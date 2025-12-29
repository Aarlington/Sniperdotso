import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

const PumpFunContext = createContext(null);

// Cache for token metadata
const metadataCache = new Map();
// Track tokens we've already tried to fetch metadata for
const metadataFetched = new Set();

export const usePumpFun = () => {
  const context = useContext(PumpFunContext);
  if (!context) {
    throw new Error('usePumpFun must be used within PumpFunProvider');
  }
  return context;
};

// Fetch token metadata from Helius DAS API with rate limiting
let lastMetadataFetch = 0;
const METADATA_FETCH_DELAY = 100; // ms between fetches

async function fetchTokenMetadata(mint) {
  if (metadataCache.has(mint)) {
    return metadataCache.get(mint);
  }
  
  if (metadataFetched.has(mint)) {
    return null; // Already tried and failed
  }
  
  // Rate limit
  const now = Date.now();
  const timeSinceLastFetch = now - lastMetadataFetch;
  if (timeSinceLastFetch < METADATA_FETCH_DELAY) {
    await new Promise(r => setTimeout(r, METADATA_FETCH_DELAY - timeSinceLastFetch));
  }
  lastMetadataFetch = Date.now();
  
  metadataFetched.add(mint);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/sniper/metadata/${mint}`);
    if (response.ok) {
      const data = await response.json();
      if (!data.error && (data.name || data.symbol)) {
        metadataCache.set(mint, data);
        return data;
      }
    }
  } catch (error) {
    console.error('Error fetching metadata:', error);
  }
  return null;
}

export const PumpFunProvider = ({ children }) => {
  const [tokens, setTokens] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Process incoming token creation event
  const handleCreateEvent = useCallback(async (event) => {
    const newToken = {
      id: event.mint,
      address: `${event.mint.slice(0, 4)}...${event.mint.slice(-4)}`,
      fullAddress: event.mint,
      symbol: event.symbol || event.mint.slice(0, 6).toUpperCase(),
      name: event.name || `Token ${event.mint.slice(0, 8)}`,
      logo: event.uri ? `https://pump.fun/image/${event.mint}` : null,
      age: '0s',
      createdAt: Date.now(),
      twitter: null,
      hasTwitter: false,
      hasWebsite: false,
      bondingCurve: event.bondingCurve,
      creator: event.user,
      volume: '$0',
      marketCap: '$3.6K',
      liquidity: '0',
      netFlow: '$0',
      txCount: 0,
      holders: 1,
      topHolders: '0%',
      change5m: '0%',
      change1h: '0%',
      change6h: '0%',
      change24h: '0%',
      isGreen: true,
      progress: 0,
      platform: 'pump',
      priceHistory: [],
      trades: [],
    };

    // Fetch metadata in background
    fetchTokenMetadata(event.mint).then(metadata => {
      if (metadata) {
        setTokens(prev => prev.map(t => {
          if (t.fullAddress === event.mint) {
            return {
              ...t,
              name: metadata.name || t.name,
              symbol: metadata.symbol || t.symbol,
              logo: metadata.image || t.logo,
              hasTwitter: !!metadata.twitter,
              twitter: metadata.twitter,
              hasWebsite: !!metadata.website,
            };
          }
          return t;
        }));
      }
    });

    setTokens(prev => [newToken, ...prev].slice(0, 100)); // Keep last 100 tokens
  }, []);

  // Process incoming trade event
  const handleTradeEvent = useCallback((event) => {
    const trade = {
      id: `${event.mint}-${event.timestamp}`,
      mint: event.mint,
      solAmount: Number(event.solAmount) / 1e9, // Convert lamports to SOL
      tokenAmount: Number(event.tokenAmount) / 1e6, // Convert to token decimals
      isBuy: event.isBuy,
      user: event.user,
      timestamp: event.timestamp * 1000,
      virtualSolReserves: Number(event.virtualSolReserves) / 1e9,
      virtualTokenReserves: Number(event.virtualTokenReserves) / 1e6,
      realSolReserves: Number(event.realSolReserves) / 1e9,
      realTokenReserves: Number(event.realTokenReserves) / 1e6,
    };

    // Calculate price and market cap
    const price = trade.virtualSolReserves / trade.virtualTokenReserves;
    const marketCap = price * 1000000000; // Total supply is 1B
    const progress = Math.min(((85 - trade.realSolReserves) / 85) * 100, 100); // Bonding curve needs ~85 SOL to complete
    
    // Check if token is graduating (progress >= 99%)
    const isGraduating = progress >= 99;

    // Update token with new trade data OR create new token if it doesn't exist
    setTokens(prev => {
      const existingToken = prev.find(t => t.fullAddress === event.mint);
      
      if (existingToken) {
        // Update existing token
        return prev.map(token => {
          if (token.fullAddress === event.mint) {
            const newPricePoint = {
              time: trade.timestamp,
              price: price,
              volume: trade.solAmount,
            };
            
            // Mark as migrated if progress hits 100%
            const shouldMigrate = progress >= 100 || (isGraduating && !token.isMigrated);
            
            return {
              ...token,
              marketCap: formatMarketCap(marketCap),
              volume: formatVolume(trade.solAmount + parseVolume(token.volume)),
              txCount: token.txCount + 1,
              progress: Math.min(Math.max(progress, 0), 100),
              priceHistory: [...token.priceHistory, newPricePoint].slice(-100),
              trades: [trade, ...token.trades].slice(0, 50),
              lastPrice: price,
              lastTrade: trade,
              isMigrated: shouldMigrate ? true : token.isMigrated,
              graduatedAt: shouldMigrate && !token.graduatedAt ? Date.now() : token.graduatedAt,
            };
          }
          return token;
        });
      } else {
        // Create new token from trade event
        const newToken = {
          id: event.mint,
          address: `${event.mint.slice(0, 4)}...${event.mint.slice(-4)}`,
          fullAddress: event.mint,
          symbol: event.mint.slice(0, 6).toUpperCase(),
          name: `Token ${event.mint.slice(0, 8)}`,
          logo: null,
          age: '0s',
          createdAt: Date.now(),
          twitter: null,
          hasTwitter: false,
          hasWebsite: false,
          bondingCurve: null,
          creator: event.user,
          volume: formatVolume(trade.solAmount),
          marketCap: formatMarketCap(marketCap),
          liquidity: trade.realSolReserves.toFixed(3),
          netFlow: trade.isBuy ? `+$${trade.solAmount.toFixed(2)}` : `-$${trade.solAmount.toFixed(2)}`,
          txCount: 1,
          holders: 1,
          topHolders: '0%',
          change5m: '0%',
          change1h: '0%',
          change6h: '0%',
          change24h: '0%',
          isGreen: trade.isBuy,
          progress: Math.min(Math.max(progress, 0), 100),
          platform: 'pump',
          priceHistory: [{ time: trade.timestamp, price: price, volume: trade.solAmount }],
          trades: [trade],
          lastPrice: price,
          lastTrade: trade,
          metadataLoading: true,
        };
        
        // Fetch metadata in background for new tokens
        fetchTokenMetadata(event.mint).then(metadata => {
          if (metadata && !metadata.error) {
            setTokens(prev => prev.map(t => {
              if (t.fullAddress === event.mint) {
                return {
                  ...t,
                  name: metadata.name || t.name,
                  symbol: metadata.symbol || t.symbol,
                  logo: metadata.image || t.logo,
                  hasTwitter: !!metadata.twitter,
                  twitter: metadata.twitter,
                  hasWebsite: !!metadata.website,
                  metadataLoading: false,
                };
              }
              return t;
            }));
          }
        });
        
        console.log('Created token from trade:', newToken.fullAddress.slice(0, 10));
        return [newToken, ...prev].slice(0, 100);
      }
    });

    // Add to recent trades
    setRecentTrades(prev => [trade, ...prev].slice(0, 50));
  }, []);

  // Process bonding curve completion event
  const handleCompleteEvent = useCallback((event) => {
    console.log('🎉 Token graduated:', event.mint);
    setTokens(prev => prev.map(token => {
      if (token.fullAddress === event.mint) {
        return {
          ...token,
          progress: 100,
          isMigrated: true,
          graduatedAt: Date.now(),
        };
      }
      return token;
    }));
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    
    try {
      wsRef.current = new WebSocket(`${WS_URL}/api/ws/pumpfun`);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected to PumpFun events');
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WS message:', data.type, data.data?.mint?.slice(0, 10) || '');
          
          switch (data.type) {
            case 'createEvent':
              console.log('New token created:', data.data.symbol, data.data.mint);
              handleCreateEvent(data.data);
              break;
            case 'tradeEvent':
              handleTradeEvent(data.data);
              break;
            case 'completeEvent':
              handleCompleteEvent(data.data);
              break;
            case 'ping':
              wsRef.current?.send(JSON.stringify({ type: 'pong' }));
              break;
            case 'connected':
              console.log('Connection confirmed by server');
              break;
            default:
              console.log('Unknown event type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [handleCreateEvent, handleTradeEvent, handleCompleteEvent]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Update token ages periodically - use ref to avoid race conditions
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTokens(prev => {
        // Only update if we have tokens
        if (prev.length === 0) return prev;
        
        // Check if any age actually changed (avoid unnecessary updates)
        let hasChanges = false;
        const updated = prev.map(token => {
          const newAge = formatAge(now - token.createdAt);
          if (newAge !== token.age) {
            hasChanges = true;
            return { ...token, age: newAge };
          }
          return token;
        });
        
        return hasChanges ? updated : prev;
      });
    }, 2000); // Update every 2 seconds instead of 1 to reduce load

    return () => clearInterval(interval);
  }, []);

  const value = {
    tokens,
    recentTrades,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
  };

  return (
    <PumpFunContext.Provider value={value}>
      {children}
    </PumpFunContext.Provider>
  );
};

// Helper functions
function formatAge(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatMarketCap(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatVolume(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function parseVolume(str) {
  if (!str || str === '$0') return 0;
  const num = parseFloat(str.replace('$', '').replace('K', '000').replace('M', '000000'));
  return isNaN(num) ? 0 : num;
}

export default PumpFunProvider;
