// Local player statistics and game session tracking for Ape In

import { GameMode } from '../types/game'

export interface ApeInGameSession {
  id: string
  gameMode: GameMode
  startTime: Date
  endTime?: Date
  status: "in-progress" | "completed" | "forfeited"
  playerScore: number
  opponentScore: number
  winner?: string
  roundsPlayed?: number
  timeInSeconds?: number
  verificationProofId?: string
}

export interface ApeInPlayerStats {
  totalGames: number
  wins: number
  losses: number
  forfeits: number
  totalPlayerScore: number
  totalOpponentScore: number
  averageScore: number
  bestScore: number
  averageTime: number
  bestTime: number
  gamesPerMode: {
    sandy: { played: number; wins: number; losses: number; forfeited: number }
    aida: { played: number; wins: number; losses: number; forfeited: number }
    lana: { played: number; wins: number; losses: number; forfeited: number }
    enj1n: { played: number; wins: number; losses: number; forfeited: number }
    nifty: { played: number; wins: number; losses: number; forfeited: number }
    pvp: { played: number; wins: number; losses: number; forfeited: number }
    multiplayer: { played: number; wins: number; losses: number; forfeited: number }
    tournament: { played: number; wins: number; losses: number; forfeited: number }
  }
  currentStreak: number
  bestStreak: number
  lastPlayed?: Date
}

const STATS_STORAGE_KEY_PREFIX = "ape-in-player-stats"
const SESSIONS_STORAGE_KEY_PREFIX = "ape-in-game-sessions"

function normalizeWalletKey(walletAddress?: string | null): string {
  const w = (walletAddress || "").trim().toLowerCase()
  return w || "guest"
}

function statsStorageKey(walletAddress?: string | null): string {
  return `${STATS_STORAGE_KEY_PREFIX}:${normalizeWalletKey(walletAddress)}`
}

function sessionsStorageKey(walletAddress?: string | null): string {
  return `${SESSIONS_STORAGE_KEY_PREFIX}:${normalizeWalletKey(walletAddress)}`
}

export function getPlayerStats(walletAddress?: string | null): ApeInPlayerStats {
  if (typeof window === "undefined") {
    return getDefaultStats()
  }

  try {
    const stored = window.localStorage.getItem(statsStorageKey(walletAddress))
    if (stored) {
      const stats = JSON.parse(stored) as ApeInPlayerStats
      if (stats.lastPlayed) {
        stats.lastPlayed = new Date(stats.lastPlayed)
      }
      return stats
    }
  } catch (error) {
    console.error("Error loading Ape In player stats:", error)
  }

  return getDefaultStats()
}

export function savePlayerStats(stats: ApeInPlayerStats, walletAddress?: string | null): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(statsStorageKey(walletAddress), JSON.stringify(stats))
  } catch (error) {
    console.error("Error saving Ape In player stats:", error)
  }
}

export function getGameSessions(walletAddress?: string | null): ApeInGameSession[] {
  if (typeof window === "undefined") return []

  try {
    const stored = window.localStorage.getItem(sessionsStorageKey(walletAddress))
    if (stored) {
      const sessions = JSON.parse(stored) as ApeInGameSession[]
      return sessions.map((session) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
      }))
    }
  } catch (error) {
    console.error("Error loading Ape In game sessions:", error)
  }

  return []
}

export function saveGameSessions(sessions: ApeInGameSession[], walletAddress?: string | null): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(sessionsStorageKey(walletAddress), JSON.stringify(sessions))
  } catch (error) {
    console.error("Error saving Ape In game sessions:", error)
  }
}

export function startGameSession(gameMode: GameMode, walletAddress?: string | null): ApeInGameSession {
  const session: ApeInGameSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    gameMode,
    startTime: new Date(),
    status: "in-progress",
    playerScore: 0,
    opponentScore: 0,
  }

  const sessions = getGameSessions(walletAddress)
  sessions.push(session)
  saveGameSessions(sessions, walletAddress)

  return session
}

export function completeGameSession(
  sessionId: string,
  playerScore: number,
  opponentScore: number,
  winner: string,
  roundsPlayed: number,
  timeInSeconds: number,
  playerName?: string,
  verificationProofId?: string,
  walletAddress?: string | null,
): void {
  const sessions = getGameSessions(walletAddress)
  const session = sessions.find((s) => s.id === sessionId)

  if (!session) return

  session.status = "completed"
  session.endTime = new Date()
  session.playerScore = playerScore
  session.opponentScore = opponentScore
  session.winner = winner
  session.roundsPlayed = roundsPlayed
  session.timeInSeconds = timeInSeconds
  session.verificationProofId = verificationProofId

  saveGameSessions(sessions, walletAddress)
  updateStatsOnCompletion(session, playerName, walletAddress)
}

export function forfeitGameSession(sessionId: string, walletAddress?: string | null): void {
  const sessions = getGameSessions(walletAddress)
  const session = sessions.find((s) => s.id === sessionId)

  if (!session) return

  session.status = "forfeited"
  session.endTime = new Date()

  saveGameSessions(sessions, walletAddress)
  updateStatsOnForfeit(session, walletAddress)
}

function updateStatsOnCompletion(session: ApeInGameSession, playerName?: string, walletAddress?: string | null): void {
  const stats = getPlayerStats(walletAddress)
  // Determine if player won: winner should be playerName (not opponentName, not gameMode name)
  const isWin = playerName 
    ? session.winner === playerName || (session.winner !== 'Opponent' && session.winner !== session.gameMode)
    : session.winner !== 'Opponent' && session.winner !== session.gameMode && session.winner !== 'Draw'

  stats.totalGames++
  if (isWin) {
    stats.wins++
    stats.currentStreak++
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak
    }
  } else {
    stats.losses++
    stats.currentStreak = 0
  }
  
  stats.totalPlayerScore += session.playerScore
  stats.totalOpponentScore += session.opponentScore || 0
  stats.lastPlayed = session.endTime

  const modeStats = stats.gamesPerMode[session.gameMode]
  if (modeStats) {
    modeStats.played++
    if (isWin) {
      modeStats.wins++
    } else {
      modeStats.losses++
    }
  }

  if (session.playerScore > stats.bestScore) {
    stats.bestScore = session.playerScore
  }

  if (stats.wins > 0) {
    stats.averageScore = Math.floor(stats.totalPlayerScore / stats.totalGames)
  }

  if (session.timeInSeconds != null && stats.wins > 0) {
    const totalWins = stats.wins
    stats.averageTime = Math.floor(
      (stats.averageTime * (totalWins - 1) + session.timeInSeconds) / totalWins,
    )

    if (stats.bestTime === 0 || (isWin && session.timeInSeconds < stats.bestTime)) {
      stats.bestTime = session.timeInSeconds
    }
  }

  savePlayerStats(stats, walletAddress)
}

function updateStatsOnForfeit(session: ApeInGameSession, walletAddress?: string | null): void {
  const stats = getPlayerStats(walletAddress)

  stats.totalGames++
  stats.forfeits++
  stats.losses++
  stats.currentStreak = 0
  stats.lastPlayed = session.endTime

  const modeStats = stats.gamesPerMode[session.gameMode]
  if (modeStats) {
    modeStats.played++
    modeStats.forfeited++
    modeStats.losses++
  }

  if (stats.totalGames > 0) {
    stats.averageScore = Math.floor(stats.totalPlayerScore / stats.totalGames)
  }

  savePlayerStats(stats, walletAddress)
}

export function getActiveSession(walletAddress?: string | null): ApeInGameSession | null {
  const sessions = getGameSessions(walletAddress)
  return sessions.find((s) => s.status === "in-progress") || null
}

export function resetPlayerStats(): void {
  if (typeof window === "undefined") return
  // Backward compatible: remove legacy global keys (older builds)
  window.localStorage.removeItem(STATS_STORAGE_KEY_PREFIX)
  window.localStorage.removeItem(SESSIONS_STORAGE_KEY_PREFIX)
}

function getDefaultStats(): ApeInPlayerStats {
  return {
    totalGames: 0,
    wins: 0,
    losses: 0,
    forfeits: 0,
    totalPlayerScore: 0,
    totalOpponentScore: 0,
    averageScore: 0,
    bestScore: 0,
    averageTime: 0,
    bestTime: 0,
    gamesPerMode: {
      sandy: { played: 0, wins: 0, losses: 0, forfeited: 0 },
      aida: { played: 0, wins: 0, losses: 0, forfeited: 0 },
      lana: { played: 0, wins: 0, losses: 0, forfeited: 0 },
      enj1n: { played: 0, wins: 0, losses: 0, forfeited: 0 },
      nifty: { played: 0, wins: 0, losses: 0, forfeited: 0 },
      pvp: { played: 0, wins: 0, losses: 0, forfeited: 0 },
      multiplayer: { played: 0, wins: 0, losses: 0, forfeited: 0 },
      tournament: { played: 0, wins: 0, losses: 0, forfeited: 0 },
    },
    currentStreak: 0,
    bestStreak: 0,
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function getWinRate(stats: ApeInPlayerStats, mode?: GameMode): number {
  if (mode) {
    const modeStats = stats.gamesPerMode[mode]
    const total = modeStats.played
    if (total === 0) return 0
    return Math.round((modeStats.wins / total) * 100)
  }
  
  if (stats.totalGames === 0) return 0
  return Math.round((stats.wins / stats.totalGames) * 100)
}

export function getForfeitRate(stats: ApeInPlayerStats, mode?: GameMode): number {
  if (mode) {
    const modeStats = stats.gamesPerMode[mode]
    const total = modeStats.played
    if (total === 0) return 0
    return Math.round((modeStats.forfeited / total) * 100)
  }
  
  if (stats.totalGames === 0) return 0
  return Math.round((stats.forfeits / stats.totalGames) * 100)
}

