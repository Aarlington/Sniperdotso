import React, { useState } from 'react';
import { 
  Bell, 
  Zap, 
  TrendingUp, 
  AlertCircle,
  Check,
  X,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { mockAlerts } from '../../data/mock';

const alertTypes = {
  new: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  whale: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  bonding: { icon: AlertCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
};

const AlertsView = () => {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filters, setFilters] = useState({
    new: true,
    whale: true,
    bonding: true,
  });

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const filteredAlerts = alerts.filter(a => filters[a.type]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Alerts</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
            {alerts.length} new
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-2 hover:bg-[#1f1f23]",
              soundEnabled ? "text-green-400" : "text-gray-500"
            )}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-[#1f1f23]"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Filter Toggles */}
      <div className="flex items-center gap-4 bg-[#0d0d0f] rounded-lg border border-[#1f1f23] p-3">
        <span className="text-gray-500 text-sm">Show:</span>
        {Object.entries(alertTypes).map(([key, { icon: Icon, color }]) => (
          <button
            key={key}
            onClick={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              filters[key] 
                ? "bg-[#1f1f23] text-white" 
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Icon className={cn("w-4 h-4", filters[key] ? color : "text-gray-500")} />
            <span className="capitalize">{key}</span>
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-12 h-12 text-gray-700 mb-4" />
            <p className="text-gray-500">No alerts to show</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const { icon: Icon, color, bg } = alertTypes[alert.type];
            return (
              <div
                key={alert.id}
                className="bg-[#0d0d0f] rounded-xl border border-[#1f1f23] p-4 flex items-start gap-4 hover:bg-[#1a1a1e] transition-colors group"
              >
                <div className={cn("p-2 rounded-lg", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{alert.message}</p>
                  <p className="text-gray-500 text-xs mt-1">{alert.time} ago</p>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1 hover:bg-[#2a2a2e] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All */}
      {alerts.length > 0 && (
        <Button
          variant="ghost"
          className="w-full py-2 text-gray-500 hover:text-white hover:bg-[#1f1f23]"
          onClick={() => setAlerts([])}
        >
          Clear all alerts
        </Button>
      )}
    </div>
  );
};

export default AlertsView;
