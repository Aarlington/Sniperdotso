import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Settings, 
  ChevronDown,
  Menu,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { chains } from '../../data/mock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import WalletButton from '../wallet/WalletButton';
import { usePumpFun } from '../../contexts/PumpFunContext';

const Header = ({ selectedChain, setSelectedChain, toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { isConnected: wsConnected, connectionStatus, solPrice } = usePumpFun();

  const currentChain = chains.find(c => c.id === selectedChain) || chains[0];

  return (
    <header className="h-14 bg-[#0d0d0f] border-b border-[#1f1f23] flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-[#1f1f23] rounded-lg transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5 text-gray-400" />
        </button>

        {/* Chain Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 px-3 py-2 bg-[#1f1f23] hover:bg-[#2a2a2e] rounded-lg border-0"
            >
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: currentChain.color + '30', color: currentChain.color }}
              >
                {currentChain.icon.charAt(0)}
              </div>
              <span className="text-white text-sm font-medium">{currentChain.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1e] border-[#2a2a2e] min-w-[160px]">
            {chains.map((chain) => (
              <DropdownMenuItem
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2e]",
                  selectedChain === chain.id && "bg-[#2a2a2e]"
                )}
              >
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: chain.color + '30', color: chain.color }}
                >
                  {chain.icon.charAt(0)}
                </div>
                <span className="text-white text-sm">{chain.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search Bar */}
        <div className={cn(
          "relative flex items-center transition-all duration-200",
          isSearchFocused ? "w-96" : "w-72"
        )}>
          <Search className="absolute left-3 w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search by token address or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-10 pr-4 py-2 bg-[#1f1f23] border-[#2a2a2e] text-white placeholder-gray-500 rounded-lg focus:border-green-500/50 focus:ring-green-500/20"
          />
        </div>

        {/* WebSocket Status */}
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          wsConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        )}>
          {wsConnected ? (
            <><Wifi className="w-3 h-3" /> Live</>
          ) : (
            <><WifiOff className="w-3 h-3" /> {connectionStatus}</>
          )}
        </div>

        {/* SOL Price */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
          <span>SOL ${solPrice?.toFixed(2) || '---'}</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Quick Actions */}
        <button className="p-2 hover:bg-[#1f1f23] rounded-lg transition-colors group">
          <Zap className="w-5 h-5 text-gray-400 group-hover:text-yellow-400" />
        </button>
        
        <button className="relative p-2 hover:bg-[#1f1f23] rounded-lg transition-colors group">
          <Bell className="w-5 h-5 text-gray-400 group-hover:text-white" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button className="p-2 hover:bg-[#1f1f23] rounded-lg transition-colors group">
          <Settings className="w-5 h-5 text-gray-400 group-hover:text-white" />
        </button>

        {/* Wallet Button */}
        <WalletButton />
      </div>
    </header>
  );
};

export default Header;
