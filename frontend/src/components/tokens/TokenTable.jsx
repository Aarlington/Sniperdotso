import React from 'react';
import { 
  ExternalLink, 
  Twitter, 
  Globe, 
  Copy, 
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const TokenTable = ({ tokens, title, showProgress = true }) => {
  const formatValue = (value) => {
    if (!value) return '-';
    return value;
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#0a0a0c] border-b border-[#1f1f23] text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="col-span-3">Token</div>
        <div className="col-span-1 text-center">Age</div>
        <div className="col-span-1 text-right">MC</div>
        <div className="col-span-1 text-right">Vol</div>
        <div className="col-span-1 text-right">Liq</div>
        <div className="col-span-1 text-center">TX</div>
        <div className="col-span-1 text-center">Holders</div>
        <div className="col-span-1 text-right">5m</div>
        <div className="col-span-1 text-right">1h</div>
        <div className="col-span-1 text-center">Action</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-[#1f1f23]">
        {tokens.map((token, index) => (
          <div
            key={token.id}
            className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-[#1a1a1e] transition-colors cursor-pointer group"
          >
            {/* Token Info */}
            <div className="col-span-3 flex items-center gap-3">
              <div className="relative">
                {token.logo ? (
                  <img
                    src={token.logo}
                    alt={token.symbol}
                    className="w-10 h-10 rounded-full object-cover bg-[#1f1f23]"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=1f1f23&color=fff&size=40`;
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{token.symbol?.slice(0, 2) || '??'}</span>
                  </div>
                )}
                {showProgress && token.progress !== undefined && (
                  <div 
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0d0d0f] border-2 flex items-center justify-center"
                    style={{ borderColor: token.progress >= 80 ? '#22c55e' : token.progress >= 50 ? '#eab308' : '#6b7280' }}
                  >
                    <span className="text-[8px] font-bold" style={{ color: token.progress >= 80 ? '#22c55e' : token.progress >= 50 ? '#eab308' : '#9ca3af' }}>
                      {Math.round(token.progress)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm truncate">{token.symbol || 'Unknown'}</span>
                  {token.isLive && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded animate-pulse">
                      LIVE
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded">
                    PUMP
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(token.fullAddress || token.address);
                          }}
                          className="text-gray-500 hover:text-gray-300 text-xs truncate max-w-[80px]"
                        >
                          {token.address}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to copy: {token.fullAddress || token.address}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {token.hasTwitter && (
                    <a 
                      href={`https://twitter.com/${token.twitter?.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Twitter className="w-3 h-3" />
                    </a>
                  )}
                  {token.hasWebsite && (
                    <Globe className="w-3 h-3 text-gray-500 hover:text-gray-300 cursor-pointer" />
                  )}
                </div>
                {token.name && token.name !== `Token ${token.fullAddress?.slice(0, 8)}` && (
                  <p className="text-gray-500 text-[10px] truncate mt-0.5">{token.name}</p>
                )}
              </div>
            </div>

            {/* Age */}
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-gray-400 text-sm">{token.age}</span>
            </div>

            {/* Market Cap */}
            <div className="col-span-1 flex items-center justify-end">
              <span className="text-white text-sm font-medium">{token.marketCap}</span>
            </div>

            {/* Volume */}
            <div className="col-span-1 flex items-center justify-end">
              <span className="text-gray-300 text-sm">{token.volume}</span>
            </div>

            {/* Liquidity */}
            <div className="col-span-1 flex items-center justify-end">
              <span className="text-gray-400 text-sm">{token.liquidity}</span>
            </div>

            {/* TX Count */}
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-gray-400 text-sm">{token.txCount}</span>
            </div>

            {/* Holders */}
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-gray-400 text-sm">{token.holders}</span>
            </div>

            {/* 5m Change */}
            <div className="col-span-1 flex items-center justify-end">
              <span className={cn(
                "text-sm font-medium",
                token.change5m.includes('-') ? "text-red-400" : 
                token.change5m === '0%' ? "text-gray-500" : "text-green-400"
              )}>
                {token.change5m}
              </span>
            </div>

            {/* 1h Change */}
            <div className="col-span-1 flex items-center justify-end">
              <span className={cn(
                "text-sm font-medium",
                token.change1h.includes('-') ? "text-red-400" : 
                token.change1h === '0%' || token.change1h === '0%/0%' ? "text-gray-500" : "text-green-400"
              )}>
                {token.change1h}
              </span>
            </div>

            {/* Action */}
            <div className="col-span-1 flex items-center justify-center">
              <Button
                size="sm"
                className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-black text-xs font-semibold rounded-md transition-all hover:scale-105"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                Buy
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TokenTable;
