import React from 'react';
import { 
  Wallet,
  ChevronDown,
  LogOut,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useWalletState } from '../../contexts/WalletContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const WalletButton = () => {
  const { connected, disconnect, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { balance, shortAddress, refreshBalance, isLoading } = useWalletState();

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
    }
  };

  const openExplorer = () => {
    if (publicKey) {
      window.open(`https://solscan.io/account/${publicKey.toBase58()}`, '_blank');
    }
  };

  if (!connected) {
    return (
      <Button
        onClick={() => setVisible(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-medium rounded-lg transition-all hover:scale-105"
      >
        <Wallet className="w-4 h-4" />
        <span>Connect</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 bg-[#1f1f23] hover:bg-[#2a2a2e] rounded-lg border-0"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-black text-xs font-bold">
              {shortAddress?.charAt(0) || 'W'}
            </span>
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-medium">{shortAddress}</p>
            <p className="text-gray-500 text-xs">
              {balance !== null ? `${balance.toFixed(4)} SOL` : '...'}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[#1a1a1e] border-[#2a2a2e] min-w-[200px]">
        <div className="px-3 py-2 border-b border-[#2a2a2e]">
          <p className="text-xs text-gray-500">Balance</p>
          <p className="text-lg font-semibold text-white">
            {balance !== null ? `${balance.toFixed(4)} SOL` : '...'}
          </p>
        </div>
        <DropdownMenuItem
          onClick={copyAddress}
          className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2e]"
        >
          <Copy className="w-4 h-4 text-gray-400" />
          <span className="text-white text-sm">Copy Address</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={openExplorer}
          className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2e]"
        >
          <ExternalLink className="w-4 h-4 text-gray-400" />
          <span className="text-white text-sm">View on Solscan</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={refreshBalance}
          disabled={isLoading}
          className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2e]"
        >
          <RefreshCw className={cn("w-4 h-4 text-gray-400", isLoading && "animate-spin")} />
          <span className="text-white text-sm">Refresh Balance</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#2a2a2e]" />
        <DropdownMenuItem
          onClick={disconnect}
          className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2e] text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WalletButton;
