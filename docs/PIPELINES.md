# Data Pipelines

This document details how data flows through the system, from raw blockchain events to the user interface.

## 1. Live Pump.fun Event Stream
This is the "Trenches" feed.

1.  **Source**: Helius WebSocket (`wss://mainnet.helius-rpc.com`).
2.  **Subscription**: The backend subscribes to `logsSubscribe` for the Pump.fun Program ID (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`).
3.  **Parsing (`pumpfun_service.py`)**:
    -   Raw logs are received.
    -   Base64 event data is decoded.
    -   **Discriminator Check**: The first 8 bytes determine the event type:
        -   `createEvent`: New token launch.
        -   `tradeEvent`: Buy/Sell transaction.
        -   `completeEvent`: Bonding curve 100% full (Migration trigger).
4.  **Enrichment**:
    -   Metadata (Name, Symbol, URI) is extracted directly from the event bytes.
5.  **Broadcast**:
    -   The structured event JSON is sent to all connected Frontend clients via the internal WebSocket (`/api/ws/pumpfun`).
6.  **Frontend Processing (`PumpFunContext.jsx`)**:
    -   **Creation**: Adds new token to the `tokensMapRef`.
    -   **Trade**: Updates price, volume, market cap, and bonding curve progress.
    -   **Throttling**: A `setInterval` runs every 500ms to convert the `tokensMapRef` into a sorted Array (`tokens` state) for React to render. This prevents UI freezing during high-volume periods.

## 2. Migration Detection Pipeline
How the system identifies tokens that have graduated to Raydium.

### A. Live Migrations
-   **Trigger**: A `completeEvent` log is received in the Live Stream.
-   **Action**: The frontend marks the token as `isMigrated: true`, sets `progress: 100`, and moves it to the "Migrated" tab.

### B. Historical Migrations (Startup)
-   **Trigger**: Page load / App startup.
-   **Action**: The frontend calls `GET /api/tokens/migrated`.
-   **Backend Logic**:
    -   Calls Helius RPC `getSignaturesForAddress` on the Pump.fun Migration Account (`39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg`).
    -   Iterates through recent transactions to find the Token Mint involved.
    -   Returns a list of Mints.
-   **Frontend Logic**:
    -   Creates placeholder token entries for these mints.
    -   Initiates the **DexScreener Enrichment** pipeline for them.

## 3. Market Data Enrichment
For tokens that have left the bonding curve (Migrated), Pump.fun data is no longer sufficient.

1.  **Trigger**: Token is marked `isMigrated: true`.
2.  **Source**: DexScreener API.
3.  **Action**: Frontend fetches `https://api.dexscreener.com/latest/dex/tokens/{mint}`.
4.  **Update**: Replaces the bonding curve price/liquidity with the real Raydium/PumpSwap pool data (e.g., actual Liquidity in USD, Market Cap, Volume).

## 4. Copy Trading Pipeline
In-stream low-latency execution.

1.  **Configuration**: User adds a "Target Wallet" via UI. Saved to MongoDB (`copy_targets`).
2.  **Backend Cache**: `CopyTradeManager` loads targets into memory for O(1) lookup.
3.  **Matching**:
    -   Every `tradeEvent` in the Live Stream is checked: `if event.user in target_wallets`.
4.  **Signaling**:
    -   If match found: Broadcast `copyTradeSignal` event to Frontend WebSocket.
5.  **Execution**:
    -   Frontend receives signal.
    -   Calls `POST /api/sniper/buy` to build a transaction for the *User's* wallet.
    -   Prompts user to sign (or auto-sign if private key infrastructure was enabled).
    -   Submits transaction to Solana.
