import { createClient } from "../client"

export type LeaderboardScore = {
  rank: number
  user_id: string
  username: string | null
  wallet_address: string
  score: number
  game_type: string | null
  total_wins?: number
  win_streak?: number
}

export class LeaderboardService {
  private supabase = createClient()

  constructor(supabaseClient?: ReturnType<typeof createClient>) {
    if (supabaseClient) {
      this.supabase = supabaseClient
    }
  }

  /**
   * Get top 10 players by their highest score from any playable game
   * Aggregates scores from game_sessions table
   */
  async getTopScores(limit = 10): Promise<LeaderboardScore[]> {
    // Early return if Supabase is not configured - prevent repeated errors
    if (!this.supabase || typeof this.supabase.rpc !== 'function') {
      return []
    }
    
    try {
      // Get the highest score per user from game_sessions
      // This query gets each user's best score across all games
      const { data, error } = await this.supabase.rpc("get_top_game_scores", {
        p_limit: limit,
      })

      if (error) {
        // Check if it's a network error (Supabase not configured)
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          // Supabase not configured - return empty array silently
          return []
        }
        // Check if RPC function doesn't exist (404) or table doesn't exist
        // Also check for HTTP 404 status or function not found messages
        if (
          error.code === 'P0001' || 
          error.code === '42P01' || 
          error.code === '42883' || // function does not exist
          error.status === 404 ||
          error.message?.includes('does not exist') || 
          error.message?.includes('function') && error.message?.includes('does not exist') ||
          error.message?.includes('could not find a function') ||
          error.message?.includes('No function matches')
        ) {
          // Function or table doesn't exist - return empty array silently (expected for some setups)
          // Stub functions should handle this, but fallback is safe
          return []
        }
        // Only log unexpected errors (not 404s)
        console.error("[v0] Unexpected error fetching top scores:", error)
        return []
      }

      if (!data) return []

      // Map the results to our format
      return data.map((entry: any, index: number) => ({
        rank: index + 1,
        user_id: entry.user_id,
        username: entry.username,
        wallet_address: entry.wallet_address,
        score: entry.max_score || entry.score || 0,
        game_type: entry.game_type,
      }))
    } catch (err: any) {
      // Check if it's a network error (Supabase not configured)
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('ERR_NAME_NOT_RESOLVED')) {
        // Supabase not configured - return empty array silently
        return []
      }
      // Suppress errors for missing functions/tables (expected for legacy features)
      if (
        err?.code === '42P01' || 
        err?.message?.includes('does not exist') ||
        err?.status === 404
      ) {
        return []
      }
      // Only log unexpected errors
      console.error("[v0] Unexpected error fetching top scores:", err)
      return []
    }
  }

  /**
   * Fallback method using direct query if RPC function doesn't exist
   */
  private async getTopScoresDirect(limit = 10): Promise<LeaderboardScore[]> {
    // Early return if Supabase is not configured
    if (!this.supabase || typeof this.supabase.from !== 'function') {
      return []
    }
    
    try {
      // Get highest score per user from game_sessions
      const { data, error } = await this.supabase
        .from("game_sessions")
        .select(
          `
          user_id,
          score,
          game_type,
          profiles!inner(wallet_address, username)
        `,
        )
        .order("score", { ascending: false })
        .limit(limit * 2) // Get more to account for duplicates

      if (error) {
        // Check if it's a network error (Supabase not configured)
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          // Supabase not configured - return empty array silently
          return []
        }
        // Check if table doesn't exist (42P01 = undefined_table)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          // Table doesn't exist - return empty array silently (expected for some setups)
          return []
        }
        // Only log unexpected errors
        console.error("[v0] Error fetching top scores directly:", error)
        return []
      }

      if (!data || data.length === 0) return []

      // Group by user_id and get the highest score for each user
      const userScores = new Map<string, { score: number; username: string | null; wallet_address: string }>()

      for (const entry of data) {
        const userId = entry.user_id
        const currentScore = userScores.get(userId)
        const profile = entry.profiles as any

        if (!currentScore || entry.score > currentScore.score) {
          userScores.set(userId, {
            score: entry.score,
            username: profile?.username || null,
            wallet_address: profile?.wallet_address || "",
          })
        }
      }

      // Convert to array, sort by score, and take top N
      const scores = Array.from(userScores.entries())
        .map(([user_id, data]) => ({
          user_id,
          ...data,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      return scores.map((entry, index) => ({
        rank: index + 1,
        user_id: entry.user_id,
        username: entry.username,
        wallet_address: entry.wallet_address,
        score: entry.score,
        game_type: null,
      }))
    } catch (err) {
      console.error("[v0] Error in getTopScoresDirect:", err)
      return []
    }
  }

  /**
   * Get top scores by total points from leaderboard table
   * This will be used later for the arcade hub points system
   */
  async getTopByPoints(limit = 10): Promise<LeaderboardScore[]> {
    try {
      const { data, error } = await this.supabase.rpc("get_leaderboard", {
        p_limit: limit,
      })

      if (error) {
        // Check if it's a network error or missing function/table
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          return []
        }
        // Check if function doesn't exist (404) or table doesn't exist
        if (error.code === 'P0001' || error.code === '42P01' || error.message?.includes('does not exist')) {
          // Function or table doesn't exist - return empty array silently
          return []
        }
        console.error("[v0] Error fetching leaderboard by points:", error)
        return []
      }

      if (!data) return []

      return data.map((entry: any, index: number) => ({
        rank: entry.rank || index + 1,
        user_id: entry.user_id,
        username: entry.username,
        wallet_address: entry.wallet_address || "",
        score: entry.total_points || 0,
        game_type: null,
        total_wins: entry.total_wins || 0,
        win_streak: entry.win_streak || 0,
      }))
    } catch (err) {
      console.error("[v0] Error fetching top by points:", err)
      return []
    }
  }

  /**
   * Get Ape In leaderboard by mode
   * Modes: 'aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer', 'singleplayer', 'all', 'best'
   */
  async getApeInLeaderboard(mode: string, limit = 100): Promise<ApeInLeaderboardEntry[]> {
    try {
      const { data, error } = await this.supabase.rpc("get_ape_in_leaderboard", {
        p_mode: mode,
        p_limit: limit,
      })

      if (error) {
        // Check if it's a network error or missing function/table
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          return []
        }
        // Check if function doesn't exist (404) or table doesn't exist
        // Also check for HTTP 404 status or function not found messages
        if (
          error.code === 'P0001' || 
          error.code === '42P01' || 
          error.code === '42883' || // function does not exist
          error.status === 404 ||
          error.message?.includes('does not exist') || 
          error.message?.includes('function') && error.message?.includes('does not exist') ||
          error.message?.includes('could not find a function') ||
          error.message?.includes('No function matches')
        ) {
          // Function or table doesn't exist - return empty array silently
          // Stub functions should handle this, but fallback is safe
          return []
        }
        // Only log unexpected errors (not 404s)
        console.error("[v0] Unexpected error fetching Ape In leaderboard:", error)
        return []
      }

      if (!data) return []

      return data.map((entry: any) => ({
        rank: entry.rank || 0,
        user_id: entry.user_id,
        wallet_address: entry.wallet_address || "",
        username: entry.username || null,
        mode: entry.mode || mode,
        best_score: entry.best_score || 0,
        games_played: entry.games_played || 0,
        last_played: entry.last_played || null,
      }))
    } catch (err) {
      console.error("[v0] Error fetching Ape In leaderboard:", err)
      return []
    }
  }
}

export type ApeInLeaderboardEntry = {
  rank: number
  user_id: string
  wallet_address: string
  username: string | null
  mode: string
  best_score: number
  games_played: number
  last_played: string | null
}




