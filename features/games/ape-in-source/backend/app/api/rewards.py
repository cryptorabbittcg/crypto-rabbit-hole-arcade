from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.rewards_service import RewardsService

router = APIRouter()

@router.get("/pool/stats")
async def get_rewards_pool_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get current rewards pool statistics"""
    try:
        service = RewardsService(db)
        stats = await service.get_rewards_pool_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/player/{wallet_address}/payments")
async def get_player_payment_history(
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Get payment history for a specific player"""
    try:
        service = RewardsService(db)
        history = await service.get_player_payment_history(wallet_address)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
