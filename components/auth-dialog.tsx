"use client"

import { useState, useEffect, useRef } from "react"
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
import { isMobile, isIOS } from "@/lib/utils/mobile-detection"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthSuccess?: (result: AuthResult) => void
}

export function AuthDialog({ open, onOpenChange, onAuthSuccess = () => {} }: AuthDialogProps) {
  const { address, isConnected } = useAccount()
  const [hasProcessedAuth, setHasProcessedAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const isMobileDevice = isMobile()
  const isIOSDevice = isIOS()

  // Monitor for successful connection
  useEffect(() => {
    if (open && address && isConnected && !hasProcessedAuth) {
      console.log("✅ Wallet connected! Processing auth...", { address, isConnected })
      setPopupBlocked(false) // Clear popup blocked state on successful connection
      setConnectionAttempted(true) // Mark as attempted since connection succeeded
      setError(null) // Clear any errors
      handleAuthSuccess()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address, isConnected, hasProcessedAuth])

  // Monitor for connection errors
  useEffect(() => {
    if (open && !address && !isConnected && hasProcessedAuth) {
      // Connection was attempted but failed
      setError("Failed to connect wallet. Please try again.")
      setHasProcessedAuth(false)
      setConnectionAttempted(true) // Keep as attempted since user tried to connect
    }
  }, [open, address, isConnected, hasProcessedAuth])

  // Reset processed flag and error when dialog closes
  useEffect(() => {
    if (!open) {
      setHasProcessedAuth(false)
      setError(null)
      setPopupBlocked(false)
      setConnectionAttempted(false)
    }
  }, [open])

  // Fallback detection: Monitor for failed connection attempts on mobile
  // This is a backup in case the direct popup test doesn't catch it
  // IMPORTANT: On mobile, Glyph connection can take longer, so we use a longer timeout
  // and check more carefully to avoid false positives
  useEffect(() => {
    if (open && isMobileDevice && connectionAttempted && !isConnected && !address && !popupBlocked && !hasProcessedAuth) {
      // Set a longer timeout for mobile - Glyph connection can take 5-10 seconds on mobile
      const timeout = setTimeout(() => {
        // Double-check conditions before showing error:
        // 1. Dialog still open
        // 2. Connection was attempted
        // 3. Still not connected
        // 4. No address
        // 5. Not already processed
        // 6. Not popup blocked
        // 7. Still on mobile (user didn't switch to desktop)
        if (open && 
            connectionAttempted && 
            !isConnected && 
            !address && 
            !hasProcessedAuth && 
            !popupBlocked &&
            isMobile()) {
          // Only show error if we're absolutely sure connection failed
          // On mobile, Glyph can take longer, so be conservative
          setError("Connection is taking longer than expected. If your wallet is connected, you can close this dialog.")
        }
      }, 8000) // Longer timeout for mobile - Glyph can take 5-10 seconds
      return () => clearTimeout(timeout)
    }
  }, [open, isMobileDevice, connectionAttempted, isConnected, address, hasProcessedAuth, popupBlocked])

  const handleAuthSuccess = async () => {
    try {
      if (address) {
        console.log("[AuthDialog] Processing auth success for:", address.substring(0, 10) + "...")
        
        // Clear any previous errors immediately
        setError(null)
        setPopupBlocked(false)
        
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
        
        // Mark as processed BEFORE calling callbacks (prevents double-processing)
        setHasProcessedAuth(true)
        
        // Call the success callback
        if (typeof onAuthSuccess === "function") {
          console.log("[AuthDialog] Calling onAuthSuccess callback")
          onAuthSuccess(result)
        } else {
          console.warn("[AuthDialog] onAuthSuccess missing; continuing without callback")
        }
        
        // Close dialog after a brief delay to ensure callbacks complete
        // On mobile, give a moment for the connection to fully establish
        setTimeout(() => {
          onOpenChange(false)
        }, isMobileDevice ? 500 : 100)
      } else {
        console.warn("[AuthDialog] handleAuthSuccess called but no address available")
      }
    } catch (error) {
      console.error("[AuthDialog] Error handling auth success:", error)
      // Don't set error if we're already connected - just log it
      if (!address || !isConnected) {
        setError(error instanceof Error ? error.message : "Failed to authenticate. Please try again.")
      }
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleContinueAsGuest = () => {
    // Close dialog without authenticating - user continues as guest
    onOpenChange(false)
  }

  // Handle click with popup permission test - runs in capture phase via React onClickCapture
  // This is the FIRST side-effect: window.open test happens synchronously in the click handler
  const handleGlyphButtonClick = (e: React.MouseEvent) => {
    // Desktop: skip popup test entirely, let click proceed without state updates
    // State will be updated in success/failure callbacks to preserve user activation
    if (!isMobileDevice) {
      return // Allow click to continue to NativeGlyphConnectButton
    }

    // Mobile: Test popup permissions FIRST - this is the FIRST side-effect, NO setState/await before this
    const testPopup = window.open("about:blank", "_blank")
    if (!testPopup) {
      // Popup blocked - prevent click from reaching button with belt-and-braces blocking
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation?.()
      // State updates happen AFTER popup test
      setPopupBlocked(true)
      setError("Pop-ups blocked. Please allow pop-ups in your browser settings or tap 'Continue to Sign In' below.")
      setConnectionAttempted(true)
      return
    }
    
    // Popup allowed - close test window immediately (still in same synchronous call stack)
    testPopup.close()
    
    // Verify popup is closed (belt-and-braces check for iOS)
    // On iOS, very fast open/close can sometimes blink, but this ensures it's closed
    if (testPopup && !testPopup.closed) {
      testPopup.close()
    }
    
    // State updates happen AFTER popup test
    setPopupBlocked(false)
    setError(null)
    setConnectionAttempted(true)
    
    // Allow click to continue to NativeGlyphConnectButton
    // The popup test above preserves the user gesture context, so Glyph's window.open will work
    // The test popup is closed synchronously, so no double-tab issue
  }

  // Handle manual fallback button click - uses same safe handler path
  // This ensures the click is directly from user gesture and triggers actual Glyph connect
  const handleManualConnectClick = (e: React.MouseEvent) => {
    // Use the same popup test logic as the main handler
    // Test popup permissions FIRST - this is the FIRST side-effect, NO setState/await before this
    if (isMobileDevice) {
      const testPopup = window.open("about:blank", "_blank")
      if (!testPopup) {
        // State updates happen AFTER popup test
        setPopupBlocked(true)
        setError("Pop-ups are blocked. Please allow pop-ups in your browser settings for this site.")
        return
      }
      // Popup allowed - close test window immediately
      testPopup.close()
      
      // Verify popup is closed (belt-and-braces check for iOS)
      if (testPopup && !testPopup.closed) {
        testPopup.close()
      }
    }
    
    // State updates happen AFTER popup test
    setPopupBlocked(false)
    setError(null)
    setConnectionAttempted(true)
    
    // CRITICAL: Trigger the actual Glyph button click synchronously in the same handler
    // This ensures the connection happens in the same user gesture context
    // The popup test above preserves the user gesture, so this click will work
    
    // Target the button more specifically: look for button within the Glyph container
    // This ensures we click the correct button even if NativeGlyphConnectButton renders multiple buttons
    const glyphButtonContainer = buttonRef.current?.querySelector('[data-glyph-button-container]')
    if (glyphButtonContainer) {
      // Look for button within the Glyph button container (more specific than querySelector('button'))
      const glyphButton = glyphButtonContainer.querySelector('button')
      if (glyphButton) {
        // Synchronous click - preserves user gesture for popup on mobile
        glyphButton.click()
        return
      }
    }
    
    // Fallback: if data attribute not found, use the wrapper and find first button
    // This is less specific but ensures we still work if DOM structure changes
    const fallbackButton = buttonRef.current?.querySelector('button')
    if (fallbackButton) {
      fallbackButton.click()
    } else {
      console.warn("[AuthDialog] Could not find Glyph button to trigger connection")
    }
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
          <div className="flex flex-col items-center gap-4">
            {/* Glyph Native Connect Button - Styled wrapper with popup permission test */}
            {/* Using onClickCapture to intercept in capture phase before Glyph's handler */}
            <div 
              className="w-full" 
              ref={buttonRef}
              data-glyph-button-wrapper
              onClickCapture={handleGlyphButtonClick}
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/20 to-green-500/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300" />
                <div className="relative border-2 border-green-400/60 rounded-xl p-4 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-sm shadow-[0_0_30px_rgba(34,197,94,0.3)] group-hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] transition-all duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-semibold text-green-400 mb-2">Login / Signup with Glyph</p>
                    <div className="flex justify-center" data-glyph-button-container>
                      <NativeGlyphConnectButton />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile popup blocked fallback button */}
            {popupBlocked && isMobileDevice && (
              <Button
                onClick={handleManualConnectClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Continue to Sign In
              </Button>
            )}

            {/* Mobile/iOS info message */}
            {isMobileDevice && !popupBlocked && (
              <p className="text-xs text-muted-foreground text-center px-4">
                {isIOSDevice ? (
                  <>On iOS, tap the button above to connect. If pop-ups are blocked, Safari settings can allow them.</>
                ) : (
                  <>On mobile, tap the button above to connect your wallet.</>
                )}
              </p>
            )}
            
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
              {popupBlocked && (
                <Button
                  onClick={handleManualConnectClick}
                  className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Try Again
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
