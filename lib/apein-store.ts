// KV-backed store for Ape In API endpoints using Vercel KV (Redis)
// Prepared for future migration from in-memory stores

import { kv } from "@vercel/kv"

export interface ApeInStats {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  totalScore: number
  bestScore: number
  winStreak: number
  bestWinStreak: number
}

export interface ApeInLeaderboardEntry {
  runId: string
  address: string
  score: number
  timestamp: number
}

const APEIN_STATS_DEFAULT: ApeInStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  totalScore: 0,
  bestScore: 0,
  winStreak: 0,
  bestWinStreak: 0,
}

// Normalize address for KV keys
function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

// Get Ape In stats for an address
export async function getApeInStats(address: string): Promise<ApeInStats> {
  const normalizedAddress = normalizeAddress(address)
  const key = `apein:stats:${normalizedAddress}`
  
  try {
    const stats = await kv.get<ApeInStats>(key)
    if (stats) {
      return stats
    }
    
    // Return default if not found
    return APEIN_STATS_DEFAULT
  } catch (error) {
    console.error(`Error getting Ape In stats for ${normalizedAddress}:`, error)
    return APEIN_STATS_DEFAULT
  }
}

// Update Ape In stats for an address
export async function updateApeInStats(
  address: string,
  updateFn: (stats: ApeInStats) => ApeInStats
): Promise<ApeInStats> {
  const normalizedAddress = normalizeAddress(address)
  const key = `apein:stats:${normalizedAddress}`
  
  try {
    const current = await getApeInStats(normalizedAddress)
    const updated = updateFn(current)
    await kv.set(key, updated)
    return updated
  } catch (error) {
    console.error(`Error updating Ape In stats for ${normalizedAddress}:`, error)
    throw error
  }
}

// Leaderboard operations using sorted sets
const APEIN_LEADERBOARD_KEY = "apein:leaderboard"
const APEIN_RUN_METADATA_PREFIX = "apein:run:"

// Add a run to the Ape In leaderboard
export async function addApeInLeaderboardEntry(
  entry: ApeInLeaderboardEntry
): Promise<void> {
  try {
    const runKey = `${APEIN_RUN_METADATA_PREFIX}${entry.runId}`
    
    // Store run metadata
    await kv.set(runKey, entry)
    
    // Add to sorted set with score as the score (higher is better)
    await kv.zadd(APEIN_LEADERBOARD_KEY, {
      score: entry.score,
      member: entry.runId,
    })
    
    // Keep only top 1000 entries (ranks 0-999, remove rank 1000+)
    // Always trim after zadd to ensure we never exceed 1000 entries
    await kv.zremrangebyrank(APEIN_LEADERBOARD_KEY, 1000, -1)
  } catch (error) {
    console.error(`Error adding Ape In leaderboard entry ${entry.runId}:`, error)
    throw error
  }
}

// Get Ape In leaderboard entries
export async function getApeInLeaderboard(
  limit: number = 50
): Promise<{ entries: ApeInLeaderboardEntry[]; total: number }> {
  try {
    // Fetch entries by score (descending order)
    const maxEntries = 1000
    const runIds = await kv.zrange<string[]>(APEIN_LEADERBOARD_KEY, 0, maxEntries - 1, { rev: true })
    
    if (runIds.length === 0) {
      return { entries: [], total: 0 }
    }
    
    // Fetch metadata for each run
    const metadataKeys = runIds.map((runId: string) => `${APEIN_RUN_METADATA_PREFIX}${runId}`)
    const entriesData = await kv.mget<ApeInLeaderboardEntry[]>(metadataKeys)
    
    // Filter out nulls
    const entries: ApeInLeaderboardEntry[] = entriesData.filter(
      (entry): entry is ApeInLeaderboardEntry => entry !== null && entry !== undefined
    )
    
    // Sort by score desc
    entries.sort((a, b) => b.score - a.score)
    
    return {
      entries: entries.slice(0, limit),
      total: entries.length,
    }
  } catch (error) {
    console.error("Error getting Ape In leaderboard:", error)
    return { entries: [], total: 0 }
  }
}

