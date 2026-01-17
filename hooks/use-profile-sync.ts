"use client"

import { useEffect, useCallback } from "react"
import { useAccount } from "wagmi"
import { useArcade } from "@/components/providers"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createGameSession, storeGameSession } from "@/lib/game-session"

export function useProfileSync() {
  const { address } = useAccount()
  const { profile, tickets, points, updateProfile, setTickets, setPoints } = useArcade()

  const syncProfile = useCallback(async () => {
    if (!address) return

    try {
      // Get or create profile in Supabase
      let supabaseProfile = await ProfileService.getProfile(address)

      if (!supabaseProfile) {
        // Create new profile (points start at 0)
        supabaseProfile = await ProfileService.createProfile({
          wallet_address: address,
          username: profile.username || `Player${address.slice(2, 8)}`,
          ape_balance: 0, // New profiles start with 0 points
          ticket_balance: tickets || 0,
        })
      }
      // NOTE: Do NOT update Supabase with local points/tickets values
      // Supabase is the source of truth - we read FROM it, not write TO it
      // Updates to points/tickets come from game completions via API routes, not from localStorage

      // Update local profile with Supabase data (read FROM Supabase)
      if (supabaseProfile) {
        updateProfile({
          username: supabaseProfile.username,
          avatar: supabaseProfile.avatar_url || undefined,
        })
        // Database uses 'tickets' field, types file may be outdated
        const tickets = (supabaseProfile as any).tickets || (supabaseProfile as any).ticket_balance || 0
        setTickets(tickets)
        // Load points from the 'points' field, not 'ape_balance'
        // NOTE: Points are ALWAYS loaded from Supabase (source of truth)
        // The database has both 'ape_balance' (APE tokens) and 'points' (game points)
        const dbPoints = (supabaseProfile as any).points || 0
        setPoints(dbPoints)

        // Create and store game session for cross-game access
        // Store points from Supabase (not localStorage)
        const session = createGameSession({
          userId: supabaseProfile.id,
          username: supabaseProfile.username,
          address: address,
          tickets: tickets,
          points: dbPoints, // Use points from Supabase, not ape_balance
        })
        storeGameSession(session)
      }
    } catch (error) {
      console.error("[v0] Failed to sync profile:", error)
    }
  }, [address, profile.username, tickets, updateProfile, setTickets, setPoints])

  // Sync on wallet connection
  useEffect(() => {
    if (address) {
      syncProfile()
    }
  }, [address, syncProfile])

  return { syncProfile }
}
