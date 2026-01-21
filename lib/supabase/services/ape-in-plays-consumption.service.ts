/**
 * Ape In Plays Consumption Service
 * 
 * Handles atomic consumption of plays (free first, then purchased)
 * 
 * CRITICAL: This service uses a single RPC function for true atomicity
 * across free + purchased play consumption to prevent race conditions.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { GameMode } from "@/features/games/ape-in/types/game"

export interface ConsumePlayResult {
  success: boolean
  error?: string
  freePlaysRemaining: number
  purchasedPlaysRemaining: number
  totalPlaysRemaining: number // Computed: free + purchased
  consumedType: 'free' | 'purchased' | null
}

export class ApeInPlaysConsumptionService {
  private adminClient = createAdminClient()

  /**
   * Consume a play for a game mode (atomic operation)
   * 
   * Priority:
   * 1. Free play first (mode-specific, daily reset)
   * 2. Purchased play second (global balance)
   * 3. Reject if both are 0
   * 
   * CRITICAL: This uses a single RPC function (ape_in_consume_play) that executes
   * the entire decision and consumption in a single database transaction, preventing
   * race conditions and "double game start" scenarios.
   * 
   * @param walletAddress - User's wallet address
   * @param gameMode - Game mode to consume play for
   * @returns ConsumePlayResult with success status and remaining balances
   */
  async consumePlayForMode(
    walletAddress: string,
    gameMode: GameMode
  ): Promise<ConsumePlayResult> {
    try {
      // Normalize wallet address
      const normalizedWallet = walletAddress.toLowerCase()

      // Call atomic RPC function (single transaction)
      const { data, error } = await this.adminClient.rpc("ape_in_consume_play", {
        p_wallet_address: normalizedWallet,
        p_game_mode: gameMode,
      })

      if (error) {
        console.error("[ApeInPlaysConsumptionService] RPC error:", error)
        return {
          success: false,
          error: error.message || "Failed to consume play",
          freePlaysRemaining: 0,
          purchasedPlaysRemaining: 0,
          totalPlaysRemaining: 0,
          consumedType: null,
        }
      }

      // RPC returns a table (array of rows), but we expect exactly one row
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error("[ApeInPlaysConsumptionService] RPC returned no data")
        return {
          success: false,
          error: "No data returned from consumption service",
          freePlaysRemaining: 0,
          purchasedPlaysRemaining: 0,
          totalPlaysRemaining: 0,
          consumedType: null,
        }
      }

      const row = data[0]

      // Map RPC response to contract
      return {
        success: row.success ?? false,
        error: row.error ?? undefined,
        freePlaysRemaining: row.free_plays_remaining ?? 0,
        purchasedPlaysRemaining: row.purchased_plays_remaining ?? 0,
        totalPlaysRemaining: row.total_plays_remaining ?? 0,
        consumedType: (row.consumed_type as 'free' | 'purchased' | null) ?? null,
      }
    } catch (error) {
      console.error("[ApeInPlaysConsumptionService] Exception consuming play:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
        freePlaysRemaining: 0,
        purchasedPlaysRemaining: 0,
        totalPlaysRemaining: 0,
        consumedType: null,
      }
    }
  }
}
