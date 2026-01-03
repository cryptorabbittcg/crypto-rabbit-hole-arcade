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
    try {
      // Validate Supabase client is initialized
      if (!this.supabase) {
        console.error("[v0] Supabase client not initialized")
        return null
      }

      // Test connection first
      const testQuery = await this.supabase.from("profiles").select("id").limit(1)
      if (testQuery.error && testQuery.error.code !== "PGRST116") {
        console.error("[v0] Supabase connection test failed:", testQuery.error)
      }

      const normalizedWallet = walletAddress.toLowerCase()
      console.log("[v0] Fetching profile for wallet:", normalizedWallet)

      const { data, error } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("wallet_address", normalizedWallet)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - profile doesn't exist yet
          console.log("[v0] Profile not found for wallet:", normalizedWallet)
          return null
        }
        // Log error in multiple ways to capture all properties
        console.error("[v0] Error fetching profile by wallet - Raw error:", error)
        console.error("[v0] Error fetching profile by wallet - Error type:", typeof error)
        console.error("[v0] Error fetching profile by wallet - Error keys:", Object.keys(error))
        console.error("[v0] Error fetching profile by wallet - Error properties:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          name: (error as any)?.name,
          stack: (error as any)?.stack,
        })
        console.error("[v0] Error fetching profile by wallet - Wallet:", normalizedWallet)
        // Try to stringify with a replacer function
        try {
          console.error("[v0] Error stringified:", JSON.stringify(error, (key, value) => {
            if (value && typeof value === 'object') {
              return Object.getOwnPropertyNames(value).reduce((acc, prop) => {
                acc[prop] = (value as any)[prop]
                return acc
              }, {} as any)
            }
            return value
          }, 2))
        } catch (e) {
          console.error("[v0] Could not stringify error:", e)
        }
        return null
      }

      return data
    } catch (err) {
      console.error("[v0] Exception fetching profile by wallet:", err)
      return null
    }
  }

  async createProfile(params: {
    wallet_address: string
    username: string
    ape_balance?: number
    tickets?: number
    referral_code?: string
  }): Promise<Profile | null> {
    try {
      // Validate Supabase client is initialized
      if (!this.supabase) {
        console.error("[v0] Supabase client not initialized")
        return null
      }

      const normalizedWallet = params.wallet_address.toLowerCase()
      console.log("[v0] Creating profile for wallet:", normalizedWallet, "username:", params.username)

      const insertData = {
        wallet_address: normalizedWallet,
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
      }

      console.log("[v0] Insert data:", insertData)

      const { data, error } = await this.supabase
        .from("profiles")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // Log error in multiple ways to capture all properties
        console.error("[v0] Error creating profile - Raw error:", error)
        console.error("[v0] Error creating profile - Error type:", typeof error)
        console.error("[v0] Error creating profile - Error keys:", Object.keys(error))
        console.error("[v0] Error creating profile - Error properties:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          name: (error as any)?.name,
          stack: (error as any)?.stack,
        })
        console.error("[v0] Error creating profile - Params:", {
          wallet_address: normalizedWallet,
          username: params.username,
        })
        // Try to stringify with a replacer function
        try {
          console.error("[v0] Error stringified:", JSON.stringify(error, (key, value) => {
            if (value && typeof value === 'object') {
              return Object.getOwnPropertyNames(value).reduce((acc, prop) => {
                acc[prop] = (value as any)[prop]
                return acc
              }, {} as any)
            }
            return value
          }, 2))
        } catch (e) {
          console.error("[v0] Could not stringify error:", e)
        }
        return null
      }

      console.log("[v0] Profile created successfully:", data)
      return data
    } catch (err) {
      console.error("[v0] Exception creating profile:", err)
      return null
    }
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
