// Supabase-based Cryptoku stats (replaces Vercel KV)
// Tracks clean streak for scoring purposes

import { CryptokuHintsService } from "./supabase/services/cryptoku-hints.service"

export interface PlayerStats {
  cleanStreak: number
  degenCompletedCount: number
  apeCompletedCount: number
  totalCompletedCount: number
}

const STATS_DEFAULT: PlayerStats = {
  cleanStreak: 0,
  degenCompletedCount: 0,
  apeCompletedCount: 0,
  totalCompletedCount: 0,
}

// In-memory cache for clean streak (fallback when Supabase not available)
// Key: wallet address -> clean streak
const cleanStreakCache = new Map<string, number>()

/**
 * Get Cryptoku stats for a wallet address
 * Uses Supabase cryptoku_hints table for persistence
 */
export async function getCryptokuStats(address: string): Promise<PlayerStats> {
  const normalizedAddress = address.toLowerCase()
  
  // Get clean streak from cache (in-memory, always available)
  const cleanStreak = cleanStreakCache.get(normalizedAddress) ?? 0
  
  try {
    // Try to get hints, but don't block if it fails or times out
    let totalRankedCompleted = 0
    try {
      const hintsService = new CryptokuHintsService()
      // Add timeout protection - if this takes too long, use defaults
      const hintsPromise = hintsService.getHintsByWallet(normalizedAddress)
      const timeoutPromise = new Promise<{ totalRankedCompleted: number }>((resolve) => 
        setTimeout(() => resolve({ totalRankedCompleted: 0 }), 3000) // 3 second timeout
      )
      
      const hints = await Promise.race([hintsPromise, timeoutPromise])
      totalRankedCompleted = hints.totalRankedCompleted || 0
    } catch (hintsError) {
      // If hints service fails, just use default (don't block stats)
      console.warn(`[getCryptokuStats] Could not fetch hints for ${normalizedAddress}:`, hintsError)
      totalRankedCompleted = 0
    }
    
    return {
      cleanStreak,
      degenCompletedCount: 0, // Not tracked separately, can be calculated from leaderboard
      apeCompletedCount: 0,    // Not tracked separately, can be calculated from leaderboard
      totalCompletedCount: totalRankedCompleted,
    }
  } catch (error) {
    console.error(`[getCryptokuStats] Error getting stats for ${normalizedAddress}:`, error)
    // Return with cached clean streak
    return {
      ...STATS_DEFAULT,
      cleanStreak,
    }
  }
}

/**
 * Update Cryptoku stats for a wallet address
 * Updates clean streak in memory cache (will be persisted to Supabase later)
 */
export async function updateCryptokuStats(
  address: string,
  updateFn: (stats: PlayerStats) => PlayerStats
): Promise<PlayerStats> {
  const normalizedAddress = address.toLowerCase()
  
  try {
    const current = await getCryptokuStats(normalizedAddress)
    const updated = updateFn(current)
    
    // Update clean streak in cache
    cleanStreakCache.set(normalizedAddress, updated.cleanStreak)
    
    // TODO: Persist clean streak to Supabase cryptoku_hints table
    // For now, it's stored in memory (survives during server session)
    
    return updated
  } catch (error) {
    console.error(`[updateCryptokuStats] Error updating stats for ${normalizedAddress}:`, error)
    // Return current stats from cache
    const cleanStreak = cleanStreakCache.get(normalizedAddress) ?? 0
    return {
      ...STATS_DEFAULT,
      cleanStreak,
    }
  }
}
