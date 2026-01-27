/**
 * PvP Match Storage Utilities
 * Phase 1: localStorage management for active PvP matches
 */

export interface ActivePvPMatch {
  matchId: string
  userId: string
  timestamp: number
}

const STORAGE_KEY = "ape_in_active_pvp_match_id"

/**
 * Store active PvP match in localStorage
 */
export function storeActivePvPMatch(matchId: string, userId: string): void {
  if (typeof window === "undefined") return

  const match: ActivePvPMatch = {
    matchId,
    userId,
    timestamp: Date.now(),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(match))
  } catch (error) {
    console.error("[PvPStorage] Error storing active match:", error)
  }
}

/**
 * Get active PvP match from localStorage
 */
export function getActivePvPMatch(): ActivePvPMatch | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const match = JSON.parse(stored) as ActivePvPMatch
    return match
  } catch (error) {
    console.error("[PvPStorage] Error reading active match:", error)
    return null
  }
}

/**
 * Clear active PvP match from localStorage
 */
export function clearActivePvPMatch(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("[PvPStorage] Error clearing active match:", error)
  }
}
