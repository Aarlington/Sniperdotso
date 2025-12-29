import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Rocket, 
  Star,
  Filter,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronDown,
  Search,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import TokenTable from '../tokens/TokenTable';
import { mockTokens } from '../../data/mock';
import { usePumpFun } from '../../contexts/PumpFunContext';

const TrenchesView = () => {
  const [activeTab, setActiveTab] = useState('trenches');
  const [filter, setFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  
  const { tokens: liveTokens, isConnected, connectionStatus } = usePumpFun();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Combine live tokens with mock data, prioritizing live tokens
  const allTokens = useMemo(() => {
    if (liveTokens.length > 0) {
      return liveTokens;
    }
    return mockTokens.trenches;
  }, [liveTokens]);

  // Filter tokens by bonding progress for different tabs
  const tokensByTab = useMemo(() => {
    const trenches = allTokens.filter(t => (t.progress || 0) < 80);
    const almostBonded = allTokens.filter(t => (t.progress || 0) >= 80 && (t.progress || 0) < 100);
    const migrated = allTokens.filter(t => (t.progress || 0) >= 100 || t.isMigrated);
    
    return {
      trenches: trenches.length > 0 ? trenches : mockTokens.trenches,
      almostBonded: almostBonded.length > 0 ? almostBonded : mockTokens.almostBonded,
      migrated: migrated.length > 0 ? migrated : mockTokens.migrated,
    };
  }, [allTokens]);

  const tabs = [
    { id: 'trenches', label: 'Trenches', icon: TrendingUp, tokens: tokensByTab.trenches },
    { id: 'almostBonded', label: 'Almost Bonded', icon: Clock, tokens: tokensByTab.almostBonded },
    { id: 'migrated', label: 'Migrated', icon: Rocket, tokens: tokensByTab.migrated },
  ];

  const currentTokens = tabs.find(t => t.id === activeTab)?.tokens || [];
  
  const filteredTokens = currentTokens.filter(token => 
    token.symbol?.toLowerCase().includes(filter.toLowerCase()) ||
    token.name?.toLowerCase().includes(filter.toLowerCase()) ||
    token.address?.toLowerCase().includes(filter.toLowerCase()) ||
    token.fullAddress?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">SOL Trenches</h2>
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1",
            isConnected ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
          )}>
            {isConnected ? (
              <><Wifi className="w-3 h-3" /> Live</>
            ) : (
              <><WifiOff className="w-3 h-3" /> {connectionStatus}</>
            )}
          </span>
          {liveTokens.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
              {liveTokens.length} tokens
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="p-2 hover:bg-[#1f1f23]"
          >
            <RefreshCw className={cn(
              "w-4 h-4 text-gray-400",
              isRefreshing && "animate-spin"
            )} />
          </Button>
          <div className="flex items-center bg-[#1f1f23] rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === 'table' ? "bg-[#2a2a2e] text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === 'grid' ? "bg-[#2a2a2e] text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#0d0d0f] p-1 rounded-lg border border-[#1f1f23]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === tab.id 
                    ? "bg-[#1f1f23] text-white" 
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  activeTab === tab.id 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-gray-700 text-gray-400"
                )}>
                  {tab.tokens.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Filter tokens..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 w-48 bg-[#0d0d0f] border-[#1f1f23] text-white placeholder-gray-500"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0f] border border-[#1f1f23] hover:bg-[#1f1f23]"
          >
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">Filters</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Token Table */}
      <TokenTable 
        tokens={filteredTokens} 
        showProgress={activeTab !== 'migrated'}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-2">
        <span>Showing {filteredTokens.length} tokens</span>
        <span>Auto-refresh: 5s</span>
      </div>
    </div>
  );
};

export default TrenchesView;
