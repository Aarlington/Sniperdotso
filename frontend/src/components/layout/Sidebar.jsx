import React, { useState } from 'react';
import { 
  Home, 
  Wallet, 
  Eye, 
  Bell, 
  Settings, 
  Activity,
  Star,
  Copy,
  Twitter,
  Search,
  TrendingUp,
  Zap,
  Target,
  BarChart2,
  Users,
  ChevronDown,
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { id: 'trenches', label: 'Trenches', icon: Home, badge: null },
  { id: 'wallet', label: 'Wallet', icon: Wallet, badge: null },
  { id: 'track', label: 'Track', icon: Eye, badge: null },
  { id: 'monitor', label: 'Monitor', icon: Activity, badge: null },
  { id: 'alerts', label: 'Alerts', icon: Bell, badge: '3' },
  { id: 'copytrade', label: 'Copy Trade', icon: Copy, badge: 'NEW' },
  { id: 'sniper', label: 'Sniper', icon: Target, badge: null },
];

const bottomItems = [
  { id: 'twitter', label: 'X Tracker', icon: Twitter },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed }) => {
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (id) => {
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={cn(
      "h-screen bg-[#0d0d0f] border-r border-[#1f1f23] flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-[#1f1f23]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">G</span>
            </div>
            <span className="text-white font-semibold text-lg">GMGN</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-black font-bold text-sm">G</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-[#1f1f23] group",
                    isActive && "bg-[#1f1f23] text-green-400",
                    !isActive && "text-gray-400"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-green-400" : "text-gray-500 group-hover:text-gray-300"
                  )} />
                  {!collapsed && (
                    <>
                      <span className={cn(
                        "flex-1 text-left text-sm font-medium transition-colors",
                        isActive ? "text-white" : "group-hover:text-white"
                      )}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={cn(
                          "px-1.5 py-0.5 text-xs font-medium rounded",
                          item.badge === 'NEW' 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-red-500/20 text-red-400"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="mx-4 my-4 border-t border-[#1f1f23]" />

        {/* Bottom Navigation */}
        <ul className="space-y-1 px-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    "text-gray-400 hover:bg-[#1f1f23] hover:text-white group"
                  )}
                >
                  <Icon className="w-5 h-5 text-gray-500 group-hover:text-gray-300" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-[#1f1f23]">
        <button className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
          "bg-[#1f1f23] hover:bg-[#2a2a2e] transition-colors"
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-xs font-medium">?</span>
          </div>
          {!collapsed && (
            <div className="flex-1 text-left">
              <p className="text-xs text-gray-400">Not Connected</p>
              <p className="text-sm text-white font-medium">Connect Wallet</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
