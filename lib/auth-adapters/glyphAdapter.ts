"use client"

import { useAccount, useDisconnect } from "wagmi"
import { useEffect, useCallback, useRef } from "react"
import type { AuthAdapter } from "./AuthAdapter"

/**
 * GlyphAuthAdapter
 * 
 * Implementation of AuthAdapter for Glyph Wallet via Wagmi.
 * 
 * This adapter wraps wagmi's useAccount() and useDisconnect() hooks
 * to provide a consistent interface for wallet connection management.
 * 
 * Note: This is a hook that must be used inside a component that's
 * wrapped by WagmiProvider.
 */
export function useGlyphAdapter(): AuthAdapter {
  const { address, isConnected } = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()

  // Event callbacks storage
  const connectCallbacksRef = useRef<Set<(address: string) => void>>(new Set())
  const disconnectCallbacksRef = useRef<Set<() => void>>(new Set())
  const previousAddressRef = useRef<string | null>(null)

  // Monitor address changes and trigger callbacks
  useEffect(() => {
    const previousAddress = previousAddressRef.current
    const currentAddress = address ?? null

    // Connection event: address changed from null/undefined to a valid address
    if (!previousAddress && currentAddress && isConnected) {
      connectCallbacksRef.current.forEach((callback) => {
        try {
          callback(currentAddress)
        } catch (error) {
          console.error("[GlyphAdapter] Error in connect callback:", error)
        }
      })
    }

    // Disconnection event: address changed from valid address to null/undefined
    if (previousAddress && !currentAddress && !isConnected) {
      disconnectCallbacksRef.current.forEach((callback) => {
        try {
          callback()
        } catch (error) {
          console.error("[GlyphAdapter] Error in disconnect callback:", error)
        }
      })
    }

    previousAddressRef.current = currentAddress
  }, [address, isConnected])

  const connect = useCallback(async (): Promise<void> => {
    // Trigger the existing showAuthDialog flow by dispatching a window event
    // This is the same mechanism used by ProfileMenu to show the auth dialog
    // The actual UI (AuthDialog with NativeGlyphConnectButton) handles the connection
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("showAuthDialog"))
    }
  }, [])

  const disconnect = useCallback(async (): Promise<void> => {
    // Use wagmi's disconnect function
    wagmiDisconnect()
  }, [wagmiDisconnect])

  const onConnect = useCallback((callback: (address: string) => void): (() => void) => {
    connectCallbacksRef.current.add(callback)
    return () => {
      connectCallbacksRef.current.delete(callback)
    }
  }, [])

  const onDisconnect = useCallback((callback: () => void): (() => void) => {
    disconnectCallbacksRef.current.add(callback)
    return () => {
      disconnectCallbacksRef.current.delete(callback)
    }
  }, [])

  return {
    address: address ?? null,
    isConnected: isConnected ?? false,
    providerName: "Glyph",
    connect,
    disconnect,
    onConnect,
    onDisconnect,
  }
}

