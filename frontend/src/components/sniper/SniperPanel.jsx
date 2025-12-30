import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Settings, 
  Target, 
  Shield, 
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Info,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Eye,
  DollarSign
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';
import { usePumpFun } from '../../contexts/PumpFunContext';
import { useWalletState } from '../../contexts/WalletContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SniperPanel = () => {
  // Wallet
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { balance } = useWalletState();
  
  // PumpFun context
  const { tokens, solPrice } = usePumpFun();
  
  // Sniper settings
  const [isActive, setIsActive] = useState(false);
  const [targetAddress, setTargetAddress] = useState('');
  const [buyAmount, setBuyAmount] = useState('0.1');
  const [slippage, setSlippage] = useState('25');
  const [priorityFee, setPriorityFee] = useState(0.001);
  const [antiMev, setAntiMev] = useState(true);
  const [autoSell, setAutoSell] = useState(false);
  const [takeProfit, setTakeProfit] = useState('100');
  const [stopLoss, setStopLoss] = useState('50');
  const [maxMcap, setMaxMcap] = useState('50000');
  const [minLiquidity, setMinLiquidity] = useState('5');
  
  // Sniper state
  const [snipedTokens, setSnipedTokens] = useState([]);
  const [pendingSnipes, setPendingSnipes] = useState([]);
  const [sniperLog, setSniperLog] = useState([]);
  
  // Add log entry
  const addLog = useCallback((message, type = 'info') => {
    setSniperLog(prev => [{
      id: Date.now(),
      message,
      type,
      time: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 50));
  }, []);

  // Execute buy transaction
  const executeBuy = useCallback(async (token) => {
    if (!connected || !publicKey) {
      addLog('Wallet not connected', 'error');
      return null;
    }

    const amount = parseFloat(buyAmount);
    if (balance !== null && balance < amount) {
      addLog(`Insufficient balance: ${balance.toFixed(4)} SOL`, 'error');
      return null;
    }

    addLog(`🎯 Sniping ${token.symbol} @ ${token.marketCap}...`, 'info');
    setPendingSnipes(prev => [...prev, token.fullAddress]);

    try {
      // Create buy transaction
      const response = await fetch(`${BACKEND_URL}/api/sniper/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mint: token.fullAddress,
          solAmount: amount,
          walletAddress: publicKey.toBase58(),
          slippage: parseInt(slippage),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Transaction failed');
      }

      const { transaction: txBase64 } = await response.json();
      
      // Sign and send
      const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
      const signedTx = await signTransaction(tx);
      
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });

      addLog(`✅ Bought ${token.symbol}! TX: ${signature.slice(0, 8)}...`, 'success');
      
      // Track position
      const position = {
        ...token,
        buyPrice: token.lastPriceUsd,
        buyAmount: amount,
        buyTime: Date.now(),
        txSignature: signature,
        currentPrice: token.lastPriceUsd,
        pnl: 0,
        pnlPercent: 0,
      };
      
      setSnipedTokens(prev => [position, ...prev]);
      
      return signature;
    } catch (error) {
      addLog(`❌ Failed: ${error.message}`, 'error');
      return null;
    } finally {
      setPendingSnipes(prev => prev.filter(addr => addr !== token.fullAddress));
    }
  }, [connected, publicKey, buyAmount, balance, slippage, signTransaction, connection, addLog]);

  // Auto-snipe new tokens
  useEffect(() => {
    if (!isActive || !connected) return;

    // Watch for new tokens that match criteria
    const checkNewTokens = () => {
      for (const token of tokens) {
        // Skip if already sniped or pending
        if (snipedTokens.some(s => s.fullAddress === token.fullAddress)) continue;
        if (pendingSnipes.includes(token.fullAddress)) continue;
        
        // Check criteria
        const mcapNum = parseFloat(token.marketCap?.replace(/[$K,M]/g, '') || '0') * 
          (token.marketCap?.includes('K') ? 1000 : token.marketCap?.includes('M') ? 1000000 : 1);
        const liqNum = parseFloat(token.liquidity) || 0;
        const maxMcapNum = parseFloat(maxMcap) || 50000;
        const minLiqNum = parseFloat(minLiquidity) || 5;
        
        // Age check - only snipe tokens younger than 30 seconds
        const ageSeconds = (Date.now() - token.createdAt) / 1000;
        
        if (ageSeconds < 30 && mcapNum < maxMcapNum && liqNum >= minLiqNum) {
          addLog(`🔍 Found: ${token.symbol} - MC: ${token.marketCap}, Liq: ${token.liquidity} SOL`, 'info');
          executeBuy(token);
        }
      }
    };

    // If targeting specific address
    if (targetAddress) {
      const target = tokens.find(t => 
        t.fullAddress === targetAddress || 
        t.fullAddress?.toLowerCase().includes(targetAddress.toLowerCase())
      );
      if (target && !snipedTokens.some(s => s.fullAddress === target.fullAddress)) {
        executeBuy(target);
      }
    } else {
      checkNewTokens();
    }
  }, [isActive, connected, tokens, targetAddress, snipedTokens, pendingSnipes, maxMcap, minLiquidity, executeBuy, addLog]);

  // Update positions with current prices
  useEffect(() => {
    if (snipedTokens.length === 0) return;

    setSnipedTokens(prev => prev.map(position => {
      const currentToken = tokens.find(t => t.fullAddress === position.fullAddress);
      if (!currentToken) return position;

      const currentPrice = currentToken.lastPriceUsd || position.buyPrice;
      const pnlPercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
      const pnlUsd = (currentPrice - position.buyPrice) * position.buyAmount * (solPrice || 180);

      return {
        ...position,
        currentPrice,
        pnl: pnlUsd,
        pnlPercent,
        currentMcap: currentToken.marketCap,
      };
    }));
  }, [tokens, snipedTokens.length, solPrice]);

  // Auto-sell logic
  useEffect(() => {
    if (!autoSell || snipedTokens.length === 0) return;

    const tp = parseFloat(takeProfit) || 100;
    const sl = parseFloat(stopLoss) || 50;

    for (const position of snipedTokens) {
      if (position.sold) continue;

      if (position.pnlPercent >= tp) {
        addLog(`🎯 TP Hit! ${position.symbol} +${position.pnlPercent.toFixed(0)}%`, 'success');
        // TODO: Execute sell
      } else if (position.pnlPercent <= -sl) {
        addLog(`🛑 SL Hit! ${position.symbol} ${position.pnlPercent.toFixed(0)}%`, 'error');
        // TODO: Execute sell
      }
    }
  }, [snipedTokens, autoSell, takeProfit, stopLoss, addLog]);

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-200">
          <p className="font-semibold">High Risk Trading</p>
          <p className="text-yellow-200/70">Sniping meme coins is extremely risky. Only use funds you can afford to lose.</p>
        </div>
      </div>

      {/* Main Sniper Card */}
      <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1f1f23] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className={cn("w-5 h-5", isActive ? "text-green-400 animate-pulse" : "text-gray-400")} />
            <h3 className="text-white font-semibold">Sniper Bot</h3>
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
              isActive ? "bg-green-500/20 text-green-400 animate-pulse" : "bg-gray-500/20 text-gray-400"
            )}>
              {isActive ? 'ARMED' : 'Inactive'}
            </span>
          </div>
          {balance !== null && (
            <span className="text-sm text-gray-400">
              {balance.toFixed(4)} SOL
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Target Input */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Target Contract (optional)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Auto-snipe new tokens or paste specific CA..."
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="flex-1 bg-[#1f1f23] border-[#2a2a2e] text-white placeholder-gray-500"
              />
              {targetAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTargetAddress('')}
                  className="px-2 hover:bg-[#2a2a2e]"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {targetAddress ? 'Will snipe when this token appears' : 'Will auto-snipe all new tokens matching criteria'}
            </p>
          </div>

          {/* Quick Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-400 text-sm">Buy Amount (SOL)</Label>
              </div>
              <Select value={buyAmount} onValueChange={setBuyAmount}>
                <SelectTrigger className="bg-[#1f1f23] border-[#2a2a2e] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-[#2a2a2e]">
                  {['0.05', '0.1', '0.25', '0.5', '1', '2', '5'].map(amt => (
                    <SelectItem key={amt} value={amt}>{amt} SOL</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Slippage (%)</Label>
              <Select value={slippage} onValueChange={setSlippage}>
                <SelectTrigger className="bg-[#1f1f23] border-[#2a2a2e] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-[#2a2a2e]">
                  {['10', '15', '20', '25', '30', '50'].map(s => (
                    <SelectItem key={s} value={s}>{s}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Max MC ($)</Label>
              <Input
                type="number"
                value={maxMcap}
                onChange={(e) => setMaxMcap(e.target.value)}
                className="bg-[#1f1f23] border-[#2a2a2e] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Min Liquidity (SOL)</Label>
              <Input
                type="number"
                value={minLiquidity}
                onChange={(e) => setMinLiquidity(e.target.value)}
                className="bg-[#1f1f23] border-[#2a2a2e] text-white"
              />
            </div>
          </div>

          {/* Priority Fee Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-400 text-sm">Priority Fee</Label>
              <span className="text-white text-sm font-medium">{priorityFee.toFixed(4)} SOL</span>
            </div>
            <Slider
              value={[priorityFee * 10000]}
              onValueChange={([val]) => setPriorityFee(val / 10000)}
              max={100}
              min={1}
              step={1}
              className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low (0.0001)</span>
              <span>Turbo (0.01)</span>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3 pt-2 border-t border-[#1f1f23]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <Label className="text-gray-300 text-sm">Anti-MEV Protection</Label>
              </div>
              <Switch checked={antiMev} onCheckedChange={setAntiMev} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <Label className="text-gray-300 text-sm">Auto-Sell (TP/SL)</Label>
              </div>
              <Switch checked={autoSell} onCheckedChange={setAutoSell} />
            </div>

            {autoSell && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs">Take Profit (%)</Label>
                  <Input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="bg-[#1f1f23] border-[#2a2a2e] text-white text-sm h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs">Stop Loss (%)</Label>
                  <Input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="bg-[#1f1f23] border-[#2a2a2e] text-white text-sm h-8"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          {!connected ? (
            <Button
              onClick={() => setVisible(true)}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              Connect Wallet to Snipe
            </Button>
          ) : (
            <Button
              className={cn(
                "w-full py-3 font-semibold text-base transition-all",
                isActive 
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" 
                  : "bg-green-500 hover:bg-green-600 text-black"
              )}
              onClick={() => {
                setIsActive(!isActive);
                if (!isActive) {
                  addLog('🚀 Sniper Armed! Watching for targets...', 'success');
                } else {
                  addLog('⏹️ Sniper Disarmed', 'info');
                }
              }}
            >
              {isActive ? (
                <><Pause className="w-5 h-5 mr-2" /> DISARM SNIPER</>
              ) : (
                <><Play className="w-5 h-5 mr-2" /> ARM SNIPER</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Active Positions */}
      {snipedTokens.length > 0 && (
        <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f1f23] flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Active Positions ({snipedTokens.length})</h3>
            <span className="text-xs text-gray-500">
              Total: ${snipedTokens.reduce((acc, p) => acc + (p.buyAmount * (solPrice || 180)), 0).toFixed(2)}
            </span>
          </div>
          <div className="divide-y divide-[#1f1f23] max-h-64 overflow-y-auto">
            {snipedTokens.map((position) => (
              <div key={position.fullAddress} className="px-4 py-3 flex items-center justify-between hover:bg-[#1a1a1e]">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    position.pnlPercent >= 0 ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    {position.pnlPercent >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{position.symbol}</p>
                    <p className="text-gray-500 text-xs">{position.buyAmount} SOL @ {position.currentMcap || position.marketCap}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-semibold text-sm",
                    position.pnlPercent >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                  </p>
                  <p className="text-gray-500 text-xs">
                    {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sniper Log */}
      <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f1f23]">
          <h3 className="text-white font-semibold text-sm">Activity Log</h3>
        </div>
        <div className="p-2 max-h-48 overflow-y-auto font-mono text-xs">
          {sniperLog.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No activity yet. Arm the sniper to start.</p>
          ) : (
            sniperLog.map((log) => (
              <div key={log.id} className={cn(
                "px-2 py-1 rounded",
                log.type === 'success' && "text-green-400",
                log.type === 'error' && "text-red-400",
                log.type === 'info' && "text-gray-400"
              )}>
                <span className="text-gray-600">[{log.time}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SniperPanel;
