import logging
from typing import Dict, Set, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class CopyTradeManager:
    """
    Manages copy trading targets and logic.
    Optimized for fast lookups during high-frequency event streaming.
    """
    def __init__(self):
        # In-memory cache for fast lookups: {wallet_address: config_dict}
        self.targets: Dict[str, dict] = {}
        
    def update_targets(self, targets_list: List[dict]):
        """Update the in-memory cache from the database"""
        self.targets = {
            t['target_wallet']: t 
            for t in targets_list 
            if t.get('enabled', True)
        }
        logger.info(f"Updated Copy Trade targets. Watching {len(self.targets)} wallets.")

    def check_trade(self, trade_data: dict) -> Optional[dict]:
        """
        Check if a trade matches any target.
        Returns copy trade configuration if match found, else None.
        """
        # trade_data comes from pumpfun_service.parse_trade_event
        # Keys: mint, solAmount, tokenAmount, isBuy, user, timestamp...
        
        trader = trade_data.get('user')
        if not trader:
            return None
            
        # Check if trader is in our targets
        config = self.targets.get(trader)
        if not config:
            return None
            
        # Apply filters
        is_buy = trade_data.get('isBuy')
        
        # If config only copies buys (default)
        if not config.get('copy_sells', False) and not is_buy:
            return None
            
        return {
            'target_wallet': trader,
            'mint': trade_data.get('mint'),
            'is_buy': is_buy,
            'fixed_amount': config.get('fixed_buy_amount_sol', 0.1),
            'timestamp': datetime.utcnow().isoformat()
        }

# Global instance
copy_trade_manager = CopyTradeManager()
