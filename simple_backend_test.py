#!/usr/bin/env python3
"""
Simple Backend API Test for Sniper Service
Focus on API structure and response format verification
"""

import asyncio
import aiohttp
import json
import uuid
import os

# Load environment variables to get the backend URL
def load_env_file(file_path):
    env_vars = {}
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('"')
    return env_vars

# Get backend URL from frontend .env
frontend_env = load_env_file('/app/frontend/.env')
BACKEND_URL = frontend_env.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

async def test_api_structure():
    """Test API endpoints for proper structure"""
    
    async with aiohttp.ClientSession() as session:
        print(f"Testing API at: {API_BASE}")
        
        # Test 1: Health Check
        print("\n1. Testing Health Check...")
        try:
            async with session.get(f"{API_BASE}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Health check OK: {data.get('status')}")
                else:
                    print(f"❌ Health check failed: {response.status}")
        except Exception as e:
            print(f"❌ Health check error: {e}")
        
        # Test 2: Buy Transaction API Structure
        print("\n2. Testing Buy Transaction API Structure...")
        buy_payload = {
            "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "solAmount": 0.01,
            "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            "slippage": 25
        }
        
        try:
            async with session.post(f"{API_BASE}/sniper/buy", json=buy_payload) as response:
                response_text = await response.text()
                print(f"Buy API Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    if 'transaction' in data:
                        print("✅ Buy API returns 'transaction' field")
                    else:
                        print("❌ Buy API missing 'transaction' field")
                elif response.status == 400:
                    # Expected for non-pump.fun tokens, but check error structure
                    try:
                        error_data = await response.json()
                        print(f"⚠️  Buy API returns expected error structure: {error_data.get('detail', 'Unknown error')}")
                        print("✅ Buy API error handling works correctly")
                    except:
                        print("❌ Buy API error response not JSON")
                else:
                    print(f"❌ Buy API unexpected status: {response.status}")
                    
        except Exception as e:
            print(f"❌ Buy API error: {e}")
        
        # Test 3: Sell Transaction API Structure  
        print("\n3. Testing Sell Transaction API Structure...")
        sell_payload = {
            "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "tokenAmount": 1000000,
            "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            "slippage": 25
        }
        
        try:
            async with session.post(f"{API_BASE}/sniper/sell", json=sell_payload) as response:
                response_text = await response.text()
                print(f"Sell API Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    if 'transaction' in data:
                        print("✅ Sell API returns 'transaction' field")
                    else:
                        print("❌ Sell API missing 'transaction' field")
                elif response.status == 400:
                    # Expected for non-pump.fun tokens, but check error structure
                    try:
                        error_data = await response.json()
                        print(f"⚠️  Sell API returns expected error structure: {error_data.get('detail', 'Unknown error')}")
                        print("✅ Sell API error handling works correctly")
                    except:
                        print("❌ Sell API error response not JSON")
                else:
                    print(f"❌ Sell API unexpected status: {response.status}")
                    
        except Exception as e:
            print(f"❌ Sell API error: {e}")
        
        # Test 4: Positions CRUD
        print("\n4. Testing Positions CRUD...")
        test_position_id = str(uuid.uuid4())
        test_wallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        
        # Create Position
        position_payload = {
            "id": test_position_id,
            "wallet_address": test_wallet,
            "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "symbol": "TEST",
            "buy_amount": 0.1,
            "token_amount": 1000000,
            "buy_price": 0.0001,
            "status": "OPEN"
        }
        
        try:
            # CREATE
            async with session.post(f"{API_BASE}/sniper/positions", json=position_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Position CREATE works")
                else:
                    print(f"❌ Position CREATE failed: {response.status}")
            
            # READ
            async with session.get(f"{API_BASE}/sniper/positions/{test_wallet}") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        print("✅ Position READ works (returns list)")
                    else:
                        print("❌ Position READ doesn't return list")
                else:
                    print(f"❌ Position READ failed: {response.status}")
            
            # UPDATE
            update_payload = {"status": "CLOSED", "pnl": 10.5}
            async with session.put(f"{API_BASE}/sniper/positions/{test_position_id}", json=update_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Position UPDATE works")
                else:
                    print(f"❌ Position UPDATE failed: {response.status}")
                    
        except Exception as e:
            print(f"❌ Positions CRUD error: {e}")
        
        print("\n" + "="*50)
        print("🏁 API Structure Test Complete")
        print("="*50)

if __name__ == "__main__":
    asyncio.run(test_api_structure())