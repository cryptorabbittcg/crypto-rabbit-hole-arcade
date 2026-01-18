"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { getGameSession, storeGameSession, getStoredPointUpdates, clearPointUpdates } from "@/lib/game-session"
import { createClient } from "@/lib/supabase/client"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { logger } from "@/lib/logger"
// Balance fetching stubbed for auth-only migration
// import { getApeBalance } from "@/adapters/wallet.adapter"
import { clearAuthToken } from "@/lib/auth"
import { clearGameSession } from "@/lib/game-session"
import { useGlyphAdapter } from "@/lib/auth-adapters/glyphAdapter"

type Transaction = {
  id: string
  title: string
  status: "prepare" | "sign" | "pending" | "confirmed" | "error"
  hash?: string
  error?: string
}

type UserProfile = {
  username: string
  avatar: string
  referralCode: string
  referralCount: number
  referralEarnings: number
  joinedAt: Date
  stats: {
    gamesPlayed: number
    totalScore: number
    achievements: string[]
  }
}

type Card = {
  id: string
  name: string
  image: string
  rarity: "common" | "rare" | "epic" | "legendary"
  power: number
}

type ArcadeContextType = {
  tickets: number
  points: number
  txns: Transaction[]
  isConnected: boolean
  address: string | null
  profile: UserProfile
  cards: Card[]
  isAuthenticated: boolean
  apeBalance: string
  connect: () => void
  disconnect: () => void
  logout: () => void
  setWalletConnection: (address: string | null) => void
  syncProfileWithWallet: (address: string) => Promise<void>
  handleAuthSuccess: (result: { token: string; walletAddress: string; type: string; isNewUser?: boolean }) => void
  addTxn: (txn: Transaction) => void
  updateTxn: (id: string, updates: Partial<Transaction>) => void
  removeTxn: (id: string) => void
  addTickets: (amount: number) => void
  addPoints: (amount: number) => void
  setTickets: (amount: number) => void
  setPoints: (amount: number) => void
  addCard: (card: Card) => void
  generateReferralCode: () => string
  trackReferral: (code: string) => void
  updateProfile: (updates: Partial<UserProfile>) => void
}

const ArcadeContext = createContext<ArcadeContextType | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  // Use auth adapter internally to source connection state
  const authAdapter = useGlyphAdapter()

  const [tickets, setTickets] = useState(0)
  const [points, setPoints] = useState(0) // Will be loaded from profile storage
  const [txns, setTxns] = useState<Transaction[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [apeBalance, setApeBalance] = useState<string>("0.0000")

  const [profile, setProfile] = useState<UserProfile>({
    username: "Guest",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Artboard-1-83QWedD6ivnkXqy5WoMh05oLPpdMO6.png",
    referralCode: "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    referralCount: 0,
    referralEarnings: 0,
    joinedAt: new Date(),
    stats: {
      gamesPlayed: 0,
      totalScore: 0,
      achievements: [],
    },
  })

  // Sync adapter connection state to internal state
  // This allows ProfileSyncWrapper and other components to continue working
  // while we source the connection state from the adapter internally
  // PHASE 1 FIX: Eliminate "ghost auth" state - isAuthenticated depends on stable wallet identity
  // isAuthenticated = true ONLY when wagmiAddress exists AND (wagmiConnected OR localStorage has that address)
  useEffect(() => {
    const wagmiAddress = authAdapter.address
    const wagmiConnected = authAdapter.isConnected
    
    setAddress(wagmiAddress)
    setIsConnected(wagmiConnected)
    
    // PHASE 1 FIX: Stable auth state based on address existence
    // isAuthenticated = true if wagmiAddress exists AND (wagmiConnected OR localStorage has that address)
    if (wagmiAddress) {
      // Check if localStorage has this address (cache check for stability)
      // Normalize both sides: trim and lowercase for safe comparison
      const storedAuthAddress = typeof window !== "undefined" 
        ? window.localStorage.getItem("arcade_auth_address")?.toLowerCase().trim() || null
        : null
      const normalizedWagmiAddress = wagmiAddress.toLowerCase().trim()
      const hasLocalStorageAuth = storedAuthAddress === normalizedWagmiAddress
      
      // Set authenticated if: (connected) OR (localStorage has this address)
      const shouldAuthenticate = wagmiConnected || hasLocalStorageAuth
      
      if (shouldAuthenticate) {
        setIsAuthenticated(true)
        // Sync auth token to localStorage (cache update, not requirement)
        if (typeof window !== "undefined") {
          window.localStorage.setItem("arcade_auth_address", wagmiAddress.toLowerCase().trim())
        }
      } else {
        // Address exists but not connected and not in localStorage - guard prevents ghost auth
        if (process.env.NODE_ENV !== "production") {
          console.log("[MOBILE-AUTH] Auth guard: wagmiAddress exists but not connected and not in localStorage, keeping isAuthenticated false")
        }
        // Keep current auth state (don't force false if already authenticated from previous state)
        // This prevents flickering during connection establishment
      }
    } else {
      // wagmiAddress is null => isAuthenticated must be false
      setIsAuthenticated(false)
    }
  }, [authAdapter.address, authAdapter.isConnected])

  useEffect(() => {
    const session = getGameSession()
    if (session) {
      // Load tickets and username from session (these can be cached)
      setTickets(session.tickets)
      // NOTE: Points should NOT be loaded from localStorage - always load from Supabase
      // This ensures points are always accurate and consistent across devices
      // Points will be loaded from Supabase in syncProfileWithWallet()
      setProfile((prev) => ({ ...prev, username: session.username }))
      if (session.address) {
        setIsConnected(true)
        setAddress(session.address)
      }
    }

    // NOTE: getStoredPointUpdates() is for pending game updates only
    // Points from localStorage should NOT be applied here - always load from Supabase
    // Clear any pending updates to avoid adding stale points
    const updates = getStoredPointUpdates()
    if (updates.length > 0) {
      // Only apply ticket updates from games (points should come from Supabase)
      updates.forEach((update) => {
        // Don't add points from localStorage - they may be stale
        // Points will be loaded from Supabase in syncProfileWithWallet()
        if (update.tickets) {
          setTickets((prev) => prev + update.tickets)
        }
        if (update.achievements && Array.isArray(update.achievements) && update.achievements.length > 0) {
          const newAchievements = update.achievements as string[]
          setProfile((prev) => ({
            ...prev,
            stats: {
              ...prev.stats,
              achievements: [...new Set([...prev.stats.achievements, ...newAchievements])],
            },
          }))
        }
      })
      clearPointUpdates()
    }

    const handlePointUpdate = (event: CustomEvent) => {
      const update = event.detail
      setPoints((prev) => prev + update.points)
      setTickets((prev) => prev + update.tickets)
    }

    window.addEventListener("gamePointsUpdated", handlePointUpdate as EventListener)
    return () => {
      window.removeEventListener("gamePointsUpdated", handlePointUpdate as EventListener)
    }
  }, [])

  useEffect(() => {
    if (isConnected || tickets > 0 || points > 0) {
      // Store session in localStorage for offline access and cross-game communication
      // NOTE: Points stored here are for offline/session continuity, but Supabase is source of truth
      // When wallet connects, points will be loaded fresh from Supabase (syncProfileWithWallet)
      storeGameSession({
        sessionId: `session_${Date.now()}`,
        userId: profile.username,
        username: profile.username,
        address,
        thirdwebClientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "", // Kept for backward compatibility with embedded games
        tickets,
        points, // Store current points for session continuity, but Supabase overrides on next load
        timestamp: Date.now(),
        avatar: profile.avatar || null, // Include avatar in session
      })
    }
  }, [tickets, points, isConnected, address, profile.username])

  const setWalletConnection = useCallback(async (newAddress: string | null) => {
    setAddress(newAddress)
    setIsConnected(!!newAddress)
    
    // Fetch APE balance when wallet connects
    // Note: The Glyph wallet is fully accessible via wagmi hooks (useAccount, useBalance, useWalletClient)
    // This allows standard wallet operations like viewing balances and sending transactions
    if (newAddress) {
      try {
        const { getApeBalance } = await import("@/lib/utils/wallet-balance")
        const balance = await getApeBalance(newAddress)
        setApeBalance(parseFloat(balance).toFixed(4))
      } catch (error) {
        console.error("Error fetching balance:", error)
        setApeBalance("0.0000")
      }
    } else {
      setApeBalance("0.0000")
    }
  }, [])

  const syncProfileWithWallet = useCallback(async (walletAddress: string) => {
    try {
      // First, try to load from localStorage (persisted profile)
      const { loadProfileByAddress } = require("@/lib/profile-storage")
      const savedProfile = loadProfileByAddress(walletAddress)
      
      if (savedProfile) {
        // Restore profile from localStorage
        setProfile({
          username: savedProfile.username,
          avatar: savedProfile.avatar || profile.avatar,
          referralCode: savedProfile.referralCode || profile.referralCode,
          referralCount: savedProfile.referralCount || 0,
          referralEarnings: savedProfile.referralEarnings || 0,
          joinedAt: new Date(savedProfile.joinedAt),
          stats: savedProfile.stats || profile.stats,
        })
        setTickets(savedProfile.tickets || 0)
        // NOTE: Points should NOT be loaded from localStorage - always load from Supabase
        // Points will be loaded from Supabase below (line 275)
      }
      
      const supabase = createClient()
      const profileService = new ProfileService(supabase)

      if (typeof profileService?.getProfileByWallet !== "function") {
        console.warn("profileService.getProfileByWallet missing; skipping profile sync")
        return
      }

      // PROFILE LOOKUP WITH RETRY: On mobile, profile may not exist yet due to race condition
      // Retry once if profile lookup returns null (wait 800-1200ms between attempts)
      let existingProfile = await profileService.getProfileByWallet(walletAddress)
      
      if (!existingProfile) {
        console.log("[MOBILE-AUTH] PROFILE_SYNC_RETRY", {
          address: walletAddress.substring(0, 10) + "...",
          timestamp: new Date().toISOString(),
          reason: "Profile lookup returned null, retrying...",
        })
        
        // Wait 1000ms before retry (mobile delay)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Retry profile lookup
        existingProfile = await profileService.getProfileByWallet(walletAddress)
        
        if (existingProfile) {
          console.log("[MOBILE-AUTH] PROFILE_SYNC_FOUND (after retry)", {
            address: walletAddress.substring(0, 10) + "...",
            timestamp: new Date().toISOString(),
          })
        } else {
          console.log("[MOBILE-AUTH] PROFILE_SYNC_RETRY_FAILED", {
            address: walletAddress.substring(0, 10) + "...",
            timestamp: new Date().toISOString(),
            message: "Profile still not found after retry, will create new profile",
          })
        }
      } else {
        console.log("[MOBILE-AUTH] PROFILE_SYNC_FOUND", {
          address: walletAddress.substring(0, 10) + "...",
          timestamp: new Date().toISOString(),
        })
      }

      if (existingProfile) {
        // Merge Supabase data with localStorage data
        // Prefer localStorage username if it exists and is not "Guest" or default generated name
        // This ensures user's custom username persists even if Supabase hasn't synced yet
        const localStorageUsername = savedProfile?.username
        const isDefaultUsername = existingProfile.username?.startsWith('Rabbit') || existingProfile.username === 'Guest'
        const useLocalStorageUsername = localStorageUsername && 
          localStorageUsername !== 'Guest' && 
          !localStorageUsername.startsWith('Rabbit') &&
          localStorageUsername !== existingProfile.username
        
        const finalUsername = useLocalStorageUsername ? localStorageUsername : existingProfile.username
        
        // If localStorage has a custom username that differs from Supabase, sync it to Supabase
        if (useLocalStorageUsername && localStorageUsername) {
          ;(async () => {
            try {
              const success = await profileService.updateProfile(existingProfile.id, {
                username: localStorageUsername,
              })
              if (success) {
                logger.log("✅ Synced localStorage username to Supabase:", localStorageUsername)
              }
            } catch (error) {
              logger.error("❌ Error syncing username to Supabase:", error)
            }
          })()
        }
        
        setProfile({
          username: finalUsername,
          avatar: savedProfile?.avatar || existingProfile.avatar_url || profile.avatar,
          referralCode: existingProfile.referral_code || profile.referralCode,
          referralCount: existingProfile.referral_count || 0,
          referralEarnings: existingProfile.referral_earnings || 0,
          joinedAt: new Date(existingProfile.created_at),
          stats: {
            gamesPlayed: existingProfile.total_games_played || 0,
            totalScore: (existingProfile as any).points || 0,
            achievements: [],
          },
        })
        setTickets((existingProfile as any).tickets || (existingProfile as any).ticket_balance || 0)
        // Load points from the 'points' field, not 'ape_balance'
        // Note: The database has both 'ape_balance' (APE tokens) and 'points' (game points)
        const dbPoints = (existingProfile as any).points || 0
        logger.log("📊 Loading points from database:", dbPoints, "for wallet:", walletAddress)
        setPoints(dbPoints)
      } else {
        if (typeof profileService?.createProfile !== "function") {
          console.warn("profileService.createProfile missing; skipping profile creation")
          return
        }

        console.log("[MOBILE-AUTH] PROFILE_SYNC_CREATED", {
          address: walletAddress.substring(0, 10) + "...",
          timestamp: new Date().toISOString(),
        })
        
        // BUG FIX: Don't set ape_balance: points (ape_balance is for APE tokens, not game points)
        // Points field will default to 0 in database (not set during creation)
        const newProfile = await profileService.createProfile({
          wallet_address: walletAddress,
          username: `Rabbit${walletAddress.slice(2, 8)}`,
          ape_balance: 0, // APE tokens start at 0 (game points go to 'points' column, defaulted to 0)
          tickets: tickets,
          referral_code: profile.referralCode,
        })

        if (newProfile) {
          console.log("[MOBILE-AUTH] PROFILE_SYNC_CREATED (success)", {
            address: walletAddress.substring(0, 10) + "...",
            profileId: newProfile.id,
            timestamp: new Date().toISOString(),
          })
          setProfile((prev) => ({
            ...prev,
            username: newProfile.username,
            referralCode: newProfile.referral_code || prev.referralCode,
            joinedAt: new Date(newProfile.created_at),
          }))
        }
      }
    } catch (error) {
      console.error("[MOBILE-AUTH] PROFILE_SYNC_FAILED", {
        address: walletAddress.substring(0, 10) + "...",
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      })
      logger.error("[v0] Error syncing profile:", error)
      // Don't throw - allow UI to continue even if profile sync fails
      // User can still play games, profile will be created on next sync attempt
    }
  }, [points, tickets, profile.referralCode, profile.avatar])

  const handleAuthSuccess = useCallback((result: { token: string; walletAddress: string; type: string; isNewUser?: boolean }) => {
    logger.log("[v0] Auth success:", result)
    setIsAuthenticated(true)
    setAuthToken(result.token)
    setAddress(result.walletAddress)
    setIsConnected(true)
    
    // Sync profile with wallet
    if (result.walletAddress) {
      syncProfileWithWallet(result.walletAddress)
      // Balance fetching stubbed for auth-only migration
      // TODO: Re-enable balance fetching after auth migration
      setApeBalance("0.0000")
    }
  }, [syncProfileWithWallet])

  const connect = useCallback(async () => {
    logger.log("[v0] Connecting wallet via adapter")
    await authAdapter.connect()
  }, [authAdapter])

  const logout = useCallback(() => {
    logger.log("[v0] Logging out user")
    setIsAuthenticated(false)
    setAuthToken(null)
    setAddress(null)
    setIsConnected(false)
    setApeBalance("0.0000")
    // Reset points and tickets on logout
    setPoints(0)
    setTickets(0)
    // Reset profile to default Guest state
    setProfile({
      username: "Guest",
      avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Artboard-1-83QWedD6ivnkXqy5WoMh05oLPpdMO6.png",
      referralCode: "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      referralCount: 0,
      referralEarnings: 0,
      joinedAt: new Date(),
      stats: {
        gamesPlayed: 0,
        totalScore: 0,
        achievements: [],
      },
    })
    clearAuthToken()
    clearGameSession()
    // NOTE: arcade_profile_{wallet_address} persists in localStorage by design
    // This allows profile to be restored when user reconnects with same wallet
    // If you want to completely clear profile on logout, uncomment below:
    // if (address) {
    //   const { clearProfileByAddress } = require("@/lib/profile-storage")
    //   clearProfileByAddress(address)
    // }
  }, [])

  const disconnect = useCallback(async () => {
    logger.log("[v0] Disconnecting wallet via adapter")
    if (isAuthenticated) {
      // If authenticated, logout handles cleanup and also disconnects wallet
      logout()
      // Also call adapter disconnect to ensure wagmi state is cleared
      await authAdapter.disconnect()
    } else {
      // If not authenticated, just disconnect wallet and clear state
      await authAdapter.disconnect()
      setIsConnected(false)
      setAddress(null)
      setApeBalance("0.0000")
      // Reset points and tickets on disconnect
      setPoints(0)
      setTickets(0)
      // Reset profile to default Guest state on disconnect
      setProfile({
        username: "Guest",
        avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Artboard-1-83QWedD6ivnkXqy5WoMh05oLPpdMO6.png",
        referralCode: "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        referralCount: 0,
        referralEarnings: 0,
        joinedAt: new Date(),
        stats: {
          gamesPlayed: 0,
          totalScore: 0,
          achievements: [],
        },
      })
      // Clear hub auth token and session on disconnect
      clearAuthToken()
      clearGameSession()
    }
  }, [isAuthenticated, logout, authAdapter])

  const addTxn = useCallback((txn: Transaction) => {
    setTxns((prev) => [txn, ...prev])
  }, [])

  const updateTxn = useCallback((id: string, updates: Partial<Transaction>) => {
    setTxns((prev) => prev.map((txn) => (txn.id === id ? { ...txn, ...updates } : txn)))
  }, [])

  const removeTxn = useCallback((id: string) => {
    setTxns((prev) => prev.filter((txn) => txn.id !== id))
  }, [])

  const addTickets = useCallback((amount: number) => {
    setTickets((prev) => {
      const newTickets = prev + amount
      // Note: updateArcadeSession, loadProfileByAddress, saveProfileByAddress are referenced but not imported
      // TODO: Implement or import these functions
      // Update session when tickets change
      if (isAuthenticated) {
        // updateArcadeSession({ tickets: newTickets })
      }
      // Save to profile storage to persist accumulated tickets
      if (address) {
        // const savedProfile = loadProfileByAddress(address)
        // if (savedProfile) {
        //   saveProfileByAddress(address, { ...savedProfile, tickets: newTickets, points })
        // } else {
        //   saveProfileByAddress(address, minimalProfile)
        // }
      }
      return newTickets
    })
  }, [isAuthenticated, address, points])

  const addPoints = useCallback(async (amount: number) => {
    logger.log("➕ addPoints called with amount:", amount)
    if (amount <= 0) {
      logger.warn("⚠️ addPoints called with 0 or negative amount, skipping")
      return
    }
    
    setPoints((prev) => {
      const newPoints = prev + amount
      logger.log("💰 Points updated locally:", prev, "->", newPoints)
      
      // Sync points to Supabase if authenticated and address is available
      if (isAuthenticated && address) {
        // Sync asynchronously to avoid blocking UI
        ;(async () => {
          try {
            const supabase = createClient()
            const profileService = new ProfileService(supabase)
            const profile = await profileService.getProfileByWallet(address)
            
            if (profile) {
              // Use the RPC function to update points (this also updates total_points in leaderboard)
              // Parameters: userId, apeChange, ticketChange, pointsChange
              const success = await profileService.updateBalance(profile.id, 0, 0, amount)
              if (success) {
                logger.log("✅ Points synced to Supabase:", amount, "Total points now:", newPoints)
                // Reload points from database to ensure consistency
                setTimeout(async () => {
                  const updatedProfile = await profileService.getProfileByWallet(address)
                  if (updatedProfile) {
                    const dbPoints = (updatedProfile as any).points || 0
                    logger.log("📊 Points in database:", dbPoints)
                    if (dbPoints !== newPoints) {
                      logger.warn("⚠️ Points mismatch - DB:", dbPoints, "Local:", newPoints)
                      setPoints(dbPoints) // Sync to database value
                    }
                  }
                }, 500)
              } else {
                logger.warn("⚠️ Failed to sync points to Supabase")
              }
            } else {
              logger.warn("⚠️ Profile not found when trying to sync points, address:", address)
            }
          } catch (error) {
            logger.error("❌ Error syncing points to Supabase:", error)
          }
        })()
      } else if (!address) {
        logger.warn("⚠️ No address available when trying to save points")
      } else if (!isAuthenticated) {
        logger.warn("⚠️ Not authenticated when trying to save points")
      }
      
      return newPoints
    })
  }, [isAuthenticated, address])

  const setTicketsValue = useCallback((amount: number) => {
    setTickets(amount)
  }, [])

  const setPointsValue = useCallback((amount: number) => {
    setPoints(amount)
  }, [])

  const addCard = useCallback((card: Card) => {
    setCards((prev) => [...prev, card])
  }, [])

  const generateReferralCode = useCallback(() => {
    const newCode = "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase()
    setProfile((prev) => ({ ...prev, referralCode: newCode }))
    return newCode
  }, [])

  const trackReferral = useCallback((code: string) => {
    setProfile((prev) => ({
      ...prev,
      referralCount: prev.referralCount + 1,
      referralEarnings: prev.referralEarnings + 150,
    }))
    setTickets((prev) => prev + 5)
    setPoints((prev) => prev + 150)
  }, [])

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates }
      
      // Save profile to localStorage keyed by wallet address
      if (address && isAuthenticated) {
        const { saveProfileByAddress } = require("@/lib/profile-storage")
        saveProfileByAddress(address, {
          username: updated.username,
          avatar: updated.avatar || "",
          referralCode: updated.referralCode,
          referralCount: updated.referralCount,
          referralEarnings: updated.referralEarnings,
          joinedAt: updated.joinedAt.toISOString(),
          points: points,
          tickets: tickets,
          stats: updated.stats,
        })

        // Also save to Supabase (async, non-blocking)
        // BUG FIX: Use instance method instead of static - get profile ID first
        ;(async () => {
          try {
            const supabase = createClient()
            const profileServiceInstance = new ProfileService(supabase)
            const profileData = await profileServiceInstance.getProfileByWallet(address)
            
            if (!profileData) {
              console.log("[MOBILE-AUTH] updateProfile: Profile not found for address", address?.substring(0, 10) + "...")
              return
            }
            
            const success = await profileServiceInstance.updateProfile(profileData.id, {
              username: updated.username,
              avatar_url: updated.avatar || null,
            })
            if (success) {
              logger.log("✅ Profile updated in Supabase:", { username: updated.username })
            } else {
              logger.warn("⚠️ Failed to update profile in Supabase")
            }
          } catch (error) {
            logger.error("❌ Error updating profile in Supabase:", error)
          }
        })()
      }
      
      return updated
    })
  }, [address, isAuthenticated, points, tickets])

  // Auto-save profile whenever it changes (for stats updates from games, etc.)
  useEffect(() => {
    if (address && isAuthenticated) {
      const { saveProfileByAddress } = require("@/lib/profile-storage")
      saveProfileByAddress(address, {
        username: profile.username,
        avatar: profile.avatar || "",
        referralCode: profile.referralCode,
        referralCount: profile.referralCount,
        referralEarnings: profile.referralEarnings,
        joinedAt: profile.joinedAt.toISOString(),
        points: points,
        tickets: tickets,
        stats: profile.stats,
      })
    }
  }, [address, isAuthenticated, profile.username, profile.avatar, profile.referralCode, profile.referralCount, profile.referralEarnings, profile.stats.gamesPlayed, profile.stats.totalScore, profile.stats.achievements.length, points, tickets])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ArcadeContextType>(
    () => ({
      tickets,
      points,
      txns,
      isConnected,
      address,
      profile,
      cards,
      isAuthenticated,
      apeBalance,
      connect,
      disconnect,
      logout,
      setWalletConnection,
      syncProfileWithWallet,
      handleAuthSuccess,
      addTxn,
      updateTxn,
      removeTxn,
      addTickets,
      addPoints,
      setTickets: setTicketsValue,
      setPoints: setPointsValue,
      addCard,
      generateReferralCode,
      trackReferral,
      updateProfile,
    }),
    [
      tickets,
      points,
      txns,
      isConnected,
      address,
      profile,
      cards,
      isAuthenticated,
      apeBalance,
      connect,
      disconnect,
      logout,
      setWalletConnection,
      syncProfileWithWallet,
      handleAuthSuccess,
      addTxn,
      updateTxn,
      removeTxn,
      addTickets,
      addPoints,
      setTicketsValue,
      setPointsValue,
      addCard,
      generateReferralCode,
      trackReferral,
      updateProfile,
    ],
  )

  return <ArcadeContext.Provider value={contextValue}>{children}</ArcadeContext.Provider>
}

export function useArcade() {
  const context = useContext(ArcadeContext)
  if (!context) {
    throw new Error("useArcade must be used within Providers")
  }
  return context
}
