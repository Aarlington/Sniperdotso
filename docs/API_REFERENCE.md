# API Reference

Base URL: `http://localhost:8001` (Internal) or via Ingress.

## Sniper Endpoints

### Create Buy Transaction
`POST /api/sniper/buy`

Builds an unsigned Solana transaction to buy tokens from the bonding curve.

**Body:**
```json
{
  "mint": "String (Token Address)",
  "solAmount": "Float",
  "walletAddress": "String (User Public Key)",
  "slippage": "Integer (Percentage, e.g., 25)"
}
```

**Response:**
```json
{
  "transaction": "Base64 Encoded String"
}
```

### Create Sell Transaction
`POST /api/sniper/sell`

Builds an unsigned Solana transaction to sell tokens back to the bonding curve.

**Body:**
```json
{
  "mint": "String",
  "tokenAmount": "Float (Raw amount, or simplified)",
  "walletAddress": "String",
  "slippage": "Integer"
}
```

## Position Management

### Get Positions
`GET /api/sniper/positions/{wallet_address}`

Returns all open and closed positions for a wallet.

### Save Position
`POST /api/sniper/positions`

Persists a new position to MongoDB (called after successful buy).

### Update Position
`PUT /api/sniper/positions/{position_id}`

Updates status (e.g., to 'CLOSED') or PnL.

## Copy Trading

### Get Targets
`GET /api/copytrade/targets`

### Add Target
`POST /api/copytrade/targets`

**Body:**
```json
{
  "target_wallet": "String",
  "fixed_buy_amount_sol": "Float",
  "label": "String (Optional)"
}
```

### Delete Target
`DELETE /api/copytrade/targets/{target_id}`

## Token Data

### Get Migrated Tokens
`GET /api/tokens/migrated`

Returns a list of recent token mints that have graduated to Raydium (Historical fetch).

### Get Token Metadata
`GET /api/sniper/metadata/{mint}`

Proxies the Helius DAS API to fetch Name, Symbol, and Image URI.
