"use client"
import Link from "next/link"
import Image from "next/image"
import { PackageOpen, Swords, Zap, Trophy, Users2 } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { useArcade } from "@/components/providers"
import { logger } from "@/lib/logger"
import { useEffect, useState } from "react"
import { GameModal } from "@/components/game-modal"
import { AuthDialog } from "@/components/auth-dialog"
import { LeaderboardService, type LeaderboardScore } from "@/lib/supabase/services/leaderboard.service"

export default function ArcadeHub() {
  const { addTxn, updateTxn, tickets, points, isAuthenticated, handleAuthSuccess, address, profile } = useArcade()
  const [apeBalance] = useState("125.50")
  const [activeGame, setActiveGame] = useState<{ url: string; title: string } | null>(null)
  const [leaderboardScores, setLeaderboardScores] = useState<LeaderboardScore[]>([])
  const [loadingScores, setLoadingScores] = useState(true)
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  // Show auth dialog on mount - always show on page load for security
  useEffect(() => {
    // Always show dialog on initial mount to require fresh sign-in
    logger.log("🔍 Showing auth dialog - fresh sign-in required")
    setShowAuthDialog(true)
    
    // Close dialog when user becomes authenticated
    if (isAuthenticated) {
      logger.log("✅ Authenticated, hiding auth dialog")
      setShowAuthDialog(false)
    }
  }, [isAuthenticated])

  // Listen for show auth dialog event from profile menu
  useEffect(() => {
    const handleShowAuthDialog = () => {
      logger.log("🔍 Profile menu requested auth dialog")
      setShowAuthDialog(true)
    }
    window.addEventListener("showAuthDialog", handleShowAuthDialog)
    return () => window.removeEventListener("showAuthDialog", handleShowAuthDialog)
  }, [])

  // Fetch leaderboard scores
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoadingScores(true)
        const leaderboardService = new LeaderboardService()
        const scores = await leaderboardService.getTopScores(10)
        setLeaderboardScores(scores)
      } catch (error) {
        console.error("[v0] Error fetching leaderboard:", error)
      } finally {
        setLoadingScores(false)
      }
    }

    fetchLeaderboard()
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  async function rollEntropy() {
    const id = crypto.randomUUID()
    addTxn({ id, title: "Entropy Roll", status: "prepare" })

    setTimeout(() => {
      updateTxn(id, { status: "pending", hash: "0x" + Math.random().toString(16).slice(2) })
      setTimeout(() => updateTxn(id, { status: "confirmed" }), 2000)
    }, 1000)
  }

  return (
    <div className="min-h-screen">
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthSuccess={handleAuthSuccess}
      />

      <GameModal
        isOpen={!!activeGame}
        onClose={() => setActiveGame(null)}
        gameUrl={activeGame?.url || ""}
        gameTitle={activeGame?.title || ""}
      />

      <MintSoonDialog />

      <div className="relative mb-8 overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-purple-500/5 to-cyan-500/10 p-8">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
            linear-gradient(to right, hsl(var(--neon-pink)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--neon-cyan)) 1px, transparent 1px)
          `,
            backgroundSize: "40px 40px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "center top",
          }}
        />

        <div className="relative z-10 text-center space-y-4">
          {/* Building on ApeChain */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image
              src="/images/design-mode/ApeCoin.png"
              alt="ApeCoin"
              width={24}
              height={24}
              className="object-contain"
            />
            <p className="text-xl md:text-2xl font-bold text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">
              Building on ApeChain
            </p>
          </div>

          {/* Banner Logo with glow */}
          <div className="flex justify-center mb-4 relative">
            <div className="absolute inset-0 flex justify-center blur-2xl opacity-50">
              <Image
                src="/1500x500 Banner Logo Transparent BG.png"
                alt="The Crypto Rabbit Hole Arcade"
                width={480}
                height={160}
                className="max-w-full h-auto opacity-30"
                priority
              />
            </div>
            <Image
              src="/1500x500 Banner Logo Transparent BG.png"
              alt="The Crypto Rabbit Hole Arcade"
              width={480}
              height={160}
              className="max-w-full h-auto relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              priority
            />
          </div>

          {/* Catchphrase with glass effect */}
          <div className="relative inline-block px-5 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-wider text-white" style={{
              textShadow: '0 0 10px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.3), 0 0 40px rgba(59,130,246,0.5)',
              WebkitTextStroke: '0.5px rgba(255,255,255,0.4)',
            }}>
              COLLECT - LEARN - PLAY - TRADE
            </p>
          </div>

        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-6 flex items-center gap-3">
          <Zap className="w-8 h-8 text-pink-500 animate-pulse" />
          <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Play To Dominate Leaderboards For Rewards
          </span>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <ArcadeCabinet
            title="Ape In!"
            subtitle="ACTION • ARCADE"
            description="Fast paced competitive push-your-luck card and dice game built for ApeChain."
            url="#" // Built-in component - no iframe needed
            players={38}
            color="pink"
            onPlay={setActiveGame}
          />
          <ArcadeCabinet
            title="Cryptoku!"
            subtitle="PUZZLE • STRATEGY"
            description="Solve crypto-themed Sudoku puzzles and climb the leaderboard"
            url="https://cryptoku.vercel.app"
            players={42}
            color="cyan"
            onPlay={setActiveGame}
          />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-6 flex items-center gap-3">
          <PackageOpen className="w-8 h-8 text-secondary animate-pulse" />
          THE CRYPTO RABBIT HOLE® OFFICIAL TRADING CARD GAME
        </h2>

        <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/30 border-4 border-purple-500/50 rounded-2xl p-8 shadow-[0_0_40px_hsl(var(--neon-purple)/0.4)]">
          <div className="aspect-video w-full max-w-4xl mx-auto mb-4">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/iA1bBbV7GtM"
              title="The Crypto Rabbit Hole Trading Card Game"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="rounded-lg"
            />
          </div>
          <div className="text-center">
            <Link
              href="https://tabletopia.com/games/the-crypto-rabbit-hole-rgcbmc/play-now"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold text-lg transition-colors underline decoration-cyan-400/50 hover:decoration-cyan-300"
            >
              Test out our sandbox game on TableTopia now
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-6 flex items-center gap-3">
          <Swords className="w-8 h-8 text-purple-500 animate-pulse" />
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            CARD BATTLE ARENA
          </span>
        </h2>

        <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/30 border-4 border-purple-500/50 rounded-2xl p-8 shadow-[0_0_40px_hsl(var(--neon-purple)/0.4)]">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-4">
              <h3 className="font-display text-3xl font-bold text-purple-400">Strategic Card Combat</h3>
              <p className="text-muted-foreground">
                Battle with your collected cards in turn-based combat. Use attack and defense strategies to defeat
                opponents and earn rewards!
              </p>
              <div className="flex gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Link href="/card-battle">
                    <Swords className="w-5 h-5 mr-2" />
                    ENTER ARENA
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <CardDisplay src="/cards/33.png" alt="Card 1" rarity="legendary" />
              <CardDisplay src="/cards/29.png" alt="Card 2" rarity="epic" />
              <CardDisplay src="/cards/50.png" alt="Card 3" rarity="rare" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-3xl font-bold mb-6 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-cyan-500 animate-pulse" />
          <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">HIGH SCORES</span>
        </h2>

        <div className="bg-black/50 border-2 border-cyan-500/30 rounded-2xl p-6 font-mono shadow-[0_0_30px_hsl(var(--neon-cyan)/0.2)]">
          {loadingScores ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
          ) : leaderboardScores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scores yet. Be the first to play and set a high score!
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboardScores.map((entry) => {
                const isCurrentUser = address && entry.wallet_address.toLowerCase() === address.toLowerCase()
                const displayName = entry.username || entry.wallet_address.slice(0, 6) + "..." + entry.wallet_address.slice(-4) || "Anonymous"
                return (
                  <ScoreEntry
                    key={entry.user_id}
                    rank={entry.rank}
                    name={isCurrentUser ? "YOU" : displayName.toUpperCase()}
                    score={entry.score}
                    isTop={entry.rank <= 3}
                    isPlayer={isCurrentUser}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MintSoonDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const w = window as unknown as { __csMintModalHasShown?: boolean }
    if (w.__csMintModalHasShown) {
      // Already shown once this page load / tab lifetime – don&apos;t show again.
      return
    }

    w.__csMintModalHasShown = true
    setOpen(true)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md px-4">
        <div className="relative holo-panel border border-cyan-400/60 shadow-[0_0_40px_hsl(var(--neon-cyan)/0.6)]">
          <button
            type="button"
            aria-label="Close mint announcement"
            onClick={() => setOpen(false)}
            className="absolute -top-5 -right-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-400/60 text-xl font-bold text-cyan-200 shadow-[0_0_25px_hsl(var(--neon-cyan)/0.8)] hover:scale-105 hover:text-cyan-100 transition-transform cursor-pointer"
          >
            ×
          </button>

          <div className="relative z-10 px-5 py-6 md:px-7 md:py-7 space-y-4">
            <div className="flex justify-center mb-4">
              <div className="relative w-full max-w-[200px] aspect-[4/5] rounded-2xl overflow-hidden border border-cyan-400/40 bg-black/70 shadow-[0_0_26px_rgba(34,211,238,0.6)]">
                <Image
                  src="/images/design-mode/Cipher%20Concept.png"
                  alt="Cipher concept art"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <header className="space-y-2 text-center">
              <h2 className="font-display text-xl md:text-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent text-glow">
                Ciphers &amp; Sentinels — Mint Coming Soon
              </h2>
              <p className="text-sm text-muted-foreground">
                Premium founder PFPs for The Crypto Rabbit Hole universe. Tap into the mint page to see the roadmap,
                benefits, and milestones.
              </p>
            </header>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                asChild
                size="sm"
                className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-xs font-semibold shadow-[0_0_20px_hsl(var(--neon-cyan)/0.5)]"
                onClick={() => setOpen(false)}
              >
                <Link href="/ciphers-sentinels-mint">Show me the mint</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArcadeCabinet({ title, subtitle, description, url, color, onPlay }: any) {
  const borderColors = {
    pink: "border-pink-500/50 hover:border-pink-500",
    cyan: "border-cyan-500/50 hover:border-cyan-500",
    purple: "border-purple-500/50 hover:border-purple-500",
  }

  const glowColors = {
    pink: "shadow-[0_0_30px_hsl(var(--neon-pink)/0.5)]",
    cyan: "shadow-[0_0_30px_hsl(var(--neon-cyan)/0.5)]",
    purple: "shadow-[0_0_30px_hsl(var(--neon-purple)/0.5)]",
  }

  const buttonColors = {
    pink: "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600",
    cyan: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600",
    purple: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
  }

  return (
    <div
      className={`relative group overflow-hidden bg-gradient-to-br from-black/90 to-${color}-950/20 border-4 ${borderColors[color as keyof typeof borderColors]} rounded-2xl p-6 transition-all hover:scale-105 ${glowColors[color as keyof typeof glowColors]}`}
    >
      {(title === "Cryptoku!" || title === "Ape In!") && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src={title === "Cryptoku!" ? "/CryptokuBanner.png" : "/ApeInBanner.png"}
            alt={`${title} banner`}
            fill
            className="object-cover opacity-60"
            priority={title === "Ape In!"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        </div>
      )}

      <div className="relative z-10 space-y-4">
        <div>
          <h3 className="font-display text-2xl font-bold text-pink-400 mb-1">{title}</h3>
          <p className="text-xs text-white/90 font-mono drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
            {subtitle}
          </p>
        </div>

        <p className="text-sm text-white/90 drop-shadow-[0_0_10px_rgba(0,0,0,1)]">{description}</p>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users2 className="w-4 h-4" />
            <span className="font-mono tracking-[0.16em] text-xs uppercase">Arcade Live</span>
          </div>
        </div>

        <Button
          onClick={() => onPlay({ url, title })}
          className={`w-full text-lg font-bold ${buttonColors[color as keyof typeof buttonColors]}`}
          size="lg"
        >
          START GAME
        </Button>
      </div>
    </div>
  )
}

function CardDisplay({ src, alt, rarity }: any) {
  const rarityColors = {
    common: "border-gray-500",
    rare: "border-blue-500",
    epic: "border-purple-500",
    legendary: "border-yellow-500",
  }

  return (
    <div className={`relative group cursor-pointer transition-transform hover:scale-110 hover:z-10`}>
      <div
        className={`absolute inset-0 ${rarityColors[rarity as keyof typeof rarityColors]} opacity-0 group-hover:opacity-100 blur-xl transition-opacity`}
      />
      <Image
        src={src || "/placeholder.svg"}
        alt={alt}
        width={200}
        height={280}
        className={`relative rounded-lg border-2 ${rarityColors[rarity as keyof typeof rarityColors]} shadow-2xl`}
      />
    </div>
  )
}

function ScoreEntry({ rank, name, score, isTop, isPlayer }: any) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isPlayer ? "bg-pink-500/20 border-2 border-pink-500" : isTop ? "bg-cyan-500/10" : "bg-muted/10"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-xl ${
            rank === 1
              ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-black"
              : rank === 2
                ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black"
                : rank === 3
                  ? "bg-gradient-to-br from-orange-400 to-red-500 text-black"
                  : "bg-muted text-foreground"
          }`}
        >
          {rank}
        </div>
        <span className="font-bold text-lg">{name}</span>
      </div>
      <span className="font-bold text-2xl text-pink-400">{score.toLocaleString()}</span>
    </div>
  )
}
