// KV-backed store for Cryptoku API endpoints using Vercel KV (Redis)

import { kv } from "@vercel/kv"

export interface LeaderboardEntry {
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

export interface PlayerStats {
  cleanStreak: number
  degenCompletedCount: number
  apeCompletedCount: number
  totalCompletedCount: number
}

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

const STATS_DEFAULT: PlayerStats = {
  cleanStreak: 0,
  degenCompletedCount: 0,
  apeCompletedCount: 0,
  totalCompletedCount: 0,
}

// Normalize address for KV keys
function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

// Get Cryptoku hints for an address
export async function getCryptokuHints(address: string): Promise<PlayerHints> {
  const normalizedAddress = normalizeAddress(address)
  const key = `cryptoku:hints:${normalizedAddress}`
  
  try {
    const hints = await kv.get<PlayerHints>(key)
    if (hints) {
      return hints
    }
    
    // Return default if not found
    return HINTS_DEFAULT
  } catch (error) {
    console.error(`Error getting hints for ${normalizedAddress}:`, error)
    return HINTS_DEFAULT
  }
}

// Update Cryptoku hints for an address
export async function updateCryptokuHints(
  address: string,
  updateFn: (hints: PlayerHints) => PlayerHints
): Promise<PlayerHints> {
  const normalizedAddress = normalizeAddress(address)
  const key = `cryptoku:hints:${normalizedAddress}`
  
  try {
    const current = await getCryptokuHints(normalizedAddress)
    const updated = updateFn(current)
    await kv.set(key, updated)
    return updated
  } catch (error) {
    console.error(`Error updating hints for ${normalizedAddress}:`, error)
    throw error
  }
}

// Get Cryptoku stats for an address
export async function getCryptokuStats(address: string): Promise<PlayerStats> {
  const normalizedAddress = normalizeAddress(address)
  const key = `cryptoku:stats:${normalizedAddress}`
  
  try {
    const stats = await kv.get<PlayerStats>(key)
    if (stats) {
      return stats
    }
    
    // Return default if not found
    return STATS_DEFAULT
  } catch (error) {
    console.error(`Error getting stats for ${normalizedAddress}:`, error)
    return STATS_DEFAULT
  }
}

// Update Cryptoku stats for an address
export async function updateCryptokuStats(
  address: string,
  updateFn: (stats: PlayerStats) => PlayerStats
): Promise<PlayerStats> {
  const normalizedAddress = normalizeAddress(address)
  const key = `cryptoku:stats:${normalizedAddress}`
  
  try {
    const current = await getCryptokuStats(normalizedAddress)
    const updated = updateFn(current)
    await kv.set(key, updated)
    return updated
  } catch (error) {
    console.error(`Error updating stats for ${normalizedAddress}:`, error)
    throw error
  }
}

// Leaderboard operations using sorted sets
const LEADERBOARD_KEY = "cryptoku:leaderboard"
const RUN_METADATA_PREFIX = "cryptoku:run:"

// Add a run to the leaderboard
export async function addCryptokuLeaderboardEntry(
  entry: LeaderboardEntry
): Promise<void> {
  try {
    const runKey = `${RUN_METADATA_PREFIX}${entry.runId}`
    
    // Store run metadata
    await kv.set(runKey, entry)
    
    // Add to sorted set with score as the score (higher is better)
    // Use score directly and fetch with ZREVRANGE for descending order
    await kv.zadd(LEADERBOARD_KEY, {
      score: entry.score,
      member: entry.runId,
    })
    
    // Keep only top 1000 entries (ranks 0-999, remove rank 1000+)
    // Always trim after zadd to ensure we never exceed 1000 entries
    await kv.zremrangebyrank(LEADERBOARD_KEY, 1000, -1)
  } catch (error) {
    console.error(`Error adding leaderboard entry ${entry.runId}:`, error)
    throw error
  }
}

// Get leaderboard entries
export async function getCryptokuLeaderboard(
  mode?: "DEGEN" | "APE" | "ALL",
  limit: number = 50
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  try {
    // Fetch more entries than needed in case mode filtering reduces results
    // Fetch up to 1000 entries (max leaderboard size) for accurate mode filtering
    const maxEntries = 1000
    const runIds = await kv.zrange<string[]>(LEADERBOARD_KEY, 0, maxEntries - 1, { rev: true })
    
    if (runIds.length === 0) {
      return { entries: [], total: 0 }
    }
    
    // Fetch metadata for each run
    const metadataKeys = runIds.map((runId: string) => `${RUN_METADATA_PREFIX}${runId}`)
    const entriesData = await kv.mget<LeaderboardEntry[]>(metadataKeys)
    
    // Filter out nulls and filter by mode if specified
    let filtered: LeaderboardEntry[] = entriesData.filter(
      (entry): entry is LeaderboardEntry => entry !== null && entry !== undefined
    )
    
    if (mode && mode !== "ALL" && ["DEGEN", "APE"].includes(mode)) {
      filtered = filtered.filter((entry) => entry.mode === mode)
    }
    
    // Sort by score desc, then time asc
    filtered.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.timeSeconds - b.timeSeconds
    })
    
    // Get total count for the filtered mode
    const total = filtered.length
    
    return {
      entries: filtered.slice(0, limit),
      total,
    }
  } catch (error) {
    console.error("Error getting leaderboard:", error)
    return { entries: [], total: 0 }
  }
}

// Legacy functions for backwards compatibility (now async)
export async function getPlayerStats(address: string): Promise<PlayerStats> {
  return getCryptokuStats(address)
}

export async function getPlayerHints(address: string): Promise<PlayerHints> {
  return getCryptokuHints(address)
}
