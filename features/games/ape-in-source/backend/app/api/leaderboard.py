from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import LeaderboardEntry
from app.services.leaderboard_service import LeaderboardService

router = APIRouter()


@router.get("/")
async def get_leaderboard(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get leaderboard entries with enhanced data"""
    try:
        service = LeaderboardService(db)
        leaderboard = await service.get_top_players(limit)
        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/player/{wallet_address}")
async def get_player_stats(
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Get specific player's stats"""
    try:
        service = LeaderboardService(db)
        stats = await service.get_player_stats(wallet_address)
        if not stats:
            raise HTTPException(status_code=404, detail="Player not found")
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_leaderboard_summary(
    db: AsyncSession = Depends(get_db)
):
    """Get leaderboard summary statistics"""
    try:
        service = LeaderboardService(db)
        summary = await service.get_leaderboard_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zkverify")
async def get_zkverify_data(
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get leaderboard data formatted for zkVerify integration"""
    try:
        service = LeaderboardService(db)
        zkverify_data = await service.generate_zkverify_data(limit)
        return zkverify_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




