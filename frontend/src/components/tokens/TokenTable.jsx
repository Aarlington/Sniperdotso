import React, { useState } from 'react';
import { 
  ExternalLink, 
  Twitter, 
  Globe, 
  Copy, 
  TrendingUp,
  Zap,
  X,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';

const QUICK_BUY_AMOUNTS = [0.05, 0.1, 0.25, 0.5, 1];

const TokenTable = ({ tokens, title, showProgress = true }) => {
  const [selectedToken, setSelectedToken] = useState(null);
  const [buyAmount, setBuyAmount] = useState(0.1);
  const [isBuying, setIsBuying] = useState(false);
  const [buyStatus, setBuyStatus] = useState(null); // 'success' | 'error' | null
  const [txSignature, setTxSignature] = useState(null);
  
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
  };

  const handleBuy = async (token, amount) => {
    if (!connected) {
      setVisible(true);
      return;
    }

    setIsBuying(true);
    setBuyStatus(null);
    
    try {
      // Call backend to create buy transaction
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sniper/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mint: token.fullAddress,
          solAmount: amount,
          walletAddress: publicKey.toBase58(),
          slippage: 25,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create transaction');
      }

      const { transaction: txBase64 } = await response.json();
      
      // Deserialize and sign
      const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
      const signedTx = await signTransaction(tx);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      
      setTxSignature(signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      setBuyStatus('success');
      console.log('Buy successful:', signature);
      
    } catch (error) {
      console.error('Buy error:', error);
      setBuyStatus('error');
    } finally {
      setIsBuying(false);
      setTimeout(() => {
        setBuyStatus(null);
        setTxSignature(null);
      }, 5000);
    }
  };

  const QuickBuyButton = ({ token }) => (
    <Button
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        if (!connected) {
          setVisible(true);
        } else {
          setSelectedToken(token);
        }
      }}
      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-black text-xs font-semibold rounded-md transition-all hover:scale-105"
    >
      Buy
    </Button>
  );

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

      {/* Empty State */}
      {(!tokens || tokens.length === 0) && (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1f1f23] flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">No tokens in this category yet</p>
          <p className="text-gray-600 text-xs mt-1">Tokens will appear here as they stream in</p>
        </div>
      )}

      {/* Table Body */}
      <div className="divide-y divide-[#1f1f23]">
        {tokens && tokens.map((token, index) => (
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
                token.change1h?.includes?.('-') ? "text-red-400" : 
                token.change1h === '0%' || token.change1h === '0%/0%' ? "text-gray-500" : "text-green-400"
              )}>
                {token.change1h || '0%'}
              </span>
            </div>

            {/* Action */}
            <div className="col-span-1 flex items-center justify-center">
              <QuickBuyButton token={token} />
            </div>
          </div>
        ))}
      </div>

      {/* Buy Modal */}
      <Dialog open={!!selectedToken} onOpenChange={() => setSelectedToken(null)}>
        <DialogContent className="bg-[#0d0d0f] border-[#1f1f23] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedToken?.logo ? (
                <img src={selectedToken.logo} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{selectedToken?.symbol?.slice(0, 2)}</span>
                </div>
              )}
              <div>
                <span className="text-white font-semibold">{selectedToken?.symbol}</span>
                {selectedToken?.name && (
                  <p className="text-gray-500 text-xs">{selectedToken.name}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Token Info */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#1f1f23] rounded-lg p-3">
                <p className="text-gray-500 text-xs">Market Cap</p>
                <p className="text-white font-semibold">{selectedToken?.marketCap}</p>
              </div>
              <div className="bg-[#1f1f23] rounded-lg p-3">
                <p className="text-gray-500 text-xs">Progress</p>
                <p className="text-green-400 font-semibold">{Math.round(selectedToken?.progress || 0)}%</p>
              </div>
              <div className="bg-[#1f1f23] rounded-lg p-3">
                <p className="text-gray-500 text-xs">Liquidity</p>
                <p className="text-white font-semibold">{selectedToken?.liquidity} SOL</p>
              </div>
            </div>

            {/* Quick Buy Amounts */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Quick Buy Amount (SOL)</p>
              <div className="grid grid-cols-5 gap-2">
                {QUICK_BUY_AMOUNTS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBuyAmount(amount)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium transition-all",
                      buyAmount === amount 
                        ? "bg-green-500 text-black" 
                        : "bg-[#1f1f23] text-gray-400 hover:bg-[#2a2a2e]"
                    )}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Buy Button */}
            <Button
              onClick={() => handleBuy(selectedToken, buyAmount)}
              disabled={isBuying || !connected}
              className={cn(
                "w-full py-3 font-semibold text-base transition-all",
                buyStatus === 'success' && "bg-green-500",
                buyStatus === 'error' && "bg-red-500",
                !buyStatus && "bg-green-500 hover:bg-green-600 text-black"
              )}
            >
              {isBuying ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Buying...</>
              ) : buyStatus === 'success' ? (
                <><Check className="w-5 h-5 mr-2" /> Bought!</>
              ) : buyStatus === 'error' ? (
                <><AlertCircle className="w-5 h-5 mr-2" /> Failed</>
              ) : !connected ? (
                'Connect Wallet First'
              ) : (
                <><Zap className="w-5 h-5 mr-2" /> Buy {buyAmount} SOL</>
              )}
            </Button>

            {/* Transaction Link */}
            {txSignature && buyStatus === 'success' && (
              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-blue-400 hover:text-blue-300"
              >
                View on Solscan →
              </a>
            )}

            {/* Links */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-[#1f1f23]">
              <a
                href={`https://gmgn.ai/sol/token/${selectedToken?.fullAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> GMGN.ai
              </a>
              <a
                href={`https://pump.fun/coin/${selectedToken?.fullAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Pump.fun
              </a>
              <a
                href={`https://dexscreener.com/solana/${selectedToken?.fullAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> DexScreener
              </a>
              <button
                onClick={() => copyAddress(selectedToken?.fullAddress)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy CA
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TokenTable;
