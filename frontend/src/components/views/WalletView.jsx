import React, { useState } from 'react';
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Send,
  ArrowDownUp,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useWalletState } from '../../contexts/WalletContext';
import { mockHoldings, mockWatchlist } from '../../data/mock';

const WalletView = () => {
  const [hideBalance, setHideBalance] = useState(false);
  const [activeTab, setActiveTab] = useState('holdings');
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { balance, shortAddress, walletAddress } = useWalletState();

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#1f1f23] flex items-center justify-center">
          <Wallet className="w-10 h-10 text-gray-500" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">Connect Your Wallet</h3>
          <p className="text-gray-500 max-w-sm">
            Connect your Solana wallet to view your holdings, track PnL, and start trading.
          </p>
        </div>
        <Button 
          onClick={() => setVisible(true)}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-black font-medium"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0d0d0f] rounded-2xl border border-[#2a2a2e] p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-gray-500 text-sm mb-1">Total Balance</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white">
                {hideBalance ? '••••••' : `${balance !== null ? balance.toFixed(4) : '...'} SOL`}
              </h2>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                {hideBalance ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {shortAddress}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-2 bg-white/5 hover:bg-white/10">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 bg-white/5 hover:bg-white/10"
              onClick={() => window.open(`https://solscan.io/account/${walletAddress}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button className="flex flex-col items-center gap-2 py-4 bg-white/5 hover:bg-white/10 border-0">
            <Send className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">Send</span>
          </Button>
          <Button className="flex flex-col items-center gap-2 py-4 bg-white/5 hover:bg-white/10 border-0">
            <ArrowDownUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-300">Swap</span>
          </Button>
          <Button className="flex flex-col items-center gap-2 py-4 bg-white/5 hover:bg-white/10 border-0">
            <Plus className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-300">Buy</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#0d0d0f] p-1 rounded-lg border border-[#1f1f23]">
        {['holdings', 'watchlist', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium capitalize transition-all",
              activeTab === tab 
                ? "bg-[#1f1f23] text-white" 
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Holdings */}
      {activeTab === 'holdings' && (
        <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
          <div className="divide-y divide-[#1f1f23]">
            {mockHoldings.map((holding) => (
              <div key={holding.id} className="px-4 py-4 flex items-center justify-between hover:bg-[#1a1a1e] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{holding.symbol.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{holding.symbol}</p>
                    <p className="text-gray-500 text-sm">{holding.amount} tokens</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{holding.value}</p>
                  <p className={cn(
                    "text-sm font-medium",
                    holding.pnl.startsWith('+') ? "text-green-400" : "text-red-400"
                  )}>
                    {holding.pnl}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist */}
      {activeTab === 'watchlist' && (
        <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
          <div className="divide-y divide-[#1f1f23]">
            {mockWatchlist.map((item) => (
              <div key={item.id} className="px-4 py-4 flex items-center justify-between hover:bg-[#1a1a1e] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1f1f23] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{item.symbol.charAt(0)}</span>
                  </div>
                  <p className="text-white font-medium">{item.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{item.price}</p>
                  <p className={cn(
                    "text-sm font-medium",
                    item.change.startsWith('+') ? "text-green-400" : "text-red-400"
                  )}>
                    {item.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History placeholder */}
      {activeTab === 'history' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500">No transaction history yet</p>
        </div>
      )}
    </div>
  );
};

export default WalletView;
