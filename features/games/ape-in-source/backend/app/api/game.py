from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import asyncio
import time
from app.database import get_db
from app.services import GameService

router = APIRouter()


class CreateGameRequest(BaseModel):
    mode: str
    playerName: str
    walletAddress: Optional[str] = None
    isDailyFree: Optional[bool] = False


class JoinGameRequest(BaseModel):
    playerName: str
    walletAddress: Optional[str] = None


@router.post("/create")
async def create_game(
    request: CreateGameRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new game"""
    print(f"🎮 Creating game: {request.mode} for player {request.playerName}")
    print(f"🎮 Request data: {request.dict()}")
    print(f"🎮 Database session: {db}")
    
    # Test database connection
    try:
        result = await db.execute(text("SELECT 1"))
        print(f"✅ Database connection test passed: {result}")
    except Exception as db_error:
        print(f"❌ Database connection test failed: {db_error}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {db_error}")
    
    service = GameService(db)
    
    # Retry logic for database lock issues
    max_retries = 3
    retry_delay = 0.1  # 100ms
    
    for attempt in range(max_retries):
        try:
            game_data = await service.create_game(
                mode=request.mode,
                player_name=request.playerName,
                wallet_address=request.walletAddress,
                is_daily_free=request.isDailyFree
            )
            print(f"✅ Game created successfully: {game_data.get('gameId', 'unknown')}")
            return game_data
        except Exception as e:
            error_str = str(e)
            print(f"❌ Game creation attempt {attempt + 1} failed: {error_str}")
            
            # Check if it's a database lock error
            if "database is locked" in error_str.lower() and attempt < max_retries - 1:
                print(f"🔄 Database locked, retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                print(f"❌ Error type: {type(e)}")
                import traceback
                print(f"❌ Traceback: {traceback.format_exc()}")
                raise HTTPException(status_code=500, detail=str(e))


@router.get("/{game_id}")
async def get_game(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get game state"""
    service = GameService(db)
    try:
        return await service.get_game_data(game_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Game not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{game_id}/draw")
async def draw_card(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Draw a card"""
    service = GameService(db)
    try:
        # Get game data to find player
        game_data = await service.get_game_data(game_id)
        
        # For now, assume first non-AI player
        from sqlalchemy import select
        from app.models import Player
        result = await db.execute(
            select(Player).where(
                Player.game_id == game_id,
                Player.is_ai == False
            )
        )
        player = result.scalar_one()
        
        card = await service.draw_card(game_id, player.id)
        return card.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{game_id}/draw")
async def draw_card(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Draw a card for the player"""
    service = GameService(db)
    try:
        # Get the player for this game
        from sqlalchemy import select
        result = await db.execute(
            select(Player).where(Player.game_id == game_id, Player.is_ai == False)
        )
        player = result.scalar_one_or_none()
        
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Draw a card
        card = await service.draw_card(game_id, player.id)
        return card.model_dump()
    except Exception as e:
        print(f"❌ Draw card failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{game_id}/roll")
async def roll_dice(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Roll dice"""
    service = GameService(db)
    try:
        # Get player
        from sqlalchemy import select
        from app.models import Player, Game
        result = await db.execute(
            select(Player).where(
                Player.game_id == game_id,
                Player.is_ai == False
            )
        )
        player = result.scalar_one()
        
        # Store turn score before roll to calculate sats gained
        result_player = await db.execute(
            select(Player).where(Player.id == player.id)
        )
        player_before = result_player.scalar_one()
        turn_score_before = player_before.turn_score
        
        roll, success, message = await service.roll_dice_action(
            game_id, player.id, dice_profile="balanced"
        )
        
        # Get updated turn score to calculate sats gained
        result_player_after = await db.execute(
            select(Player).where(Player.id == player.id)
        )
        player_after = result_player_after.scalar_one()
        sats_gained = player_after.turn_score - turn_score_before
        
        # If player busted or hit bearish penalty, end their turn via stack_sats first
        # This ensures consistent flow: player's turn officially ends before bot plays
        bot_actions = []
        if not success:
            # Stack player's sats (turn_score is 0 after bust, so nothing added)
            # This officially ends the player's turn
            await service.stack_sats(game_id, player.id, skip_ai_turn=True)
            
            # Get game to check if it's still playing
            result = await db.execute(
                select(Game).where(Game.id == game_id)
            )
            game = result.scalar_one()
            
            if game.status == "playing":
                # Now trigger AI turn and get action log
                bot_actions = await service._ai_play_turn(game_id)
            
            # Get fresh player data AFTER bot completes its turn
            result_player_final = await db.execute(
                select(Player).where(Player.id == player.id)
            )
            player_after = result_player_final.scalar_one()
        
        return {
            "value": roll,
            "success": success,
            "message": message,
            "satsGained": sats_gained,
            "turnScore": player_after.turn_score,
            "botActions": bot_actions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{game_id}/stack")
async def stack_sats(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Stack sats (end turn)"""
    service = GameService(db)
    try:
        # Get player
        from sqlalchemy import select
        from app.models import Player, Game
        result = await db.execute(
            select(Player).where(
                Player.game_id == game_id,
                Player.is_ai == False
            )
        )
        player = result.scalar_one()
        
        # Stack player's sats
        await service.stack_sats(game_id, player.id, skip_ai_turn=True)
        
        # Check if game is still playing
        result = await db.execute(
            select(Game).where(Game.id == game_id)
        )
        game = result.scalar_one()
        
        # If game is still playing, trigger AI turn and get actions
        bot_actions = []
        if game.status == "playing":
            bot_actions = await service._ai_play_turn(game_id)
        
        # Get fresh game data AFTER bot completes its turn
        game_data = await service.get_game_data(game_id)
        
        return {
            **game_data,
            "botActions": bot_actions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{game_id}/forfeit")
async def forfeit_game(
    game_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Forfeit the game"""
    try:
        from sqlalchemy import select
        from app.models import Game, Player
        
        result = await db.execute(
            select(Game).where(Game.id == game_id)
        )
        game = result.scalar_one()
        
        # Find opponent
        result = await db.execute(
            select(Player).where(
                Player.game_id == game_id,
                Player.is_ai == True
            )
        )
        opponent = result.scalar_one_or_none()
        
        game.status = "finished"
        game.winner_id = opponent.id if opponent else None
        
        await db.commit()
        
        return {"message": "Game forfeited"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
