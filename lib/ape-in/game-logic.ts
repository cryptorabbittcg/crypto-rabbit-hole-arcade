/**
 * Ape In Game Logic
 * Ported from Python backend game logic
 * Handles game creation, card deck management, dice rolling, and bot AI
 */

import { GameMode, GameState, Card, CardType } from "@/features/games/ape-in/types/game"
import { getCardImagePath, getCardImageFilename } from "@/features/games/ape-in/utils/cardImages"
import { BOT_CONFIGS } from "@/features/games/ape-in/utils/botConfig"

/**
 * Card definitions
 * Maps card types and values to card names
 */
const CARD_DEFINITIONS: Record<string, { name: string; type: CardType; value: number; penalty?: string }[]> = {
  // Cipher cards (1pt)
  cipher_1pt: [
    { name: 'Abbie', type: 'Cipher', value: 1 },
    { name: 'Alita', type: 'Cipher', value: 1 },
    { name: 'En-J1n', type: 'Cipher', value: 1 },
    { name: 'Jakey', type: 'Cipher', value: 1 },
  ],
  
  // Cipher cards (2pt)
  cipher_2pt: [
    { name: 'Ace', type: 'Cipher', value: 2 },
    { name: 'Beats', type: 'Cipher', value: 2 },
    { name: 'Dash', type: 'Cipher', value: 2 },
    { name: 'Ray', type: 'Cipher', value: 2 },
  ],
  
  // Cipher cards (3pt)
  cipher_3pt: [
    { name: 'Jazzy', type: 'Cipher', value: 3 },
    { name: 'Meemo', type: 'Cipher', value: 3 },
    { name: 'Sabrina', type: 'Cipher', value: 3 },
    { name: 'Thea', type: 'Cipher', value: 3 },
  ],
  
  // Cipher cards (5pt)
  cipher_5pt: [
    { name: 'Nero', type: 'Cipher', value: 5 },
    { name: 'Saul', type: 'Cipher', value: 5 },
    { name: 'Somi', type: 'Cipher', value: 5 },
    { name: 'Wick', type: 'Cipher', value: 5 },
  ],
  
  // Cipher cards (8pt)
  cipher_8pt: [
    { name: 'Sandy', type: 'Cipher', value: 8 },
    { name: 'Tala', type: 'Cipher', value: 8 },
    { name: 'Tulip', type: 'Cipher', value: 8 },
    { name: 'Zacky', type: 'Cipher', value: 8 },
  ],
  
  // Historacle cards
  historacle: [
    { name: 'Sats', type: 'Historacle', value: 1 },
    { name: 'Fibonacci', type: 'Historacle', value: 2 },
    { name: 'Gann', type: 'Historacle', value: 3 },
    { name: 'Dow', type: 'Historacle', value: 4 },
    { name: 'Elliott', type: 'Historacle', value: 5 },
  ],
  
  // Oracle cards (varies by bot)
  oracle: [
    { name: 'Oracle_Sats_1', type: 'Oracle', value: 1 },
    { name: 'Oracle_Sats_2', type: 'Oracle', value: 2 },
    { name: 'Oracle_Sats_3', type: 'Oracle', value: 3 },
  ],
  
  // Bearish cards
  bearish: [
    { name: 'Bear_Half', type: 'Bearish', value: 0, penalty: 'half' },
    { name: 'Bear_Minus_10', type: 'Bearish', value: 0, penalty: 'minus_10' },
    { name: 'Bear_Reset', type: 'Bearish', value: 0, penalty: 'reset' },
  ],
  
  // Special cards
  special: [
    { name: 'Ape_In', type: 'Special', value: 0 },
    { name: 'Ape_In_MAYC', type: 'Special', value: 0 },
    { name: 'Ape_In_Historic', type: 'Special', value: 0 },
  ],
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Create a card object from card definition
 */
function createCard(def: { name: string; type: CardType; value: number; penalty?: string }): Card {
  return {
    name: def.name,
    type: def.type,
    value: def.value,
    image_url: getCardImagePath(getCardImageFilename(def.name)),
    penalty: def.penalty,
  }
}

/**
 * Build card deck for a game mode
 */
export function buildDeck(mode: GameMode): Card[] {
  const deck: Card[] = []
  
  // Add all cipher cards (multiple copies based on value)
  Object.values(CARD_DEFINITIONS.cipher_1pt).forEach(def => {
    deck.push(...Array(4).fill(null).map(() => createCard(def)))
  })
  Object.values(CARD_DEFINITIONS.cipher_2pt).forEach(def => {
    deck.push(...Array(4).fill(null).map(() => createCard(def)))
  })
  Object.values(CARD_DEFINITIONS.cipher_3pt).forEach(def => {
    deck.push(...Array(4).fill(null).map(() => createCard(def)))
  })
  Object.values(CARD_DEFINITIONS.cipher_5pt).forEach(def => {
    deck.push(...Array(3).fill(null).map(() => createCard(def)))
  })
  Object.values(CARD_DEFINITIONS.cipher_8pt).forEach(def => {
    deck.push(...Array(2).fill(null).map(() => createCard(def)))
  })
  
  // Add historacle cards (one of each)
  CARD_DEFINITIONS.historacle.forEach(def => {
    deck.push(createCard(def))
  })
  
  // Add oracle cards based on bot mode (if applicable)
  if (mode !== 'sandy' && mode !== 'pvp' && mode !== 'multiplayer' && mode !== 'tournament') {
    // Bot-specific oracle cards
    const oracleCards = [
      { name: `Oracle_${mode.charAt(0).toUpperCase() + mode.slice(1)}_1`, type: 'Oracle' as CardType, value: 1 },
      { name: `Oracle_${mode.charAt(0).toUpperCase() + mode.slice(1)}_2`, type: 'Oracle' as CardType, value: 2 },
      { name: `Oracle_${mode.charAt(0).toUpperCase() + mode.slice(1)}_3`, type: 'Oracle' as CardType, value: 3 },
    ]
    oracleCards.forEach(def => {
      deck.push(createCard(def))
    })
  }
  
  // Add bearish cards (fewer in tutorial mode)
  const bearishCount = mode === 'sandy' ? 2 : 4
  CARD_DEFINITIONS.bearish.forEach(def => {
    for (let i = 0; i < bearishCount; i++) {
      deck.push(createCard(def))
    }
  })
  
  // Add special cards (one of each)
  CARD_DEFINITIONS.special.forEach(def => {
    deck.push(createCard(def))
  })
  
  // Shuffle deck
  return shuffle(deck)
}

/**
 * Create a new game
 */
export function createApeInGame(params: {
  mode: GameMode
  playerName: string
  walletAddress?: string
  isDailyFree?: boolean
}): GameState {
  const { mode, playerName } = params
  
  // Generate game ID
  const gameId = `${mode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Get opponent name based on mode
  const opponentName = mode === 'sandy' 
    ? BOT_CONFIGS.sandy.name
    : mode === 'aida'
    ? BOT_CONFIGS.aida.name
    : mode === 'lana'
    ? BOT_CONFIGS.lana.name
    : mode === 'enj1n'
    ? BOT_CONFIGS.enj1n.name
    : mode === 'nifty'
    ? BOT_CONFIGS.nifty.name
    : 'Opponent'
  
  // Get bot config for mode-specific settings
  const botConfig = BOT_CONFIGS[mode]
  
  // Create initial game state
  // Note: GameState interface doesn't include playerName/opponentName, so we store them separately
  const gameState: GameState & { playerName?: string; opponentName?: string } = {
    gameId,
    mode,
    playerScore: 0,
    opponentScore: 0,
    playerTurnScore: 0,
    opponentTurnScore: 0,
    currentCard: null,
    lastRoll: null,
    roundCount: 0,
    maxRounds: botConfig?.maxRounds || (mode === 'sandy' ? 10 : 15),
    unlimitedRounds: false,
    winningScore: botConfig?.winningScore || (mode === 'sandy' ? 150 : 200),
    isPlayerTurn: true,
    gameStatus: 'waiting',
    winner: null,
    apeInActive: false,
    playerName, // Store as optional property
    opponentName, // Store as optional property
  }
  
  return gameState
}

/**
 * Draw a card from the deck
 */
export function drawCard(deck: Card[]): { card: Card | null; remainingDeck: Card[] } {
  if (deck.length === 0) {
    return { card: null, remainingDeck: [] }
  }
  
  const card = deck[0]
  const remainingDeck = deck.slice(1)
  
  return { card, remainingDeck }
}

/**
 * Roll dice (1-6)
 */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1
}

/**
 * Calculate dice roll success
 * Success if roll >= card value (for most cards)
 * Special rules for Bearish and Special cards
 */
export function calculateDiceSuccess(card: Card, roll: number): { success: boolean; message?: string } {
  if (card.type === 'Bearish') {
    // Bearish cards always succeed (but apply penalty)
    return { success: true, message: 'Bearish card drawn - penalty applies' }
  }
  
  if (card.type === 'Special') {
    // Special cards (Ape In) have special rules
    if (card.name === 'Ape_In') {
      // Ape In: Roll 6 to activate
      return { 
        success: roll === 6, 
        message: roll === 6 ? 'Ape In activated!' : 'Ape In failed - need 6'
      }
    }
    return { success: true }
  }
  
  // Standard cards: Success if roll >= card value
  const success = roll >= card.value
  return {
    success,
    message: success 
      ? `Success! Rolled ${roll} (needed ${card.value})`
      : `Failed! Rolled ${roll} (needed ${card.value})`
  }
}

/**
 * Bot AI decision
 * Determines if bot should continue rolling or stack (end turn)
 */
export function botShouldContinue(
  mode: GameMode,
  opponentScore: number,
  opponentTurnScore: number,
  playerScore: number,
  winningScore: number,
  roundCount: number
): boolean {
  // Bot difficulty based on mode
  const config = BOT_CONFIGS[mode]
  if (!config) return false
  
  // Bot risk tolerance (0-1, higher = more risk)
  const riskTolerance = config.difficulty === 'Easy' ? 0.3 : config.difficulty === 'Medium' ? 0.5 : 0.7
  
  // If bot is close to winning, be more conservative
  const totalScore = opponentScore + opponentTurnScore
  if (totalScore >= winningScore * 0.9) {
    return opponentTurnScore < winningScore * 0.2 * riskTolerance
  }
  
  // If player is far ahead, take more risks
  if (playerScore > opponentScore + 50) {
    return opponentTurnScore < winningScore * 0.4 * riskTolerance
  }
  
  // Normal play: stack when turn score reaches threshold
  const threshold = winningScore * 0.15 * (1 + riskTolerance)
  return opponentTurnScore < threshold
}

/**
 * Apply card penalty
 */
export function applyCardPenalty(score: number, penalty: string | undefined): number {
  if (!penalty) return score
  
  switch (penalty) {
    case 'half':
      return Math.floor(score / 2)
    case 'minus_10':
      return Math.max(0, score - 10)
    case 'reset':
      return 0
    default:
      return score
  }
}

/**
 * Check if game is won
 */
export function checkGameWon(
  playerScore: number,
  opponentScore: number,
  winningScore: number,
  roundCount: number,
  maxRounds: number
): { isWon: boolean; winner: 'player' | 'opponent' | null } {
  // Check for score win
  if (playerScore >= winningScore) {
    return { isWon: true, winner: 'player' }
  }
  if (opponentScore >= winningScore) {
    return { isWon: true, winner: 'opponent' }
  }
  
  // Check for round limit
  if (roundCount >= maxRounds) {
    if (playerScore > opponentScore) {
      return { isWon: true, winner: 'player' }
    } else if (opponentScore > playerScore) {
      return { isWon: true, winner: 'opponent' }
    } else {
      return { isWon: true, winner: null } // Draw
    }
  }
  
  return { isWon: false, winner: null }
}

