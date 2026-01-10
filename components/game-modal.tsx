"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useCallback } from "react"
import { useArcade } from "@/components/providers"
import { CryptokuGame, type CryptokuGameHandle } from "@/features/games/cryptoku/cryptokugame"
import ApeInGame, { type ApeInGameHandle } from "@/features/games/ape-in/apeingame"
import { getGameSession } from "@/lib/game-session"
import { ErrorBoundary } from "@/components/error-boundary"

interface GameModalProps {
  isOpen: boolean
  onClose: () => void
  gameUrl: string
  gameTitle: string
}

export function GameModal({ isOpen, onClose, gameUrl, gameTitle }: GameModalProps) {
  const { isConnected, address, connect, profile, addPoints, addTickets, points, tickets } = useArcade()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const cryptokuRef = useRef<CryptokuGameHandle>(null)
  const apeInRef = useRef<ApeInGameHandle>(null)
  
  // Memoize onGameEnd callbacks to prevent recreation on every render
  // This prevents infinite loops in ApeInGame's confirmForfeitFromModal
  const handleApeInGameEnd = useCallback((result: {
    score: number
    mode: string
    metadata?: any
    points?: number
  }) => {
    console.log("🎮 Ape In game ended:", result)
    // Add points when game ends (only for ranked modes with points > 0)
    if (result.points !== undefined && result.points > 0) {
      console.log("💰 Adding points from Ape In:", result.points, "from mode:", result.mode)
      addPoints(result.points)
    } else {
      console.log("ℹ️ No points to add (tutorial mode or 0 points):", {
        mode: result.mode,
        points: result.points,
      })
    }
  }, [addPoints])
  
  const handleCryptokuGameEnd = useCallback((result: {
    score: number
    metadata?: any
  }) => {
    console.log("🎮 Cryptoku game ended:", result)
    // Add points when game ends (only for ranked modes with points > 0)
    if (result.metadata?.points !== undefined && result.metadata.points > 0) {
      console.log("💰 Adding points from Cryptoku:", result.metadata.points)
      addPoints(result.metadata.points)
    } else {
      console.log("ℹ️ No points to add (unranked mode or 0 points):", result.metadata)
    }
  }, [addPoints])

  // Handle close/exit with forfeit confirmation for active games
  const handleClose = useCallback(() => {
    const isCryptoku = gameTitle === "Cryptoku!"
    const isApeIn = gameTitle === "Ape In!"
    
    // Check Cryptoku game state
    if (isCryptoku && cryptokuRef.current) {
      const forfeitShown = cryptokuRef.current.handleGameExit()
      // If forfeit confirmation is shown, don't close yet - wait for user decision
      if (forfeitShown) {
        return
      }
    }
    
    // Check Ape In game state
    if (isApeIn && apeInRef.current) {
      const forfeitShown = apeInRef.current.handleGameExit()
      // If forfeit confirmation is shown, don't close yet - wait for user decision
      if (forfeitShown) {
        return
      }
    }
    
    // For other games or if no forfeit needed, just close
    onClose()
  }, [gameTitle, onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, handleClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Send session data to iframe when it loads (for external games via iframe)
  // NOTE: Ape In is now integrated as a component, so this is only for other iframe games
  useEffect(() => {
    if (!isOpen || !iframeRef.current) return

    const iframe = iframeRef.current
    const isApeIn = gameTitle === "Ape In!"

    // Skip postMessage logic for Ape In - it's now a direct component
    if (isApeIn) return

    let retryInterval: NodeJS.Timeout | null = null
    let hasSentIdentity = false // Guard to prevent duplicate sends
    let identitySentTimeout: NodeJS.Timeout | null = null

    // Get the iframe's origin from its src URL
    const getIframeOrigin = (): string | null => {
      if (!iframe?.src) return null
      try {
        const url = new URL(iframe.src)
        return url.origin
      } catch {
        return null
      }
    }

    const sendSessionToIframe = () => {
      // Prevent duplicate sends - only send once per iframe load
      if (hasSentIdentity) {
        console.log("⏭️ Identity already sent, skipping duplicate send")
        return
      }
      
      let session = getGameSession()
      
      // If no session exists, create one for the iframe with current profile data
      if (!session) {
        const { createGameSession, storeGameSession } = require("@/lib/game-session")
        session = createGameSession({
          userId: profile.username || address || "guest",
          username: profile.username || "Guest",
          address: address || null,
          tickets: tickets || 0,
          points: points || 0,
          avatar: profile.avatar || null, // Include avatar in session
        })
        storeGameSession(session)
        if (session) {
          console.log("📝 Created session for iframe:", {
            sessionId: session.sessionId,
            username: session.username,
            address: session.address,
            points: session.points,
            hasClientId: !!session.thirdwebClientId,
          })
        }
      }
      
      // Ensure session exists before proceeding
      if (!session) {
        console.warn("⚠️ No session available to send to iframe")
        return
      }
      
      // Update existing session with current points/tickets if they've changed
      if (session.points !== points || session.tickets !== tickets) {
        const { storeGameSession } = require("@/lib/game-session")
        const updatedSession = { ...session, points: points || 0, tickets: tickets || 0 }
        storeGameSession(updatedSession)
        session = updatedSession
        console.log("🔄 Updated session with current balances:", { points: session.points, tickets: session.tickets })
      }
      
      // Try to send message - wrap in try/catch to handle cross-origin errors gracefully
      try {
        // Only try to access contentWindow if iframe exists
        if (!iframe) {
          console.warn("⚠️ Iframe ref not available")
          return
        }

        // Access contentWindow in a try/catch to handle cross-origin gracefully
        let contentWindow: Window | null = null
        try {
          contentWindow = iframe.contentWindow
        } catch (e) {
          // Cross-origin access blocked - this is expected before iframe loads
          console.log("⚠️ Cannot access iframe contentWindow (cross-origin or not loaded)")
          return
        }

        if (!contentWindow) {
          console.warn("⚠️ Iframe contentWindow is null")
          return
        }

        // Get the iframe's exact origin from its src URL
        const targetOrigin = getIframeOrigin()
        if (!targetOrigin) {
          console.warn("⚠️ Cannot determine iframe origin from src URL, falling back to '*'")
          // Fallback to '*' only if we can't determine origin
        }

        // Send session data to iframe
        const messagePayload = {
          type: "ARCADE_IDENTITY",
          session: session,
          // Also send as direct properties for compatibility
          sessionId: session.sessionId,
          userId: session.userId,
          username: session.username,
          address: session.address,
          thirdwebClientId: session.thirdwebClientId,
          tickets: session.tickets,
          points: session.points,
          avatar: session.avatar || null, // Include avatar for PFP display
        }
        
        // Log the exact message structure being sent
        console.log("📤 Sending identity message:", JSON.stringify(messagePayload, null, 2))
        console.log("📤 Target origin:", targetOrigin || "*")
        console.log("📤 Full session object:", JSON.stringify(session, null, 2))
        
        // Use exact origin if available, otherwise fallback to '*' for cross-origin iframes
        contentWindow.postMessage(messagePayload, targetOrigin || "*")
        hasSentIdentity = true // Mark as sent to prevent duplicates
        console.log(`✅ postMessage called with target origin: '${targetOrigin || "*"}' - Identity sent successfully`)
        
        // Clear any pending retry intervals since we've successfully sent
        if (retryInterval) {
          clearInterval(retryInterval)
          retryInterval = null
        }
      } catch (error) {
        console.error("❌ Error sending session to iframe:", error)
        // Don't retry if we get an error - likely a CORS/security issue
      }
    }

    const handleLoad = () => {
      console.log("📥 Iframe loaded, waiting before sending session...")
      // Clear any pending timeout from previous load attempts
      if (identitySentTimeout) {
        clearTimeout(identitySentTimeout)
        identitySentTimeout = null
      }
      // Reset the sent flag for this new load
      hasSentIdentity = false
      
      // Wait 300ms after load to ensure iframe is fully ready and message listener is initialized
      // Ape In recommends 200-500ms delay
      identitySentTimeout = setTimeout(() => {
        console.log("📤 Sending session after iframe load (300ms delay)...")
        sendSessionToIframe()
        identitySentTimeout = null
      }, 300) // Reduced from 1000ms to 300ms as recommended
    }

    const handleError = () => {
      console.error("❌ Iframe error: failed to load")
      if (retryInterval) {
        clearInterval(retryInterval)
        retryInterval = null
      }
    }

    // Listen for iframe load - only set up listeners if iframe element exists
    if (iframe) {
      iframe.addEventListener("load", handleLoad)
      iframe.addEventListener("error", handleError)
      
      // Check if iframe has already loaded by checking if contentWindow is accessible
      // Note: This might throw on cross-origin iframes, so we catch it
      try {
        if (iframe.contentWindow || iframe.contentDocument) {
          // Iframe might already be loaded, but wait a bit anyway to ensure it's ready
          // Use handleLoad which will reset the flag and send after delay
          setTimeout(handleLoad, 100)
        }
      } catch (e) {
        // Cross-origin - can't check, just wait for load event
        console.log("⚠️ Cannot check iframe state (cross-origin), waiting for load event")
      }
    }

    // Retry mechanism: Only retry if we haven't successfully sent yet
    // This is a backup in case the load event doesn't fire or is delayed
    let retryCount = 0
    const maxRetries = 6 // Try for up to 3 seconds (6 * 500ms)
    retryInterval = setInterval(() => {
      if (hasSentIdentity) {
        // Already sent, clear the interval
        if (retryInterval) {
          clearInterval(retryInterval)
          retryInterval = null
        }
        return
      }
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retry attempt ${retryCount + 1}/${maxRetries} - sending identity...`)
        sendSessionToIframe()
        retryCount++
      } else {
        console.warn("⚠️ Max retries reached, stopping retry interval")
        if (retryInterval) {
          clearInterval(retryInterval)
          retryInterval = null
        }
      }
    }, 500)

    // Listen for requests from iframe
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security - Ape In should come from its domain
      const allowedOrigins = [
        "https://ape-in-game.vercel.app",
        "http://localhost:5173", // For local development
        "http://127.0.0.1:5173",
      ]
      
      if (!allowedOrigins.includes(event.origin)) {
        console.log("⚠️ Message from unauthorized origin:", event.origin, "- ignoring")
        return
      }

      // Handle ARCADE_SESSION_REQUEST (child requesting session)
      if (event.data?.type === "ARCADE_SESSION_REQUEST" || event.data?.type === "REQUEST_ARCADE_IDENTITY") {
        console.log("📥 Received session request from iframe - sending identity...")
        // Reset the flag to allow sending again if requested
        hasSentIdentity = false
        // Send immediately when requested
        sendSessionToIframe()
      }
      
      // Handle points earned from Ape In
      if (event.data?.type === "APE_IN_GAME_END" || event.data?.type === "GAME_POINTS_UPDATE") {
        const pointsEarned = event.data?.points || event.data?.pointsEarned || 0
        const gameMode = event.data?.gameMode || event.data?.mode || "unknown"
        const score = event.data?.score || 0
        
        console.log("🎮 Ape In game ended:", { pointsEarned, gameMode, score })
        
        // Only add points if > 0 and not Sandy (tutorial mode)
        if (pointsEarned > 0 && gameMode !== "sandy" && gameMode !== "Sandy") {
          console.log("💰 Adding points from Ape In:", pointsEarned, "from mode:", gameMode)
          addPoints(pointsEarned)
        } else {
          console.log("ℹ️ No points to add (tutorial mode or 0 points):", { gameMode, pointsEarned })
        }
      }
    }

    window.addEventListener("message", handleMessage)

    return () => {
      // Cleanup: clear all intervals and timeouts
      if (retryInterval) {
        clearInterval(retryInterval)
        retryInterval = null
      }
      if (identitySentTimeout) {
        clearTimeout(identitySentTimeout)
        identitySentTimeout = null
      }
      if (iframe) {
        iframe.removeEventListener("load", handleLoad)
        iframe.removeEventListener("error", handleError)
      }
      window.removeEventListener("message", handleMessage)
      // Reset flag on cleanup so next open can send again
      hasSentIdentity = false
    }
  }, [isOpen, gameTitle, isConnected, address, profile.username, points, tickets])

  if (!isOpen) return null

  const isCryptoku = gameTitle === "Cryptoku!"
  const isApeIn = gameTitle === "Ape In!"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse" />
          <h2 className="font-display text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            {gameTitle}
          </h2>
        </div>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          className="bg-red-500/20 hover:bg-red-500/40 border-2 border-red-500/50 text-red-400 hover:text-red-300 transition-all shadow-[0_0_20px_hsl(0,100%,50%,0.3)]"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="relative w-full h-full max-w-[100vw] max-h-[100vh] md:max-w-[95vw] md:max-h-[90vh] md:rounded-2xl overflow-hidden border-4 border-pink-500/30 shadow-[0_0_50px_hsl(var(--neon-pink)/0.5)]">
        {isCryptoku ? (
          <div className="w-full h-full overflow-auto bg-black">
            <CryptokuGame
              ref={cryptokuRef}
              playerAddress={address}
              profileUsername={profile.username}
              profileAvatarUrl={profile.avatar}
              onGameEnd={handleCryptokuGameEnd}
              onClose={onClose}
            />
          </div>
        ) : isApeIn ? (
          <div className="w-full h-full overflow-auto bg-black">
            <ErrorBoundary
              fallback={
                <div className="flex items-center justify-center min-h-screen p-4">
                  <div className="max-w-md mx-auto p-6 bg-slate-800/90 rounded-xl border border-red-500/30 text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-3">Game Error</h2>
                    <p className="text-red-300 mb-6">
                      Something went wrong while loading the game. Please try again.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => {
                          onClose()
                        }}
                        variant="outline"
                      >
                        Return to Hub
                      </Button>
                      <Button
                        onClick={() => {
                          window.location.reload()
                        }}
                        variant="default"
                      >
                        Refresh Page
                      </Button>
                    </div>
                  </div>
                </div>
              }
            >
              <ApeInGame
                ref={apeInRef}
                playerAddress={address}
                profileUsername={profile.username}
                profileAvatarUrl={profile.avatar}
                onGameStart={() => {
                  console.log("🎮 Ape In game started")
                }}
                onGameEnd={handleApeInGameEnd}
                onClose={onClose}
              />
            </ErrorBoundary>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={gameUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={gameTitle}
          />
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm text-muted-foreground font-mono">
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">ESC</kbd> or click <X className="inline w-4 h-4" />{" "}
          to return to hub
        </p>
      </div>
    </div>
  )
}

