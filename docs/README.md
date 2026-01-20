# Solana Sniper Bot & GMGN Clone - Project Documentation

## Overview
This project is a full-stack real-time trading terminal and sniper bot for Solana, specifically focused on **Pump.fun** tokens. It mimics the functionality and aesthetic of platforms like **gmgn.ai**, providing a "Trenches" view for new launches, a "Sniper" for rapid execution, and "Copy Trading" capabilities.

The system is built to handle high-frequency data streams, process blockchain events in real-time, and execute trades via user-connected wallets.

## Key Capabilities
- **Live "Trenches" Feed**: Real-time streaming of new token launches and trades on Pump.fun.
- **Bonding Curve Tracking**: Visualizes token progress towards graduation (Raydium migration).
- **Sniper Terminal**: Instant Buy/Sell interface with customizable slippage and priority fees.
- **Copy Trading**: Automated signaling system to mimic trades from target wallets.
- **Migrated Token Tracking**: Detects and tracks tokens that have graduated to Raydium, fetching live market data from DexScreener.
- **Portfolio Tracking**: Real-time PnL tracking for open positions.

## Navigation
- [Architecture](ARCHITECTURE.md): System design, tech stack, and component breakdown.
- [Data Pipelines](PIPELINES.md): Detailed flow of data from blockchain to UI.
- [Features](FEATURES.md): In-depth explanation of core features (Sniper, Copy Trade, Trenches).
- [API Reference](API_REFERENCE.md): Backend API endpoints and usage.

## Quick Start
### Prerequisites
- Python 3.9+
- Node.js & Yarn
- MongoDB
- Helius API Key (RPC & WebSocket)

### Backend
```bash
cd backend
pip install -r requirements.txt
# Ensure .env has HELIUS_API_KEY, MONGO_URL
python server.py # (or via supervisor)
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```
