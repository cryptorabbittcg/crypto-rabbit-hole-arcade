import { createClient, hasSupabaseConfig } from "../client"
import { ProfileService } from "./profile.service"

export interface PlayerHints {
  hintBalance: number
  gamesUntilNextFreeHint: number
  totalRankedCompleted: number
}

const HINTS_DEFAULT: PlayerHints = {
  hintBalance: 3,
  gamesUntilNextFreeHint: 10,
  totalRankedCompleted: 0,
}

export class CryptokuHintsService {
  private supabase = createClient()
  private profileService = new ProfileService(this.supabase)

  constructor(supabaseClient?: ReturnType<typeof createClient>) {
    if (supabaseClient) {
      this.supabase = supabaseClient
      this.profileService = new ProfileService(supabaseClient)
    }
  }

  /**
   * Check if Supabase is configured
   */
  private isConfigured(): boolean {
    return hasSupabaseConfig()
  }

  /**
   * Get hints for a user by wallet address
   * Includes one-time migration from localStorage (client-side only)
   */
  async getHintsByWallet(walletAddress: string): Promise<PlayerHints> {
    try {
      if (!this.isConfigured()) {
        return this.getHintsFromLocalStorage(walletAddress) || HINTS_DEFAULT
      }

      // Get profile to get user_id
      const profile = await this.profileService.getProfileByWallet(walletAddress)
      if (!profile) {
        // No profile exists, return default
        return HINTS_DEFAULT
      }

      // Try migration from localStorage (one-time, client-side only)
      // Skip on server-side to prevent timeouts
      if (typeof window !== "undefined") {
        await this.migrateFromLocalStorage(walletAddress, profile.id)
      }

      return this.getHints(profile.id)
    } catch (error) {
      console.error("[CryptokuHintsService] Error getting hints:", error)
      // Only try localStorage fallback on client-side
      if (typeof window !== "undefined") {
        return this.getHintsFromLocalStorage(walletAddress) || HINTS_DEFAULT
      }
      return HINTS_DEFAULT
    }
  }

  /**
   * Get hints for a user by user_id
   */
  async getHints(userId: string): Promise<PlayerHints> {
    try {
      if (!this.isConfigured()) {
        return HINTS_DEFAULT
      }

      const { data, error } = await this.supabase
        .from("cryptoku_hints")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No record found, create default
          const created = await this.createDefaultHints(userId)
          return created
        }
        console.error("[CryptokuHintsService] Error fetching hints:", error)
        return HINTS_DEFAULT
      }

      // Calculate gamesUntilNextFreeHint
      const gamesUntilNext = 10 - (data.total_ranked_completed % 10)

      return {
        hintBalance: data.hint_balance,
        gamesUntilNextFreeHint: gamesUntilNext,
        totalRankedCompleted: data.total_ranked_completed,
      }
    } catch (error) {
      console.error("[CryptokuHintsService] Exception getting hints:", error)
      return HINTS_DEFAULT
    }
  }

  /**
   * Use a hint (atomic operation via SQL function)
   */
  async useHint(userId: string): Promise<{ success: boolean; hints: PlayerHints; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return { success: false, hints: HINTS_DEFAULT, error: "Database not configured" }
      }

      const { data, error } = await this.supabase.rpc("use_cryptoku_hint", {
        p_user_id: userId,
      })

      if (error) {
        console.error("[CryptokuHintsService] Error using hint:", error)
        return { success: false, hints: HINTS_DEFAULT, error: error.message }
      }

      if (!data.success) {
        return {
          success: false,
          hints: await this.getHints(userId),
          error: data.error || "Failed to use hint",
        }
      }

      return {
        success: true,
        hints: {
          hintBalance: data.hintBalance,
          gamesUntilNextFreeHint: data.gamesUntilNextFreeHint,
          totalRankedCompleted: (await this.getHints(userId)).totalRankedCompleted,
        },
      }
    } catch (error) {
      console.error("[CryptokuHintsService] Exception using hint:", error)
      return { success: false, hints: HINTS_DEFAULT, error: "Internal error" }
    }
  }

  /**
   * Reward hint on game completion (atomic operation via SQL function)
   */
  async rewardHint(userId: string): Promise<{
    hintsEarned: number
    hints: PlayerHints
  }> {
    try {
      if (!this.isConfigured()) {
        return { hintsEarned: 0, hints: HINTS_DEFAULT }
      }

      const { data, error } = await this.supabase.rpc("reward_cryptoku_hint", {
        p_user_id: userId,
      })

      if (error) {
        console.error("[CryptokuHintsService] Error rewarding hint:", error)
        return { hintsEarned: 0, hints: HINTS_DEFAULT }
      }

      return {
        hintsEarned: data.hintsEarned || 0,
        hints: {
          hintBalance: data.hintBalance,
          gamesUntilNextFreeHint: data.gamesUntilNextFreeHint,
          totalRankedCompleted: data.totalRankedCompleted,
        },
      }
    } catch (error) {
      console.error("[CryptokuHintsService] Exception rewarding hint:", error)
      return { hintsEarned: 0, hints: HINTS_DEFAULT }
    }
  }

  /**
   * Purchase hints
   */
  async purchaseHints(userId: string, amount: number): Promise<{
    success: boolean
    hints: PlayerHints
    error?: string
  }> {
    try {
      if (!this.isConfigured()) {
        return { success: false, hints: HINTS_DEFAULT, error: "Database not configured" }
      }

      if (amount <= 0) {
        return { success: false, hints: HINTS_DEFAULT, error: "Invalid amount" }
      }

      const { data, error } = await this.supabase.rpc("purchase_cryptoku_hints", {
        p_user_id: userId,
        p_amount: amount,
      })

      if (error) {
        console.error("[CryptokuHintsService] Error purchasing hints:", error)
        return { success: false, hints: HINTS_DEFAULT, error: error.message }
      }

      if (!data.success) {
        return {
          success: false,
          hints: await this.getHints(userId),
          error: data.error || "Failed to purchase hints",
        }
      }

      return {
        success: true,
        hints: {
          hintBalance: data.hintBalance,
          gamesUntilNextFreeHint: data.gamesUntilNextFreeHint,
          totalRankedCompleted: (await this.getHints(userId)).totalRankedCompleted,
        },
      }
    } catch (error) {
      console.error("[CryptokuHintsService] Exception purchasing hints:", error)
      return { success: false, hints: HINTS_DEFAULT, error: "Internal error" }
    }
  }

  /**
   * Create default hints record for a user
   * Uses RPC function to bypass RLS
   */
  private async createDefaultHints(userId: string): Promise<PlayerHints> {
    try {
      // Use RPC function which has SECURITY DEFINER and can bypass RLS
      const { error: rpcError } = await this.supabase.rpc("ensure_cryptoku_hints", {
        p_user_id: userId,
      })

      if (rpcError) {
        console.error("[CryptokuHintsService] Error calling ensure_cryptoku_hints:", rpcError)
        // If RPC fails, return default instead of calling getHints again (prevents infinite loop)
        return HINTS_DEFAULT
      }

      // Fetch the created/existing hints directly (don't call getHints to avoid loop)
      const { data, error } = await this.supabase
        .from("cryptoku_hints")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error || !data) {
        // If still not found after RPC call, return default
        console.warn("[CryptokuHintsService] Hints not found after ensure_cryptoku_hints call")
        return HINTS_DEFAULT
      }

      // Calculate gamesUntilNextFreeHint
      const gamesUntilNext = 10 - (data.total_ranked_completed % 10)

      return {
        hintBalance: data.hint_balance,
        gamesUntilNextFreeHint: gamesUntilNext,
        totalRankedCompleted: data.total_ranked_completed,
      }
    } catch (error) {
      console.error("[CryptokuHintsService] Exception creating default hints:", error)
      return HINTS_DEFAULT
    }
  }

  /**
   * Migrate hints from localStorage to Supabase (one-time migration)
   */
  private async migrateFromLocalStorage(walletAddress: string, userId: string): Promise<void> {
    if (typeof window === "undefined") return

    try {
      const localStorageKey = `cryptoku_hints_${walletAddress.toLowerCase()}`
      const stored = window.localStorage.getItem(localStorageKey)

      if (!stored) return // No legacy data

      const legacyHints = JSON.parse(stored) as PlayerHints

      // Check if Supabase record already exists
      const { data: existing } = await this.supabase
        .from("cryptoku_hints")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (existing) {
        // Already migrated, just clear localStorage
        window.localStorage.removeItem(localStorageKey)
        console.log("[CryptokuHintsService] Hints already migrated, cleared localStorage")
        return
      }

      // Migrate data to Supabase
      const { error } = await this.supabase.from("cryptoku_hints").insert({
        user_id: userId,
        hint_balance: legacyHints.hintBalance || 3,
        total_ranked_completed: legacyHints.totalRankedCompleted || 0,
      })

      if (error) {
        if (error.code === "23505") {
          // Race condition: record was created by another request
          console.log("[CryptokuHintsService] Hints already exist, cleared localStorage")
        } else {
          console.error("[CryptokuHintsService] Migration error:", error)
          return // Don't clear localStorage if migration failed
        }
      } else {
        console.log("[CryptokuHintsService] Successfully migrated hints from localStorage")
      }

      // Clear localStorage after successful migration
      window.localStorage.removeItem(localStorageKey)
    } catch (error) {
      console.error("[CryptokuHintsService] Exception during migration:", error)
      // Don't clear localStorage on error, allow retry
    }
  }

  /**
   * Get hints from localStorage (fallback only)
   */
  private getHintsFromLocalStorage(walletAddress: string): PlayerHints | null {
    if (typeof window === "undefined") return null

    try {
      const localStorageKey = `cryptoku_hints_${walletAddress.toLowerCase()}`
      const stored = window.localStorage.getItem(localStorageKey)
      if (stored) {
        return JSON.parse(stored) as PlayerHints
      }
    } catch (error) {
      console.error("[CryptokuHintsService] Error reading localStorage:", error)
    }

    return null
  }
}

