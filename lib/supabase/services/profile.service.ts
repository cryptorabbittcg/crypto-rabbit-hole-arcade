import { createClient } from "../client"
import type { Profile } from "../database.types"

export class ProfileService {
  private supabase = createClient()

  constructor(supabaseClient?: ReturnType<typeof createClient>) {
    if (supabaseClient) {
      this.supabase = supabaseClient
    }
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("[v0] Error fetching profile:", error)
      return null
    }

    return data
  }

  async getProfileByWallet(walletAddress: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - profile doesn't exist yet
        return null
      }
      console.error("[v0] Error fetching profile by wallet:", error)
      return null
    }

    return data
  }

  async createProfile(params: {
    wallet_address: string
    username: string
    ape_balance?: number
    tickets?: number
    referral_code?: string
  }): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .insert({
        wallet_address: params.wallet_address.toLowerCase(),
        username: params.username,
        ape_balance: params.ape_balance ?? 0,
        ticket_balance: params.tickets ?? 0,
        referral_code: params.referral_code || null,
        total_games_played: 0,
        total_wins: 0,
        total_losses: 0,
        win_streak: 0,
        highest_win_streak: 0,
        total_points: 0,
        level: 1,
        experience: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating profile:", error)
      return null
    }

    return data
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
    const { error } = await this.supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      console.error("[v0] Error updating profile:", error)
      return false
    }

    return true
  }

  async updateBalance(userId: string, apeChange = 0, ticketChange = 0, pointsChange = 0): Promise<boolean> {
    const { error } = await this.supabase.rpc("update_user_balance", {
      p_user_id: userId,
      p_ape_change: apeChange,
      p_ticket_change: ticketChange,
      p_points_change: pointsChange,
    })

    if (error) {
      console.error("[v0] Error updating balance:", error)
      return false
    }

    return true
  }

  async recordGameResult(userId: string, won: boolean, pointsEarned: number): Promise<boolean> {
    const { error } = await this.supabase.rpc("record_game_result", {
      p_user_id: userId,
      p_won: won,
      p_points_earned: pointsEarned,
    })

    if (error) {
      console.error("[v0] Error recording game result:", error)
      return false
    }

    return true
  }
}
