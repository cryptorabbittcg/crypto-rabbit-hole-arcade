"use client"

import { useState, useEffect } from "react"
import { AuthDialog } from "@/components/auth-dialog"
import { useArcade } from "@/components/providers"
import { logger } from "@/lib/logger"

/**
 * Global AuthDialog component that listens for showAuthDialog events
 * from anywhere in the app (e.g., ProfileMenu on any page)
 */
export function GlobalAuthDialog() {
  const { isAuthenticated, handleAuthSuccess } = useArcade()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  // Listen for show auth dialog event from profile menu or other components
  useEffect(() => {
    const handleShowAuthDialog = () => {
      logger.log("🔍 Global auth dialog: showAuthDialog event received")
      setShowAuthDialog(true)
    }
    window.addEventListener("showAuthDialog", handleShowAuthDialog)
    return () => window.removeEventListener("showAuthDialog", handleShowAuthDialog)
  }, [])

  // Close dialog when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && showAuthDialog) {
      logger.log("✅ Authenticated, hiding global auth dialog")
      setShowAuthDialog(false)
    }
  }, [isAuthenticated, showAuthDialog])

  return (
    <AuthDialog
      open={showAuthDialog}
      onOpenChange={setShowAuthDialog}
      onAuthSuccess={handleAuthSuccess}
    />
  )
}

