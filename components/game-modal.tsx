"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"
import { useArcade } from "@/components/providers"
import { CryptokuGame } from "@/features/games/cryptoku/cryptokugame"
import { getGameSession } from "@/lib/game-session"

interface GameModalProps {
  isOpen: boolean
  onClose: () => void
  gameUrl: string
  gameTitle: string
}

export function GameModal({ isOpen, onClose, gameUrl, gameTitle }: GameModalProps) {
  const { isConnected, address, connect, profile, addPoints, addTickets, points, tickets } = useArcade()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

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

  // Send session data to iframe when it loads (for Ape In cross-origin communication)
  useEffect(() => {
    if (!isOpen || !iframeRef.current) return

    const iframe = iframeRef.current
    const isApeIn = gameTitle === "Ape In!"

    if (!isApeIn) return

    let retryInterval: NodeJS.Timeout | null = null

    const sendSessionToIframe = () => {
      // Don't check contentWindow here - it can cause cross-origin errors
      // Just try to send the message and let it fail gracefully if needed
      
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

        // Send session data to iframe
        // For cross-origin iframes, we need to use "*" or the iframe's actual origin
        // Since we can't reliably get the iframe's origin due to CORS, we use "*"
        // Ape In will validate the origin on its side
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
        }
        
        // Log the exact message structure being sent
        console.log("📤 Sending identity message:", JSON.stringify(messagePayload, null, 2))
        console.log("📤 Message structure breakdown:", {
          "event.data.type": messagePayload.type,
          "event.data.session": "Full GameSession object (see below)",
          "event.data.sessionId": messagePayload.sessionId,
          "event.data.userId": messagePayload.userId,
          "event.data.username": messagePayload.username,
          "event.data.address": messagePayload.address,
          "event.data.thirdwebClientId": messagePayload.thirdwebClientId,
          "event.data.tickets": messagePayload.tickets,
          "event.data.points": messagePayload.points,
        })
        console.log("📤 Full session object:", JSON.stringify(session, null, 2))
        
        // Use "*" for cross-origin iframes - Ape In will validate the origin
        contentWindow.postMessage(messagePayload, "*")
        console.log("✅ postMessage called with target origin: '*'")
      } catch (error) {
        console.error("❌ Error sending session to iframe:", error)
        // Don't retry if we get an error - likely a CORS/security issue
      }
    }

    const handleLoad = () => {
      console.log("📥 Iframe loaded, waiting before sending session...")
      // Wait longer after load to ensure iframe is fully ready and has initialized
      setTimeout(() => {
        if (retryInterval) {
          clearInterval(retryInterval)
          retryInterval = null
        }
        console.log("📤 Sending session after iframe load...")
        sendSessionToIframe()
      }, 1000) // Wait 1 second after load to ensure iframe is ready
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
          setTimeout(handleLoad, 200)
        }
      } catch (e) {
        // Cross-origin - can't check, just wait for load event
        console.log("⚠️ Cannot check iframe state (cross-origin), waiting for load event")
      }
    }

    // Retry mechanism: try sending session multiple times in case iframe loads slowly
    // We'll rely on the load event primarily, but keep retries as backup
    let retryCount = 0
    const maxRetries = 10 // Try for up to 5 seconds
    retryInterval = setInterval(() => {
      if (retryCount < maxRetries) {
        sendSessionToIframe()
        retryCount++
      } else {
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
        return
      }

      if (event.data?.type === "REQUEST_ARCADE_IDENTITY") {
        console.log("📥 Received identity request from iframe")
        if (retryInterval) {
          clearInterval(retryInterval)
          retryInterval = null
        }
        sendSessionToIframe()
      }
    }

    window.addEventListener("message", handleMessage)

    return () => {
      if (retryInterval) {
        clearInterval(retryInterval)
        retryInterval = null
      }
      if (iframe) {
        iframe.removeEventListener("load", handleLoad)
        iframe.removeEventListener("error", handleError)
      }
      window.removeEventListener("message", handleMessage)
    }
  }, [isOpen, gameTitle, isConnected, address, profile.username, points, tickets])

  if (!isOpen) return null

  const isCryptoku = gameTitle === "Cryptoku!"

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
          onClick={onClose}
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
              playerAddress={address}
              profileUsername={profile.username}
              profileAvatarUrl={profile.avatar}
              onGameEnd={(result) => {
                console.log("🎮 Cryptoku game ended:", result)
                // Add points when game ends (only for ranked modes with points > 0)
                if (result.metadata?.points !== undefined && result.metadata.points > 0) {
                  console.log("💰 Adding points from Cryptoku:", result.metadata.points)
                  addPoints(result.metadata.points)
                } else {
                  console.log("ℹ️ No points to add (unranked mode or 0 points):", result.metadata)
                }
                // Tickets are disabled for now - coming soon
                // if (result.metadata?.outcome === "win") {
                //   console.log("🎫 Adding ticket for Cryptoku win")
                //   addTickets(1)
                // }
              }}
            />
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

