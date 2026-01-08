import { createClient } from "../client"
import type { GameSession } from "../database.types"

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
        duration_seconds: 0,
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
        duration_seconds: durationSeconds,
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

  // Static wrapper method for convenience
  static async getRecentGames(walletAddress: string, limit: number): Promise<GameSession[]> {
    // First get the profile by wallet to get the user_id
    const { ProfileService } = await import("./profile.service")
    const profile = await ProfileService.getProfile(walletAddress)
    if (!profile) {
      return []
    }
    const service = new GameService()
    return service.getUserGameHistory(profile.id, limit)
  }
}
