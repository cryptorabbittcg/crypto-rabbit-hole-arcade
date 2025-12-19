"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getGameSession, storeGameSession, getStoredPointUpdates, clearPointUpdates } from "@/lib/game-session"
import { createClient } from "@/lib/supabase/client"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import type { Wallet } from "thirdweb/wallets"

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
  wallet: Wallet | null
  profile: UserProfile
  cards: Card[]
  connect: () => void
  disconnect: () => void
  setWalletConnection: (address: string | null, wallet: Wallet | null) => void
  syncProfileWithWallet: (address: string) => Promise<void>
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
  const [tickets, setTickets] = useState(0)
  const [points, setPoints] = useState(0) // Will be loaded from profile storage
  const [txns, setTxns] = useState<Transaction[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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

  useEffect(() => {
    const session = getGameSession()
    if (session) {
      setTickets(session.tickets)
      setPoints(session.points)
      setProfile((prev) => ({ ...prev, username: session.username }))
      if (session.address) {
        setIsConnected(true)
        setAddress(session.address)
      }
    }

    const updates = getStoredPointUpdates()
    if (updates.length > 0) {
      updates.forEach((update) => {
        setPoints((prev) => prev + update.points)
        setTickets((prev) => prev + update.tickets)
        if (update.achievements) {
          setProfile((prev) => ({
            ...prev,
            stats: {
              ...prev.stats,
              achievements: [...new Set([...prev.stats.achievements, ...update.achievements])],
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
      storeGameSession({
        sessionId: `session_${Date.now()}`,
        userId: profile.username,
        username: profile.username,
        address,
        thirdwebClientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
        tickets,
        points,
        timestamp: Date.now(),
      })
    }
  }, [tickets, points, isConnected, address, profile.username])

  const setWalletConnection = (newAddress: string | null, newWallet: Wallet | null) => {
    setAddress(newAddress)
    setWallet(newWallet)
    setIsConnected(!!newAddress)
  }

  const syncProfileWithWallet = async (walletAddress: string) => {
    try {
      const supabase = createClient()
      const profileService = new ProfileService(supabase)

      const existingProfile = await profileService.getProfileByWallet(walletAddress)

      if (existingProfile) {
        setProfile({
          username: existingProfile.username,
          avatar: existingProfile.avatar_url || profile.avatar,
          referralCode: existingProfile.referral_code,
          referralCount: existingProfile.referral_count,
          referralEarnings: existingProfile.referral_earnings,
          joinedAt: new Date(existingProfile.created_at),
          stats: {
            gamesPlayed: existingProfile.games_played,
            totalScore: existingProfile.total_score,
            achievements: existingProfile.achievements || [],
          },
        })
        setTickets(existingProfile.tickets)
        setPoints(existingProfile.ape_balance)
      } else {
        const newProfile = await profileService.createProfile({
          wallet_address: walletAddress,
          username: `Rabbit${walletAddress.slice(2, 8)}`,
          ape_balance: points,
          tickets: tickets,
          referral_code: profile.referralCode,
        })

        if (newProfile) {
          setProfile((prev) => ({
            ...prev,
            username: newProfile.username,
            referralCode: newProfile.referral_code,
            joinedAt: new Date(newProfile.created_at),
          }))
        }
      }
    } catch (error) {
      console.error("[v0] Error syncing profile:", error)
    }
  }

  const connect = () => {
    console.log("[v0] Use WalletConnect component to connect wallet")
  }

  const disconnect = () => {
    console.log("[v0] Use WalletConnect component to disconnect wallet")
  }

  const addTxn = (txn: Transaction) => {
    setTxns((prev) => [txn, ...prev])
  }

  const updateTxn = (id: string, updates: Partial<Transaction>) => {
    setTxns((prev) => prev.map((txn) => (txn.id === id ? { ...txn, ...updates } : txn)))
  }

  const removeTxn = (id: string) => {
    setTxns((prev) => prev.filter((txn) => txn.id !== id))
  }

  const addTickets = (amount: number) => {
    setTickets((prev) => {
      const newTickets = prev + amount
      // Update session when tickets change
      if (isAuthenticated) {
        updateArcadeSession({ tickets: newTickets })
      }
      // Save to profile storage to persist accumulated tickets
      // Save even if not fully authenticated, as long as we have an address
      if (address) {
        const savedProfile = loadProfileByAddress(address)
        if (savedProfile) {
          saveProfileByAddress(address, {
            ...savedProfile,
            tickets: newTickets,
            points: points, // Include current points
          })
        } else {
          // If no saved profile exists, create minimal profile entry
          const minimalProfile = {
            username: address.slice(0, 6) + "..." + address.slice(-4),
            avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Artboard-1-83QWedD6ivnkXqy5WoMh05oLPpdMO6.png",
            referralCode: "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
            referralCount: 0,
            referralEarnings: 0,
            joinedAt: new Date().toISOString(),
            points: points || 0,
            tickets: newTickets,
            stats: {
              gamesPlayed: 0,
              totalScore: 0,
              achievements: [],
            },
          }
          saveProfileByAddress(address, minimalProfile)
        }
      }
      return newTickets
    })
  }

  const addPoints = (amount: number) => {
    console.log("➕ addPoints called with amount:", amount)
    setPoints((prev) => {
      const newPoints = prev + amount
      console.log("💰 Points updated:", prev, "->", newPoints)
      // Update session when points change
      if (isAuthenticated) {
        updateArcadeSession({ points: newPoints })
      }
      // Save to profile storage to persist accumulated points
      // Save even if not fully authenticated, as long as we have an address
      if (address) {
        const savedProfile = loadProfileByAddress(address)
        if (savedProfile) {
          saveProfileByAddress(address, {
            ...savedProfile,
            points: newPoints,
            tickets: tickets, // Include current tickets
          })
          console.log("💾 Saved points to profile:", newPoints)
        } else {
          // If no saved profile exists, we still want to save points
          // Create a minimal profile entry for this address
          const minimalProfile = {
            username: address.slice(0, 6) + "..." + address.slice(-4),
            avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Artboard-1-83QWedD6ivnkXqy5WoMh05oLPpdMO6.png",
            referralCode: "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
            referralCount: 0,
            referralEarnings: 0,
            joinedAt: new Date().toISOString(),
            points: newPoints,
            tickets: tickets,
            stats: {
              gamesPlayed: 0,
              totalScore: 0,
              achievements: [],
            },
          }
          saveProfileByAddress(address, minimalProfile)
          console.log("💾 Created new profile entry with points:", newPoints)
        }
      } else {
        console.warn("⚠️ No address available when trying to save points")
      }
      return newPoints
    })
  }

  const setTicketsValue = (amount: number) => {
    setTickets(amount)
  }

  const setPointsValue = (amount: number) => {
    setPoints(amount)
  }

  const addCard = (card: Card) => {
    setCards((prev) => [...prev, card])
  }

  const generateReferralCode = () => {
    const newCode = "RABBIT" + Math.random().toString(36).substring(2, 8).toUpperCase()
    setProfile((prev) => ({ ...prev, referralCode: newCode }))
    return newCode
  }

  const trackReferral = (code: string) => {
    setProfile((prev) => ({
      ...prev,
      referralCount: prev.referralCount + 1,
      referralEarnings: prev.referralEarnings + 150,
    }))
    setTickets((prev) => prev + 5)
    setPoints((prev) => prev + 150)
  }

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates }
      
      // Save profile to localStorage keyed by wallet address
      if (address && isAuthenticated) {
        saveProfileByAddress(address, {
          username: updated.username,
          avatar: updated.avatar,
          referralCode: updated.referralCode,
          referralCount: updated.referralCount,
          referralEarnings: updated.referralEarnings,
          joinedAt: updated.joinedAt.toISOString(),
          points: points, // Include current accumulated points
          tickets: tickets, // Include current accumulated tickets
          stats: updated.stats,
        })
      }
      
      // Update session when profile changes
      if (isAuthenticated) {
        updateArcadeSession({
          username: updated.username,
          avatar: updated.avatar,
        })
      }
      return updated
    })
  }

  // Auto-save profile whenever it changes (for stats updates from games, etc.)
  useEffect(() => {
    if (address && isAuthenticated) {
      saveProfileByAddress(address, {
        username: profile.username,
        avatar: profile.avatar,
        referralCode: profile.referralCode,
        referralCount: profile.referralCount,
        referralEarnings: profile.referralEarnings,
        joinedAt: profile.joinedAt.toISOString(),
        points: points, // Include current accumulated points
        tickets: tickets, // Include current accumulated tickets
        stats: profile.stats,
      })
    }
  }, [address, isAuthenticated, profile.username, profile.avatar, profile.referralCode, profile.referralCount, profile.referralEarnings, profile.stats.gamesPlayed, profile.stats.totalScore, profile.stats.achievements.length, points, tickets])

  return (
    <ArcadeContext.Provider
      value={{
        tickets,
        points,
        txns,
        isConnected,
        address,
        wallet,
        profile,
        cards,
        connect,
        disconnect,
        setWalletConnection,
        syncProfileWithWallet,
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
      }}
    >
      {children}
    </ArcadeContext.Provider>
  )
}

export function useArcade() {
  const context = useContext(ArcadeContext)
  if (!context) {
    throw new Error("useArcade must be used within Providers")
  }
  return context
}
