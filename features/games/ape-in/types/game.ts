// Cache bust timestamp: 2024-01-17 06:58:43 UTC
export const GameModeValues = ['sandy', 'aida', 'lana', 'enj1n', 'nifty', 'pvp', 'multiplayer', 'tournament'] as const
export type GameMode = typeof GameModeValues[number]

// Export runtime objects for SES compatibility
export const GameMode = {
  SANDY: 'sandy',
  AIDA: 'aida', 
  LANA: 'lana',
  ENJ1N: 'enj1n',
  NIFTY: 'nifty',
  PVP: 'pvp',
  MULTIPLAYER: 'multiplayer',
  TOURNAMENT: 'tournament'
} as const

// Runtime exports for commonly imported interfaces
export const CardType = {
  CIPHER: 'Cipher',
  ORACLE: 'Oracle',
  HISTORACLE: 'Historacle',
  BEARISH: 'Bearish',
  SPECIAL: 'Special'
} as const

export const GameStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
} as const

export const GameActionType = {
  DRAW: 'draw',
  ROLL: 'roll',
  STACK: 'stack',
  FORFEIT: 'forfeit'
} as const

export const WebSocketMessageType = {
  GAME_UPDATE: 'game_update',
  PLAYER_JOINED: 'player_joined',
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended',
  ERROR: 'error'
} as const

export type CardType = 'Cipher' | 'Oracle' | 'Historacle' | 'Bearish' | 'Special'

export interface Card {
  name: string
  type: CardType
  value: number
  image_url: string
  penalty?: string
}

export interface GameState {
  gameId: string
  mode: GameMode
  playerScore: number
  opponentScore: number
  playerTurnScore: number
  opponentTurnScore: number
  currentCard: Card | null
  lastRoll: number | null
  roundCount: number
  maxRounds: number
  unlimitedRounds: boolean
  winningScore: number
  isPlayerTurn: boolean
  gameStatus: 'waiting' | 'playing' | 'finished'
  winner: string | null
  apeInActive: boolean
}

export interface Player {
  id: string
  name: string
  walletAddress?: string
  score: number
  turnScore: number
}

export interface LeaderboardEntry {
  rank: number
  playerName: string
  walletAddress?: string
  totalWins: number
  highScore: number
  gamesPlayed: number
}

export interface DiceRoll {
  value: number
  success: boolean
  message?: string
}

export interface GameAction {
  type: 'draw' | 'roll' | 'stack' | 'forfeit'
  playerId: string
}

export interface WebSocketMessage {
  type: 'game_update' | 'player_joined' | 'game_started' | 'game_ended' | 'error'
  data: any
}

// Runtime constructors for commonly imported interfaces
export const createLeaderboardEntry = (entry: {
  rank: number
  playerName: string
  walletAddress?: string
  totalWins: number
  highScore: number
  gamesPlayed: number
}): LeaderboardEntry => entry

// Runtime exports for direct interface imports
export const LeaderboardEntry = {
  create: createLeaderboardEntry,
  // Default empty entry for type checking
  empty: () => ({
    rank: 0,
    playerName: '',
    walletAddress: undefined,
    totalWins: 0,
    highScore: 0,
    gamesPlayed: 0
  })
}

export const createCard = (card: {
  name: string
  type: CardType
  value: number
  image_url: string
  penalty?: string
}): Card => card

export const createGameState = (state: {
  gameId: string
  mode: GameMode
  playerScore: number
  opponentScore: number
  playerTurnScore: number
  opponentTurnScore: number
  currentCard: Card | null
  lastRoll: number | null
  roundCount: number
  maxRounds: number
  unlimitedRounds: boolean
  winningScore: number
  isPlayerTurn: boolean
  gameStatus: 'waiting' | 'playing' | 'finished'
  winner: string | null
  apeInActive: boolean
}): GameState => state

export const createPlayer = (player: {
  id: string
  name: string
  walletAddress?: string
  score: number
  turnScore: number
}): Player => player

export const createWebSocketMessage = (message: {
  type: 'game_update' | 'player_joined' | 'game_started' | 'game_ended' | 'error'
  data: any
}): WebSocketMessage => message

// Runtime exports for direct interface imports (for SES compatibility)
export const Card = {
  create: createCard,
  empty: () => ({
    name: '',
    type: 'Cipher' as CardType,
    value: 0,
    image_url: '',
    penalty: undefined
  })
}

export const GameState = {
  create: createGameState,
  empty: () => ({
    gameId: '',
    mode: 'sandy' as GameMode,
    playerScore: 0,
    opponentScore: 0,
    playerTurnScore: 0,
    opponentTurnScore: 0,
    currentCard: null,
    lastRoll: null,
    roundCount: 0,
    maxRounds: 0,
    unlimitedRounds: false,
    winningScore: 0,
    isPlayerTurn: false,
    gameStatus: 'waiting' as const,
    winner: null,
    apeInActive: false
  })
}

export const Player = {
  create: createPlayer,
  empty: () => ({
    id: '',
    name: '',
    walletAddress: undefined,
    score: 0,
    turnScore: 0
  })
}

export const WebSocketMessage = {
  create: createWebSocketMessage,
  empty: () => ({
    type: 'error' as const,
    data: null
  })
}
