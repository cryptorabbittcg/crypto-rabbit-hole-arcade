// Local player statistics and game session tracking for Cryptoku

export type Difficulty = "noob" | "degen" | "ape"

export interface GameSession {
  id: string
  difficulty: Difficulty
  startTime: Date
  endTime?: Date
  status: "in-progress" | "completed" | "forfeited"
  errors: number
  hintsUsed: number
  timeInSeconds?: number
  score?: number
  verificationProofId?: string
}

export interface PlayerStats {
  totalGames: number
  completions: number
  forfeits: number
  averageTime: number
  bestTime: number
  totalErrors: number
  totalHintsUsed: number
  gamesPerDifficulty: {
    noob: { played: number; completed: number; forfeited: number }
    degen: { played: number; completed: number; forfeited: number }
    ape: { played: number; completed: number; forfeited: number }
  }
  currentStreak: number
  bestStreak: number
  lastPlayed?: Date
}

const STATS_STORAGE_KEY_PREFIX = "cryptoku-player-stats"
const SESSIONS_STORAGE_KEY_PREFIX = "cryptoku-game-sessions"

function normalizeWalletKey(walletAddress?: string | null): string {
  const w = (walletAddress || "").trim().toLowerCase()
  // Keep separate stats per wallet; fall back to a stable "guest" bucket
  return w || "guest"
}

function statsStorageKey(walletAddress?: string | null): string {
  return `${STATS_STORAGE_KEY_PREFIX}:${normalizeWalletKey(walletAddress)}`
}

function sessionsStorageKey(walletAddress?: string | null): string {
  return `${SESSIONS_STORAGE_KEY_PREFIX}:${normalizeWalletKey(walletAddress)}`
}

export function getPlayerStats(walletAddress?: string | null): PlayerStats {
  if (typeof window === "undefined") {
    return getDefaultStats()
  }

  try {
    const stored = window.localStorage.getItem(statsStorageKey(walletAddress))
    if (stored) {
      const stats = JSON.parse(stored) as PlayerStats
      if (stats.lastPlayed) {
        stats.lastPlayed = new Date(stats.lastPlayed)
      }
      return stats
    }
  } catch (error) {
    console.error("Error loading player stats:", error)
  }

  return getDefaultStats()
}

export function savePlayerStats(stats: PlayerStats, walletAddress?: string | null): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(statsStorageKey(walletAddress), JSON.stringify(stats))
  } catch (error) {
    console.error("Error saving player stats:", error)
  }
}

export function getGameSessions(walletAddress?: string | null): GameSession[] {
  if (typeof window === "undefined") return []

  try {
    const stored = window.localStorage.getItem(sessionsStorageKey(walletAddress))
    if (stored) {
      const sessions = JSON.parse(stored) as GameSession[]
      return sessions.map((session) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
      }))
    }
  } catch (error) {
    console.error("Error loading game sessions:", error)
  }

  return []
}

export function saveGameSessions(sessions: GameSession[], walletAddress?: string | null): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(sessionsStorageKey(walletAddress), JSON.stringify(sessions))
  } catch (error) {
    console.error("Error saving game sessions:", error)
  }
}

export function startGameSession(difficulty: Difficulty, walletAddress?: string | null): GameSession {
  const session: GameSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    difficulty,
    startTime: new Date(),
    status: "in-progress",
    errors: 0,
    hintsUsed: 0,
  }

  const sessions = getGameSessions(walletAddress)
  sessions.push(session)
  saveGameSessions(sessions, walletAddress)

  return session
}

export function completeGameSession(
  sessionId: string,
  timeInSeconds: number,
  errors: number,
  hintsUsed: number,
  score: number,
  verificationProofId?: string,
  walletAddress?: string | null,
): void {
  const sessions = getGameSessions(walletAddress)
  const session = sessions.find((s) => s.id === sessionId)

  if (!session) return

  session.status = "completed"
  session.endTime = new Date()
  session.timeInSeconds = timeInSeconds
  session.errors = errors
  session.hintsUsed = hintsUsed
  session.score = score
  session.verificationProofId = verificationProofId

  saveGameSessions(sessions, walletAddress)
  updateStatsOnCompletion(session, walletAddress)
}

export function forfeitGameSession(sessionId: string, errors: number, hintsUsed: number, walletAddress?: string | null): void {
  const sessions = getGameSessions(walletAddress)
  const session = sessions.find((s) => s.id === sessionId)

  if (!session) return

  session.status = "forfeited"
  session.endTime = new Date()
  session.errors = errors
  session.hintsUsed = hintsUsed

  saveGameSessions(sessions, walletAddress)
  updateStatsOnForfeit(session, walletAddress)
}

function updateStatsOnCompletion(session: GameSession, walletAddress?: string | null): void {
  const stats = getPlayerStats(walletAddress)

  stats.totalGames++
  stats.completions++
  stats.totalErrors += session.errors
  stats.totalHintsUsed += session.hintsUsed
  stats.lastPlayed = session.endTime

  const diffStats = stats.gamesPerDifficulty[session.difficulty]
  diffStats.played++
  diffStats.completed++

  if (session.timeInSeconds != null) {
    const totalGames = stats.completions
    stats.averageTime = Math.floor(
      (stats.averageTime * (totalGames - 1) + session.timeInSeconds) / totalGames,
    )

    if (stats.bestTime === 0 || session.timeInSeconds < stats.bestTime) {
      stats.bestTime = session.timeInSeconds
    }
  }

  stats.currentStreak++
  if (stats.currentStreak > stats.bestStreak) {
    stats.bestStreak = stats.currentStreak
  }

  savePlayerStats(stats, walletAddress)
}

function updateStatsOnForfeit(session: GameSession, walletAddress?: string | null): void {
  const stats = getPlayerStats(walletAddress)

  stats.totalGames++
  stats.forfeits++
  stats.totalErrors += session.errors
  stats.totalHintsUsed += session.hintsUsed
  stats.lastPlayed = session.endTime
  stats.currentStreak = 0

  const diffStats = stats.gamesPerDifficulty[session.difficulty]
  diffStats.played++
  diffStats.forfeited++

  savePlayerStats(stats, walletAddress)
}

export function getActiveSession(walletAddress?: string | null): GameSession | null {
  const sessions = getGameSessions(walletAddress)
  return sessions.find((s) => s.status === "in-progress") ?? null
}

function getDefaultStats(): PlayerStats {
  return {
    totalGames: 0,
    completions: 0,
    forfeits: 0,
    averageTime: 0,
    bestTime: 0,
    totalErrors: 0,
    totalHintsUsed: 0,
    gamesPerDifficulty: {
      noob: { played: 0, completed: 0, forfeited: 0 },
      degen: { played: 0, completed: 0, forfeited: 0 },
      ape: { played: 0, completed: 0, forfeited: 0 },
    },
    currentStreak: 0,
    bestStreak: 0,
  }
}

export function getCompletionRate(stats: PlayerStats): number {
  if (stats.totalGames === 0) return 0
  return Math.round((stats.completions / stats.totalGames) * 100)
}

export function getForfeitRate(stats: PlayerStats): number {
  if (stats.totalGames === 0) return 0
  return Math.round((stats.forfeits / stats.totalGames) * 100)
}

export function resetPlayerStats(): void {
  if (typeof window === "undefined") return
  // Backward compatible: remove the legacy global keys too (older builds)
  window.localStorage.removeItem(STATS_STORAGE_KEY_PREFIX)
  window.localStorage.removeItem(SESSIONS_STORAGE_KEY_PREFIX)
  // NOTE: per-wallet keys are now used; if you need to clear a specific wallet,
  // you can remove `cryptoku-player-stats:<wallet>` and `cryptoku-game-sessions:<wallet>` directly.
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}


