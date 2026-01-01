import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Zap, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { usePumpFun } from '../../contexts/PumpFunContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CopyTradePanel = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { lastEvent } = usePumpFun();
  
  const [targets, setTargets] = useState([]);
  const [newTarget, setNewTarget] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [buyAmount, setBuyAmount] = useState('0.1');
  const [autoApprove, setAutoApprove] = useState(false); // Note: Still requires popup without private key
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{ id: Date.now(), msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  // Load targets
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/copytrade/targets`);
        if (res.ok) setTargets(await res.json());
      } catch (e) {
        console.error("Failed to load targets", e);
      }
    };
    fetchTargets();
  }, []);

  // Handle Copy Trade Signal
  useEffect(() => {
    if (lastEvent?.type === 'copyTradeSignal') {
      handleCopySignal(lastEvent.data);
    }
  }, [lastEvent]);

  const handleCopySignal = useCallback(async (signal) => {
    if (!connected || !publicKey) return;

    addLog(`🔔 Copy Signal: ${signal.target_wallet} bought ${signal.mint}`, 'info');

    try {
      // Find target config
      const target = targets.find(t => t.target_wallet === signal.target_wallet);
      if (!target || !target.enabled) return;

      const amount = target.fixed_buy_amount_sol || 0.1;
      
      addLog(`🚀 Copying trade: ${amount} SOL on ${signal.mint}...`, 'info');

      // Create transaction
      const response = await fetch(`${BACKEND_URL}/api/sniper/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mint: signal.mint,
          solAmount: amount,
          walletAddress: publicKey.toBase58(),
          slippage: 25, // Default copy slippage
        }),
      });

      if (!response.ok) throw new Error("Failed to build transaction");

      const { transaction: txBase64 } = await response.json();
      const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
      
      // Request signature (User popup)
      const signedTx = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      });

      addLog(`✅ Copied! TX: ${signature.slice(0, 8)}...`, 'success');
      
      // Persist position (Optional, reusing sniper logic)
      // await fetch(...) 

    } catch (e) {
      addLog(`❌ Copy Failed: ${e.message}`, 'error');
    }
  }, [connected, publicKey, targets, connection, signTransaction]);

  const addTarget = async () => {
    if (!newTarget) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/copytrade/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            target_wallet: newTarget,
            label: newLabel,
            fixed_buy_amount_sol: parseFloat(buyAmount),
            enabled: true
        })
      });
      
      if (res.ok) {
        const saved = await res.json();
        setTargets(prev => [...prev, saved]);
        setNewTarget('');
        setNewLabel('');
        addLog(`Added target: ${saved.target_wallet}`, 'success');
      }
    } catch (e) {
      addLog(`Failed to add target: ${e.message}`, 'error');
    }
  };

  const removeTarget = async (id) => {
    try {
        await fetch(`${BACKEND_URL}/api/copytrade/targets/${id}`, { method: 'DELETE' });
        setTargets(prev => prev.filter(t => t.id !== id));
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="space-y-4">
       <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f1f23] flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Copy Trading</h3>
            </div>
            <span className="text-xs text-gray-500">{targets.length} Targets</span>
        </div>

        <div className="p-4 space-y-4">
            {/* Add Target */}
            <div className="space-y-2">
                <Label className="text-gray-400 text-xs">Add Wallet to Copy</Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Wallet Address" 
                        value={newTarget}
                        onChange={e => setNewTarget(e.target.value)}
                        className="bg-[#1f1f23] border-[#2a2a2e] text-white text-xs"
                    />
                    <Input 
                        placeholder="Label (opt)" 
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        className="bg-[#1f1f23] border-[#2a2a2e] text-white text-xs w-24"
                    />
                </div>
                <div className="flex gap-2 items-end">
                    <div className="space-y-1 flex-1">
                        <Label className="text-gray-500 text-xs">Buy Amount (SOL)</Label>
                        <Input 
                            type="number" 
                            value={buyAmount}
                            onChange={e => setBuyAmount(e.target.value)}
                            className="bg-[#1f1f23] border-[#2a2a2e] text-white text-xs"
                        />
                    </div>
                    <Button onClick={addTarget} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus className="w-4 h-4 mr-1" /> Add
                    </Button>
                </div>
            </div>

            {/* Target List */}
            <div className="space-y-2">
                <Label className="text-gray-400 text-xs">Active Targets</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {targets.map(t => (
                        <div key={t.id} className="bg-[#1a1a1e] p-2 rounded flex items-center justify-between">
                            <div className="overflow-hidden">
                                <p className="text-white text-xs font-medium truncate w-32">{t.label || 'Unknown'}</p>
                                <p className="text-gray-500 text-[10px] truncate w-32">{t.target_wallet}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400 text-xs">{t.fixed_buy_amount_sol} SOL</span>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeTarget(t.id)}
                                    className="h-6 w-6 p-0 hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {targets.length === 0 && <p className="text-gray-600 text-xs italic">No targets added.</p>}
                </div>
            </div>

            {/* Logs */}
            <div className="bg-black/20 rounded p-2 max-h-32 overflow-y-auto font-mono text-[10px]">
                {logs.map(l => (
                    <div key={l.id} className={cn(
                        "mb-1",
                        l.type === 'success' && "text-green-400",
                        l.type === 'error' && "text-red-400",
                        "text-gray-400"
                    )}>
                        <span className="opacity-50">[{l.time}]</span> {l.msg}
                    </div>
                ))}
            </div>
        </div>
       </div>
    </div>
  );
};

export default CopyTradePanel;
