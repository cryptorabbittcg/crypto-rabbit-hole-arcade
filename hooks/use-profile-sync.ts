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
        // Create new profile
        supabaseProfile = await ProfileService.createProfile({
          wallet_address: address,
          username: profile.username || `Player${address.slice(2, 8)}`,
          ape_balance: points,
          ticket_balance: tickets,
        })
      } else {
        // Update existing profile with current balances
        await ProfileService.updateBalance(address, {
          ape_balance: points,
          ticket_balance: tickets,
        })
      }

      // Update local profile with Supabase data
      if (supabaseProfile) {
        updateProfile({
          username: supabaseProfile.username,
          avatar: supabaseProfile.avatar_url || undefined,
        })
        // Database uses 'tickets' field, types file may be outdated
        const tickets = (supabaseProfile as any).tickets || (supabaseProfile as any).ticket_balance || 0
        setTickets(tickets)
        setPoints(supabaseProfile.ape_balance)

        // Create and store game session for cross-game access
        const session = createGameSession({
          userId: supabaseProfile.id,
          username: supabaseProfile.username,
          address: address,
          tickets: tickets,
          points: supabaseProfile.ape_balance,
        })
        storeGameSession(session)
      }
    } catch (error) {
      console.error("[v0] Failed to sync profile:", error)
    }
  }, [address, profile.username, points, tickets, updateProfile, setTickets, setPoints])

  // Sync on wallet connection
  useEffect(() => {
    if (address) {
      syncProfile()
    }
  }, [address, syncProfile])

  return { syncProfile }
}
