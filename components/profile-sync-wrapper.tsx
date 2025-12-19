"use client"

import { useEffect, type ReactNode } from "react"
import { useActiveAccount, useActiveWallet } from "thirdweb/react"
import { useArcade } from "@/components/providers"

export function ProfileSyncWrapper({ children }: { children: ReactNode }) {
  const account = useActiveAccount()
  const wallet = useActiveWallet()
  const { setWalletConnection, syncProfileWithWallet, isAuthenticated } = useArcade()

  useEffect(() => {
    if (account?.address) {
      console.log("[v0] Wallet connected:", account.address, "Wallet:", wallet?.id)
      // Update wallet connection state - this will also fetch APE balance
      setWalletConnection(account.address, wallet || null)
      // Sync profile with wallet - this will create/update profile in Supabase
      // Note: syncProfileWithWallet handles its own guards, so it's safe to call
      syncProfileWithWallet(account.address)
    } else {
      // Only clear connection if wallet is actually disconnected
      // Don't clear if we're authenticated but account is temporarily unavailable
      if (!isAuthenticated) {
        console.log("[v0] Wallet disconnected")
        setWalletConnection(null, null)
      }
    }
  }, [account?.address, wallet, setWalletConnection, syncProfileWithWallet, isAuthenticated])

  return <>{children}</>
}
