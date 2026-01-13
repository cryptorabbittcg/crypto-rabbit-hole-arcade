import { createClient, hasSupabaseConfig } from "../client"
import type { Profile } from "../database.types"
import type { SupabaseClient } from "@supabase/supabase-js"

// Minimal database schema type for SupabaseClient
// Note: Full database types would be generated from Supabase, but this provides type safety
type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile & { tickets?: number; linked_wallets?: Array<{ address: string; type: string; linkedAt: string }> }
        Insert: unknown
        Update: unknown
      }
    }
    Functions: Record<string, unknown>
    Views: Record<string, unknown>
  }
}

export class ProfileService {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient ?? (createClient() as SupabaseClient<Database>)
  }

  /**
   * Check if Supabase is configured before making requests
   */
  private isConfigured(): boolean {
    return hasSupabaseConfig()
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
      // Check if Supabase is configured before making requests
      if (!this.isConfigured()) {
        // Silently return null if Supabase is not configured (prevents error spam)
        return null
      }

      // Validate Supabase client is initialized
      if (!this.supabase) {
        console.error("[ProfileService] Supabase client not initialized")
        return null
      }

      const normalizedWallet = walletAddress.toLowerCase()

      const { data, error } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("wallet_address", normalizedWallet)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - profile doesn't exist yet (this is expected)
          return null
        }
        // Only log non-expected errors
        if (!error.message?.includes("Failed to fetch") && !error.message?.includes("ERR_NAME_NOT_RESOLVED")) {
          console.warn("[ProfileService] Error fetching profile by wallet:", {
            code: error.code,
            message: error.message,
            wallet: normalizedWallet.substring(0, 10) + "...",
          })
        }
        return null
      }

      return data
    } catch (err: unknown) {
      // Only log if it's not a network error (prevents spam)
      const error = err as { message?: string }
      if (!error?.message?.includes("Failed to fetch") && !error?.message?.includes("ERR_NAME_NOT_RESOLVED")) {
        console.error("[ProfileService] Exception fetching profile by wallet:", error?.message || err)
      }
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
      // Check if Supabase is configured before making requests
      if (!this.isConfigured()) {
        // Silently return null if Supabase is not configured (prevents error spam)
        return null
      }

      // Validate Supabase client is initialized
      if (!this.supabase) {
        console.error("[ProfileService] Supabase client not initialized")
        return null
      }

      const normalizedWallet = params.wallet_address.toLowerCase()

      const insertData = {
        wallet_address: normalizedWallet,
        username: params.username,
        ape_balance: params.ape_balance ?? 1000,
        tickets: params.tickets ?? 5,
        referral_code: params.referral_code || null,
        total_games_played: 0,
        total_wins: 0,
        total_losses: 0,
        win_streak: 0,
        best_win_streak: 0,
      }

      const { data, error } = await this.supabase
        .from("profiles")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // Only log non-network errors
        if (!error.message?.includes("Failed to fetch") && !error.message?.includes("ERR_NAME_NOT_RESOLVED")) {
          console.warn("[ProfileService] Error creating profile:", {
            code: error.code,
            message: error.message,
            wallet: normalizedWallet.substring(0, 10) + "...",
          })
        }
        return null
      }

      return data
    } catch (err: unknown) {
      // Only log if it's not a network error (prevents spam)
      const error = err as { message?: string }
      if (!error?.message?.includes("Failed to fetch") && !error?.message?.includes("ERR_NAME_NOT_RESOLVED")) {
        console.error("[ProfileService] Exception creating profile:", error?.message || err)
      }
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

  // Static wrapper methods for convenience
  static async getProfile(walletAddress: string): Promise<Profile | null> {
    const service = new ProfileService()
    return service.getProfileByWallet(walletAddress)
  }

  static async createProfile(params: {
    wallet_address: string
    username: string
    ape_balance?: number
    ticket_balance?: number
    referral_code?: string
  }): Promise<Profile | null> {
    const service = new ProfileService()
    return service.createProfile({
      wallet_address: params.wallet_address,
      username: params.username,
      ape_balance: params.ape_balance,
      tickets: params.ticket_balance,
      referral_code: params.referral_code,
    })
  }

  static async updateBalance(walletAddress: string, balances: { ape_balance: number; ticket_balance: number }): Promise<boolean> {
    const service = new ProfileService()
    const profile = await service.getProfileByWallet(walletAddress)
    if (!profile) {
      return false
    }
    // Calculate the changes needed
    const apeChange = balances.ape_balance - profile.ape_balance
    // Access tickets field (database uses 'tickets', types file may be outdated)
    // Type assertion needed due to schema/type mismatch
    const profileWithTickets = profile as Profile & { tickets?: number }
    const currentTickets = profileWithTickets.tickets ?? profile.ticket_balance ?? 0
    const ticketChange = balances.ticket_balance - currentTickets
    return service.updateBalance(profile.id, apeChange, ticketChange, 0)
  }

  static async updateProfile(walletAddress: string, updates: Partial<Profile>): Promise<boolean> {
    const service = new ProfileService()
    const profile = await service.getProfileByWallet(walletAddress)
    if (!profile) {
      return false
    }
    return service.updateProfile(profile.id, updates)
  }

  /**
   * Get linked wallets for a profile
   */
  async getLinkedWallets(userId: string): Promise<Array<{ address: string; type: string; linkedAt: string }>> {
    if (!this.isConfigured()) {
      return []
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select("linked_wallets")
      .eq("id", userId)
      .single()

    if (error || !data) {
      return []
    }

    return (data.linked_wallets as Array<{ address: string; type: string; linkedAt: string }>) || []
  }

  /**
   * Add a linked wallet to a profile
   */
  async addLinkedWallet(
    userId: string,
    linkedAddress: string,
    type: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    // Normalize and validate wallet type (defensive allowlist check)
    const normalizedType = type.toLowerCase()
    const ALLOWED_WALLET_TYPES = ["metamask"] as const
    if (!ALLOWED_WALLET_TYPES.includes(normalizedType as (typeof ALLOWED_WALLET_TYPES)[number])) {
      return false // Invalid wallet type
    }

    // Get current linked wallets
    const current = await this.getLinkedWallets(userId)

    // Check if already linked
    const normalizedLinked = linkedAddress.toLowerCase()
    if (current.some((w) => w.address.toLowerCase() === normalizedLinked)) {
      return false // Already linked
    }

    // Check limit (max 5)
    if (current.length >= 5) {
      return false // Too many linked wallets
    }

    // Add new linked wallet (type normalized to lowercase)
    const newWallet = {
      address: normalizedLinked,
      type: normalizedType,
      linkedAt: new Date().toISOString(),
    }

    const updated = [...current, newWallet]

    // Only update linked_wallets and updated_at fields (safety check)
    const { error } = await this.supabase
      .from("profiles")
      .update({ linked_wallets: updated, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      console.error("[ProfileService] Error adding linked wallet:", error)
      return false
    }

    return true
  }

  /**
   * Remove a linked wallet from a profile
   */
  async removeLinkedWallet(userId: string, linkedAddress: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    // Get current linked wallets
    const current = await this.getLinkedWallets(userId)

    // Filter out the wallet to remove
    const normalizedLinked = linkedAddress.toLowerCase()
    const updated = current.filter((w) => w.address.toLowerCase() !== normalizedLinked)

    // If no change, wallet wasn't linked
    if (updated.length === current.length) {
      return false
    }

    // Only update linked_wallets and updated_at fields (safety check)
    const { error } = await this.supabase
      .from("profiles")
      .update({ linked_wallets: updated, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      console.error("[ProfileService] Error removing linked wallet:", error)
      return false
    }

    return true
  }
}
