import React, { useState } from 'react';
import { 
  Zap, 
  Settings, 
  Target, 
  Shield, 
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Info
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
import { mockSniperSettings, mockRecentTrades } from '../../data/mock';

const SniperPanel = () => {
  const [settings, setSettings] = useState(mockSniperSettings);
  const [isActive, setIsActive] = useState(false);
  const [targetAddress, setTargetAddress] = useState('');

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Main Sniper Card */}
      <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1f1f23] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-semibold">Sniper Bot</h3>
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
              isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
            )}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="p-2 hover:bg-[#1f1f23]"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Target Input */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Target Contract Address</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Paste token address or bond URL..."
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="flex-1 bg-[#1f1f23] border-[#2a2a2e] text-white placeholder-gray-500"
              />
              <Button
                variant="ghost"
                size="sm"
                className="px-3 bg-[#1f1f23] hover:bg-[#2a2a2e]"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-400 text-sm">Buy Amount (SOL)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Amount of SOL to spend per snipe</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                value={settings.defaultBuyAmount}
                onChange={(e) => updateSetting('defaultBuyAmount', e.target.value)}
                className="bg-[#1f1f23] border-[#2a2a2e] text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-400 text-sm">Slippage (%)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Maximum price slippage tolerance</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                value={settings.slippage}
                onChange={(e) => updateSetting('slippage', e.target.value)}
                className="bg-[#1f1f23] border-[#2a2a2e] text-white"
              />
            </div>
          </div>

          {/* Priority Fee Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-400 text-sm">Priority Fee</Label>
              <span className="text-white text-sm font-medium">{settings.priorityFee} SOL</span>
            </div>
            <Slider
              value={[parseFloat(settings.priorityFee) * 1000]}
              onValueChange={([val]) => updateSetting('priorityFee', (val / 1000).toString())}
              max={10}
              min={1}
              step={1}
              className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>Medium</span>
              <span>Turbo</span>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <Label className="text-gray-300 text-sm">Anti-MEV Protection</Label>
              </div>
              <Switch
                checked={settings.antiMev}
                onCheckedChange={(val) => updateSetting('antiMev', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <Label className="text-gray-300 text-sm">Auto-Sell</Label>
              </div>
              <Switch
                checked={settings.autoSell}
                onCheckedChange={(val) => updateSetting('autoSell', val)}
              />
            </div>

            {settings.autoSell && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs">Take Profit (%)</Label>
                  <Input
                    type="number"
                    value={settings.sellAt}
                    onChange={(e) => updateSetting('sellAt', e.target.value)}
                    className="bg-[#1f1f23] border-[#2a2a2e] text-white text-sm h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs">Stop Loss (%)</Label>
                  <Input
                    type="number"
                    value={settings.stopLoss}
                    onChange={(e) => updateSetting('stopLoss', e.target.value)}
                    className="bg-[#1f1f23] border-[#2a2a2e] text-white text-sm h-8"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button
            className={cn(
              "w-full py-3 font-semibold text-base transition-all",
              isActive 
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" 
                : "bg-green-500 hover:bg-green-600 text-black"
            )}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? (
              <><Pause className="w-5 h-5 mr-2" /> Stop Sniper</>
            ) : (
              <><Play className="w-5 h-5 mr-2" /> Start Sniper</>
            )}
          </Button>
        </div>
      </div>

      {/* Recent Snipes */}
      <div className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f1f23]">
          <h3 className="text-white font-semibold text-sm">Recent Trades</h3>
        </div>
        <div className="divide-y divide-[#1f1f23]">
          {mockRecentTrades.map((trade) => (
            <div key={trade.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#1a1a1e] transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  trade.type === 'buy' ? "bg-green-500/20" : "bg-red-500/20"
                )}>
                  {trade.type === 'buy' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{trade.token}</p>
                  <p className="text-gray-500 text-xs">{trade.amount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">{trade.price}</p>
                <p className="text-gray-500 text-xs">{trade.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SniperPanel;
