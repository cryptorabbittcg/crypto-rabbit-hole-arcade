import { createClient, hasSupabaseConfig } from "../client"
import { ProfileService } from "./profile.service"

export interface CryptokuLeaderboardEntry {
  runId: string
  address: string
  mode: "NOOB" | "DEGEN" | "APE"
  score: number
  timeSeconds: number
  hintsUsed: number
  errors: number
  timestamp: number
  completed: boolean
  forfeited: boolean
}

export interface CryptokuLeaderboardResult {
  entries: CryptokuLeaderboardEntry[]
  total: number
}

export class CryptokuLeaderboardService {
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
   * Add a leaderboard entry (by wallet address)
   */
  async addEntry(entry: CryptokuLeaderboardEntry): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.warn("[CryptokuLeaderboardService] Supabase not configured, skipping leaderboard entry")
        return false
      }

      // Get profile to get user_id
      const profile = await this.profileService.getProfileByWallet(entry.address)
      if (!profile) {
        console.warn("[CryptokuLeaderboardService] Profile not found for address:", entry.address.substring(0, 10))
        return false
      }

      return this.addEntryByUserId(profile.id, entry)
    } catch (error) {
      console.error("[CryptokuLeaderboardService] Error adding entry:", error)
      return false
    }
  }

  /**
   * Add a leaderboard entry (by user_id)
   */
  async addEntryByUserId(userId: string, entry: CryptokuLeaderboardEntry): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return false
      }

      const { error } = await this.supabase.rpc("add_cryptoku_leaderboard_entry", {
        p_run_id: entry.runId,
        p_user_id: userId,
        p_mode: entry.mode,
        p_score: entry.score,
        p_time_seconds: entry.timeSeconds,
        p_hints_used: entry.hintsUsed,
        p_errors: entry.errors,
        p_completed: entry.completed,
        p_forfeited: entry.forfeited,
      })

      if (error) {
        console.error("[CryptokuLeaderboardService] Error adding leaderboard entry:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("[CryptokuLeaderboardService] Exception adding entry:", error)
      return false
    }
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboard(
    mode: "DEGEN" | "APE" | "ALL" = "ALL",
    limit: number = 50
  ): Promise<CryptokuLeaderboardResult> {
    try {
      if (!this.isConfigured()) {
        return { entries: [], total: 0 }
      }

      const { data, error } = await this.supabase.rpc("get_cryptoku_leaderboard", {
        p_mode: mode,
        p_limit: limit,
      })

      if (error) {
        console.error("[CryptokuLeaderboardService] Error getting leaderboard:", error)
        return { entries: [], total: 0 }
      }

      // Convert database format to API format
      const entries: CryptokuLeaderboardEntry[] = (data || []).map((row: any) => ({
        runId: row.run_id,
        address: row.wallet_address || "",
        mode: row.mode as "NOOB" | "DEGEN" | "APE",
        score: row.score,
        timeSeconds: row.time_seconds,
        hintsUsed: row.hints_used,
        errors: row.errors,
        timestamp: new Date(row.created_at).getTime(),
        completed: true,
        forfeited: false,
      }))

      return {
        entries,
        total: entries.length,
      }
    } catch (error) {
      console.error("[CryptokuLeaderboardService] Exception getting leaderboard:", error)
      return { entries: [], total: 0 }
    }
  }

  /**
   * Get user's best run for a mode
   */
  async getUserBestRun(walletAddress: string, mode: "DEGEN" | "APE"): Promise<CryptokuLeaderboardEntry | null> {
    try {
      if (!this.isConfigured()) {
        return null
      }

      const profile = await this.profileService.getProfileByWallet(walletAddress)
      if (!profile) {
        return null
      }

      const { data, error } = await this.supabase
        .from("cryptoku_leaderboard")
        .select("*")
        .eq("user_id", profile.id)
        .eq("mode", mode)
        .eq("completed", true)
        .eq("forfeited", false)
        .order("score", { ascending: false })
        .order("time_seconds", { ascending: true })
        .limit(1)
        .single()

      if (error || !data) {
        return null
      }

      return {
        runId: data.run_id,
        address: walletAddress,
        mode: data.mode as "NOOB" | "DEGEN" | "APE",
        score: data.score,
        timeSeconds: data.time_seconds,
        hintsUsed: data.hints_used,
        errors: data.errors,
        timestamp: new Date(data.created_at).getTime(),
        completed: true,
        forfeited: false,
      }
    } catch (error) {
      console.error("[CryptokuLeaderboardService] Exception getting user best run:", error)
      return null
    }
  }
}

