import { createClient } from "../client"
import type { PvPMatch } from "../database.types"

export class PvPService {
  private supabase = createClient()

  async findMatch(userId: string, cardId: string): Promise<PvPMatch | null> {
    // First, try to join an existing waiting match
    const { data: waitingMatch } = await this.supabase
      .from("pvp_matches")
      .select("*")
      .eq("match_status", "waiting")
      .neq("player1_id", userId)
      .limit(1)
      .single()

    if (waitingMatch) {
      // Join the waiting match
      const { data, error } = await this.supabase
        .from("pvp_matches")
        .update({
          player2_id: userId,
          player2_card_id: cardId,
          match_status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", waitingMatch.id)
        .select()
        .single()

      if (error) {
        console.error("[v0] Error joining match:", error)
        return null
      }

      return data
    }

    // No waiting match found, create a new one
    const { data, error } = await this.supabase
      .from("pvp_matches")
      .insert({
        player1_id: userId,
        player1_card_id: cardId,
        match_status: "waiting",
        player1_health: 100,
        player2_health: 100,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating match:", error)
      return null
    }

    return data
  }

  async getMatch(matchId: string): Promise<PvPMatch | null> {
    const { data, error } = await this.supabase.from("pvp_matches").select("*").eq("id", matchId).single()

    if (error) {
      console.error("[v0] Error fetching match:", error)
      return null
    }

    return data
  }

  async updateMatchHealth(
    matchId: string,
    player1Health: number,
    player2Health: number,
    turnCount: number,
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from("pvp_matches")
      .update({
        player1_health: player1Health,
        player2_health: player2Health,
        turn_count: turnCount,
      })
      .eq("id", matchId)

    if (error) {
      console.error("[v0] Error updating match health:", error)
      return false
    }

    return true
  }

  async completeMatch(matchId: string, winnerId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("pvp_matches")
      .update({
        winner_id: winnerId,
        match_status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId)

    if (error) {
      console.error("[v0] Error completing match:", error)
      return false
    }

    return true
  }

  async subscribeToMatch(matchId: string, callback: (match: PvPMatch) => void) {
    type RealtimePayload<T> = { new: T | null; old: T | null }
    return this.supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pvp_matches",
          filter: `id=eq.${matchId}`,
        },
        (payload: RealtimePayload<PvPMatch>) => {
          if (payload.new) callback(payload.new)
        },
      )
      .subscribe()
  }
}
