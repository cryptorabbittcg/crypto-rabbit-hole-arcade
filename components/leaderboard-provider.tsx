"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { LeaderboardService, type ApeInLeaderboardEntry } from "@/lib/supabase/services/leaderboard.service"
import { CryptokuLeaderboardService } from "@/lib/supabase/services/cryptoku-leaderboard.service"

type CryptokuLeaderboardEntry = {
  rank: number
  address: string
  username?: string | null
  avatar_url?: string | null
  score: number
  timeSeconds: number
  hintsUsed: number
  errors: number
  mode: "DEGEN" | "APE"
}

type LeaderboardContextType = {
  // Ape In leaderboards
  apeInLeaderboards: {
    aida: ApeInLeaderboardEntry[]
    lana: ApeInLeaderboardEntry[]
    enj1n: ApeInLeaderboardEntry[]
    nifty: ApeInLeaderboardEntry[]
  }
  loadingApeIn: boolean
  apeInError: string | null
  
  // Cryptoku leaderboards
  cryptokuLeaderboards: {
    degen: CryptokuLeaderboardEntry[]
    ape: CryptokuLeaderboardEntry[]
  }
  loadingCryptoku: boolean
  cryptokuError: string | null
  
  // Refresh functions
  refreshApeIn: () => Promise<void>
  refreshCryptoku: () => Promise<void>
  refreshAll: () => Promise<void>
}

const LeaderboardContext = createContext<LeaderboardContextType | null>(null)

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const [apeInLeaderboards, setApeInLeaderboards] = useState<LeaderboardContextType["apeInLeaderboards"]>({
    aida: [],
    lana: [],
    enj1n: [],
    nifty: [],
  })
  const [loadingApeIn, setLoadingApeIn] = useState(true)
  const [apeInError, setApeInError] = useState<string | null>(null)
  
  const [cryptokuLeaderboards, setCryptokuLeaderboards] = useState<LeaderboardContextType["cryptokuLeaderboards"]>({
    degen: [],
    ape: [],
  })
  const [loadingCryptoku, setLoadingCryptoku] = useState(true)
  const [cryptokuError, setCryptokuError] = useState<string | null>(null)

  // Fetch Ape In leaderboards
  const refreshApeIn = useCallback(async () => {
    setLoadingApeIn(true)
    setApeInError(null)
    try {
      const leaderboardService = new LeaderboardService()
      
      // Fetch all modes in parallel
      const [aida, lana, enj1n, nifty] = await Promise.all([
        leaderboardService.getApeInLeaderboard("aida", 100),
        leaderboardService.getApeInLeaderboard("lana", 100),
        leaderboardService.getApeInLeaderboard("enj1n", 100),
        leaderboardService.getApeInLeaderboard("nifty", 100),
      ])
      
      setApeInLeaderboards({ aida, lana, enj1n, nifty })
    } catch (error) {
      console.error("[LeaderboardProvider] Error fetching Ape In leaderboards:", error)
      setApeInError("Failed to load Ape In leaderboards")
    } finally {
      setLoadingApeIn(false)
    }
  }, [])

  // Fetch Cryptoku leaderboards
  const refreshCryptoku = useCallback(async () => {
    setLoadingCryptoku(true)
    setCryptokuError(null)
    try {
      const cryptokuService = new CryptokuLeaderboardService()
      
      // Fetch both modes in parallel
      const [degenResult, apeResult] = await Promise.all([
        cryptokuService.getLeaderboard("DEGEN", 100),
        cryptokuService.getLeaderboard("APE", 100),
      ])
      
      // Map CryptokuLeaderboardEntry to our format
      // The service already returns entries with username and avatar_url
      const mapCryptokuEntry = (entry: any, index: number): CryptokuLeaderboardEntry => ({
        rank: index + 1,
        address: entry.address,
        username: entry.username ?? null,
        avatar_url: entry.avatar_url ?? null,
        score: entry.score,
        timeSeconds: entry.timeSeconds,
        hintsUsed: entry.hintsUsed,
        errors: entry.errors,
        mode: entry.mode as "DEGEN" | "APE",
      })
      
      setCryptokuLeaderboards({
        degen: degenResult.entries.map((entry, idx) => mapCryptokuEntry(entry, idx)),
        ape: apeResult.entries.map((entry, idx) => mapCryptokuEntry(entry, idx)),
      })
    } catch (error) {
      console.error("[LeaderboardProvider] Error fetching Cryptoku leaderboards:", error)
      setCryptokuError("Failed to load Cryptoku leaderboards")
    } finally {
      setLoadingCryptoku(false)
    }
  }, [])

  // Refresh all leaderboards
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshApeIn(), refreshCryptoku()])
  }, [refreshApeIn, refreshCryptoku])

  // Initial fetch on mount
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // Refresh on window focus (prevents stale data)
  useEffect(() => {
    const handleFocus = () => {
      refreshAll()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [refreshAll])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<LeaderboardContextType>(
    () => ({
      apeInLeaderboards,
      loadingApeIn,
      apeInError,
      cryptokuLeaderboards,
      loadingCryptoku,
      cryptokuError,
      refreshApeIn,
      refreshCryptoku,
      refreshAll,
    }),
    [
      apeInLeaderboards,
      loadingApeIn,
      apeInError,
      cryptokuLeaderboards,
      loadingCryptoku,
      cryptokuError,
      refreshApeIn,
      refreshCryptoku,
      refreshAll,
    ],
  )

  return <LeaderboardContext.Provider value={contextValue}>{children}</LeaderboardContext.Provider>
}

export function useLeaderboard() {
  const context = useContext(LeaderboardContext)
  if (!context) {
    throw new Error("useLeaderboard must be used within LeaderboardProvider")
  }
  return context
}
