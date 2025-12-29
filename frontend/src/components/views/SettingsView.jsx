import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Wallet, 
  Bell, 
  Shield, 
  Palette,
  Globe,
  Zap,
  ChevronRight,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const settingsSections = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'trading', label: 'Trading', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

const SettingsView = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    rpc: 'https://api.mainnet-beta.solana.com',
    priorityFee: 0.001,
    defaultSlippage: 25,
    antiMev: true,
    soundAlerts: true,
    pushNotifications: true,
    emailAlerts: false,
    theme: 'dark',
    compactMode: false,
    showPnl: true,
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-56 space-y-1">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                activeSection === section.id 
                  ? "bg-[#1f1f23] text-white" 
                  : "text-gray-500 hover:text-white hover:bg-[#1a1a1e]"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#0d0d0f] rounded-xl border border-[#1f1f23] p-6">
        {/* General Settings */}
        {activeSection === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">General Settings</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-400">RPC Endpoint</Label>
                <Input
                  value={settings.rpc}
                  onChange={(e) => updateSetting('rpc', e.target.value)}
                  className="bg-[#1f1f23] border-[#2a2a2e] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="bg-[#1f1f23] border-[#2a2a2e] text-white">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-[#2a2a2e]">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Trading Settings */}
        {activeSection === 'trading' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Trading Settings</h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-400">Default Slippage (%)</Label>
                  <span className="text-white font-medium">{settings.defaultSlippage}%</span>
                </div>
                <Slider
                  value={[settings.defaultSlippage]}
                  onValueChange={([val]) => updateSetting('defaultSlippage', val)}
                  max={50}
                  min={1}
                  step={1}
                  className="[&_[role=slider]]:bg-green-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-400">Priority Fee (SOL)</Label>
                  <span className="text-white font-medium">{settings.priorityFee} SOL</span>
                </div>
                <Slider
                  value={[settings.priorityFee * 1000]}
                  onValueChange={([val]) => updateSetting('priorityFee', val / 1000)}
                  max={10}
                  min={1}
                  step={1}
                  className="[&_[role=slider]]:bg-green-500"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[#1f1f23]">
                <div>
                  <Label className="text-white">Anti-MEV Protection</Label>
                  <p className="text-gray-500 text-sm">Protect trades from sandwich attacks</p>
                </div>
                <Switch
                  checked={settings.antiMev}
                  onCheckedChange={(val) => updateSetting('antiMev', val)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#1f1f23]">
                <div>
                  <Label className="text-white">Sound Alerts</Label>
                  <p className="text-gray-500 text-sm">Play sound for new alerts</p>
                </div>
                <Switch
                  checked={settings.soundAlerts}
                  onCheckedChange={(val) => updateSetting('soundAlerts', val)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-[#1f1f23]">
                <div>
                  <Label className="text-white">Push Notifications</Label>
                  <p className="text-gray-500 text-sm">Browser push notifications</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(val) => updateSetting('pushNotifications', val)}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="text-white">Email Alerts</Label>
                  <p className="text-gray-500 text-sm">Receive important alerts via email</p>
                </div>
                <Switch
                  checked={settings.emailAlerts}
                  onCheckedChange={(val) => updateSetting('emailAlerts', val)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Security */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Security Settings</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Always verify transaction details before signing. Never share your private keys.
                </p>
              </div>

              <Button variant="outline" className="w-full justify-between bg-transparent border-[#2a2a2e] text-white hover:bg-[#1f1f23]">
                <span>Connected Wallet</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Button>

              <Button variant="outline" className="w-full justify-between bg-transparent border-[#2a2a2e] text-white hover:bg-[#1f1f23]">
                <span>Transaction History</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
        )}

        {/* Appearance */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Appearance</h3>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-gray-400">Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', icon: Moon, label: 'Dark' },
                    { id: 'light', icon: Sun, label: 'Light' },
                    { id: 'system', icon: Monitor, label: 'System' },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => updateSetting('theme', id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                        settings.theme === id 
                          ? "border-green-500 bg-green-500/10" 
                          : "border-[#2a2a2e] hover:border-[#3a3a3e]"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5",
                        settings.theme === id ? "text-green-400" : "text-gray-500"
                      )} />
                      <span className={cn(
                        "text-sm",
                        settings.theme === id ? "text-white" : "text-gray-500"
                      )}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[#1f1f23]">
                <div>
                  <Label className="text-white">Compact Mode</Label>
                  <p className="text-gray-500 text-sm">Show more data with less spacing</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(val) => updateSetting('compactMode', val)}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="text-white">Show PnL</Label>
                  <p className="text-gray-500 text-sm">Display profit/loss on holdings</p>
                </div>
                <Switch
                  checked={settings.showPnl}
                  onCheckedChange={(val) => updateSetting('showPnl', val)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
