import { createClient, hasSupabaseConfig } from "../client"
import { ProfileService } from "./profile.service"
import { CURRENT_SEASON } from "@/lib/season"

export interface CryptokuLeaderboardEntry {
  runId: string
  address: string
  username?: string | null
  avatar_url?: string | null
  mode: "NOOB" | "DEGEN" | "APE"
  score: number
  timeSeconds: number
  hintsUsed: number
  errors: number
  timestamp: number
  completed: boolean
  forfeited: boolean
  season?: number
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

      const rpcName = "add_cryptoku_leaderboard_entry"
      const rpcParams = {
        p_run_id: entry.runId,
        p_user_id: userId,
        p_mode: entry.mode,
        p_score: entry.score,
        p_time_seconds: entry.timeSeconds,
        p_hints_used: entry.hintsUsed,
        p_errors: entry.errors,
        p_completed: entry.completed,
        p_forfeited: entry.forfeited,
        // IMPORTANT: Always pass season to hit the season-aware overload (DB has multiple signatures)
        // and to avoid silently defaulting to season 0.
        p_season: entry.season ?? CURRENT_SEASON,
      }
      
      console.error("[CryptokuLeaderboardService] CALLING RPC:", rpcName, "WITH PARAMS:", JSON.stringify(rpcParams, null, 2))
      
      const { data, error } = await this.supabase.rpc(rpcName, rpcParams)

      if (error) {
        // Log FULL error object for production debugging
        const errorLog = {
          rpcName,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorFull: error,
          paramsSent: rpcParams,
          runId: entry.runId,
          userId,
          mode: entry.mode,
          score: entry.score,
        }
        console.error("[CryptokuLeaderboardService] RPC ERROR - Full error object:", JSON.stringify(errorLog, null, 2))
        console.error("[CryptokuLeaderboardService] RPC ERROR - Error code:", error.code)
        console.error("[CryptokuLeaderboardService] RPC ERROR - Error message:", error.message)
        console.error("[CryptokuLeaderboardService] RPC ERROR - Error details:", error.details)
        console.error("[CryptokuLeaderboardService] RPC ERROR - Error hint:", error.hint)
        return false
      }
      
      console.error("[CryptokuLeaderboardService] RPC SUCCESS - Returned data:", JSON.stringify(data, null, 2))
      console.error("[CryptokuLeaderboardService] RPC SUCCESS - Data type:", typeof data, "Data value:", data)
      
      console.log("[CryptokuLeaderboardService] Successfully added leaderboard entry", {
        runId: entry.runId,
        entryId: data,
        mode: entry.mode,
        score: entry.score,
      })

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

      const season = CURRENT_SEASON
      const { data, error } = await this.supabase.rpc("get_cryptoku_leaderboard", {
        p_mode: mode,
        p_limit: limit,
        // IMPORTANT: required for correct filtering; DB defaults to season 0 if omitted
        p_season: season,
      })

      if (error) {
        console.error("[CryptokuLeaderboardService] Error getting leaderboard:", error)
        return { entries: [], total: 0 }
      }

      console.log("[CryptokuLeaderboardService] Leaderboard fetched", {
        mode,
        season,
        returned: Array.isArray(data) ? data.length : 0,
      })

      // Convert database format to API format
      // RPC now returns: rank, run_id, user_id, wallet_address, username, avatar_url, mode, score, time_seconds, hints_used, errors, created_at
      const entries: CryptokuLeaderboardEntry[] = (data || []).map((row: any) => ({
        runId: row.run_id,
        address: row.wallet_address || "",
        username: row.username ?? null,
        avatar_url: row.avatar_url ?? null,
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

