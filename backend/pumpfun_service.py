"""
Pump.fun WebSocket Service
Subscribes to Pump.fun program events and broadcasts to connected clients
"""
import os
import json
import asyncio
import logging
from typing import Set, Dict, Any, Optional
from datetime import datetime
import base64
import struct

import websockets
from websockets.exceptions import ConnectionClosed
import httpx

logger = logging.getLogger(__name__)

# Pump.fun Program ID
PUMP_FUN_PROGRAM_ID = os.environ.get('PUMP_FUN_PROGRAM_ID', '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
HELIUS_WS_URL = os.environ.get('HELIUS_WS_URL')
HELIUS_RPC_URL = os.environ.get('HELIUS_RPC_URL')

# Event discriminators (first 8 bytes of the event data)
EVENT_DISCRIMINATORS = {
    bytes([27, 114, 169, 77, 222, 235, 99, 118]): 'createEvent',
    bytes([189, 219, 127, 211, 78, 230, 97, 238]): 'tradeEvent',
    bytes([95, 114, 97, 156, 212, 46, 152, 8]): 'completeEvent',
}


class PumpFunEventService:
    """Service to subscribe to Pump.fun events and broadcast to WebSocket clients"""
    
    def __init__(self):
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.is_running = False
        self.subscription_id: Optional[int] = None
        self.ws_connection = None
        self.reconnect_delay = 1
        self.max_reconnect_delay = 60
        
    async def add_client(self, websocket):
        """Add a client to broadcast list"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
    async def remove_client(self, websocket):
        """Remove a client from broadcast list"""
        self.clients.discard(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.clients)}")
        
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.clients:
            return
            
        message_json = json.dumps(message)
        disconnected = set()
        
        for client in self.clients:
            try:
                await client.send(message_json)
            except ConnectionClosed:
                disconnected.add(client)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(client)
                
        # Remove disconnected clients
        for client in disconnected:
            await self.remove_client(client)
            
    def parse_create_event(self, data: bytes) -> Dict[str, Any]:
        """Parse createEvent data"""
        try:
            offset = 8  # Skip discriminator
            
            # Read name (string with length prefix)
            name_len = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            name = data[offset:offset+name_len].decode('utf-8')
            offset += name_len
            
            # Read symbol
            symbol_len = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            symbol = data[offset:offset+symbol_len].decode('utf-8')
            offset += symbol_len
            
            # Read uri
            uri_len = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            uri = data[offset:offset+uri_len].decode('utf-8')
            offset += uri_len
            
            # Read mint (32 bytes)
            mint = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            offset += 32
            
            # Read bondingCurve (32 bytes)
            bonding_curve = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            offset += 32
            
            # Read user (32 bytes)
            user = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            
            return {
                'name': name,
                'symbol': symbol,
                'uri': uri,
                'mint': mint,
                'bondingCurve': bonding_curve,
                'user': user,
            }
        except Exception as e:
            logger.error(f"Error parsing createEvent: {e}")
            return None
            
    def parse_trade_event(self, data: bytes) -> Dict[str, Any]:
        """Parse tradeEvent data"""
        try:
            offset = 8  # Skip discriminator
            
            # Read mint (32 bytes)
            mint = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            offset += 32
            
            # Read solAmount (u64)
            sol_amount = struct.unpack('<Q', data[offset:offset+8])[0]
            offset += 8
            
            # Read tokenAmount (u64)
            token_amount = struct.unpack('<Q', data[offset:offset+8])[0]
            offset += 8
            
            # Read isBuy (bool)
            is_buy = data[offset] == 1
            offset += 1
            
            # Read user (32 bytes)
            user = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            offset += 32
            
            # Read timestamp (i64)
            timestamp = struct.unpack('<q', data[offset:offset+8])[0]
            offset += 8
            
            # Read virtualSolReserves (u64)
            virtual_sol_reserves = struct.unpack('<Q', data[offset:offset+8])[0]
            offset += 8
            
            # Read virtualTokenReserves (u64)
            virtual_token_reserves = struct.unpack('<Q', data[offset:offset+8])[0]
            offset += 8
            
            # Read realSolReserves (u64)  
            real_sol_reserves = struct.unpack('<Q', data[offset:offset+8])[0]
            offset += 8
            
            # Read realTokenReserves (u64)
            real_token_reserves = struct.unpack('<Q', data[offset:offset+8])[0]
            
            return {
                'mint': mint,
                'solAmount': str(sol_amount),
                'tokenAmount': str(token_amount),
                'isBuy': is_buy,
                'user': user,
                'timestamp': timestamp,
                'virtualSolReserves': str(virtual_sol_reserves),
                'virtualTokenReserves': str(virtual_token_reserves),
                'realSolReserves': str(real_sol_reserves),
                'realTokenReserves': str(real_token_reserves),
            }
        except Exception as e:
            logger.error(f"Error parsing tradeEvent: {e}")
            return None
            
    def parse_complete_event(self, data: bytes) -> Dict[str, Any]:
        """Parse completeEvent data"""
        try:
            offset = 8  # Skip discriminator
            
            # Read user (32 bytes)
            user = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            offset += 32
            
            # Read mint (32 bytes)
            mint = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            offset += 32
            
            # Read bondingCurve (32 bytes)
            bonding_curve = base64.b64encode(data[offset:offset+32]).decode('utf-8')
            offset += 32
            
            # Read timestamp (i64)
            timestamp = struct.unpack('<q', data[offset:offset+8])[0]
            
            return {
                'user': user,
                'mint': mint,
                'bondingCurve': bonding_curve,
                'timestamp': timestamp,
            }
        except Exception as e:
            logger.error(f"Error parsing completeEvent: {e}")
            return None
            
    async def process_log(self, log: str):
        """Process a program log and extract events"""
        if not log.startswith('Program data: '):
            return
            
        try:
            # Extract base64 data
            data_b64 = log.replace('Program data: ', '')
            data = base64.b64decode(data_b64)
            
            # Check discriminator
            discriminator = data[:8]
            
            for disc_bytes, event_type in EVENT_DISCRIMINATORS.items():
                if discriminator == disc_bytes:
                    event_data = None
                    
                    if event_type == 'createEvent':
                        event_data = self.parse_create_event(data)
                    elif event_type == 'tradeEvent':
                        event_data = self.parse_trade_event(data)
                    elif event_type == 'completeEvent':
                        event_data = self.parse_complete_event(data)
                        
                    if event_data:
                        await self.broadcast({
                            'type': event_type,
                            'data': event_data,
                            'timestamp': datetime.utcnow().isoformat(),
                        })
                    break
                    
        except Exception as e:
            logger.debug(f"Error processing log: {e}")
            
    async def subscribe_to_program(self):
        """Subscribe to Pump.fun program logs via Helius WebSocket"""
        if not HELIUS_WS_URL:
            logger.error("HELIUS_WS_URL not configured")
            return
            
        while self.is_running:
            try:
                async with websockets.connect(HELIUS_WS_URL) as ws:
                    self.ws_connection = ws
                    self.reconnect_delay = 1  # Reset delay on successful connection
                    
                    # Subscribe to program logs
                    subscribe_msg = {
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "logsSubscribe",
                        "params": [
                            {"mentions": [PUMP_FUN_PROGRAM_ID]},
                            {"commitment": "confirmed"}
                        ]
                    }
                    
                    await ws.send(json.dumps(subscribe_msg))
                    logger.info(f"Subscribed to Pump.fun program: {PUMP_FUN_PROGRAM_ID}")
                    
                    # Listen for messages
                    async for message in ws:
                        try:
                            data = json.loads(message)
                            
                            # Handle subscription confirmation
                            if 'result' in data:
                                self.subscription_id = data['result']
                                logger.info(f"Subscription confirmed with ID: {self.subscription_id}")
                                continue
                                
                            # Handle log notifications
                            if 'params' in data:
                                result = data['params'].get('result', {})
                                value = result.get('value', {})
                                logs = value.get('logs', [])
                                
                                for log in logs:
                                    await self.process_log(log)
                                    
                        except json.JSONDecodeError as e:
                            logger.error(f"Error decoding message: {e}")
                            
            except ConnectionClosed as e:
                logger.warning(f"WebSocket connection closed: {e}")
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                
            # Reconnect with exponential backoff
            if self.is_running:
                logger.info(f"Reconnecting in {self.reconnect_delay} seconds...")
                await asyncio.sleep(self.reconnect_delay)
                self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
                
    async def start(self):
        """Start the event service"""
        self.is_running = True
        asyncio.create_task(self.subscribe_to_program())
        logger.info("PumpFun event service started")
        
    async def stop(self):
        """Stop the event service"""
        self.is_running = False
        if self.ws_connection:
            await self.ws_connection.close()
        logger.info("PumpFun event service stopped")


# Global instance
pumpfun_service = PumpFunEventService()
