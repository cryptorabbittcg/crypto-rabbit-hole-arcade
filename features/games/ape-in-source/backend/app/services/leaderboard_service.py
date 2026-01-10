"""
Leaderboard Service - Handles leaderboard operations with validation and zkVerify preparation
"""

from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models import LeaderboardEntry, Player, Game
import hashlib
import json
from datetime import datetime


class LeaderboardService:
    """Service for managing leaderboard operations with validation"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_player_stats(self, player: Player, won: bool, game_score: int) -> Dict:
        """Update player stats in leaderboard with validation"""
        if not player.wallet_address:
            return {"error": "Player has no wallet address"}

        try:
            # Get or create leaderboard entry
            result = await self.db.execute(
                select(LeaderboardEntry).where(
                    LeaderboardEntry.wallet_address == player.wallet_address
                )
            )
            entry = result.scalar_one_or_none()

            if not entry:
                entry = LeaderboardEntry(
                    player_name=player.name,
                    wallet_address=player.wallet_address,
                    total_wins=0,
                    total_losses=0,
                    total_games=0,
                    high_score=0,
                    total_score=0
                )
                self.db.add(entry)
                await self.db.flush()

            # Safely handle None values
            total_games = entry.total_games or 0
            total_wins = entry.total_wins or 0
            total_losses = entry.total_losses or 0
            high_score = entry.high_score or 0
            total_score = entry.total_score or 0

            # Update stats
            entry.total_games = total_games + 1
            if won:
                entry.total_wins = total_wins + 1
            else:
                entry.total_losses = total_losses + 1

            # Update high score
            if game_score > high_score:
                entry.high_score = game_score

            # Add to total score
            entry.total_score = total_score + game_score

            # Validate data integrity
            validation_result = self._validate_entry(entry)
            if not validation_result["valid"]:
                raise ValueError(f"Leaderboard validation failed: {validation_result['errors']}")

            return {
                "success": True,
                "player_name": entry.player_name,
                "wallet_address": entry.wallet_address,
                "total_games": entry.total_games,
                "total_wins": entry.total_wins,
                "total_losses": entry.total_losses,
                "high_score": entry.high_score,
                "total_score": entry.total_score
            }

        except Exception as e:
            return {"error": str(e)}

    def _validate_entry(self, entry: LeaderboardEntry) -> Dict:
        """Validate leaderboard entry data integrity"""
        errors = []
        
        # Check for negative values
        if entry.total_games < 0:
            errors.append("total_games cannot be negative")
        if entry.total_wins < 0:
            errors.append("total_wins cannot be negative")
        if entry.total_losses < 0:
            errors.append("total_losses cannot be negative")
        if entry.high_score < 0:
            errors.append("high_score cannot be negative")
        if entry.total_score < 0:
            errors.append("total_score cannot be negative")
        
        # Check logical consistency
        if entry.total_wins + entry.total_losses > entry.total_games:
            errors.append("wins + losses cannot exceed total games")
        
        if entry.total_wins < 0 or entry.total_losses < 0:
            errors.append("wins and losses cannot be negative")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }

    async def get_top_players(self, limit: int = 100) -> List[Dict]:
        """Get top players by wins, then by high score"""
        result = await self.db.execute(
            select(LeaderboardEntry)
            .order_by(
                desc(LeaderboardEntry.total_wins),
                desc(LeaderboardEntry.high_score),
                desc(LeaderboardEntry.total_score)
            )
            .limit(limit)
        )
        entries = result.scalars().all()
        
        return [
            {
                "rank": idx + 1,
                "player_name": entry.player_name,
                "wallet_address": entry.wallet_address,
                "total_wins": entry.total_wins or 0,
                "total_losses": entry.total_losses or 0,
                "total_games": entry.total_games or 0,
                "high_score": entry.high_score or 0,
                "total_score": entry.total_score or 0,
                "win_rate": round((entry.total_wins or 0) / max(entry.total_games or 1, 1) * 100, 2)
            }
            for idx, entry in enumerate(entries)
        ]

    async def get_player_stats(self, wallet_address: str) -> Optional[Dict]:
        """Get specific player's stats"""
        result = await self.db.execute(
            select(LeaderboardEntry).where(
                LeaderboardEntry.wallet_address == wallet_address
            )
        )
        entry = result.scalar_one_or_none()
        
        if not entry:
            return None
        
        return {
            "player_name": entry.player_name,
            "wallet_address": entry.wallet_address,
            "total_wins": entry.total_wins or 0,
            "total_losses": entry.total_losses or 0,
            "total_games": entry.total_games or 0,
            "high_score": entry.high_score or 0,
            "total_score": entry.total_score or 0,
            "win_rate": round((entry.total_wins or 0) / max(entry.total_games or 1, 1) * 100, 2),
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat()
        }

    async def generate_zkverify_data(self, limit: int = 100) -> Dict:
        """Generate leaderboard data for zkVerify integration"""
        players = await self.get_top_players(limit)
        
        # Create a hash of the leaderboard data for verification
        data_string = json.dumps(players, sort_keys=True)
        data_hash = hashlib.sha256(data_string.encode()).hexdigest()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "data_hash": data_hash,
            "total_players": len(players),
            "leaderboard": players
        }

    async def get_leaderboard_summary(self) -> Dict:
        """Get summary statistics for the leaderboard"""
        result = await self.db.execute(
            select(
                func.count(LeaderboardEntry.id).label('total_players'),
                func.sum(LeaderboardEntry.total_games).label('total_games_played'),
                func.sum(LeaderboardEntry.total_wins).label('total_wins'),
                func.max(LeaderboardEntry.high_score).label('highest_score')
            )
        )
        summary = result.first()
        
        return {
            "total_players": summary.total_players or 0,
            "total_games_played": summary.total_games_played or 0,
            "total_wins": summary.total_wins or 0,
            "highest_score": summary.highest_score or 0,
            "last_updated": datetime.utcnow().isoformat()
        }
