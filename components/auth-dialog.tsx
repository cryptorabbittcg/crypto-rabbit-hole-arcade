"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConnectEmbed, useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react"
import { thirdwebClient } from "@/lib/thirdweb"
import { apeChainMainnet } from "@/lib/chains"
import { Button } from "@/components/ui/button"
import {
  getWalletInfo,
  storeAuthToken,
  clearAuthToken,
  type AuthResult,
} from "@/lib/auth"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthSuccess?: (result: AuthResult) => void
}

export function AuthDialog({ open, onOpenChange, onAuthSuccess = () => {} }: AuthDialogProps) {
  const account = useActiveAccount()
  const wallet = useActiveWallet()
  const { disconnect: disconnectWallet } = useDisconnect()
  const [hasProcessedAuth, setHasProcessedAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear any stored auth state when dialog opens to force fresh sign-in
  // NOTE: We preserve profile data (arcade_profile_*) - only clear wallet connections
  useEffect(() => {
    if (open) {
      // First, disconnect any active wallet connection
      if (wallet) {
        try {
          disconnectWallet(wallet)
        } catch (err) {
          console.warn("Error disconnecting wallet:", err)
        }
      }
      
      // Clear stored auth tokens to force fresh login
      clearAuthToken()
      
      // Clear thirdweb's stored wallet connections (but NOT profile data)
      if (typeof window !== "undefined") {
        // Clear thirdweb's localStorage keys (but preserve arcade_profile_* keys)
        const keysToRemove: string[] = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key && (key.startsWith("thirdweb") || key.startsWith("wagmi")) && !key.startsWith("arcade_profile_")) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key))
        console.log("🧹 Cleared stored wallet connections for fresh sign-in (profile data preserved)")
      }
    }
  }, [open, wallet, disconnectWallet])

  // Monitor for successful connection
  useEffect(() => {
    if (open && account && wallet && !hasProcessedAuth) {
      console.log("✅ Wallet connected! Processing auth...")
      handleAuthSuccess()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account, wallet, hasProcessedAuth])

  // Reset processed flag and error when dialog closes
  useEffect(() => {
    if (!open) {
      setHasProcessedAuth(false)
      setError(null)
    }
  }, [open])

  const handleAuthSuccess = async () => {
    try {
      if (wallet && account) {
        let authToken: string | null = null
        
        // For inAppWallet, try to get the auth token
        if (wallet.id === "inApp") {
          try {
            // inAppWallet stores auth token - try to access it
            const authDetails = await (wallet as any).getAuthDetails?.()
            if (authDetails?.token) {
              authToken = authDetails.token
            } else {
              // Try alternative method to get token
              const storedAuth = localStorage.getItem("thirdweb_auth_token")
              if (storedAuth) {
                authToken = storedAuth
              }
            }
          } catch (e) {
            console.log("Could not get auth token from inAppWallet:", e)
          }
          
          // If we have a token for inAppWallet, try to get wallet info
          if (authToken) {
            storeAuthToken(authToken)
            try {
              // Only call getWalletInfo if we have a valid token
              // This validates the token and gets wallet info
              await getWalletInfo(authToken)
              // If successful, create result with token
              const result: AuthResult = {
                isNewUser: false,
                token: authToken,
                type: "email",
                walletAddress: account.address,
              }
              setHasProcessedAuth(true)
              if (typeof onAuthSuccess === "function") {
                onAuthSuccess(result)
              } else {
                console.warn("onAuthSuccess missing; continuing without callback")
              }
              onOpenChange(false)
              return
            } catch (e) {
              // If getWalletInfo fails (e.g., token invalid/expired), 
              // clear the invalid token and continue with fallback
              console.warn("Failed to get wallet info, token may be invalid:", e)
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("thirdweb_auth_token")
              }
              // Continue to fallback below
            }
          }
        }
        
        // For external wallets (MetaMask, Coinbase, etc.) or if token retrieval failed,
        // use the account address as the token identifier
        // External wallets don't have auth tokens, so we use the address
        const result: AuthResult = {
          isNewUser: false,
          token: authToken || account.address, // Use address as fallback for external wallets
          type: wallet.id === "inApp" ? "email" : "siwe",
          walletAddress: account.address,
        }
        
        // Store the connection info
        if (authToken) {
          storeAuthToken(authToken)
        }
        
        // The Providers component will handle the wallet connection
        setHasProcessedAuth(true)
        if (typeof onAuthSuccess === "function") {
          onAuthSuccess(result)
        } else {
          console.warn("onAuthSuccess missing; continuing without callback")
        }
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error handling auth success:", error)
      setError(error instanceof Error ? error.message : "Failed to authenticate. Please try again.")
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleContinueAsGuest = () => {
    // Close dialog without authenticating - user continues as guest
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
        // Allow ConnectButton modal to work - don't close on outside click if it's the ConnectButton modal
        const target = e.target as HTMLElement
        if (target.closest('[data-thirdweb-connect-modal]') || target.closest('[data-thirdweb-connect-button]')) {
          e.preventDefault()
        }
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent text-center">
            <div>Welcome To</div>
            <div>The Crypto Rabbit Hole Arcade</div>
          </DialogTitle>
          <DialogDescription className="text-center">
            Sign in with your email or connect your wallet to start playing and earning rewards.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="flex flex-col items-center gap-3">
            {/* Use ConnectEmbed with autoConnect disabled to require fresh sign-in each time */}
            {/* Note: If you see "Unrecognized chain ID" errors, MetaMask needs to add ApeChain.
                The chain will be automatically added if possible, otherwise add it manually in MetaMask. */}
            <div className="w-full">
              <ConnectEmbed
                client={thirdwebClient}
                chain={apeChainMainnet}
                autoConnect={false}
              />
            </div>
            
            {/* Continue as Guest button */}
            <Button
              variant="outline"
              onClick={handleContinueAsGuest}
              className="w-full"
            >
              Continue as Guest
            </Button>
          </div>
          
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
