import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

const PumpFunContext = createContext(null);

// Cache for token metadata
const metadataCache = new Map();
const metadataFetched = new Set();

// Live SOL price
let currentSolPrice = 180;
let lastPriceFetch = 0;

export const usePumpFun = () => {
  const context = useContext(PumpFunContext);
  if (!context) {
    throw new Error('usePumpFun must be used within PumpFunProvider');
  }
  return context;
};

// Fetch live SOL price
async function fetchSolPrice() {
  const now = Date.now();
  if (now - lastPriceFetch < 30000) return currentSolPrice;
  
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    if (response.ok) {
      const data = await response.json();
      currentSolPrice = data.solana?.usd || 180;
      lastPriceFetch = now;
    }
  } catch (error) {
    console.error('Error fetching SOL price:', error);
  }
  return currentSolPrice;
}

fetchSolPrice();

// Metadata fetching
let lastMetadataFetch = 0;
const METADATA_FETCH_DELAY = 100;

async function fetchTokenMetadata(mint) {
  if (metadataCache.has(mint)) return metadataCache.get(mint);
  if (metadataFetched.has(mint)) return null;
  
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
  // We use a ref for the "source of truth" to avoid constant state updates
  // This allows us to process high-frequency events without re-rendering on every single one
  const tokensMapRef = useRef(new Map()); // Map<mint, Token> for O(1) access
  
  // Exposed state
  const [tokens, setTokens] = useState([]);
  const [lastEvent, setLastEvent] = useState(null); // For signals like copyTrade
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Helper to safely update tokens map
  const updateTokenInMap = (mint, updateFn) => {
    const current = tokensMapRef.current.get(mint);
    const updated = updateFn(current);
    if (updated) {
      tokensMapRef.current.set(mint, updated);
    }
  };

  // Process incoming token creation event
  const handleCreateEvent = useCallback((event) => {
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
      isGreen: true,
      progress: 0,
      platform: 'pump',
      priceHistory: [],
      trades: [],
      isMigrated: false
    };

    // Add to map
    tokensMapRef.current.set(event.mint, newToken);

    // Fetch metadata background
    fetchTokenMetadata(event.mint).then(metadata => {
      if (metadata) {
        updateTokenInMap(event.mint, (t) => t ? ({
          ...t,
          name: metadata.name || t.name,
          symbol: metadata.symbol || t.symbol,
          logo: metadata.image || t.logo,
          hasTwitter: !!metadata.twitter,
          twitter: metadata.twitter,
          hasWebsite: !!metadata.website,
        }) : null);
      }
    });
  }, []);

  // Process incoming trade event
  const handleTradeEvent = useCallback((event) => {
    const trade = {
      id: `${event.mint}-${event.timestamp}`,
      mint: event.mint,
      solAmount: Number(event.solAmount) / 1e9,
      tokenAmount: Number(event.tokenAmount) / 1e6,
      isBuy: event.isBuy,
      user: event.user,
      timestamp: event.timestamp * 1000,
      virtualSolReserves: Number(event.virtualSolReserves) / 1e9,
      virtualTokenReserves: Number(event.virtualTokenReserves) / 1e6,
      realSolReserves: Number(event.realSolReserves) / 1e9,
      realTokenReserves: Number(event.realTokenReserves) / 1e6,
    };

    const SOL_PRICE_USD = currentSolPrice;
    const priceInSol = trade.virtualSolReserves / trade.virtualTokenReserves;
    const priceInUsd = priceInSol * SOL_PRICE_USD;
    const marketCapUsd = priceInSol * 1_000_000_000 * SOL_PRICE_USD;
    const tradeVolumeUsd = trade.solAmount * SOL_PRICE_USD;
    const progress = Math.min((trade.realSolReserves / 85) * 100, 100);
    const isGraduating = progress >= 99 || trade.realSolReserves >= 84;

    const existingToken = tokensMapRef.current.get(event.mint);

    if (existingToken) {
        // Update existing
        const now = Date.now();
        const newPricePoint = {
            time: trade.timestamp,
            price: priceInSol,
            priceUsd: priceInUsd,
            volume: tradeVolumeUsd,
        };
        const updatedHistory = [...existingToken.priceHistory, newPricePoint].slice(-50); // Reduced history size
        const { change5m, change1h } = calculatePriceChanges(updatedHistory, now);
        
        // Simple unique traders tracking (Set is not serializable easily, so we just use length for now or keep separate)
        // For performance, we'll just increment holder count if it's a new wallet in a simplified way
        // Or keep the Set in the object but be careful with memory. 
        // Let's just assume uniqueTraders is a Set.
        if (!existingToken.uniqueTradersSet) existingToken.uniqueTradersSet = new Set(existingToken.uniqueTraders || []);
        existingToken.uniqueTradersSet.add(event.user);

        const totalVolumeUsd = (existingToken.totalVolumeUsd || 0) + tradeVolumeUsd;
        const shouldMigrate = progress >= 100 || (isGraduating && !existingToken.isMigrated);

        tokensMapRef.current.set(event.mint, {
            ...existingToken,
            marketCap: formatMarketCapUsd(marketCapUsd),
            volume: formatVolumeUsd(totalVolumeUsd),
            totalVolumeUsd: totalVolumeUsd,
            liquidity: trade.realSolReserves.toFixed(2),
            txCount: existingToken.txCount + 1,
            holders: existingToken.uniqueTradersSet.size,
            progress: Math.min(Math.max(progress, 0), 100),
            priceHistory: updatedHistory,
            trades: [trade, ...existingToken.trades].slice(0, 20), // Reduced trades size
            lastPrice: priceInSol,
            lastPriceUsd: priceInUsd,
            lastTrade: trade,
            change5m: change5m,
            change1h: change1h,
            isMigrated: shouldMigrate ? true : existingToken.isMigrated,
            graduatedAt: shouldMigrate && !existingToken.graduatedAt ? Date.now() : existingToken.graduatedAt,
            isGreen: trade.isBuy,
        });
    } else {
        // Create new from trade (likely missed create event or existing token)
        const isMigrated = progress >= 100 || isGraduating;
        
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
            creator: event.user,
            volume: formatVolumeUsd(tradeVolumeUsd),
            totalVolumeUsd: tradeVolumeUsd,
            marketCap: formatMarketCapUsd(marketCapUsd),
            liquidity: trade.realSolReserves.toFixed(2),
            netFlow: trade.isBuy ? `+$${tradeVolumeUsd.toFixed(0)}` : `-$${tradeVolumeUsd.toFixed(0)}`,
            txCount: 1,
            holders: 1,
            uniqueTradersSet: new Set([event.user]),
            topHolders: '0%',
            change5m: '0%',
            change1h: '0%',
            isGreen: trade.isBuy,
            progress: Math.min(Math.max(progress, 0), 100),
            priceHistory: [{ time: trade.timestamp, price: priceInSol, priceUsd: priceInUsd, volume: tradeVolumeUsd }],
            trades: [trade],
            lastPrice: priceInSol,
            lastPriceUsd: priceInUsd,
            lastTrade: trade,
            isMigrated: isMigrated,
            graduatedAt: isMigrated ? Date.now() : null
        };

        tokensMapRef.current.set(event.mint, newToken);

        // Fetch metadata
        fetchTokenMetadata(event.mint).then(metadata => {
            if (metadata && !metadata.error) {
                updateTokenInMap(event.mint, (t) => t ? ({
                    ...t,
                    name: metadata.name || t.name,
                    symbol: metadata.symbol || t.symbol,
                    logo: metadata.image || t.logo,
                    hasTwitter: !!metadata.twitter,
                    twitter: metadata.twitter,
                    hasWebsite: !!metadata.website,
                }) : null);
            }
        });
    }
  }, []);

  const handleCompleteEvent = useCallback((event) => {
    console.log('🎉 Token graduated:', event.mint);
    updateTokenInMap(event.mint, (token) => {
        if (!token) return null;
        return {
            ...token,
            progress: 100,
            isMigrated: true,
            graduatedAt: Date.now(),
        };
    });
  }, []);

  // Sync Interval: Updates the React state from the Ref at a fixed rate (e.g. 2fps)
  // This throttles rendering while keeping data effectively real-time
  useEffect(() => {
    const interval = setInterval(() => {
        if (tokensMapRef.current.size === 0) return;

        // Convert map to array and sort
        // We want the LATEST tokens. 
        // Optimization: limit the size of the Map to prevent memory leaks?
        // If map gets too big (>500), delete oldest?
        
        const allTokens = Array.from(tokensMapRef.current.values());
        
        // Sort by creation time desc (newest first)
        allTokens.sort((a, b) => b.createdAt - a.createdAt);
        
        // Keep memory usable: hard limit map size
        if (allTokens.length > 500) {
            // Remove oldest from map
            for (let i = 500; i < allTokens.length; i++) {
                tokensMapRef.current.delete(allTokens[i].fullAddress);
            }
        }

        // Slice for display (show max 100)
        const displayTokens = allTokens.slice(0, 100);
        
        // Update ages for display tokens only
        const now = Date.now();
        const updatedDisplayTokens = displayTokens.map(t => ({
            ...t,
            age: formatAge(now - t.createdAt)
        }));

        setTokens(updatedDisplayTokens);
    }, 500); // 500ms throttling

    return () => clearInterval(interval);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setConnectionStatus('connecting');
    
    try {
      wsRef.current = new WebSocket(`${WS_URL}/api/ws/pumpfun`);
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'copyTradeSignal') {
             setLastEvent({ type: 'copyTradeSignal', data: msg.data });
             return;
          }

          if (msg.type === 'createEvent') handleCreateEvent(msg.data);
          else if (msg.type === 'tradeEvent') handleTradeEvent(msg.data);
          else if (msg.type === 'completeEvent') handleCompleteEvent(msg.data);
          else if (msg.type === 'ping') wsRef.current?.send(JSON.stringify({ type: 'pong' }));

        } catch (error) {
          console.error('WS Parse Error:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    } catch (error) {
      setConnectionStatus('error');
    }
  }, [handleCreateEvent, handleTradeEvent, handleCompleteEvent]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    wsRef.current?.close();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const value = {
    tokens,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    solPrice: currentSolPrice,
    lastEvent
  };

  return (
    <PumpFunContext.Provider value={value}>
      {children}
    </PumpFunContext.Provider>
  );
};

// Helpers
function formatAge(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function formatMarketCapUsd(val) {
  if (val >= 1e6) return `$${(val/1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val/1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function formatVolumeUsd(val) {
  if (val >= 1e6) return `$${(val/1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val/1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function calculatePriceChanges(history, now) {
  if (!history || history.length < 2) return { change5m: '0%', change1h: '0%' };
  const current = history[history.length - 1].price;
  const p5m = history.find(p => p.time >= now - 300000)?.price || history[0].price;
  const p1h = history.find(p => p.time >= now - 3600000)?.price || history[0].price;
  
  const c5 = p5m > 0 ? ((current - p5m) / p5m) * 100 : 0;
  const c1 = p1h > 0 ? ((current - p1h) / p1h) * 100 : 0;
  
  return {
    change5m: `${c5 >= 0 ? '+' : ''}${c5.toFixed(0)}%`,
    change1h: `${c1 >= 0 ? '+' : ''}${c1.toFixed(0)}%`
  };
}

export default PumpFunProvider;
