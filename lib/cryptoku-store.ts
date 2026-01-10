// KV-backed store for Cryptoku API endpoints using Vercel KV (Redis)

import { kv } from "@vercel/kv"

// Check if Vercel KV is configured
function isKVConfigured(): boolean {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN &&
    process.env.KV_REST_API_URL !== "" &&
    process.env.KV_REST_API_TOKEN !== ""
  )
}

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

// In-memory cache for when KV is not available
// This persists during the server session (until server restart)
const inMemoryCache = new Map<string, PlayerHints>()

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
  
  // Check if KV is configured
  if (!isKVConfigured()) {
    // Try to get from in-memory cache first
    const cached = inMemoryCache.get(normalizedAddress)
    if (cached) {
      return cached
    }
    
    // IMPORTANT: Only return default hints if this is the FIRST time accessing this address
    // Don't reset hints that have already been used. This prevents hints from being restored
    // after they've been consumed. We'll check localStorage as a backup persistence layer.
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      const stored = window.localStorage.getItem(localStorageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as PlayerHints
          // Only use stored value if it's valid and balance is >= 0
          if (parsed && typeof parsed.hintBalance === 'number' && parsed.hintBalance >= 0) {
            inMemoryCache.set(normalizedAddress, parsed)
            return parsed
          }
        } catch (e) {
          console.warn("Failed to parse stored hints from localStorage:", e)
        }
      }
    }
    
    // Only set default if truly no existing data found
    inMemoryCache.set(normalizedAddress, HINTS_DEFAULT)
    // Also store in localStorage as backup
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      window.localStorage.setItem(localStorageKey, JSON.stringify(HINTS_DEFAULT))
    }
    return HINTS_DEFAULT
  }
  
  try {
    const hints = await kv.get<PlayerHints>(key)
    if (hints) {
      // Update cache for faster access
      inMemoryCache.set(normalizedAddress, hints)
      return hints
    }
    
    // Check localStorage as backup before returning default
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      const stored = window.localStorage.getItem(localStorageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as PlayerHints
          if (parsed && typeof parsed.hintBalance === 'number' && parsed.hintBalance >= 0) {
            inMemoryCache.set(normalizedAddress, parsed)
            return parsed
          }
        } catch (e) {
          console.warn("Failed to parse stored hints from localStorage:", e)
        }
      }
    }
    
    // Return default if not found and update cache
    inMemoryCache.set(normalizedAddress, HINTS_DEFAULT)
    // Also store in localStorage as backup
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      window.localStorage.setItem(localStorageKey, JSON.stringify(HINTS_DEFAULT))
    }
    return HINTS_DEFAULT
  } catch (error) {
    console.error(`Error getting hints for ${normalizedAddress}:`, error)
    // Try cache as fallback
    const cached = inMemoryCache.get(normalizedAddress)
    if (cached) {
      return cached
    }
    // Try localStorage as final fallback before returning default
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      const stored = window.localStorage.getItem(localStorageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as PlayerHints
          if (parsed && typeof parsed.hintBalance === 'number' && parsed.hintBalance >= 0) {
            inMemoryCache.set(normalizedAddress, parsed)
            return parsed
          }
        } catch (e) {
          console.warn("Failed to parse stored hints from localStorage:", e)
        }
      }
    }
    
    // Return default hints on error and update cache (last resort)
    inMemoryCache.set(normalizedAddress, HINTS_DEFAULT)
    // Store in localStorage as backup
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      window.localStorage.setItem(localStorageKey, JSON.stringify(HINTS_DEFAULT))
    }
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
  
  // Check if KV is configured
  if (!isKVConfigured()) {
    // Use in-memory cache when KV is not configured
    const current = await getCryptokuHints(normalizedAddress)
    const updated = updateFn(current)
    
    // Update in-memory cache
    inMemoryCache.set(normalizedAddress, updated)
    
    // Also persist to localStorage as backup
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      window.localStorage.setItem(localStorageKey, JSON.stringify(updated))
    }
    
    console.log(`Hint balance updated in-memory for ${normalizedAddress}: ${updated.hintBalance} hints remaining`)
    return updated
  }
  
  try {
    const current = await getCryptokuHints(normalizedAddress)
    const updated = updateFn(current)
    
    // Double-check KV is still configured before attempting set
    if (isKVConfigured()) {
      try {
        await kv.set(key, updated)
        // Update cache after successful KV write
        inMemoryCache.set(normalizedAddress, updated)
        // Also persist to localStorage as backup
        if (typeof window !== "undefined") {
          const localStorageKey = `cryptoku_hints_${normalizedAddress}`
          window.localStorage.setItem(localStorageKey, JSON.stringify(updated))
        }
        return updated
      } catch (kvError) {
        console.error(`KV set operation failed for ${normalizedAddress}:`, kvError)
        // Fall through to use in-memory cache
      }
    }
    
    // KV unavailable - use in-memory cache as fallback
    inMemoryCache.set(normalizedAddress, updated)
    // Also persist to localStorage as backup
    if (typeof window !== "undefined") {
      const localStorageKey = `cryptoku_hints_${normalizedAddress}`
      window.localStorage.setItem(localStorageKey, JSON.stringify(updated))
    }
    console.warn(`Hint balance updated in-memory (KV unavailable) for ${normalizedAddress}: ${updated.hintBalance} hints remaining`)
    return updated
  } catch (error) {
    console.error(`Error updating hints for ${normalizedAddress}:`, error)
    // If getting hints fails, try to return a default decremented value
    // This ensures hints still work even if there's an error
    try {
      const defaultHints = await getCryptokuHints(normalizedAddress)
      const updated = updateFn(defaultHints)
      
      // Update cache even on error
      inMemoryCache.set(normalizedAddress, updated)
      // Also persist to localStorage as backup
      if (typeof window !== "undefined") {
        const localStorageKey = `cryptoku_hints_${normalizedAddress}`
        window.localStorage.setItem(localStorageKey, JSON.stringify(updated))
      }
      console.warn("Error occurred, using in-memory cache fallback")
      return updated
    } catch (fallbackError) {
      // Last resort: return default hints with balance decremented
      console.error("All hint update attempts failed, returning safe default")
      const safeDefault = {
        ...HINTS_DEFAULT,
        hintBalance: Math.max(0, HINTS_DEFAULT.hintBalance - 1),
      }
      inMemoryCache.set(normalizedAddress, safeDefault)
      // Also persist to localStorage as backup
      if (typeof window !== "undefined") {
        const localStorageKey = `cryptoku_hints_${normalizedAddress}`
        window.localStorage.setItem(localStorageKey, JSON.stringify(safeDefault))
      }
      return safeDefault
    }
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
