/**
 * Ape In Game Service
 * Ported from Python FastAPI backend game_service.py
 * Handles all game logic including bot AI and weighted card drawing
 */

import { GameState, Card, GameMode, BotAction, RollResult } from '@/features/games/ape-in/types/game'
import { BOT_CONFIGS } from '@/features/games/ape-in/utils/botConfig'
import { drawWeightedCard, applyApeInEffect } from './game-logic-cards'
import { rollDice, checkBust, checkDodgeBearish } from './game-logic-dice'
import { getGame, storeGame, updateGame } from './game-store'

export class GameService {
  /**
   * Create a new game
   */
  static async createGame(
    mode: GameMode,
    playerName: string,
    walletAddress?: string,
    isDailyFree: boolean = false
  ): Promise<GameState> {
    const botConfig = BOT_CONFIGS[mode] || BOT_CONFIGS.sandy
    const winningScore = botConfig.winningScore
    const maxRounds = botConfig.maxRounds
    const noRoundLimit = botConfig.noRoundLimit || false
    
    console.log('[GameService.createGame] Config loaded:', {
      mode,
      botConfigName: botConfig.name,
      winningScore,
      maxRounds,
      noRoundLimit,
      fallbackUsed: !BOT_CONFIGS[mode],
    })

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const playerId = `player_${Date.now()}`
    const opponentId = mode !== 'pvp' && mode !== 'multiplayer' && mode !== 'tournament' 
      ? `opponent_${Date.now()}` 
      : undefined

    const opponentName = mode !== 'pvp' && mode !== 'multiplayer' && mode !== 'tournament'
      ? botConfig.name
      : undefined

    const gameState: GameState = {
      gameId,
      mode,
      playerScore: 0,
      opponentScore: 0,
      playerTurnScore: 0,
      opponentTurnScore: 0,
      currentCard: null,
      lastRoll: null,
      roundCount: 0, // Start at 0, will become 1 on first draw
      maxRounds,
      unlimitedRounds: noRoundLimit,
      winningScore,
      isPlayerTurn: true,
      gameStatus: mode === 'pvp' || mode === 'multiplayer' ? 'waiting' : 'waiting', // Start in waiting until intro completes
      winner: null,
      apeInActive: false,
      usedBearishFlags: [],
      gameLog: [],
      playerName,
      opponentName,
      playerId,
      opponentId,
    }

    await storeGame(gameId, gameState)
    return gameState
  }

  /**
   * Get complete game data
   */
  static async getGameData(gameId: string): Promise<GameState> {
    const stored = await getGame(gameId)
    if (!stored) {
      throw new Error('Game not found')
    }
    return stored.gameState
  }

  /**
   * Draw a card for a player (weighted drawing, no physical deck)
   */
  static async drawCard(gameId: string, playerId: string): Promise<Card> {
    const stored = await getGame(gameId)
    if (!stored) {
      throw new Error('Game not found')
    }

    const gameState = stored.gameState

    // Check if last card was Ape In! to prevent consecutive Ape In! cards
    const lastCardWasApeIn = gameState.currentCard?.name === "Ape In!"

    // Draw a weighted card (exclude Ape In! if last card was Ape In!)
    const card = drawWeightedCard(
      gameState.usedBearishFlags || [],
      lastCardWasApeIn,
      gameState.mode
    )

    // Store card in state (replaces any existing card)
    gameState.currentCard = card

    // Activate Ape In effect if Ape In card is drawn
    if (card.name === "Ape In!") {
      gameState.apeInActive = true
    }

    // Update game log
    if (gameState.gameLog) {
      gameState.gameLog.push({ type: 'draw', card, playerId, timestamp: Date.now() })
    }

    await updateGame(gameId, gameState)
    return card
  }

  /**
   * Roll dice and process result
   */
  static async rollDiceAction(
    gameId: string,
    playerId: string,
    diceProfile: string = "balanced"
  ): Promise<RollResult> {
    const stored = await getGame(gameId)
    if (!stored) {
      throw new Error('Game not found')
    }

    const gameState = stored.gameState
    const isPlayer = playerId === gameState.playerId

    // Must have a current card
    if (!gameState.currentCard) {
      throw new Error('No card to roll for')
    }

    const currentCard = gameState.currentCard

    // Roll dice
    const roll = rollDice(diceProfile)
    gameState.lastRoll = roll

    const wasApeInActive = gameState.apeInActive

    // Handle Bearish cards
    if (currentCard.type === "Bearish") {
      // Check if penalty can be dodged (even roll)
      if (checkDodgeBearish(roll)) {
        // Dodged!
        if (gameState.apeInActive) {
          gameState.apeInActive = false
        }
        
        // Mark bearish flag as used even when dodged (prevents repeat)
        if (currentCard.penalty && gameState.usedBearishFlags) {
          if (!gameState.usedBearishFlags.includes(currentCard.penalty)) {
            gameState.usedBearishFlags.push(currentCard.penalty)
          }
        }

        gameState.currentCard = null
        await updateGame(gameId, gameState)

        const message = wasApeInActive 
          ? "Great Roll! Your sats are safe! Continue your turn. (Ape In! negated)" 
          : "Great Roll! Your sats are safe! Continue your turn."
        return { value: roll, success: true, message }
      } else {
        // Apply penalty
        const penalty = currentCard.penalty
        if (penalty === "Reset") {
          if (isPlayer) {
            gameState.playerScore = 0
          } else {
            gameState.opponentScore = 0
          }
          if (gameState.usedBearishFlags && !gameState.usedBearishFlags.includes("Reset")) {
            gameState.usedBearishFlags.push("Reset")
          }
        } else if (penalty === "Half") {
          if (isPlayer) {
            gameState.playerScore = Math.floor(gameState.playerScore / 2)
          } else {
            gameState.opponentScore = Math.floor(gameState.opponentScore / 2)
          }
          if (gameState.usedBearishFlags && !gameState.usedBearishFlags.includes("Half")) {
            gameState.usedBearishFlags.push("Half")
          }
        } else if (penalty === "Minus10") {
          if (isPlayer) {
            gameState.playerScore = Math.max(0, gameState.playerScore - 10)
          } else {
            gameState.opponentScore = Math.max(0, gameState.opponentScore - 10)
          }
          if (gameState.usedBearishFlags && !gameState.usedBearishFlags.includes("Minus10")) {
            gameState.usedBearishFlags.push("Minus10")
          }
        }

        // Reset turn score and clear card
        if (isPlayer) {
          gameState.playerTurnScore = 0
        } else {
          gameState.opponentTurnScore = 0
        }
        gameState.currentCard = null
        gameState.apeInActive = false

        await updateGame(gameId, gameState)

        const message = wasApeInActive 
          ? `Hit by ${penalty}! (Ape In! negated)` 
          : `Hit by ${penalty}!`
        return { value: roll, success: false, message }
      }
    }

    // Check bust
    if (checkBust(roll)) {
      if (isPlayer) {
        gameState.playerTurnScore = 0
      } else {
        gameState.opponentTurnScore = 0
      }
      gameState.currentCard = null
      gameState.apeInActive = false

      await updateGame(gameId, gameState)
      return { value: roll, success: false, message: "Busted!" }
    }

    // Success - add card value to turn score
    let cardValue = currentCard.value

    // Apply Ape In effect
    if (gameState.apeInActive) {
      cardValue *= 2
      gameState.apeInActive = false
    }

    const previousTurnScore = isPlayer ? gameState.playerTurnScore : gameState.opponentTurnScore
    const newTurnScore = previousTurnScore + cardValue

    if (isPlayer) {
      gameState.playerTurnScore = newTurnScore
    } else {
      gameState.opponentTurnScore = newTurnScore
    }

    gameState.currentCard = null
    await updateGame(gameId, gameState)

    const satsGained = cardValue
    return {
      value: roll,
      success: true,
      message: `Added ${cardValue} sats to turn score!`,
      satsGained,
      turnScore: newTurnScore
    }
  }

  /**
   * Stack sats (end turn)
   */
  static async stackSats(gameId: string, playerId: string, skipAiTurn: boolean = false): Promise<GameState> {
    const stored = await getGame(gameId)
    if (!stored) {
      throw new Error('Game not found')
    }

    const gameState = stored.gameState
    const isPlayer = playerId === gameState.playerId

    // Add turn score to total score
    if (isPlayer) {
      gameState.playerScore += gameState.playerTurnScore
      gameState.playerTurnScore = 0
    } else {
      gameState.opponentScore += gameState.opponentTurnScore
      gameState.opponentTurnScore = 0
    }

    // Check win condition
    if (isPlayer && gameState.playerScore >= gameState.winningScore) {
      gameState.gameStatus = 'finished'
      gameState.winner = gameState.playerName || 'Player'
    } else if (!isPlayer && gameState.opponentScore >= gameState.winningScore) {
      gameState.gameStatus = 'finished'
      gameState.winner = gameState.opponentName || 'Opponent'
    }

    // Increment round ONLY when AI player completes their turn (not on player's turn)
    // Rounds start at 1, so we increment after the bot's first turn completes
    if (!isPlayer && gameState.gameStatus !== 'finished') {
      // Only increment if we're past round 1 (bot has completed at least one turn)
      if (gameState.roundCount >= 1) {
        gameState.roundCount += 1
      } else {
        // This shouldn't happen, but ensure round is at least 1
        gameState.roundCount = 1
      }
    }

    // Check max rounds (only for games with round limits)
    if (!gameState.unlimitedRounds && gameState.roundCount > gameState.maxRounds && gameState.gameStatus !== 'finished') {
      gameState.gameStatus = 'finished'
      // Determine winner by score
      if (gameState.playerScore > gameState.opponentScore) {
        gameState.winner = gameState.playerName || 'Player'
      } else if (gameState.opponentScore > gameState.playerScore) {
        gameState.winner = gameState.opponentName || 'Opponent'
      } else {
        gameState.winner = null // Tie
      }
    }

    await updateGame(gameId, gameState)

    // If player just stacked and game is still playing, execute AI turn
    if (!skipAiTurn && isPlayer && gameState.gameStatus === 'playing' && gameState.mode !== 'pvp' && gameState.mode !== 'multiplayer' && gameState.mode !== 'tournament') {
      // AI turn will be executed by the API route
      // We don't execute it here to avoid recursion
    }

    return gameState
  }

  /**
   * Execute AI opponent's turn and return action log for replay
   */
  static async executeBotTurn(gameId: string): Promise<BotAction[]> {
    const stored = await getGame(gameId)
    if (!stored) {
      throw new Error('Game not found')
    }

    const gameState = stored.gameState

    if (!gameState.opponentId) {
      return [] // No AI opponent
    }

    const aiType = gameState.mode
    const botConfig = BOT_CONFIGS[aiType] || BOT_CONFIGS.sandy
    const riskCfg = botConfig.risk || {}
    const jitterCfg = botConfig.jitter || { enabled: false, pct: 0.0 }
    const diceModes = botConfig.diceModes || [aiType]
    const noRoundLimit = botConfig.noRoundLimit || false

    // Compute rounds left
    const roundsLeft = noRoundLimit ? null : Math.max(0, gameState.maxRounds - gameState.roundCount)

    // Catch-up realism (Human-feel v1.2):
    // If the bot starts the turn meaningfully behind, force it to build momentum (N successful rolls)
    // before allowing banking—unless it reaches the bot-specific "danger zone" turn sats threshold.
    const behindByAtStart = gameState.playerScore - gameState.opponentScore
    const behindGapAtStart = riskCfg.behindGap ?? 999
    const wasBehindAtTurnStart = behindByAtStart >= behindGapAtStart
    const catchUpMinRolls = riskCfg.catchUpMinRolls ?? 2
    const bigTurnScoreGate = riskCfg.leadProtectBigTurnScore ?? 40

    const shouldBlockBankForCatchUp = (ts: number, successfulRolls: number): boolean => {
      if (!wasBehindAtTurnStart) return false
      if (ts >= bigTurnScoreGate) return false
      return successfulRolls < catchUpMinRolls
    }

    // Per-match deterministic jitter factor based on game.id
    const getJittered = (value: number): number => {
      if (!value) return value
      if (!jitterCfg.enabled) return value
      const pct = jitterCfg.pct || 0.0
      // Deterministic jitter from game.id hash
      let hash = 0
      for (let i = 0; i < gameState.gameId.length; i++) {
        hash = ((hash << 5) - hash) + gameState.gameId.charCodeAt(i)
        hash = hash & hash // Convert to 32bit integer
      }
      const seed = Math.abs(hash) % 10000
      const rnd = (seed / 10000.0) * 2.0 - 1.0 // [-1, 1)
      return Math.max(0.0, value * (1.0 + pct * rnd))
    }

    // Adaptive scaling helper: increase probability when behind or low rounds left
    const scalePush = (baseProb: number, behindBy: number): number => {
      if (baseProb <= 0.0) return 0.0
      let prob = baseProb
      // scale by behindBy (every 25 sats behind adds ~5%)
      prob += Math.max(0, behindBy) * 0.002
      // scale by rounds left (if nearing end, add up to +10%)
      if (roundsLeft !== null && roundsLeft <= 3) {
        prob += Math.max(0, (3 - roundsLeft + 1)) * 0.03
      }
      return Math.min(0.98, Math.max(0.0, getJittered(prob)))
    }

    const targetTurnScore = this.getAiTargetScore(aiType, gameState)

    // Track actions for replay
    const actions: BotAction[] = []
    let botTurnEndedByFailure = false

    /**
     * Human-feel v1 lead protection gates
     * - Prevents bots from insta-banking tiny leads (e.g. 0–0 and ts=3/5/8)
     * - Enables smarter lead protection mid/late game (score-gated)
     */
    const maybeLeadProtectBank = (opts: {
      wouldBeAhead: boolean
      ts: number
      playerScore: number
      opponentScore: number
      successfulRollsThisTurn: number
      minPlayerDefault: number
      minTurnDefault: number
      defaultMessage: string
      softMessage: string
    }): boolean => {
      const enabled = riskCfg.leadProtectEnabled !== false
      if (!enabled) return false
      if (!opts.wouldBeAhead) return false

      const minPlayer = riskCfg.leadProtectMinPlayerScore ?? opts.minPlayerDefault
      const minTurn = riskCfg.leadProtectMinTurnScore ?? opts.minTurnDefault
      const minLead = riskCfg.leadProtectMinLeadAfterBank ?? 0
      const minRolls = riskCfg.leadProtectMinRolls ?? 0
      const earlyChance = riskCfg.leadProtectChanceEarly ?? 0
      const bigTurnScore = riskCfg.leadProtectBigTurnScore ?? (minTurn + 20)

      const leadAfterBank = (opts.opponentScore + opts.ts) - opts.playerScore

      // Hard gate: only protect lead once the game is "real" (score + turn sats thresholds)
      if (
        opts.playerScore >= minPlayer &&
        opts.ts >= minTurn &&
        // Human-feel: do not allow lead-protect banking until N successful rolls have happened
        opts.successfulRollsThisTurn >= minRolls &&
        (
          leadAfterBank >= minLead ||
          // Big turn sats should sometimes trigger protection even without a cushion (bot-specific)
          opts.ts >= bigTurnScore
        )
      ) {
        actions.push({ type: "decision", message: opts.defaultMessage })
        return true
      }

      // Optional soft bank early: only if ts is meaningful
      if (earlyChance > 0 && opts.ts >= minTurn && Math.random() < earlyChance) {
        actions.push({ type: "decision", message: opts.softMessage })
        return true
      }

      return false
    }

    // AI draws and rolls with adaptive logic
    while (true) {
      // Draw card
      const card = await this.drawCard(gameId, gameState.opponentId)

      // Special handling for Ape In card
      if (card.name === "Ape In!") {
        actions.push({
          type: "ape_in",
          card,
          message: "Ape In! activated"
        })
        // Don't clear the card immediately - let it stay visible
        // The card will be cleared when the next card is drawn
        continue // AI continues to draw another card
      }

      // Log the draw action
      actions.push({
        type: "draw",
        card
      })

      // Decide dice profile (conditional aggressive switch if behind or low rounds)
      const behindByNow = gameState.playerScore - gameState.opponentScore
      let diceProfile: string = aiType
      if (diceModes.length > 1) {
        // switch to aggressive when notably behind or low rounds
        const behindGap = riskCfg.behindGap || 999
        if (behindByNow >= behindGap || (roundsLeft !== null && roundsLeft <= 2)) {
          diceProfile = diceModes[diceModes.length - 1] // Last is aggressive
        } else {
          diceProfile = diceModes[0] // First is normal
        }
      }

      // Roll dice with selected profile
      const rollResult = await this.rollDiceAction(gameId, gameState.opponentId, diceProfile)

      // Refresh game state to get updated turn score
      const updatedState = await this.getGameData(gameId)

      actions.push({
        type: "roll",
        value: rollResult.value,
        success: rollResult.success,
        message: rollResult.message,
        turnScore: updatedState.opponentTurnScore,
        diceProfile
      })

      if (!rollResult.success) {
        // AI busted or hit bearish penalty -> turn ends WITHOUT stacking/banking.
        // Round should still advance because seat2 turn completed.
        botTurnEndedByFailure = true
        break
      }

      // Helper for opponent-aware nudge: if player currently far ahead, push more
      let opponentPushNudge = 0.0
      if (behindByNow >= 30) {
        opponentPushNudge = 0.08
      }

      const currentState = await this.getGameData(gameId)
      const currentBehindBy = currentState.playerScore - currentState.opponentScore
      const currentTurnScore = currentState.opponentTurnScore

      // Chain fatigue: after 6+ successful draw+roll cycles, reduce continue probability
      // Aida/Lana decay faster (0.12/draw); Nifty/En-J1n slower (0.06/draw)
      const CHAIN_THRESHOLD = 6
      const chainFatigueRates: Record<string, number> = { aida: 0.12, lana: 0.12, nifty: 0.06, enj1n: 0.06 }
      const successfulDrawsThisTurn = actions.filter(a => a.type === 'roll').length
      const overBy = Math.max(0, successfulDrawsThisTurn - CHAIN_THRESHOLD)
      const decayRate = chainFatigueRates[aiType] ?? 0
      const chainDecay = (decayRate > 0 && overBy > 0) ? Math.max(0.15, 1.0 - overBy * decayRate) : 1.0

      // Sandy-specific tutorial logic (simple and predictable)
      if (aiType === "sandy" && currentTurnScore >= 21) {
        // Check if player is significantly ahead (>50 sats)
        if (currentBehindBy > 50) {
          // 61.8% chance to continue when player is far ahead (golden ratio)
          const shouldContinue = Math.random() < 0.618
          if (shouldContinue) {
            actions.push({
              type: "decision",
              message: `Sandy takes a big risk to catch up! (61.8% chance, player ahead by ${currentBehindBy} sats)`
            })
          } else {
            actions.push({
              type: "decision",
              message: `Sandy plays it safe despite being behind by ${currentBehindBy} sats`
            })
            break
          }
        } else {
          // Normal tutorial logic - 10% chance to continue at 21
          const shouldContinue = Math.random() < 0.10
          if (shouldContinue) {
            actions.push({
              type: "decision",
              message: "Sandy decides to push her luck! (10% chance)"
            })
          } else {
            actions.push({
              type: "decision",
              message: "Sandy plays it safe at 21 sats"
            })
            break
          }
        }
      }
      // Aida-specific decision logic
      else if (aiType === "aida") {
        const behindBy = currentBehindBy
        const ts = currentTurnScore
        const midMin = riskCfg.midMin || 21
        const midMax = riskCfg.midMax || 39
        const midPush = riskCfg.midPush || 0.50
        const highStack = riskCfg.highStack || 40
        const aidaBehindGap = riskCfg.behindGap || 30
        const aidaBehindPush = riskCfg.behindPush || 0.60

        // Lead-protection gate (Human-feel v1): avoid insta-banking tiny early leads
        const wouldBeAhead = currentState.opponentScore + ts > currentState.playerScore
        if (maybeLeadProtectBank({
          wouldBeAhead,
          ts,
          playerScore: currentState.playerScore,
          opponentScore: currentState.opponentScore,
          successfulRollsThisTurn: successfulDrawsThisTurn,
          minPlayerDefault: 21,
          minTurnDefault: 8,
          defaultMessage: "Aida banks—protecting her lead.",
          softMessage: "Aida banks early—soft lead protection.",
        })) {
          break
        }

        if (behindBy > aidaBehindGap) {
          const raw = scalePush(aidaBehindPush + opponentPushNudge, behindBy)
          if (Math.random() < raw * chainDecay) {
            actions.push({ type: "decision", message: "Aida takes a calculated risk to catch up." })
            continue
          } else {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "Aida was behind—keeps pushing to complete the catch-up turn." })
              continue
            }
            break
          }
        } else if (ts >= highStack) {
          if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
            actions.push({ type: "decision", message: "Aida was behind—keeps pushing to complete the catch-up turn." })
            continue
          }
          actions.push({ type: "decision", message: `Aida stacks at ${highStack}+.` })
          break
        } else if (midMin <= ts && ts <= midMax) {
          const raw = scalePush(midPush + opponentPushNudge, behindBy)
          if (Math.random() < raw * chainDecay) {
            actions.push({ type: "decision", message: "Aida pushes with a balanced risk." })
            continue
          } else {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "Aida was behind—keeps pushing to complete the catch-up turn." })
              continue
            }
            break
          }
        } else {
          if (successfulDrawsThisTurn >= CHAIN_THRESHOLD && Math.random() >= chainDecay) {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "Aida was behind—keeps pushing to complete the catch-up turn." })
              continue
            }
            actions.push({ type: "decision", message: "Aida banks—chain fatigue." })
            break
          }
          continue
        }
      }
      // Lana-specific decision logic
      else if (aiType === "lana") {
        const ts = currentTurnScore
        const stackAt = riskCfg.stackAt || 30
        const stackBias = riskCfg.stackBias || 0.70

        // Lead-protection gate (Human-feel v1): avoid insta-banking tiny early leads
        const wouldBeAhead = currentState.opponentScore + ts > currentState.playerScore
        if (maybeLeadProtectBank({
          wouldBeAhead,
          ts,
          playerScore: currentState.playerScore,
          opponentScore: currentState.opponentScore,
          successfulRollsThisTurn: successfulDrawsThisTurn,
          minPlayerDefault: 21,
          minTurnDefault: 8,
          defaultMessage: "Lana banks—protecting her lead.",
          softMessage: "Lana banks early—soft lead protection.",
        })) {
          break
        }

        if (ts >= stackAt) {
          const stackProb = scalePush(stackBias - 0.20, -currentBehindBy)
          const continueProb = (1 - stackProb) * chainDecay
          if (Math.random() < continueProb) {
            continue
          } else {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "Lana was behind—keeps the pressure on before banking." })
              continue
            }
            actions.push({ type: "decision", message: `Lana stacks at ${stackAt}.` })
            break
          }
        } else {
          if (successfulDrawsThisTurn >= CHAIN_THRESHOLD && Math.random() >= chainDecay) {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "Lana was behind—keeps the pressure on before banking." })
              continue
            }
            actions.push({ type: "decision", message: "Lana banks—chain fatigue." })
            break
          }
          continue
        }
      }
      // En-J1n-specific decision logic
      else if (aiType === "enj1n") {
        const behindBy = currentBehindBy
        const ts = currentTurnScore
        const enj1nBehindGap = riskCfg.behindGap || 20
        const stackAt = riskCfg.stackAt || 50
        const basePush = riskCfg.basePush || 0.75

        // If stacking now would put En-J1n 21+ sats beyond the player, bank (he pushes for a cushion)
        // Human-feel v1: gate this so it doesn't trigger too early.
        const wouldBeAheadBy21 = currentState.opponentScore + ts > currentState.playerScore + 21
        const lpMinPlayer = riskCfg.leadProtectMinPlayerScore ?? 34
        const lpMinTurn = riskCfg.leadProtectMinTurnScore ?? 21
        if (wouldBeAheadBy21 && ts >= lpMinTurn && currentState.playerScore >= lpMinPlayer) {
          actions.push({ type: "decision", message: "En-J1n banks—21 sats clear and plays it safe." })
          break
        }

        if (behindBy > enj1nBehindGap) {
          // Human-feel v1.2: when behind, En-J1n pushes hard, but must complete catch-up momentum
          const raw = scalePush(basePush + 0.10 + opponentPushNudge, behindBy)
          if (Math.random() < raw * chainDecay) {
            actions.push({ type: "decision", message: "En-J1n keeps pressing to catch up." })
            continue
          } else {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "En-J1n was behind—keeps pressing to complete the catch-up turn." })
              continue
            }
            actions.push({ type: "decision", message: "En-J1n banks—momentary reset." })
            break
          }
        } else if (ts >= stackAt) {
          actions.push({ type: "decision", message: `En-J1n stacks at ${stackAt}.` })
          break
        } else {
          const raw = scalePush(basePush + opponentPushNudge, behindBy)
          if (Math.random() < raw * chainDecay) {
            actions.push({ type: "decision", message: "En-J1n keeps pressing the attack." })
            continue
          } else {
            break
          }
        }
      }
      // Nifty-specific decision logic
      else if (aiType === "nifty") {
        const behindBy = currentBehindBy
        const ts = currentTurnScore
        const stackAt = riskCfg.stackAt || 50
        const behindGap = riskCfg.behindGap || 20

        // Lead-protection gate (Human-feel v1): avoid insta-banking tiny early leads
        const wouldBeAhead = currentState.opponentScore + ts > currentState.playerScore
        if (maybeLeadProtectBank({
          wouldBeAhead,
          ts,
          playerScore: currentState.playerScore,
          opponentScore: currentState.opponentScore,
          successfulRollsThisTurn: successfulDrawsThisTurn,
          minPlayerDefault: 34,
          minTurnDefault: 13,
          defaultMessage: "Nifty banks—protecting her lead.",
          softMessage: "Nifty banks early—soft lead protection.",
        })) {
          break
        }

        if (ts >= stackAt) {
          if (behindBy >= behindGap) {
            if (successfulDrawsThisTurn >= CHAIN_THRESHOLD && Math.random() >= chainDecay) {
              if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
                actions.push({ type: "decision", message: "Nifty was behind—rides the momentum a bit longer." })
                continue
              }
              actions.push({ type: "decision", message: "Nifty banks—chain fatigue." })
              break
            }
            actions.push({ type: "decision", message: "Nifty is behind—stays ultra aggressive over 50 sats." })
            continue
          } else {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "Nifty was behind—rides the momentum a bit longer." })
              continue
            }
            actions.push({ type: "decision", message: `Nifty stacks at ${stackAt}.` })
            break
          }
        } else {
          if (successfulDrawsThisTurn >= CHAIN_THRESHOLD && Math.random() >= chainDecay) {
            if (shouldBlockBankForCatchUp(ts, successfulDrawsThisTurn)) {
              actions.push({ type: "decision", message: "Nifty was behind—rides the momentum a bit longer." })
              continue
            }
            actions.push({ type: "decision", message: "Nifty banks—chain fatigue." })
            break
          }
          continue
        }
      } else if (currentTurnScore >= targetTurnScore) {
        break
      }
    }

    if (botTurnEndedByFailure) {
      // Seat2 turn ended by bust/bearish-fail.
      // Ensure round advances (same semantics as "end of seat2 turn").
      if (gameState.gameStatus !== 'finished') {
        if (gameState.roundCount >= 1) {
          gameState.roundCount += 1
        } else {
          gameState.roundCount = 1
        }
      }

      // Check max rounds (only for games with round limits)
      if (!gameState.unlimitedRounds && gameState.roundCount > gameState.maxRounds && gameState.gameStatus !== 'finished') {
        gameState.gameStatus = 'finished'
        // Determine winner by score
        if (gameState.playerScore > gameState.opponentScore) {
          gameState.winner = gameState.playerName || 'Player'
        } else if (gameState.opponentScore > gameState.playerScore) {
          gameState.winner = gameState.opponentName || 'Opponent'
        } else {
          gameState.winner = null // Tie
        }
      }

      await updateGame(gameId, gameState)
      return actions
    }

    // Seat2 chose to bank/stop (stack) -> bank sats and advance round inside stackSats()
    const finalState = await this.stackSats(gameId, gameState.opponentId, true)
    actions.push({ type: "stack", finalScore: finalState.opponentScore })

    return actions
  }

  /**
   * Get AI target turn score based on type
   */
  static getAiTargetScore(aiType: GameMode, gameState: GameState): number {
    const botConfig = BOT_CONFIGS[aiType] || BOT_CONFIGS.sandy
    const targetScores = botConfig.targetScores || [21]
    return targetScores[Math.floor(Math.random() * targetScores.length)]
  }

  /**
   * Forfeit the game
   */
  static async forfeitGame(gameId: string, playerId: string): Promise<GameState> {
    const stored = await getGame(gameId)
    if (!stored) {
      throw new Error('Game not found')
    }

    const gameState = stored.gameState
    gameState.gameStatus = 'finished'
    gameState.winner = gameState.playerId === playerId 
      ? (gameState.opponentName || 'Opponent')
      : (gameState.playerName || 'Player')

    await updateGame(gameId, gameState)
    return gameState
  }
}

