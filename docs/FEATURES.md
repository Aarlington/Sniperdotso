# Feature Specifications

## 1. The Sniper Terminal
The core trading interface designed for speed and precision.

### UI Components
-   **Quick Buttons**: Preset SOL amounts (0.1, 0.5, 1.0).
-   **Slippage Slider**: Adjustable slippage tolerance (Default 25% for high volatility).
-   **Priority Fee**: Configurable compute unit price to land transactions faster.
-   **PnL Tracker**: Live view of open positions with unrealized Profit/Loss.

### Backend Logic (`sniper_service.py`)
-   **Buy**:
    -   Interacts with the Bonding Curve contract.
    -   Calculates `maxSolCost` based on slippage.
    -   Handles ATA (Associated Token Account) creation if needed.
-   **Sell**:
    -   Calculates `minSolOutput` based on slippage.
    -   Executes sale against the curve.

### Auto-Sell (TP/SL)
-   The frontend monitors the price of open positions.
-   If `(Current Price / Buy Price) > Take Profit %` -> Trigger Sell.
-   If `(Current Price / Buy Price) < Stop Loss %` -> Trigger Sell.

## 2. Copy Trader
Follow "Smart Money" wallets automatically.

-   **Watchlist**: Add/Remove wallets to track.
-   **Fixed Size**: Define a static SOL amount to buy for every copied trade (e.g., "Always buy 0.1 SOL").
-   **In-Stream**: Uses the main data feed, meaning it sees the trade the moment Helius indexes the block. No polling delay.

## 3. The Trenches (Token Feed)
A Gmgn.ai-style feed of new tokens.

-   **Filtering**:
    -   **Trenches**: New tokens, low bonding progress (<80%).
    -   **Almost Bonded**: High bonding progress (80% - 99%).
    -   **Migrated**: Successfully graduated to Raydium (100% / Complete).
-   **Metrics**:
    -   **Age**: Time since creation.
    -   **Bonding Progress**: % of curve filled.
    -   **Tx Count**: Activity level.
    -   **Holders**: Unique trader count (estimated from stream).

## 4. Migrated Tokens
Special handling for "Graduated" tokens.

-   Since these tokens leave the bonding curve, their price is no longer determined by the curve formula.
-   The system automatically switches data sources for these tokens from **Pump.fun Internal** to **DexScreener** to ensure accurate pricing and liquidity data from Raydium/PumpSwap pools.
