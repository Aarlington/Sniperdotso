from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import asyncio
import json
import httpx

from pumpfun_service import pumpfun_service
from sniper_service import sniper_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


from copytrade_service import copy_trade_manager

# Define Models
class CopyTradeTarget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_wallet: str
    label: Optional[str] = None
    fixed_buy_amount_sol: float = 0.1
    enabled: bool = True
    copy_sells: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class BuyRequest(BaseModel):
    mint: str
    solAmount: float
    walletAddress: str
    slippage: int = 25

class SellRequest(BaseModel):
    mint: str
    tokenAmount: float
    walletAddress: str
    slippage: int = 25

class Position(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    mint: str
    symbol: str
    buy_amount: float
    token_amount: float
    buy_price: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = 'OPEN'
    tp_percent: Optional[float] = None
    sl_percent: Optional[float] = None
    pnl: Optional[float] = 0.0

class TokenInfo(BaseModel):
    mint: str
    

# API Routes
@api_router.get("/")
async def root():
    return {"message": "GMGN Sniper API v1.0"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "pumpfun_connected": pumpfun_service.is_running,
        "timestamp": datetime.utcnow().isoformat()
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# Sniper Routes
@api_router.post("/sniper/buy")
async def create_buy_transaction(request: BuyRequest):
    """Create a buy transaction for a Pump.fun token"""
    try:
        transaction = await sniper_service.create_buy_transaction(
            mint_address=request.mint,
            buyer_address=request.walletAddress,
            sol_amount=request.solAmount,
            slippage_percent=request.slippage
        )
        
        if not transaction:
            raise HTTPException(status_code=400, detail="Failed to create transaction")
            
        return {"transaction": transaction}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating buy transaction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/sniper/sell")
async def create_sell_transaction(request: SellRequest):
    """Create a sell transaction for a Pump.fun token"""
    try:
        # Pump.fun tokens have 6 decimals
        token_units = int(request.tokenAmount * 1e6)
        
        transaction = await sniper_service.create_sell_transaction(
            mint_address=request.mint,
            seller_address=request.walletAddress,
            token_amount=token_units,
            slippage_percent=request.slippage
        )
        
        if not transaction:
            raise HTTPException(status_code=400, detail="Failed to create transaction")
            
        return {"transaction": transaction}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating sell transaction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/sniper/positions/{wallet_address}", response_model=List[Position])
async def get_positions(wallet_address: str):
    positions = await db.positions.find({"wallet_address": wallet_address}, {"_id": 0}).to_list(1000)
    return [Position(**p) for p in positions]

@api_router.post("/sniper/positions", response_model=Position)
async def create_position(position: Position):
    # Ensure _id is not in the inserted document
    pos_dict = position.dict()
    await db.positions.insert_one(pos_dict)
    # Remove _id from response
    if "_id" in pos_dict:
        del pos_dict["_id"]
    return position

@api_router.put("/sniper/positions/{position_id}", response_model=Position)
async def update_position(position_id: str, update_data: Dict[str, Any]):
    if 'id' in update_data:
        del update_data['id']
    
    await db.positions.update_one(
        {"id": position_id},
        {"$set": update_data}
    )
    
    updated_position = await db.positions.find_one({"id": position_id}, {"_id": 0})
    if not updated_position:
        raise HTTPException(status_code=404, detail="Position not found")
        
    return Position(**updated_position)

@api_router.get("/sniper/token/{mint}")
async def get_token_info(mint: str):
    """Get token bonding curve information"""
    try:
        from solders.pubkey import Pubkey
        mint_pubkey = Pubkey.from_string(mint)
        
        bonding_curve = await sniper_service.get_bonding_curve_account(mint_pubkey)
        
        if not bonding_curve:
            raise HTTPException(status_code=404, detail="Token not found")
            
        # Calculate progress percentage
        # Bonding curve completes at ~85 SOL
        real_sol = bonding_curve['realSolReserves'] / 1e9
        progress = min(((85 - (85 - real_sol)) / 85) * 100, 100)
        
        return {
            **bonding_curve,
            'progress': progress,
            'realSolReservesSOL': real_sol,
        }
        
    except Exception as e:
        logger.error(f"Error getting token info: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Copy Trade Routes
@api_router.get("/copytrade/targets", response_model=List[CopyTradeTarget])
async def get_copy_targets():
    targets = await db.copy_targets.find({}, {"_id": 0}).to_list(1000)
    return [CopyTradeTarget(**t) for t in targets]

@api_router.post("/copytrade/targets", response_model=CopyTradeTarget)
async def create_copy_target(target: CopyTradeTarget):
    target_dict = target.dict()
    await db.copy_targets.insert_one(target_dict)
    
    # Refresh cache
    all_targets = await db.copy_targets.find({}, {"_id": 0}).to_list(1000)
    copy_trade_manager.update_targets(all_targets)
    
    if "_id" in target_dict:
        del target_dict["_id"]
    return target

@api_router.delete("/copytrade/targets/{target_id}")
async def delete_copy_target(target_id: str):
    result = await db.copy_targets.delete_one({"id": target_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Target not found")
        
    # Refresh cache
    all_targets = await db.copy_targets.find({}, {"_id": 0}).to_list(1000)
    copy_trade_manager.update_targets(all_targets)
    
    return {"status": "deleted"}
        
    except Exception as e:
        logger.error(f"Error getting token info: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/sniper/metadata/{mint}")
async def get_token_metadata(mint: str):
    """Fetch token metadata using Helius DAS API"""
    import os
    HELIUS_RPC_URL = os.environ.get('HELIUS_RPC_URL')
    
    try:
        async with httpx.AsyncClient() as client:
            # Use Helius DAS API to get asset info
            response = await client.post(
                HELIUS_RPC_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": "metadata",
                    "method": "getAsset",
                    "params": {"id": mint}
                },
                timeout=5.0
            )
            
            if response.status_code == 200:
                data = response.json()
                result = data.get('result', {})
                content = result.get('content', {})
                metadata = content.get('metadata', {})
                links = content.get('links', {})
                
                return {
                    'mint': mint,
                    'name': metadata.get('name', ''),
                    'symbol': metadata.get('symbol', ''),
                    'description': metadata.get('description', ''),
                    'image': content.get('files', [{}])[0].get('uri', '') if content.get('files') else links.get('image', ''),
                    'twitter': '',
                    'website': links.get('external_url', ''),
                }
            
            return {'mint': mint, 'error': 'Token not found'}
            
    except Exception as e:
        logger.error(f"Error fetching metadata for {mint}: {e}")
        return {'mint': mint, 'error': str(e)}


# WebSocket for real-time Pump.fun events
@api_router.websocket("/ws/pumpfun")
async def websocket_pumpfun(websocket: WebSocket):
    """WebSocket endpoint for real-time Pump.fun events"""
    await websocket.accept()
    await pumpfun_service.add_client(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to Pump.fun event stream",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                if message.get('type') == 'pong':
                    continue
                    
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})
                
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await pumpfun_service.remove_client(websocket)


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Start background services on app startup"""
    # Initialize copy trade manager
    try:
        targets = await db.copy_targets.find({}, {"_id": 0}).to_list(1000)
        copy_trade_manager.update_targets(targets)
    except Exception as e:
        logger.error(f"Failed to load copy targets: {e}")
        
    await pumpfun_service.start()
    logger.info("Application started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on app shutdown"""
    await pumpfun_service.stop()
    client.close()
    logger.info("Application shutdown")
