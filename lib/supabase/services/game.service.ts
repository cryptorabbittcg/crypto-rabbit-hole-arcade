import { createClient } from "../client"
import type { GameSession } from "../database.types"

/**
 * Normalized game session data structure
 * Used for consistent field names across the application
 */
export type NormalizedGameSession = {
  id: string
  createdAt: string
  durationSeconds: number
  gameType: string
  gameMode: string | null
  score: number
  pointsEarned: number
}

export class GameService {
  private supabase = createClient()

  async createGameSession(
    userId: string,
    gameType: GameSession["game_type"],
    metadata: Record<string, any> = {},
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("game_sessions")
      .insert({
        user_id: userId,
        game_type: gameType,
        score: 0,
        points_earned: 0,
        ape_earned: 0,
        tickets_earned: 0,
        duration: 0,
        result: "incomplete",
        metadata,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[v0] Error creating game session:", error)
      return null
    }

    return data.id
  }

  async completeGameSession(
    sessionId: string,
    score: number,
    result: GameSession["result"],
    pointsEarned: number,
    apeEarned: number,
    ticketsEarned: number,
    durationSeconds: number,
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from("game_sessions")
      .update({
        score,
        result,
        points_earned: pointsEarned,
        ape_earned: apeEarned,
        tickets_earned: ticketsEarned,
        duration: durationSeconds,
      })
      .eq("id", sessionId)

    if (error) {
      console.error("[v0] Error completing game session:", error)
      return false
    }

    return true
  }

  async getUserGameHistory(userId: string, limit = 10): Promise<GameSession[]> {
    const { data, error } = await this.supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching game history:", error)
      return []
    }

    return data || []
  }

  /**
   * Get recent games with normalized field names
   * Orders by started_at (primary) or created_at (fallback)
   * Normalizes duration/duration_seconds to durationSeconds
   * Normalizes started_at/created_at to createdAt
   */
  async getRecentGamesNormalized(userId: string, limit = 10): Promise<NormalizedGameSession[]> {
    const { data, error } = await this.supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false, nullsLast: true })
      .limit(limit)

    if (error) {
      // If started_at ordering fails, try created_at
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from("game_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (fallbackError) {
        console.error("[GameService] Error fetching game history:", fallbackError)
        return []
      }

      return (fallbackData || []).map(this.normalizeGameSession)
    }

    return (data || []).map(this.normalizeGameSession)
  }

  /**
   * Normalize a game session record to consistent field names
   */
  private normalizeGameSession = (session: any): NormalizedGameSession => {
    // Normalize timestamp: prefer started_at, fallback to created_at
    const createdAt = session.started_at || session.created_at || new Date().toISOString()

    // Normalize duration: prefer duration, fallback to duration_seconds
    const durationSeconds = session.duration ?? session.duration_seconds ?? 0

    return {
      id: session.id,
      createdAt,
      durationSeconds,
      gameType: session.game_type || "",
      gameMode: session.game_mode || null,
      score: session.score || 0,
      pointsEarned: session.points_earned || 0,
    }
  }

  // Static wrapper method for convenience
  static async getRecentGames(walletAddress: string, limit: number): Promise<NormalizedGameSession[]> {
    // First get the profile by wallet to get the user_id
    const { ProfileService } = await import("./profile.service")
    const serviceInstance = new ProfileService()
    const profile = await serviceInstance.getProfileByWallet(walletAddress)
    if (!profile) {
      return []
    }
    const service = new GameService()
    return service.getRecentGamesNormalized(profile.id, limit)
  }
}
