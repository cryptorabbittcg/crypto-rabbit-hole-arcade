export type CardType = 'Cipher' | 'Oracle' | 'Historacle' | 'Bearish' | 'Special'

export type GameMode = 
  | 'sandy' 
  | 'aida' 
  | 'lana' 
  | 'enj1n' 
  | 'nifty' 
  | 'pvp' 
  | 'multiplayer' 
  | 'tournament'

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
