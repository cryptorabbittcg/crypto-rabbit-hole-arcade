"use client"

import { useEffect, type ReactNode } from "react"
import { useAccount } from "wagmi"
import { useArcade } from "@/components/providers"

export function ProfileSyncWrapper({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { setWalletConnection, syncProfileWithWallet, isAuthenticated } = useArcade()

  useEffect(() => {
    if (address && isConnected) {
      console.log("[v0] Wallet connected:", address)
      // Update wallet connection state - this will also fetch APE balance
      setWalletConnection(address)
      // Sync profile with wallet - this will create/update profile in Supabase
      // Note: syncProfileWithWallet handles its own guards, so it's safe to call
      syncProfileWithWallet(address)
    } else {
      // Only clear connection if wallet is actually disconnected
      // Don't clear if we're authenticated but account is temporarily unavailable
      if (!isAuthenticated) {
        console.log("[v0] Wallet disconnected")
        setWalletConnection(null)
      }
    }
  }, [address, isConnected, setWalletConnection, syncProfileWithWallet, isAuthenticated])

  return <>{children}</>
}
