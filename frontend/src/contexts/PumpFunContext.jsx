import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

const PumpFunContext = createContext(null);

export const usePumpFun = () => {
  const context = useContext(PumpFunContext);
  if (!context) {
    throw new Error('usePumpFun must be used within PumpFunProvider');
  }
  return context;
};

export const PumpFunProvider = ({ children }) => {
  const [tokens, setTokens] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Process incoming token creation event
  const handleCreateEvent = useCallback((event) => {
    const newToken = {
      id: event.mint,
      address: `${event.mint.slice(0, 4)}...${event.mint.slice(-4)}`,
      fullAddress: event.mint,
      symbol: event.symbol,
      name: event.name,
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
    const progress = ((79 - trade.realSolReserves) / 79) * 100; // Bonding curve needs ~79 SOL to complete

    // Update token with new trade data
    setTokens(prev => prev.map(token => {
      if (token.fullAddress === event.mint) {
        const newPricePoint = {
          time: trade.timestamp,
          price: price,
          volume: trade.solAmount,
        };
        
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
        };
      }
      return token;
    }));

    // Add to recent trades
    setRecentTrades(prev => [trade, ...prev].slice(0, 50));
  }, []);

  // Process bonding curve completion event
  const handleCompleteEvent = useCallback((event) => {
    setTokens(prev => prev.map(token => {
      if (token.fullAddress === event.mint) {
        return {
          ...token,
          progress: 100,
          isMigrated: true,
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
          
          switch (data.type) {
            case 'createEvent':
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

  // Update token ages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(prev => prev.map(token => ({
        ...token,
        age: formatAge(Date.now() - token.createdAt),
      })));
    }, 1000);

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
