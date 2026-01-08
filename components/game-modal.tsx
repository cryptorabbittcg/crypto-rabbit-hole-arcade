"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { useArcade } from "@/components/providers"
import { CryptokuGame } from "@/features/games/cryptoku/cryptokugame"

interface GameModalProps {
  isOpen: boolean
  onClose: () => void
  gameUrl: string
  gameTitle: string
}

export function GameModal({ isOpen, onClose, gameUrl, gameTitle }: GameModalProps) {
  const { isConnected, address, connect, profile, addPoints, addTickets } = useArcade()

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
