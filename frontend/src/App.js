import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import TrenchesView from './components/views/TrenchesView';
import WalletView from './components/views/WalletView';
import AlertsView from './components/views/AlertsView';
import SettingsView from './components/views/SettingsView';
import SniperPanel from './components/sniper/SniperPanel';
import { cn } from './lib/utils';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('trenches');
  const [selectedChain, setSelectedChain] = useState('sol');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const renderContent = () => {
    switch (activeTab) {
      case 'trenches':
        return <TrenchesView />;
      case 'wallet':
        return <WalletView isConnected={isWalletConnected} />;
      case 'alerts':
        return <AlertsView />;
      case 'settings':
        return <SettingsView />;
      case 'sniper':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrenchesView />
            </div>
            <div className="lg:col-span-1">
              <SniperPanel />
            </div>
          </div>
        );
      case 'copytrade':
        return (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-2xl">CT</span>
            </div>
            <h2 className="text-xl font-bold text-white">Copy Trading</h2>
            <p className="text-gray-500 max-w-md text-center">
              Follow top traders and automatically copy their trades. Coming soon!
            </p>
          </div>
        );
      case 'track':
      case 'monitor':
        return (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
            <p className="text-gray-500">Track wallets and monitor token movements</p>
          </div>
        );
      case 'twitter':
        return (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <h2 className="text-xl font-bold text-white">X Tracker</h2>
            <p className="text-gray-500">Real-time Twitter/X feed tracking</p>
          </div>
        );
      default:
        return <TrenchesView />;
    }
  };

  return (
    <div className="h-screen flex bg-[#09090b] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          selectedChain={selectedChain}
          setSelectedChain={setSelectedChain}
          toggleSidebar={toggleSidebar}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
