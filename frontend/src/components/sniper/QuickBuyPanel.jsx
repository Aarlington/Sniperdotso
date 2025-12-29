import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  Transaction, 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  Zap, 
  AlertCircle, 
  Check, 
  Loader2,
  TrendingUp,
  Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useWalletState } from '../../contexts/WalletContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const QUICK_BUY_AMOUNTS = [
  { label: '0.1', value: 0.1 },
  { label: '0.25', value: 0.25 },
  { label: '0.5', value: 0.5 },
  { label: '1', value: 1 },
];

const QuickBuyPanel = ({ token, onBuySuccess, onBuyError }) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { balance, isConnected } = useWalletState();
  const [selectedAmount, setSelectedAmount] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState(null); // 'pending' | 'success' | 'error'
  const [txSignature, setTxSignature] = useState(null);

  const handleQuickBuy = useCallback(async () => {
    if (!connected || !publicKey || !token) {
      onBuyError?.('Wallet not connected');
      return;
    }

    if (balance !== null && balance < selectedAmount) {
      onBuyError?.('Insufficient balance');
      return;
    }

    setIsLoading(true);
    setTxStatus('pending');

    try {
      // For now, we'll create a simulated buy transaction
      // In production, this would call the Pump.fun program
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sniper/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mint: token.fullAddress,
          solAmount: selectedAmount,
          walletAddress: publicKey.toBase58(),
          slippage: 25, // 25% default slippage for meme coins
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create buy transaction');
      }

      const { transaction: txBase64 } = await response.json();
      
      // Deserialize and sign the transaction
      const transaction = Transaction.from(Buffer.from(txBase64, 'base64'));
      const signedTx = await signTransaction(transaction);
      
      // Send the transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      setTxSignature(signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      setTxStatus('success');
      onBuySuccess?.(signature);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setTxStatus(null);
        setTxSignature(null);
      }, 3000);

    } catch (error) {
      console.error('Buy error:', error);
      setTxStatus('error');
      onBuyError?.(error.message);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setTxStatus(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, token, selectedAmount, balance, signTransaction, connection, onBuySuccess, onBuyError]);

  if (!isConnected) {
    return (
      <div className="bg-[#1a1a1e] rounded-lg p-4 border border-[#2a2a2e]">
        <p className="text-gray-500 text-sm text-center">Connect wallet to buy</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1f1f23] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-white font-medium text-sm">Quick Buy</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Shield className="w-4 h-4 text-blue-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>25% slippage protection</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Amount Selection */}
      <div className="p-4 space-y-4">
        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_BUY_AMOUNTS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setSelectedAmount(value)}
              disabled={isLoading}
              className={cn(
                "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                selectedAmount === value
                  ? "bg-green-500 text-black"
                  : "bg-[#1f1f23] text-gray-400 hover:bg-[#2a2a2e] hover:text-white",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {label} SOL
            </button>
          ))}
        </div>

        {/* Balance Display */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Available:</span>
          <span className={cn(
            "font-medium",
            balance !== null && balance < selectedAmount ? "text-red-400" : "text-white"
          )}>
            {balance !== null ? `${balance.toFixed(4)} SOL` : '...'}
          </span>
        </div>

        {/* Buy Button */}
        <Button
          onClick={handleQuickBuy}
          disabled={isLoading || !token || (balance !== null && balance < selectedAmount)}
          className={cn(
            "w-full py-3 font-semibold text-base transition-all",
            txStatus === 'success' && "bg-green-500 hover:bg-green-500",
            txStatus === 'error' && "bg-red-500 hover:bg-red-500",
            !txStatus && "bg-green-500 hover:bg-green-600 text-black"
          )}
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
          ) : txStatus === 'success' ? (
            <><Check className="w-5 h-5 mr-2" /> Success!</>
          ) : txStatus === 'error' ? (
            <><AlertCircle className="w-5 h-5 mr-2" /> Failed</>
          ) : (
            <><TrendingUp className="w-5 h-5 mr-2" /> Buy {selectedAmount} SOL</>
          )}
        </Button>

        {/* Transaction Link */}
        {txSignature && txStatus === 'success' && (
          <a
            href={`https://solscan.io/tx/${txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-blue-400 hover:text-blue-300"
          >
            View on Solscan →
          </a>
        )}
      </div>
    </div>
  );
};

export default QuickBuyPanel;
