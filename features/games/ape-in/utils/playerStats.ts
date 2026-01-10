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
  }
  currentStreak: number
  bestStreak: number
  lastPlayed?: Date
}

const STATS_STORAGE_KEY = "ape-in-player-stats"
const SESSIONS_STORAGE_KEY = "ape-in-game-sessions"

export function getPlayerStats(): ApeInPlayerStats {
  if (typeof window === "undefined") {
    return getDefaultStats()
  }

  try {
    const stored = window.localStorage.getItem(STATS_STORAGE_KEY)
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

export function savePlayerStats(stats: ApeInPlayerStats): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats))
  } catch (error) {
    console.error("Error saving Ape In player stats:", error)
  }
}

export function getGameSessions(): ApeInGameSession[] {
  if (typeof window === "undefined") return []

  try {
    const stored = window.localStorage.getItem(SESSIONS_STORAGE_KEY)
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

export function saveGameSessions(sessions: ApeInGameSession[]): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.error("Error saving Ape In game sessions:", error)
  }
}

export function startGameSession(gameMode: GameMode): ApeInGameSession {
  const session: ApeInGameSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    gameMode,
    startTime: new Date(),
    status: "in-progress",
    playerScore: 0,
    opponentScore: 0,
  }

  const sessions = getGameSessions()
  sessions.push(session)
  saveGameSessions(sessions)

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
): void {
  const sessions = getGameSessions()
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

  saveGameSessions(sessions)
  updateStatsOnCompletion(session, playerName)
}

export function forfeitGameSession(sessionId: string): void {
  const sessions = getGameSessions()
  const session = sessions.find((s) => s.id === sessionId)

  if (!session) return

  session.status = "forfeited"
  session.endTime = new Date()

  saveGameSessions(sessions)
  updateStatsOnForfeit(session)
}

function updateStatsOnCompletion(session: ApeInGameSession, playerName?: string): void {
  const stats = getPlayerStats()
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

  savePlayerStats(stats)
}

function updateStatsOnForfeit(session: ApeInGameSession): void {
  const stats = getPlayerStats()

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

  savePlayerStats(stats)
}

export function getActiveSession(): ApeInGameSession | null {
  const sessions = getGameSessions()
  return sessions.find((s) => s.status === "in-progress") || null
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

