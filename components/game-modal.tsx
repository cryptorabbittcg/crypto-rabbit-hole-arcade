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
  const { isConnected, address, connect, profile, addPoints, addTickets } = useArcade()
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

    const sendSessionToIframe = () => {
      let session = getGameSession()
      
      // If no session exists, create a minimal one for the iframe
      if (!session) {
        const { createGameSession, storeGameSession } = require("@/lib/game-session")
        session = createGameSession({
          userId: profile.username || "guest",
          username: profile.username || "Guest",
          address: address || null,
          tickets: 0,
          points: 0,
        })
        storeGameSession(session)
        console.log("📝 Created minimal session for iframe:", session)
      }
      
      if (session && iframe.contentWindow) {
        try {
          // Send session data to iframe
          iframe.contentWindow.postMessage(
            {
              type: "ARCADE_IDENTITY",
              session: session,
            },
            "*" // Target origin - in production, should be specific: "https://ape-in-game.vercel.app"
          )
          console.log("📤 Sent arcade identity to iframe:", {
            sessionId: session.sessionId,
            username: session.username,
            address: session.address,
            hasClientId: !!session.thirdwebClientId,
          })
        } catch (error) {
          console.error("❌ Error sending session to iframe:", error)
        }
      } else if (!session) {
        console.warn("⚠️ No session available to send to iframe")
      }
    }

    // Retry mechanism: try sending session multiple times in case iframe loads slowly
    let retryCount = 0
    const maxRetries = 10
    const retryInterval = setInterval(() => {
      if (retryCount < maxRetries && iframe.contentWindow) {
        sendSessionToIframe()
        retryCount++
      } else {
        clearInterval(retryInterval)
      }
    }, 500) // Try every 500ms for up to 5 seconds

    // Send immediately if iframe is already loaded
    if (iframe.contentWindow) {
      sendSessionToIframe()
    }

    // Also send when iframe loads
    iframe.addEventListener("load", () => {
      clearInterval(retryInterval)
      sendSessionToIframe()
    })

    // Listen for requests from iframe
    const handleMessage = (event: MessageEvent) => {
      // In production, verify event.origin === "https://ape-in-game.vercel.app"
      if (event.data?.type === "REQUEST_ARCADE_IDENTITY") {
        console.log("📥 Received identity request from iframe")
        clearInterval(retryInterval)
        sendSessionToIframe()
      }
    }

    window.addEventListener("message", handleMessage)

    return () => {
      clearInterval(retryInterval)
      iframe.removeEventListener("load", sendSessionToIframe)
      window.removeEventListener("message", handleMessage)
    }
  }, [isOpen, gameTitle, isConnected, address, profile.username])

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
                // Add points and tickets when game ends
                if (result.metadata?.points !== undefined && result.metadata.points > 0) {
                  console.log("💰 Adding points from Cryptoku:", result.metadata.points)
                  addPoints(result.metadata.points)
                } else {
                  console.warn("⚠️ No points in metadata or points is 0:", result.metadata)
                }
                // Cryptoku doesn't pass tickets in metadata, but we could add 1 ticket per win
                if (result.metadata?.outcome === "win") {
                  console.log("🎫 Adding ticket for Cryptoku win")
                  addTickets(1)
                }
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
