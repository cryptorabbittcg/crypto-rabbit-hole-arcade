from typing import Dict, List, Optional, Tuple
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Game, Player, GameState, LeaderboardEntry
from app.game_logic import (
    Card,
    draw_weighted_card,
    apply_ape_in_effect,
    roll_dice,
    check_bust,
)
from app.config import settings
from app.services.rewards_service import RewardsService
from app.services.leaderboard_service import LeaderboardService


class GameService:
    """Service for managing game logic and state"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.rewards_service = RewardsService(db)
        self.leaderboard_service = LeaderboardService(db)

    async def create_game(
        self,
        mode: str,
        player_name: str,
        wallet_address: Optional[str] = None,
        is_daily_free: bool = False
    ) -> Dict:
        """Create a new game"""
        # Get bot-specific configuration
        bot_config = settings.BOT_CONFIGS.get(mode, {})
        winning_score = bot_config.get("winning_score", settings.MAX_SCORE)
        max_rounds = bot_config.get("max_rounds", settings.MAX_ROUNDS)
        
        # Create game
        game = Game(
            mode=mode,
            status="waiting" if mode in ["pvp", "multiplayer"] else "playing",
            winning_score=winning_score,
            max_rounds=max_rounds
        )
        self.db.add(game)
        await self.db.flush()

        # Create player
        player = Player(
            game_id=game.id,
            name=player_name,
            wallet_address=wallet_address,
            is_ai=False
        )
        self.db.add(player)
        await self.db.flush()  # Flush to get player.id

        # Create AI opponent if single-player mode
        if mode in ["sandy", "aida", "lana", "enj1n", "nifty"]:
            bot_name = bot_config.get("name", mode.capitalize())
            ai_player = Player(
                game_id=game.id,
                name=bot_name,
                is_ai=True,
                ai_type=mode
            )
            self.db.add(ai_player)
            game.status = "playing"

        # Create game state
        game_state = GameState(
            game_id=game.id,
            current_player_id=player.id,  # Now player.id is guaranteed to be set
            used_bearish_flags=[],
            game_log=[]
        )
        self.db.add(game_state)

        # Record payment for non-Sandy games (but not for daily free games)
        if mode != "sandy" and wallet_address and not is_daily_free:
            bot_config = settings.BOT_CONFIGS.get(mode, {})
            game_price = 0.10  # Default price for paid games
            
            await self.rewards_service.record_game_payment(
                game_id=game.id,
                player_id=player.id,
                wallet_address=wallet_address,
                amount_apecoin=game_price,
                game_mode=mode
            )

        await self.db.commit()
        await self.db.refresh(game)

        return await self.get_game_data(game.id)

    async def get_game_data(self, game_id: str) -> Dict:
        """Get complete game data"""
        result = await self.db.execute(
            select(Game).where(Game.id == game_id)
        )
        game = result.scalar_one_or_none()
        
        if not game:
            raise ValueError("Game not found")

        # Get players
        result = await self.db.execute(
            select(Player).where(Player.game_id == game_id)
        )
        players = result.scalars().all()

        # Get game state
        result = await self.db.execute(
            select(GameState).where(GameState.game_id == game_id)
        )
        state = result.scalar_one_or_none()

        # Find human player and opponent
        human_player = next((p for p in players if not p.is_ai), None)
        opponent = next((p for p in players if p.is_ai or p.id != human_player.id), None)

        # Get winner name instead of ID
        winner_name = None
        if game.winner_id:
            winner_player = next((p for p in players if p.id == game.winner_id), None)
            winner_name = winner_player.name if winner_player else None

        # Check if this game mode has unlimited rounds
        bot_config = settings.BOT_CONFIGS.get(game.mode, {})
        no_round_limit = bot_config.get("no_round_limit", False)
        
        return {
            "gameId": game.id,
            "mode": game.mode,
            "status": game.status,
            "playerScore": human_player.score if human_player else 0,
            "opponentScore": opponent.score if opponent else 0,
            "playerTurnScore": human_player.turn_score if human_player else 0,
            "opponentTurnScore": opponent.turn_score if opponent else 0,
            "currentCard": state.current_card if state else None,
            "lastRoll": state.last_roll if state else None,
            "roundCount": game.current_round,
            "maxRounds": game.max_rounds,
            "unlimitedRounds": no_round_limit,
            "winningScore": game.winning_score,
            "isPlayerTurn": state.current_player_id == human_player.id if human_player and state else False,
            "gameStatus": game.status,
            "winner": winner_name,
            "apeInActive": state.ape_in_active if state else False,
        }

    async def draw_card(self, game_id: str, player_id: str) -> Card:
        """Draw a card for a player"""
        result = await self.db.execute(
            select(GameState).where(GameState.game_id == game_id)
        )
        state = result.scalar_one()

        # Get game mode for card weighting
        result = await self.db.execute(
            select(Game).where(Game.id == game_id)
        )
        game = result.scalar_one()

        # Check if last card was Ape In! to prevent consecutive Ape In! cards
        last_card_was_ape_in = False
        if state.current_card:
            last_card = Card(**state.current_card)
            last_card_was_ape_in = last_card.name == "Ape In!"

        # Draw a card (exclude Ape In! if last card was Ape In!)
        card = draw_weighted_card(state.used_bearish_flags, exclude_ape_in=last_card_was_ape_in, game_mode=game.mode)
        
        # Store card in state (this replaces any existing card)
        state.current_card = card.model_dump()
        
        # Activate Ape In effect if Ape In card is drawn
        if card.name == "Ape In!":
            state.ape_in_active = True
        
        await self.db.commit()
        return card

    async def roll_dice_action(
        self,
        game_id: str,
        player_id: str,
        dice_profile: str = "balanced"
    ) -> Tuple[int, bool, str]:
        """Roll dice and process result"""
        result = await self.db.execute(
            select(GameState).where(GameState.game_id == game_id)
        )
        state = result.scalar_one()

        result = await self.db.execute(
            select(Player).where(Player.id == player_id)
        )
        player = result.scalar_one()

        # Must have a current card
        if not state.current_card:
            raise ValueError("No card to roll for")

        current_card = Card(**state.current_card)
        
        # Roll dice
        roll = roll_dice(dice_profile)
        state.last_roll = roll

        # Check if Ape In is active
        was_ape_in_active = state.ape_in_active

        # Handle Bearish cards
        if current_card.type == "Bearish":
            # Check if penalty can be dodged (even roll)
            if roll % 2 == 0:
                # Dodged!
                if state.ape_in_active:
                    state.ape_in_active = False
                    message = "Dodged bearish!"
                    if was_ape_in_active:
                        message += " (Ape In! negated)"
                    return roll, True, message
                else:
                    state.used_bearish_flags.append(current_card.penalty)
                    state.current_card = None
                    await self.db.commit()
                    message = "Dodged bearish!"
                    if was_ape_in_active:
                        message += " (Ape In! negated)"
                    return roll, True, message
            else:
                # Apply penalty
                if current_card.penalty == "Reset":
                    player.score = 0
                    state.used_bearish_flags.append("Reset")
                elif current_card.penalty == "Half":
                    player.score = player.score // 2
                    state.used_bearish_flags.append("Half")
                elif current_card.penalty == "Minus10":
                    player.score = max(0, player.score - 10)
                    state.used_bearish_flags.append("Minus10")
                
                player.turn_score = 0
                state.current_card = None
                
                await self.db.commit()
                message = f"Hit by {current_card.penalty}!"
                if was_ape_in_active:
                    message += " (Ape In! negated)"
                return roll, False, message

        # Check bust
        if check_bust(roll):
            player.turn_score = 0
            state.current_card = None
            state.ape_in_active = False
            
            await self.db.commit()
            return roll, False, "Busted!"

        # Success - add card value to turn score
        card_value = current_card.value
        
        # Apply Ape In effect
        if state.ape_in_active:
            card_value *= 2
            state.ape_in_active = False

        player.turn_score += card_value
        state.current_card = None
        
        await self.db.commit()
        return roll, True, f"Added {card_value} sats to turn score!"

    async def stack_sats(self, game_id: str, player_id: str, skip_ai_turn: bool = False) -> Dict:
        """Stack sats (end turn)"""
        result = await self.db.execute(
            select(Player).where(Player.id == player_id)
        )
        player = result.scalar_one()

        result = await self.db.execute(
            select(Game).where(Game.id == game_id)
        )
        game = result.scalar_one()
        
        result = await self.db.execute(
            select(GameState).where(GameState.game_id == game_id)
        )
        state = result.scalar_one()

        # Add turn score to total score
        player.score += player.turn_score
        player.turn_score = 0

        # Check win condition
        if player.score >= game.winning_score:
            game.status = "finished"
            game.winner_id = player.id

        # Increment round ONLY when AI player completes their turn (bot's score is finalized)
        # This marks the end of a complete round (player turn + bot turn)
        if player.is_ai and game.status != "finished":
            game.current_round += 1

        # Check max rounds (only for games with round limits)
        bot_config = settings.BOT_CONFIGS.get(game.mode, {})
        no_round_limit = bot_config.get("no_round_limit", False)
        
        if not no_round_limit and game.current_round > game.max_rounds and game.status != "finished":
            game.status = "finished"
            # Determine winner
            result = await self.db.execute(
                select(Player).where(Player.game_id == game_id).order_by(Player.score.desc())
            )
            winner = result.scalars().first()
            game.winner_id = winner.id if winner else None

        await self.db.commit()

        # Update leaderboard after main transaction is committed (non-critical)
        if not player.is_ai and game.status == "finished":
            try:
                result = await self.leaderboard_service.update_player_stats(player, won=True, game_score=player.score)
                if result.get("success"):
                    await self.db.commit()  # Commit the leaderboard update
                    print(f"✅ Leaderboard updated successfully for {player.name}")
                else:
                    print(f"❌ Leaderboard update failed: {result.get('error')}")
            except Exception as e:
                print(f"❌ Warning: Failed to update leaderboard: {e}")
                await self.db.rollback()  # Rollback leaderboard changes if they fail
                # Continue with game flow even if leaderboard update fails

        # If AI opponent and human player just stacked, play AI turn
        if not skip_ai_turn and player.is_ai is False and game.status == "playing":
            await self._ai_play_turn(game_id)

        return await self.get_game_data(game_id)

    async def _ai_play_turn(self, game_id: str):
        """AI opponent plays their turn and return action log"""
        result = await self.db.execute(
            select(Player).where(Player.game_id == game_id, Player.is_ai == True)
        )
        ai_player = result.scalar_one_or_none()

        if not ai_player:
            return []

        result = await self.db.execute(
            select(Game).where(Game.id == game_id)
        )
        game = result.scalar_one()

        # AI decision logic based on type
        ai_type = ai_player.ai_type or "sandy"
        bot_config = settings.BOT_CONFIGS.get(ai_type, {})
        risk_cfg = bot_config.get("risk", {})
        jitter_cfg = bot_config.get("jitter", {"enabled": False, "pct": 0.0})
        dice_modes = bot_config.get("diceModes", [ai_type])
        no_round_limit = bot_config.get("no_round_limit", False)

        # Compute roundsLeft (respect no_round_limit)
        rounds_left = None if no_round_limit else max(0, game.max_rounds - game.current_round)

        # Per-match deterministic jitter factor based on game.id
        def get_jittered(value: float) -> float:
            if not value:
                return value
            if not jitter_cfg.get("enabled", False):
                return value
            pct = float(jitter_cfg.get("pct", 0.0))
            # Deterministic jitter from game.id hash
            seed = hash((game.id, ai_type)) % 10000
            rnd = (seed / 10000.0) * 2.0 - 1.0  # [-1, 1)
            return max(0.0, value * (1.0 + pct * rnd))

        # Adaptive scaling helper: increase probability when behind or low rounds left
        def scale_push(base_prob: float, behind_by: int) -> float:
            if base_prob <= 0.0:
                return 0.0
            prob = base_prob
            # scale by behindBy (every 25 sats behind adds ~5%)
            prob += max(0, behind_by) * 0.002
            # scale by rounds left (if nearing end, add up to +10%)
            if rounds_left is not None and rounds_left <= 3:
                prob += max(0, (3 - rounds_left + 1)) * 0.03
            return min(0.98, max(0.0, get_jittered(prob)))

        target_turn_score = self._get_ai_target_score(ai_type, ai_player, game)

        # Track actions for replay
        actions = []

        # AI draws and rolls with adaptive logic
        while True:
            # Draw card
            card = await self.draw_card(game_id, ai_player.id)
            
            # Special handling for Ape In card
            if card.name == "Ape In!":
                actions.append({
                    "type": "ape_in",
                    "card": card.model_dump(),
                    "message": "Ape In! activated"
                })
                # Don't clear the card immediately - let it stay visible
                # The card will be cleared when the next card is drawn
                continue  # AI continues to draw another card
            
            # Log the draw action
            actions.append({
                "type": "draw",
                "card": card.model_dump()
            })

            # Decide dice profile (conditional aggressive switch if behind or low rounds)
            # Fetch human score for context
            result = await self.db.execute(
                select(Player).where(Player.game_id == game_id, Player.is_ai == False)
            )
            human_player = result.scalar_one()
            behind_by_now = human_player.score - ai_player.score
            dice_profile = ai_type
            if len(dice_modes) > 1:
                # switch to aggressive when notably behind or low rounds
                if behind_by_now >= int(risk_cfg.get("behindGap", 999)) or (rounds_left is not None and rounds_left <= 2):
                    dice_profile = dice_modes[-1]
                else:
                    dice_profile = dice_modes[0]

            # Roll dice with selected profile
            roll, success, message = await self.roll_dice_action(
                game_id, ai_player.id, dice_profile=dice_profile
            )
            
            # Refresh ai_player to get updated turn_score
            result = await self.db.execute(
                select(Player).where(Player.id == ai_player.id)
            )
            ai_player = result.scalar_one()
            
            actions.append({
                "type": "roll",
                "value": roll,
                "success": success,
                "message": message,
                "turnScore": ai_player.turn_score,
                "diceProfile": dice_profile
            })

            if not success:
                # AI busted or hit bearish
                break
            
            # Helper for opponent-aware nudge: if player currently far ahead, push more
            opponent_push_nudge = 0.0
            if behind_by_now >= 30:
                opponent_push_nudge = 0.08

            # Sandy-specific tutorial logic (simple and predictable)
            if ai_type == "sandy" and ai_player.turn_score >= 21:
                # Check if player is significantly ahead (>50 sats)
                if behind_by_now > 50:
                    # 61.8% chance to continue when player is far ahead (golden ratio)
                    should_continue = (random.random() < 0.618)
                    if should_continue:
                        actions.append({
                            "type": "decision",
                            "message": f"Sandy takes a big risk to catch up! (61.8% chance, player ahead by {behind_by_now} sats)"
                        })
                    else:
                        actions.append({
                            "type": "decision",
                            "message": f"Sandy plays it safe despite being behind by {behind_by_now} sats"
                        })
                        break
                else:
                    # Normal tutorial logic - 10% chance to continue at 21
                    should_continue = (random.random() < 0.10)
                    if should_continue:
                        actions.append({
                            "type": "decision",
                            "message": "Sandy decides to push her luck! (10% chance)"
                        })
                    else:
                        actions.append({
                            "type": "decision",
                            "message": "Sandy plays it safe at 21 sats"
                        })
                        break
            # Aida-specific decision logic
            elif ai_type == "aida":
                behind_by = behind_by_now
                ts = ai_player.turn_score
                mid_min = int(risk_cfg.get("midMin", 21))
                mid_max = int(risk_cfg.get("midMax", 39))
                mid_push = float(risk_cfg.get("midPush", 0.50))
                high_stack = int(risk_cfg.get("highStack", 40))
                aida_behind_gap = int(risk_cfg.get("behindGap", 30))
                aida_behind_push = float(risk_cfg.get("behindPush", 0.60))
                if behind_by > aida_behind_gap:
                    if random.random() < scale_push(aida_behind_push + opponent_push_nudge, behind_by):
                        actions.append({"type": "decision", "message": "Aida takes a calculated risk to catch up."})
                        continue
                    else:
                        break
                elif ts >= high_stack:
                    actions.append({"type": "decision", "message": f"Aida stacks at {high_stack}+."})
                    break
                elif mid_min <= ts <= mid_max:
                    if random.random() < scale_push(mid_push + opponent_push_nudge, behind_by):
                        actions.append({"type": "decision", "message": "Aida pushes with a balanced risk."})
                        continue
                    else:
                        break
                else:
                    continue
            # Lana-specific decision logic
            elif ai_type == "lana":
                ts = ai_player.turn_score
                stack_at = int(risk_cfg.get("stackAt", 30))
                stack_bias = float(risk_cfg.get("stackBias", 0.70))
                if ts >= stack_at:
                    if random.random() < scale_push(stack_bias - 0.20, -behind_by_now):  # slight tendency to stack, less when behind
                        actions.append({"type": "decision", "message": f"Lana stacks at {stack_at}."})
                        break
                    else:
                        continue
                else:
                    continue
            # En-J1n-specific decision logic
            elif ai_type == "enj1n":
                behind_by = behind_by_now
                ts = ai_player.turn_score
                enj1n_behind_gap = int(risk_cfg.get("behindGap", 20))
                stack_at = int(risk_cfg.get("stackAt", 50))
                base_push = float(risk_cfg.get("basePush", 0.75))
                if behind_by > enj1n_behind_gap:
                    actions.append({"type": "decision", "message": "En-J1n stacks aggressively to catch up."})
                    break
                elif ts >= stack_at:
                    actions.append({"type": "decision", "message": f"En-J1n stacks at {stack_at}."})
                    break
                else:
                    if random.random() < scale_push(base_push + opponent_push_nudge, behind_by):
                        actions.append({"type": "decision", "message": "En-J1n keeps pressing the attack."})
                        continue
                    else:
                        break
            # Nifty-specific decision logic
            elif ai_type == "nifty":
                behind_by = behind_by_now
                ts = ai_player.turn_score
                stack_at = int(risk_cfg.get("stackAt", 50))
                behind_gap = int(risk_cfg.get("behindGap", 20))
                if ts >= stack_at:
                    if behind_by >= behind_gap:
                        actions.append({"type": "decision", "message": "Nifty is behind—stays ultra aggressive over 50 sats."})
                        continue
                    else:
                        actions.append({"type": "decision", "message": f"Nifty stacks at {stack_at}."})
                        break
                else:
                    continue
            elif ai_player.turn_score >= target_turn_score:
                break

        # Stack sats (skip AI turn to prevent recursion)
        await self.stack_sats(game_id, ai_player.id, skip_ai_turn=True)
        actions.append({
            "type": "stack",
            "finalScore": ai_player.score
        })
        
        return actions

    def _get_ai_target_score(self, ai_type: str, ai_player: Player, game: Game) -> int:
        """Get AI target turn score based on type"""
        bot_config = settings.BOT_CONFIGS.get(ai_type, {})
        target_scores = bot_config.get("target_scores", [21])
        return random.choice(target_scores)

