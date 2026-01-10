from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.rewards import RewardsPool, GamePayment
import uuid
from datetime import datetime

class RewardsService:
    """Service for managing rewards pool and game payments"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_game_payment(
        self, 
        game_id: str, 
        player_id: str, 
        wallet_address: str, 
        amount_apecoin: float, 
        game_mode: str
    ) -> Dict:
        """Record a game payment and update rewards pool"""
        
        # Create payment record
        payment = GamePayment(
            id=str(uuid.uuid4()),
            game_id=game_id,
            player_id=player_id,
            wallet_address=wallet_address,
            amount_apecoin=amount_apecoin,
            game_mode=game_mode
        )
        self.db.add(payment)
        
        # Update or create rewards pool
        result = await self.db.execute(
            select(RewardsPool).where(RewardsPool.id == "main")
        )
        pool = result.scalar_one_or_none()
        
        if not pool:
            pool = RewardsPool(
                id="main",
                total_apecoin_collected=0.0,
                total_games_played=0
            )
            self.db.add(pool)
        
        pool.total_apecoin_collected += amount_apecoin
        pool.total_games_played += 1
        pool.updated_at = datetime.utcnow()
        
        await self.db.commit()
        
        return {
            "payment_id": payment.id,
            "amount": amount_apecoin,
            "total_pool": pool.total_apecoin_collected,
            "total_games": pool.total_games_played
        }

    async def get_rewards_pool_stats(self) -> Dict:
        """Get current rewards pool statistics"""
        result = await self.db.execute(
            select(RewardsPool).where(RewardsPool.id == "main")
        )
        pool = result.scalar_one_or_none()
        
        if not pool:
            return {
                "total_apecoin_collected": 0.0,
                "total_games_played": 0,
                "average_per_game": 0.0
            }
        
        return {
            "total_apecoin_collected": pool.total_apecoin_collected,
            "total_games_played": pool.total_games_played,
            "average_per_game": pool.total_apecoin_collected / pool.total_games_played if pool.total_games_played > 0 else 0.0
        }

    async def get_player_payment_history(self, wallet_address: str) -> Dict:
        """Get payment history for a specific player"""
        result = await self.db.execute(
            select(GamePayment).where(GamePayment.wallet_address == wallet_address)
            .order_by(GamePayment.created_at.desc())
        )
        payments = result.scalars().all()
        
        total_spent = sum(p.amount_apecoin for p in payments)
        
        return {
            "total_payments": len(payments),
            "total_spent": total_spent,
            "payments": [
                {
                    "game_id": p.game_id,
                    "amount": p.amount_apecoin,
                    "game_mode": p.game_mode,
                    "created_at": p.created_at.isoformat()
                }
                for p in payments
            ]
        }
