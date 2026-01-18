"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useAccount } from "wagmi"
import { useArcade } from "@/components/providers"
import { isMobile } from "@/lib/utils/mobile-detection"

export function ProfileSyncWrapper({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { setWalletConnection, syncProfileWithWallet, isAuthenticated } = useArcade()
  
  // Single-flight lock to prevent concurrent syncs
  const syncLockRef = useRef<boolean>(false)
  // Track pending sync timeout to cancel if address changes
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any pending sync if address changes
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }
    
    if (address && isConnected) {
      console.log("[MOBILE-AUTH] WAGMI_CONNECTED", {
        address: address.substring(0, 10) + "...",
        timestamp: new Date().toISOString(),
        isMobile: isMobile(),
      })
      
      // Update wallet connection state immediately - this will also fetch APE balance
      setWalletConnection(address)
      
      // MOBILE-SAFE "SETTLED" GATE: Wait for wallet to settle before profile sync
      // On mobile, wallet connection can take 5-10s, so we wait 800-1500ms for stability
      // On desktop, use immediate or near-immediate sync (0ms or very short delay)
      const isMobileDevice = isMobile()
      const settleDelay = isMobileDevice ? 1000 : 0 // 1000ms mobile, 0ms desktop
      
      // Prevent concurrent syncs with single-flight lock
      if (syncLockRef.current) {
        console.log("[MOBILE-AUTH] Profile sync already in progress, skipping duplicate")
        return
      }
      
      syncLockRef.current = true
      
      // PHASE 1 FIX: Single setTimeout with try/catch/finally inside to guarantee lock release
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          // Double-check address hasn't changed during delay and lock is still held
          if (address && isConnected && syncLockRef.current) {
            console.log("[MOBILE-AUTH] PROFILE_SYNC_START", {
              address: address.substring(0, 10) + "...",
              timestamp: new Date().toISOString(),
              settleDelay,
            })
            
            // Sync profile with wallet - this will create/update profile in Supabase
            // Note: syncProfileWithWallet handles its own guards, so it's safe to call
            await syncProfileWithWallet(address)
          }
        } catch (error) {
          // Log error but don't throw - lock release happens in finally
          console.error("[MOBILE-AUTH] Profile sync error (non-fatal):", error)
        } finally {
          // PHASE 1 FIX: Always release lock and clear timeout, even if sync throws or conditions changed
          syncLockRef.current = false
          syncTimeoutRef.current = null
        }
      }, settleDelay)
      
      // Cleanup on unmount or address change
      return () => {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
          syncTimeoutRef.current = null
        }
        syncLockRef.current = false
      }
    } else {
      // Only clear connection if wallet is actually disconnected
      // Don't clear if we're authenticated but account is temporarily unavailable
      if (!isAuthenticated) {
        console.log("[v0] Wallet disconnected")
        setWalletConnection(null)
        syncLockRef.current = false
      }
    }
  }, [address, isConnected, setWalletConnection, syncProfileWithWallet, isAuthenticated])

  return <>{children}</>
}
