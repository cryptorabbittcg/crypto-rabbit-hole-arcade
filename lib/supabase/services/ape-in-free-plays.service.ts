import { createClient, hasSupabaseConfig } from "../client"
import { ProfileService } from "./profile.service"
import type { GameMode } from "@/features/games/ape-in/types/game"

const FREE_PLAY_MODES: GameMode[] = ["aida", "lana", "enj1n", "nifty"]
const FREE_PLAYS_PER_DAY = 5

export interface DailyFreePlay {
  gameMode: GameMode
  walletAddress: string
  dateUsed: string // YYYY-MM-DD format
  timestamp: number
}

export class ApeInFreePlaysService {
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
   * Get today's date in UTC (YYYY-MM-DD format)
   */
  private getTodayDate(): string {
    const now = new Date()
    return now.toISOString().split("T")[0] // YYYY-MM-DD format
  }

  /**
   * Get free plays remaining for a mode (by wallet address)
   * Includes one-time migration from localStorage
   */
  async getFreePlaysRemainingByWallet(walletAddress: string, gameMode: GameMode): Promise<number> {
    try {
      if (!this.isConfigured()) {
        return this.getFreePlaysFromLocalStorage(walletAddress, gameMode)
      }

      // Sandy is always free (tutorial)
      if (gameMode === "sandy") {
        return FREE_PLAYS_PER_DAY
      }

      // Only specific modes have free plays
      if (!FREE_PLAY_MODES.includes(gameMode)) {
        return 0
      }

      // Get profile to get user_id
      const profile = await this.profileService.getProfileByWallet(walletAddress)
      if (!profile) {
        // No profile exists, return default
        return FREE_PLAYS_PER_DAY
      }

      // Try migration from localStorage (one-time)
      await this.migrateFromLocalStorage(walletAddress, profile.id)

      return this.getFreePlaysRemaining(profile.id, gameMode)
    } catch (error) {
      console.error("[ApeInFreePlaysService] Error getting free plays:", error)
      return this.getFreePlaysFromLocalStorage(walletAddress, gameMode)
    }
  }

  /**
   * Get free plays remaining for a mode (by user_id)
   */
  async getFreePlaysRemaining(userId: string, gameMode: GameMode): Promise<number> {
    try {
      if (!this.isConfigured()) {
        return FREE_PLAYS_PER_DAY
      }

      // Sandy is always free
      if (gameMode === "sandy") {
        return FREE_PLAYS_PER_DAY
      }

      // Only specific modes have free plays
      if (!FREE_PLAY_MODES.includes(gameMode)) {
        return 0
      }

      const today = this.getTodayDate()

      const { count, error } = await this.supabase
        .from("ape_in_daily_free_plays")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("game_mode", gameMode)
        .eq("date_used", today)

      if (error) {
        console.error("[ApeInFreePlaysService] Error counting free plays:", error)
        return FREE_PLAYS_PER_DAY
      }

      const used = count || 0
      return Math.max(0, FREE_PLAYS_PER_DAY - used)
    } catch (error) {
      console.error("[ApeInFreePlaysService] Exception getting free plays:", error)
      return FREE_PLAYS_PER_DAY
    }
  }

  /**
   * Check if user is eligible for a free play
   */
  async isEligible(walletAddress: string, gameMode: GameMode): Promise<boolean> {
    if (!walletAddress) return false

    // Sandy is always free
    if (gameMode === "sandy") return true

    // Only specific modes have free plays
    if (!FREE_PLAY_MODES.includes(gameMode)) return false

    const remaining = await this.getFreePlaysRemainingByWallet(walletAddress, gameMode)
    return remaining > 0
  }

  /**
   * Use a free play (atomic operation)
   */
  async useFreePlay(walletAddress: string, gameMode: GameMode): Promise<{
    success: boolean
    freePlaysRemaining: number
    error?: string
  }> {
    try {
      if (!walletAddress) {
        return { success: false, freePlaysRemaining: 0, error: "Wallet address required" }
      }

      // Sandy is always free, don't record
      if (gameMode === "sandy") {
        return { success: true, freePlaysRemaining: FREE_PLAYS_PER_DAY }
      }

      // Only specific modes have free plays
      if (!FREE_PLAY_MODES.includes(gameMode)) {
        return { success: false, freePlaysRemaining: 0, error: "Mode doesn't support free plays" }
      }

      if (!this.isConfigured()) {
        // Fallback to localStorage
        this.useFreePlayLocalStorage(walletAddress, gameMode)
        return {
          success: true,
          freePlaysRemaining: this.getFreePlaysFromLocalStorage(walletAddress, gameMode),
        }
      }

      // Get profile to get user_id
      const profile = await this.profileService.getProfileByWallet(walletAddress)
      if (!profile) {
        return { success: false, freePlaysRemaining: 0, error: "Profile not found" }
      }

      const today = this.getTodayDate()

      // Try to insert (atomic operation with ON CONFLICT)
      const { error } = await this.supabase.from("ape_in_daily_free_plays").insert({
        user_id: profile.id,
        game_mode: gameMode,
        date_used: today,
      })

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation = already used today
          const remaining = await this.getFreePlaysRemaining(profile.id, gameMode)
          return {
            success: false,
            freePlaysRemaining: remaining,
            error: "Free play already used today",
          }
        }
        console.error("[ApeInFreePlaysService] Error using free play:", error)
        return { success: false, freePlaysRemaining: 0, error: error.message }
      }

      // Get remaining after successful insert
      const remaining = await this.getFreePlaysRemaining(profile.id, gameMode)

      console.log(`[ApeInFreePlaysService] Used free play for ${gameMode}. Remaining: ${remaining}`)

      return { success: true, freePlaysRemaining: remaining }
    } catch (error) {
      console.error("[ApeInFreePlaysService] Exception using free play:", error)
      return { success: false, freePlaysRemaining: 0, error: "Internal error" }
    }
  }

  /**
   * Migrate free plays from localStorage to Supabase (one-time migration)
   * Only migrates today's plays
   */
  private async migrateFromLocalStorage(walletAddress: string, userId: string): Promise<void> {
    if (typeof window === "undefined") return

    try {
      const localStorageKey = `dailyFreePlays_${walletAddress.toLowerCase()}`
      const stored = window.localStorage.getItem(localStorageKey)

      if (!stored) return // No legacy data

      const legacyPlays = JSON.parse(stored) as DailyFreePlay[]
      const today = this.getTodayDate()

      // Filter to today's plays only
      const todayPlays = legacyPlays.filter((play) => play.dateUsed === today)

      if (todayPlays.length === 0) {
        // No today's plays to migrate, just clear localStorage
        window.localStorage.removeItem(localStorageKey)
        return
      }

      // Insert today's plays into Supabase (with conflict handling)
      const inserts = todayPlays.map((play) => ({
        user_id: userId,
        game_mode: play.gameMode,
        date_used: today,
      }))

      const { error } = await this.supabase
        .from("ape_in_daily_free_plays")
        .upsert(inserts, {
          onConflict: "user_id,game_mode,date_used",
          ignoreDuplicates: true,
        })

      if (error) {
        console.error("[ApeInFreePlaysService] Migration error:", error)
        return // Don't clear localStorage if migration failed
      }

      console.log(`[ApeInFreePlaysService] Migrated ${todayPlays.length} free plays from localStorage`)
      // Clear localStorage after successful migration
      window.localStorage.removeItem(localStorageKey)
    } catch (error) {
      console.error("[ApeInFreePlaysService] Exception during migration:", error)
      // Don't clear localStorage on error, allow retry
    }
  }

  /**
   * Get free plays from localStorage (fallback only)
   */
  private getFreePlaysFromLocalStorage(walletAddress: string, gameMode: GameMode): number {
    if (typeof window === "undefined") return FREE_PLAYS_PER_DAY

    if (gameMode === "sandy") return FREE_PLAYS_PER_DAY
    if (!FREE_PLAY_MODES.includes(gameMode)) return 0

    try {
      const localStorageKey = `dailyFreePlays_${walletAddress.toLowerCase()}`
      const stored = window.localStorage.getItem(localStorageKey)
      if (!stored) return FREE_PLAYS_PER_DAY

      const allPlays = JSON.parse(stored) as DailyFreePlay[]
      const today = this.getTodayDate()
      const todayPlays = allPlays.filter(
        (play) => play.gameMode === gameMode && play.dateUsed === today,
      )

      return Math.max(0, FREE_PLAYS_PER_DAY - todayPlays.length)
    } catch (error) {
      console.error("[ApeInFreePlaysService] Error reading localStorage:", error)
      return FREE_PLAYS_PER_DAY
    }
  }

  /**
   * Use free play in localStorage (fallback only)
   */
  private useFreePlayLocalStorage(walletAddress: string, gameMode: GameMode): void {
    if (typeof window === "undefined") return
    if (gameMode === "sandy") return
    if (!FREE_PLAY_MODES.includes(gameMode)) return

    try {
      const localStorageKey = `dailyFreePlays_${walletAddress.toLowerCase()}`
      const today = this.getTodayDate()
      const stored = window.localStorage.getItem(localStorageKey)

      let allPlays: DailyFreePlay[] = []
      if (stored) {
        allPlays = JSON.parse(stored)
        // Keep only today's plays
        allPlays = allPlays.filter((play) => play.dateUsed === today)
      }

      // Add new play
      allPlays.push({
        gameMode,
        walletAddress: walletAddress.toLowerCase(),
        dateUsed: today,
        timestamp: Date.now(),
      })

      window.localStorage.setItem(localStorageKey, JSON.stringify(allPlays))
    } catch (error) {
      console.error("[ApeInFreePlaysService] Error using free play in localStorage:", error)
    }
  }
}

