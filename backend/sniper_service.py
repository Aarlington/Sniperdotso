"""
Sniper Service - Buy/Sell transactions for Pump.fun tokens
"""
import os
import json
import base64
import logging
from typing import Optional, Dict, Any
import struct
from pathlib import Path

import httpx
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.instruction import Instruction, AccountMeta
from solders.hash import Hash
from solders.message import Message
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

HELIUS_RPC_URL = os.environ.get('HELIUS_RPC_URL')
PUMP_FUN_PROGRAM_ID = Pubkey.from_string(os.environ.get('PUMP_FUN_PROGRAM_ID', '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'))

# Program addresses
GLOBAL_ACCOUNT_SEED = b"global"
BONDING_CURVE_SEED = b"bonding-curve"
MINT_AUTHORITY_SEED = b"mint-authority"

# Token program IDs
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
RENT_PROGRAM_ID = Pubkey.from_string("SysvarRent111111111111111111111111111111111")
EVENT_AUTHORITY = Pubkey.from_string("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1")


class SniperService:
    """Service to handle buy/sell operations for Pump.fun tokens"""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
    async def get_recent_blockhash(self) -> str:
        """Get recent blockhash from RPC"""
        response = await self.http_client.post(
            HELIUS_RPC_URL,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getLatestBlockhash",
                "params": [{"commitment": "confirmed"}]
            }
        )
        data = response.json()
        return data['result']['value']['blockhash']
        
    async def get_bonding_curve_account(self, mint: Pubkey) -> Optional[Dict[str, Any]]:
        """Get bonding curve account data"""
        # Derive bonding curve PDA
        bonding_curve_pda, _ = Pubkey.find_program_address(
            [BONDING_CURVE_SEED, bytes(mint)],
            PUMP_FUN_PROGRAM_ID
        )
        
        response = await self.http_client.post(
            HELIUS_RPC_URL,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getAccountInfo",
                "params": [
                    str(bonding_curve_pda),
                    {"encoding": "base64", "commitment": "confirmed"}
                ]
            }
        )
        data = response.json()
        
        if not data.get('result', {}).get('value'):
            return None
            
        account_data = base64.b64decode(data['result']['value']['data'][0])
        
        # Parse bonding curve account
        # Layout: discriminator(8) + virtualTokenReserves(8) + virtualSolReserves(8) + 
        #         realTokenReserves(8) + realSolReserves(8) + tokenTotalSupply(8) + complete(1)
        offset = 8  # Skip discriminator
        virtual_token_reserves = struct.unpack('<Q', account_data[offset:offset+8])[0]
        offset += 8
        virtual_sol_reserves = struct.unpack('<Q', account_data[offset:offset+8])[0]
        offset += 8
        real_token_reserves = struct.unpack('<Q', account_data[offset:offset+8])[0]
        offset += 8
        real_sol_reserves = struct.unpack('<Q', account_data[offset:offset+8])[0]
        offset += 8
        token_total_supply = struct.unpack('<Q', account_data[offset:offset+8])[0]
        offset += 8
        complete = account_data[offset] == 1
        
        return {
            'address': str(bonding_curve_pda),
            'virtualTokenReserves': virtual_token_reserves,
            'virtualSolReserves': virtual_sol_reserves,
            'realTokenReserves': real_token_reserves,
            'realSolReserves': real_sol_reserves,
            'tokenTotalSupply': token_total_supply,
            'complete': complete,
        }
        
    async def get_global_account(self) -> Optional[Dict[str, Any]]:
        """Get global account data for fee recipient"""
        global_pda, _ = Pubkey.find_program_address(
            [GLOBAL_ACCOUNT_SEED],
            PUMP_FUN_PROGRAM_ID
        )
        
        response = await self.http_client.post(
            HELIUS_RPC_URL,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getAccountInfo",
                "params": [
                    str(global_pda),
                    {"encoding": "base64", "commitment": "confirmed"}
                ]
            }
        )
        data = response.json()
        
        if not data.get('result', {}).get('value'):
            return None
            
        account_data = base64.b64decode(data['result']['value']['data'][0])
        
        # Parse global account to get fee recipient
        # Layout: discriminator(8) + initialized(1) + authority(32) + feeRecipient(32) + ...
        offset = 8 + 1 + 32  # Skip to feeRecipient
        fee_recipient = Pubkey.from_bytes(account_data[offset:offset+32])
        
        return {
            'address': str(global_pda),
            'feeRecipient': str(fee_recipient),
        }
        
    def calculate_buy_price(self, bonding_curve: Dict, sol_amount: int) -> int:
        """Calculate how many tokens you get for SOL amount"""
        virtual_sol = bonding_curve['virtualSolReserves']
        virtual_token = bonding_curve['virtualTokenReserves']
        real_token = bonding_curve['realTokenReserves']
        
        if bonding_curve['complete']:
            raise ValueError("Bonding curve is complete")
            
        # AMM formula: k = x * y
        k = virtual_sol * virtual_token
        new_virtual_sol = virtual_sol + sol_amount
        new_virtual_token = k // new_virtual_sol + 1
        tokens_out = virtual_token - new_virtual_token
        
        return min(tokens_out, real_token)
        
    def calculate_sell_price(self, bonding_curve: Dict, token_amount: int) -> int:
        """Calculate minimum SOL output for selling tokens"""
        virtual_sol = bonding_curve['virtualSolReserves']
        virtual_token = bonding_curve['virtualTokenReserves']
        
        if bonding_curve['complete']:
            raise ValueError("Bonding curve is complete")
            
        # AMM formula for sell: n = (amount * virtualSol) / (virtualToken + amount)
        n = (token_amount * virtual_sol) // (virtual_token + token_amount)
        
        # Calculate fee (1%)
        # Fee basis points is typically 100 (1%)
        fee_bps = 100 
        fee = (n * fee_bps) // 10000
        
        return n - fee

    def calculate_slippage(self, amount: int, slippage_bps: int) -> int:
        """Calculate amount with slippage"""
        return amount + (amount * slippage_bps) // 10000

    async def create_sell_transaction(
        self,
        mint_address: str,
        seller_address: str,
        token_amount: int,
        slippage_percent: int = 25
    ) -> Optional[str]:
        """Create a sell transaction for a Pump.fun token"""
        try:
            mint = Pubkey.from_string(mint_address)
            seller = Pubkey.from_string(seller_address)
            
            # Get bonding curve data
            bonding_curve = await self.get_bonding_curve_account(mint)
            if not bonding_curve:
                raise ValueError("Token not found")
                
            # Get global account for fee recipient
            global_account = await self.get_global_account()
            if not global_account:
                raise ValueError("Could not get global account")
                
            # Calculate min SOL output with slippage
            min_sol_output = self.calculate_sell_price(bonding_curve, token_amount)
            slippage_bps = slippage_percent * 100
            min_sol_with_slippage = min_sol_output - (min_sol_output * slippage_bps) // 10000
            
            # Derive PDAs
            bonding_curve_pda = Pubkey.from_string(bonding_curve['address'])
            fee_recipient = Pubkey.from_string(global_account['feeRecipient'])
            global_pda = Pubkey.from_string(global_account['address'])
            
            # Get associated token accounts
            associated_bonding_curve = self.get_associated_token_address(mint, bonding_curve_pda)
            associated_user = self.get_associated_token_address(mint, seller)
            
            # Build sell instruction
            # Discriminator for 'sell': [51, 230, 133, 164, 1, 127, 131, 173]
            sell_discriminator = bytes([51, 230, 133, 164, 1, 127, 131, 173])
            instruction_data = sell_discriminator + struct.pack('<Q', token_amount) + struct.pack('<Q', min_sol_with_slippage)
            
            accounts = [
                AccountMeta(global_pda, is_signer=False, is_writable=False),
                AccountMeta(fee_recipient, is_signer=False, is_writable=True),
                AccountMeta(mint, is_signer=False, is_writable=False),
                AccountMeta(bonding_curve_pda, is_signer=False, is_writable=True),
                AccountMeta(associated_bonding_curve, is_signer=False, is_writable=True),
                AccountMeta(associated_user, is_signer=False, is_writable=True),
                AccountMeta(seller, is_signer=True, is_writable=True),
                AccountMeta(SYS_PROGRAM_ID, is_signer=False, is_writable=False),
                AccountMeta(ASSOCIATED_TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
                AccountMeta(TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
                AccountMeta(EVENT_AUTHORITY, is_signer=False, is_writable=False),
                AccountMeta(PUMP_FUN_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            sell_ix = Instruction(PUMP_FUN_PROGRAM_ID, instruction_data, accounts)
            
            instructions = [sell_ix]
            
            # Get recent blockhash
            blockhash = await self.get_recent_blockhash()
            
            # Create transaction
            message = Message.new_with_blockhash(
                instructions,
                seller,
                Hash.from_string(blockhash)
            )
            
            tx = Transaction.new_unsigned(message)
            
            return base64.b64encode(bytes(tx)).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Error creating sell transaction: {e}")
            raise

    async def create_buy_transaction(
        self,
        mint_address: str,
        buyer_address: str,
        sol_amount: float,
        slippage_percent: int = 25
    ) -> Optional[str]:
        """Create a buy transaction for a Pump.fun token"""
        try:
            mint = Pubkey.from_string(mint_address)
            buyer = Pubkey.from_string(buyer_address)
            sol_lamports = int(sol_amount * 1e9)  # Convert SOL to lamports
            
            # Get bonding curve data
            bonding_curve = await self.get_bonding_curve_account(mint)
            if not bonding_curve:
                raise ValueError("Token not found or bonding curve complete")
                
            if bonding_curve['complete']:
                raise ValueError("Bonding curve is complete, use Raydium instead")
                
            # Get global account for fee recipient
            global_account = await self.get_global_account()
            if not global_account:
                raise ValueError("Could not get global account")
                
            # Calculate token amount with slippage
            token_amount = self.calculate_buy_price(bonding_curve, sol_lamports)
            slippage_bps = slippage_percent * 100
            max_sol_cost = self.calculate_slippage(sol_lamports, slippage_bps)
            
            # Derive PDAs
            bonding_curve_pda = Pubkey.from_string(bonding_curve['address'])
            fee_recipient = Pubkey.from_string(global_account['feeRecipient'])
            global_pda = Pubkey.from_string(global_account['address'])
            
            # Get associated token accounts
            associated_bonding_curve = self.get_associated_token_address(mint, bonding_curve_pda)
            associated_user = self.get_associated_token_address(mint, buyer)
            
            # Build buy instruction
            # Discriminator for 'buy': [102, 6, 61, 18, 1, 218, 235, 234]
            buy_discriminator = bytes([102, 6, 61, 18, 1, 218, 235, 234])
            instruction_data = buy_discriminator + struct.pack('<Q', token_amount) + struct.pack('<Q', max_sol_cost)
            
            accounts = [
                AccountMeta(global_pda, is_signer=False, is_writable=False),
                AccountMeta(fee_recipient, is_signer=False, is_writable=True),
                AccountMeta(mint, is_signer=False, is_writable=False),
                AccountMeta(bonding_curve_pda, is_signer=False, is_writable=True),
                AccountMeta(associated_bonding_curve, is_signer=False, is_writable=True),
                AccountMeta(associated_user, is_signer=False, is_writable=True),
                AccountMeta(buyer, is_signer=True, is_writable=True),
                AccountMeta(SYS_PROGRAM_ID, is_signer=False, is_writable=False),
                AccountMeta(TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
                AccountMeta(RENT_PROGRAM_ID, is_signer=False, is_writable=False),
                AccountMeta(EVENT_AUTHORITY, is_signer=False, is_writable=False),
                AccountMeta(PUMP_FUN_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            buy_ix = Instruction(PUMP_FUN_PROGRAM_ID, instruction_data, accounts)
            
            # Check if user ATA exists, if not add create instruction
            ata_exists = await self.check_account_exists(str(associated_user))
            
            instructions = []
            if not ata_exists:
                create_ata_ix = self.create_associated_token_account_instruction(
                    buyer, buyer, mint
                )
                instructions.append(create_ata_ix)
                
            instructions.append(buy_ix)
            
            # Get recent blockhash
            blockhash = await self.get_recent_blockhash()
            
            # Create transaction
            message = Message.new_with_blockhash(
                instructions,
                buyer,
                Hash.from_string(blockhash)
            )
            
            tx = Transaction.new_unsigned(message)
            
            # Return base64 encoded transaction for client to sign
            return base64.b64encode(bytes(tx)).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Error creating buy transaction: {e}")
            raise
            
    async def check_account_exists(self, address: str) -> bool:
        """Check if an account exists"""
        response = await self.http_client.post(
            HELIUS_RPC_URL,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getAccountInfo",
                "params": [address, {"commitment": "confirmed"}]
            }
        )
        data = response.json()
        return data.get('result', {}).get('value') is not None
        
    def get_associated_token_address(self, mint: Pubkey, owner: Pubkey) -> Pubkey:
        """Get the associated token address for a mint and owner"""
        ata, _ = Pubkey.find_program_address(
            [bytes(owner), bytes(TOKEN_PROGRAM_ID), bytes(mint)],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
        return ata
        
    def create_associated_token_account_instruction(
        self,
        payer: Pubkey,
        owner: Pubkey,
        mint: Pubkey
    ) -> Instruction:
        """Create an instruction to create an associated token account"""
        ata = self.get_associated_token_address(mint, owner)
        
        accounts = [
            AccountMeta(payer, is_signer=True, is_writable=True),
            AccountMeta(ata, is_signer=False, is_writable=True),
            AccountMeta(owner, is_signer=False, is_writable=False),
            AccountMeta(mint, is_signer=False, is_writable=False),
            AccountMeta(SYS_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
        ]
        
        return Instruction(ASSOCIATED_TOKEN_PROGRAM_ID, bytes(), accounts)


# Global instance
sniper_service = SniperService()
