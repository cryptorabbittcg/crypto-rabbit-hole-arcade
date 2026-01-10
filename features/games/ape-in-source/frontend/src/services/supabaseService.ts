/**
 * Supabase Service
 * Handles queries to Supabase game_sessions and profiles tables
 * All functions are non-blocking and return safe fallbacks when Supabase is not configured
 */

import { supabase, hasSupabaseConfig } from '../lib/supabase/client'

export interface GameSession {
  id: string
  user_id?: string
  wallet_address: string
  game_type: string
  game_mode: string
  game_subtype: string
  score: number
  result?: 'WIN' | 'DRAW' | 'LOSS' | 'FORFEIT'
  points_earned?: number
  duration_ms?: number
  created_at: string
  profiles?: {
    wallet_address: string
    username?: string
    avatar_url?: string
  }
}

export interface LeaderboardEntry {
  rank: number
  walletAddress: string
  username?: string
  avatarUrl?: string
  score: number
  gameMode: string
  timeSeconds?: number
  createdAt: string
}

export interface PlayerStats {
  totalGames: number
  wins: number
  losses: number
  winRate: number
  totalPoints: number
  averageScore: number
  bestScore: number
  currentWinStreak: number
  bestWinStreak: number
  totalPlayTime: number
  averageTime: number
  bestTime?: number
  modeBreakdown: Record<string, {
    games: number
    wins: number
    bestScore: number
  }>
  subtypeBreakdown: Record<string, {
    games: number
    wins: number
    bestScore: number
  }>
}

/**
 * Fetch leaderboard entries from Supabase
 * @param subtype - Filter by game_subtype ('single_player', 'pvp', 'multiplayer', or null for all)
 * @param limit - Number of entries to return
 * @returns Promise<LeaderboardEntry[]> - Empty array if Supabase not configured or on error
 */
export async function fetchLeaderboard(
  subtype: 'single_player' | 'pvp' | 'multiplayer' | null = null,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  // Non-blocking: return empty array if Supabase not configured
  if (!supabase || !hasSupabaseConfig()) {
    return []
  }

  try {
    // Build query parameters
    const params: Record<string, string> = {
      select: 'score,game_mode,duration_ms,created_at,wallet_address,profiles!inner(wallet_address,username,avatar_url)',
      game_type: 'eq.ape_in',
      game_mode: 'neq.sandy', // Exclude Sandy mode
      order: 'score.desc',
      limit: limit.toString(),
    }

    // Filter by subtype if provided
    if (subtype) {
      params.game_subtype = `eq.${subtype}`
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `${supabase.url}/rest/v1/game_sessions?${queryString}`

    const response = await fetch(url, {
      headers: supabase.headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('❌ Supabase leaderboard query error:', response.status, errorText)
      return []
    }

    const data = await response.json()

    if (!data || !Array.isArray(data) || data.length === 0) {
      return []
    }

    // Group by wallet_address and get best score per user
    const userBestScores = new Map<string, { session: GameSession; rank: number }>()
    
    data.forEach((session: any) => {
      const addr = session.wallet_address?.toLowerCase() || ''
      if (!addr) return

      const existing = userBestScores.get(addr)
      if (!existing || session.score > existing.session.score) {
        userBestScores.set(addr, { session: session as GameSession, rank: 0 })
      }
    })

    // Sort by score and assign ranks
    const entries: LeaderboardEntry[] = Array.from(userBestScores.values())
      .sort((a, b) => b.session.score - a.session.score)
      .map((entry, index) => ({
        rank: index + 1,
        walletAddress: entry.session.wallet_address,
        username: entry.session.profiles?.username,
        avatarUrl: entry.session.profiles?.avatar_url,
        score: entry.session.score,
        gameMode: entry.session.game_mode,
        timeSeconds: entry.session.duration_ms ? Math.floor(entry.session.duration_ms / 1000) : undefined,
        createdAt: entry.session.created_at,
      }))

    return entries
  } catch (error) {
    // Catch all errors to prevent UI blocking
    console.error('❌ Error fetching leaderboard (non-blocking):', error)
    return []
  }
}

/**
 * Fetch player stats from Supabase
 * @param walletAddress - Player's wallet address
 * @returns Promise<PlayerStats | null> - null if Supabase not configured or on error
 */
export async function fetchPlayerStats(walletAddress: string): Promise<PlayerStats | null> {
  if (!walletAddress) return null

  // Non-blocking: return null if Supabase not configured
  if (!supabase || !hasSupabaseConfig()) {
    return null
  }

  try {
    const params = new URLSearchParams({
      select: 'score,game_mode,game_subtype,duration_ms,created_at,points_earned,result',
      wallet_address: `eq.${walletAddress.toLowerCase()}`,
      game_type: 'eq.ape_in',
      order: 'created_at.desc',
    })

    const url = `${supabase.url}/rest/v1/game_sessions?${params}`

    const response = await fetch(url, {
      headers: supabase.headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('❌ Supabase player stats query error:', response.status, errorText)
      return null
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPoints: 0,
        averageScore: 0,
        bestScore: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        totalPlayTime: 0,
        averageTime: 0,
        modeBreakdown: {},
        subtypeBreakdown: {},
      }
    }

    // Filter out Sandy mode
    const filteredSessions = data.filter((s: any) => s.game_mode !== 'sandy')

    if (filteredSessions.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPoints: 0,
        averageScore: 0,
        bestScore: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        totalPlayTime: 0,
        averageTime: 0,
        modeBreakdown: {},
        subtypeBreakdown: {},
      }
    }

    // Calculate stats from existing scores
    let wins = 0
    let losses = 0
    let totalScore = 0
    let totalPoints = 0
    let bestScore = 0
    let totalPlayTime = 0
    let bestTime: number | undefined

    const modeBreakdown: Record<string, { games: number; wins: number; bestScore: number }> = {}
    const subtypeBreakdown: Record<string, { games: number; wins: number; bestScore: number }> = {}

    let currentStreak = 0
    let bestStreak = 0

    // Process sessions in chronological order for streaks
    const sortedSessions = [...filteredSessions].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    sortedSessions.forEach((session: any) => {
      // Use result field if available, otherwise infer from score for legacy data
      const hasResult = session.result !== undefined && session.result !== null
      const isWin = session.result === 'WIN' || (!hasResult && session.score && session.score > 0)
      const isLoss = session.result === 'LOSS' || session.result === 'FORFEIT'
      const isDraw = session.result === 'DRAW'
      
      if (isWin && !isDraw) {
        wins++
        currentStreak++
        if (currentStreak > bestStreak) bestStreak = currentStreak
      } else if (isLoss || isDraw) {
        losses++
        currentStreak = 0
      }

      // Aggregate existing scores
      if (session.score) {
        totalScore += session.score
        if (session.score > bestScore) bestScore = session.score
      }

      if (session.points_earned) {
        totalPoints += session.points_earned
      }

      if (session.duration_ms) {
        const seconds = Math.floor(session.duration_ms / 1000)
        totalPlayTime += seconds
        if (!bestTime || seconds < bestTime) bestTime = seconds
      }

      // Mode breakdown
      const mode = session.game_mode || 'unknown'
      if (!modeBreakdown[mode]) {
        modeBreakdown[mode] = { games: 0, wins: 0, bestScore: 0 }
      }
      modeBreakdown[mode].games++
      if (isWin) modeBreakdown[mode].wins++
      if (session.score && session.score > modeBreakdown[mode].bestScore) {
        modeBreakdown[mode].bestScore = session.score
      }

      // Subtype breakdown
      const subtype = session.game_subtype || 'unknown'
      if (!subtypeBreakdown[subtype]) {
        subtypeBreakdown[subtype] = { games: 0, wins: 0, bestScore: 0 }
      }
      subtypeBreakdown[subtype].games++
      if (isWin) subtypeBreakdown[subtype].wins++
      if (session.score && session.score > subtypeBreakdown[subtype].bestScore) {
        subtypeBreakdown[subtype].bestScore = session.score
      }
    })

    const totalGames = wins + losses
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0
    const averageScore = wins > 0 ? totalScore / wins : 0
    const averageTime = totalGames > 0 ? totalPlayTime / totalGames : 0

    // Calculate current streak from most recent games (reverse chronological)
    currentStreak = 0
    for (let i = sortedSessions.length - 1; i >= 0; i--) {
      const session = sortedSessions[i]
      const hasResult = session.result !== undefined && session.result !== null
      const isWin = session.result === 'WIN' || (!hasResult && session.score && session.score > 0)
      const isLoss = session.result === 'LOSS' || session.result === 'FORFEIT'
      
      if (isWin && !isLoss) {
        currentStreak++
      } else {
        break
      }
    }

    return {
      totalGames,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100,
      totalPoints,
      averageScore: Math.round(averageScore),
      bestScore,
      currentWinStreak: currentStreak,
      bestWinStreak: bestStreak,
      totalPlayTime,
      averageTime: Math.round(averageTime),
      bestTime,
      modeBreakdown,
      subtypeBreakdown,
    }
  } catch (error) {
    // Catch all errors to prevent UI blocking
    console.error('❌ Error fetching player stats (non-blocking):', error)
    return null
  }
}

/**
 * Re-export hasSupabaseConfig for convenience
 */
export { hasSupabaseConfig }
