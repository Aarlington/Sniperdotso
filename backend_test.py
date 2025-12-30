#!/usr/bin/env python3
"""
Backend API Testing for Sniper Service
Tests the Buy/Sell transaction endpoints and Positions CRUD operations
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
import os
from pathlib import Path

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

print(f"Testing backend at: {API_BASE}")

class SniperAPITester:
    def __init__(self):
        self.session = None
        self.test_results = {
            'buy_transaction': {'passed': False, 'error': None},
            'sell_transaction': {'passed': False, 'error': None},
            'positions_create': {'passed': False, 'error': None},
            'positions_get': {'passed': False, 'error': None},
            'positions_update': {'passed': False, 'error': None}
        }
        
        # Test data - using realistic Solana addresses
        self.test_mint = "So11111111111111111111111111111111111111112"  # Wrapped SOL
        self.test_wallet = "11111111111111111111111111111111"  # System program (valid pubkey format)
        self.test_position_id = str(uuid.uuid4())
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_health_check(self):
        """Test if the API is responding"""
        try:
            async with self.session.get(f"{API_BASE}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Health check passed: {data}")
                    return True
                else:
                    print(f"❌ Health check failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    async def test_buy_transaction(self):
        """Test /api/sniper/buy endpoint"""
        print("\n🧪 Testing Buy Transaction Endpoint...")
        
        try:
            payload = {
                "mint": self.test_mint,
                "solAmount": 0.1,
                "walletAddress": self.test_wallet,
                "slippage": 25
            }
            
            async with self.session.post(f"{API_BASE}/sniper/buy", json=payload) as response:
                response_text = await response.text()
                print(f"Buy response status: {response.status}")
                print(f"Buy response: {response_text[:200]}...")
                
                if response.status == 200:
                    data = await response.json()
                    if 'transaction' in data and data['transaction']:
                        print("✅ Buy transaction endpoint working - returns transaction field")
                        self.test_results['buy_transaction']['passed'] = True
                        return True
                    else:
                        error = "Response missing 'transaction' field"
                        print(f"❌ Buy transaction failed: {error}")
                        self.test_results['buy_transaction']['error'] = error
                        return False
                else:
                    error = f"HTTP {response.status}: {response_text}"
                    print(f"❌ Buy transaction failed: {error}")
                    self.test_results['buy_transaction']['error'] = error
                    return False
                    
        except Exception as e:
            error = str(e)
            print(f"❌ Buy transaction error: {error}")
            self.test_results['buy_transaction']['error'] = error
            return False
    
    async def test_sell_transaction(self):
        """Test /api/sniper/sell endpoint"""
        print("\n🧪 Testing Sell Transaction Endpoint...")
        
        try:
            payload = {
                "mint": self.test_mint,
                "tokenAmount": 1000000,  # 1 token with 6 decimals
                "walletAddress": self.test_wallet,
                "slippage": 25
            }
            
            async with self.session.post(f"{API_BASE}/sniper/sell", json=payload) as response:
                response_text = await response.text()
                print(f"Sell response status: {response.status}")
                print(f"Sell response: {response_text[:200]}...")
                
                if response.status == 200:
                    data = await response.json()
                    if 'transaction' in data and data['transaction']:
                        print("✅ Sell transaction endpoint working - returns transaction field")
                        self.test_results['sell_transaction']['passed'] = True
                        return True
                    else:
                        error = "Response missing 'transaction' field"
                        print(f"❌ Sell transaction failed: {error}")
                        self.test_results['sell_transaction']['error'] = error
                        return False
                else:
                    error = f"HTTP {response.status}: {response_text}"
                    print(f"❌ Sell transaction failed: {error}")
                    self.test_results['sell_transaction']['error'] = error
                    return False
                    
        except Exception as e:
            error = str(e)
            print(f"❌ Sell transaction error: {error}")
            self.test_results['sell_transaction']['error'] = error
            return False
    
    async def test_positions_create(self):
        """Test POST /api/sniper/positions endpoint"""
        print("\n🧪 Testing Create Position Endpoint...")
        
        try:
            payload = {
                "id": self.test_position_id,
                "wallet_address": self.test_wallet,
                "mint": self.test_mint,
                "symbol": "TEST",
                "buy_amount": 0.1,
                "token_amount": 1000000,
                "buy_price": 0.0001,
                "status": "OPEN",
                "tp_percent": 50.0,
                "sl_percent": 20.0,
                "pnl": 0.0
            }
            
            async with self.session.post(f"{API_BASE}/sniper/positions", json=payload) as response:
                response_text = await response.text()
                print(f"Create position response status: {response.status}")
                print(f"Create position response: {response_text[:200]}...")
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('id') == self.test_position_id:
                        print("✅ Create position endpoint working")
                        self.test_results['positions_create']['passed'] = True
                        return True
                    else:
                        error = "Created position ID doesn't match"
                        print(f"❌ Create position failed: {error}")
                        self.test_results['positions_create']['error'] = error
                        return False
                else:
                    error = f"HTTP {response.status}: {response_text}"
                    print(f"❌ Create position failed: {error}")
                    self.test_results['positions_create']['error'] = error
                    return False
                    
        except Exception as e:
            error = str(e)
            print(f"❌ Create position error: {error}")
            self.test_results['positions_create']['error'] = error
            return False
    
    async def test_positions_get(self):
        """Test GET /api/sniper/positions/{wallet_address} endpoint"""
        print("\n🧪 Testing Get Positions Endpoint...")
        
        try:
            async with self.session.get(f"{API_BASE}/sniper/positions/{self.test_wallet}") as response:
                response_text = await response.text()
                print(f"Get positions response status: {response.status}")
                print(f"Get positions response: {response_text[:200]}...")
                
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        # Check if our test position is in the list
                        found_position = any(pos.get('id') == self.test_position_id for pos in data)
                        if found_position:
                            print("✅ Get positions endpoint working - found test position")
                        else:
                            print("✅ Get positions endpoint working - returns list format")
                        self.test_results['positions_get']['passed'] = True
                        return True
                    else:
                        error = "Response is not a list"
                        print(f"❌ Get positions failed: {error}")
                        self.test_results['positions_get']['error'] = error
                        return False
                else:
                    error = f"HTTP {response.status}: {response_text}"
                    print(f"❌ Get positions failed: {error}")
                    self.test_results['positions_get']['error'] = error
                    return False
                    
        except Exception as e:
            error = str(e)
            print(f"❌ Get positions error: {error}")
            self.test_results['positions_get']['error'] = error
            return False
    
    async def test_positions_update(self):
        """Test PUT /api/sniper/positions/{position_id} endpoint"""
        print("\n🧪 Testing Update Position Endpoint...")
        
        try:
            update_payload = {
                "status": "CLOSED",
                "pnl": 15.5
            }
            
            async with self.session.put(f"{API_BASE}/sniper/positions/{self.test_position_id}", json=update_payload) as response:
                response_text = await response.text()
                print(f"Update position response status: {response.status}")
                print(f"Update position response: {response_text[:200]}...")
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('status') == 'CLOSED' and data.get('pnl') == 15.5:
                        print("✅ Update position endpoint working")
                        self.test_results['positions_update']['passed'] = True
                        return True
                    else:
                        error = "Updated position doesn't reflect changes"
                        print(f"❌ Update position failed: {error}")
                        self.test_results['positions_update']['error'] = error
                        return False
                else:
                    error = f"HTTP {response.status}: {response_text}"
                    print(f"❌ Update position failed: {error}")
                    self.test_results['positions_update']['error'] = error
                    return False
                    
        except Exception as e:
            error = str(e)
            print(f"❌ Update position error: {error}")
            self.test_results['positions_update']['error'] = error
            return False
    
    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Sniper API Tests...")
        print("=" * 50)
        
        # Test health first
        health_ok = await self.test_health_check()
        if not health_ok:
            print("❌ Backend not responding, aborting tests")
            return self.test_results
        
        # Run all sniper tests
        await self.test_buy_transaction()
        await self.test_sell_transaction()
        await self.test_positions_create()
        await self.test_positions_get()
        await self.test_positions_update()
        
        return self.test_results
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results.values() if result['passed'])
        total = len(self.test_results)
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result['passed'] else "❌ FAIL"
            print(f"{test_name}: {status}")
            if not result['passed'] and result['error']:
                print(f"  Error: {result['error']}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed - check errors above")

async def main():
    """Main test runner"""
    async with SniperAPITester() as tester:
        results = await tester.run_all_tests()
        tester.print_summary()
        return results

if __name__ == "__main__":
    results = asyncio.run(main())