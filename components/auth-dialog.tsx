"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeGlyphConnectButton } from "@use-glyph/sdk-react"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import {
  storeAuthToken,
  type AuthResult,
} from "@/lib/auth"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthSuccess?: (result: AuthResult) => void
}

export function AuthDialog({ open, onOpenChange, onAuthSuccess = () => {} }: AuthDialogProps) {
  const { address, isConnected } = useAccount()
  const [hasProcessedAuth, setHasProcessedAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Monitor for successful connection
  useEffect(() => {
    if (open && address && isConnected && !hasProcessedAuth) {
      console.log("✅ Wallet connected! Processing auth...")
      handleAuthSuccess()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address, isConnected, hasProcessedAuth])

  // Reset processed flag and error when dialog closes
  useEffect(() => {
    if (!open) {
      setHasProcessedAuth(false)
      setError(null)
    }
  }, [open])

  const handleAuthSuccess = async () => {
    try {
      if (address) {
        // For Glyph wallet, use the address as the token identifier
        // Glyph handles authentication internally, so we use the address
        const result: AuthResult = {
          isNewUser: false,
          token: address, // Use address as token identifier
          type: "siwe", // Sign-In With Ethereum
          walletAddress: address,
        }
        
        // Store the connection info (address as token)
        storeAuthToken(address)
        
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent text-center">
            <div>Welcome To</div>
            <div>The Crypto Rabbit Hole Arcade</div>
          </DialogTitle>
          <DialogDescription className="text-center">
            Connect your ApeChain wallet to start playing and earning rewards.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="flex flex-col items-center gap-3">
            {/* Glyph Native Connect Button */}
            <div className="w-full">
              <NativeGlyphConnectButton />
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
