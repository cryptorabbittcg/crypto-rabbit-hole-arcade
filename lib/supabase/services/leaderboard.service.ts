import { createClient } from "../client"

export type LeaderboardScore = {
  rank: number
  user_id: string
  username: string | null
  wallet_address: string
  score: number
  game_type: string | null
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
    try {
      // Get the highest score per user from game_sessions
      // This query gets each user's best score across all games
      const { data, error } = await this.supabase.rpc("get_top_game_scores", {
        p_limit: limit,
      })

      if (error) {
        // If the RPC function doesn't exist, fall back to a direct query
        console.warn("[v0] RPC function not found, using direct query:", error)
        return await this.getTopScoresDirect(limit)
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
    } catch (err) {
      console.error("[v0] Error fetching top scores:", err)
      return []
    }
  }

  /**
   * Fallback method using direct query if RPC function doesn't exist
   */
  private async getTopScoresDirect(limit = 10): Promise<LeaderboardScore[]> {
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
        console.error("[v0] Error fetching leaderboard by points:", error)
        return []
      }

      if (!data) return []

      return data.map((entry: any, index: number) => ({
        rank: entry.rank || index + 1,
        user_id: entry.user_id,
        username: entry.username,
        wallet_address: "", // Will need to join with profiles if needed
        score: entry.total_points || 0,
        game_type: null,
      }))
    } catch (err) {
      console.error("[v0] Error fetching top by points:", err)
      return []
    }
  }
}




