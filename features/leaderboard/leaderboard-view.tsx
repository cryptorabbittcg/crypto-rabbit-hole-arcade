"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Zap, Medal } from "@/components/icons"
import { useArcade } from "@/components/providers"
import { useLeaderboard } from "@/components/leaderboard-provider"
import { LeaderboardService, type ApeInLeaderboardEntry } from "@/lib/supabase/services/leaderboard.service"
import { ApeInLeaderboardList } from "@/components/leaderboards/ApeInLeaderboardList"

type LeaderboardEntry = {
  rank: number
  address: string
  points: number
  wins: number
  streak: number
  avatar?: string
}

type CryptokuLeaderboardEntry = {
  rank: number
  address: string
  username?: string | null
  avatar_url?: string | null
  score: number
  timeSeconds: number
  hintsUsed: number
  errors: number
  mode: "DEGEN" | "APE"
}

const GLOBAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 2, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 3, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 4, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 5, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 6, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 7, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 8, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 9, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
  { rank: 10, address: "0x0000...0000", points: 0, wins: 0, streak: 0 },
]

export default function LeaderboardView() {
  const { points, address, profile } = useArcade()
  const {
    apeInLeaderboards,
    loadingApeIn,
    apeInError,
    cryptokuLeaderboards,
    loadingCryptoku,
    cryptokuError,
  } = useLeaderboard()
  
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingOverall, setLoadingOverall] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [userPoints, setUserPoints] = useState<number>(points || 0)
  
  // Cryptoku leaderboard state (mode selection)
  const [cryptokuMode, setCryptokuMode] = useState<"DEGEN" | "APE">("DEGEN")
  // Use provider data for Cryptoku
  const cryptokuLeaderboard = cryptokuMode === "DEGEN" ? cryptokuLeaderboards.degen : cryptokuLeaderboards.ape

  // Ape In leaderboard state (mode selection)
  const [apeInSingleplayerMode, setApeInSingleplayerMode] = useState<"aida" | "lana" | "nifty" | "enj1n">("aida")
  // Use provider data for Ape In
  const apeInSingleplayerLeaderboard = 
    apeInSingleplayerMode === "aida" ? apeInLeaderboards.aida :
    apeInSingleplayerMode === "lana" ? apeInLeaderboards.lana :
    apeInSingleplayerMode === "nifty" ? apeInLeaderboards.nifty :
    apeInLeaderboards.enj1n

  const [apeInPvpLeaderboard, setApeInPvpLeaderboard] = useState<ApeInLeaderboardEntry[]>([])
  const [loadingApeInPvp, setLoadingApeInPvp] = useState(false)
  const [apeInPvpError, setApeInPvpError] = useState<string | null>(null)
  const [apeInPvpDataLoaded, setApeInPvpDataLoaded] = useState(false)

  const [apeInMultiplayerLeaderboard, setApeInMultiplayerLeaderboard] = useState<ApeInLeaderboardEntry[]>([])
  const [loadingApeInMultiplayer, setLoadingApeInMultiplayer] = useState(false)
  const [apeInMultiplayerError, setApeInMultiplayerError] = useState<string | null>(null)
  const [apeInMultiplayerDataLoaded, setApeInMultiplayerDataLoaded] = useState(false)

  // Fetch Overall Points leaderboard data
  useEffect(() => {
    async function fetchOverallLeaderboard() {
      try {
        setLoadingOverall(true)
        const leaderboardService = new LeaderboardService()
        const scores = await leaderboardService.getTopByPoints(100)
        
        // Map RPC result to LeaderboardEntry format
        const entries: LeaderboardEntry[] = scores.map((entry) => ({
          rank: entry.rank,
          address: entry.wallet_address 
            ? `${entry.wallet_address.slice(0, 6)}...${entry.wallet_address.slice(-4)}`
            : "0x0000...0000",
          points: entry.score, // score field contains total_points
          wins: entry.total_wins || 0, // Use wins from RPC response
          streak: entry.win_streak || 0, // Use streak from RPC response
          avatar: undefined, // Can be added later if needed
        }))
        
        setOverallLeaderboard(entries)
        
        // Find user's rank if address matches
        if (address) {
          const normalizedAddress = address.toLowerCase()
          const userEntry = scores.find(
            (entry) => entry.wallet_address?.toLowerCase() === normalizedAddress
          )
          if (userEntry) {
            setUserRank(userEntry.rank)
            setUserPoints(userEntry.score)
          }
        }
      } catch (error) {
        console.error("[LeaderboardView] Error fetching overall leaderboard:", error)
        setOverallLeaderboard([])
      } finally {
        setLoadingOverall(false)
      }
    }

    fetchOverallLeaderboard()

    // Refresh leaderboard when tab regains focus (prevents stale data)
    const handleFocus = () => {
      fetchOverallLeaderboard()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [address])

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Helper function to format address
  const formatAddress = (address: string): string => {
    if (!address || address.length < 10) return "0x0000...0000"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Handle Cryptoku mode change (no fetch needed, data comes from provider)
  const handleCryptokuModeChange = (mode: "DEGEN" | "APE") => {
    setCryptokuMode(mode)
  }

  // Handle Ape In singleplayer mode change (no fetch needed, data comes from provider)
  const handleApeInSingleplayerModeChange = (mode: "aida" | "lana" | "nifty" | "enj1n") => {
    setApeInSingleplayerMode(mode)
  }

  // Fetch Ape In PvP leaderboard (still needs direct fetch as provider doesn't include PvP)
  const fetchApeInPvpLeaderboard = async () => {
    setLoadingApeInPvp(true)
    setApeInPvpError(null)
    try {
      const leaderboardService = new LeaderboardService()
      const entries = await leaderboardService.getApeInLeaderboard("pvp", 100)
      setApeInPvpLeaderboard(entries)
      setApeInPvpDataLoaded(true)
    } catch (error) {
      console.error("[LeaderboardView] Error fetching Ape In PvP leaderboard:", error)
      setApeInPvpError("Failed to load leaderboard. Please try again.")
      setApeInPvpLeaderboard([])
    } finally {
      setLoadingApeInPvp(false)
    }
  }

  // Fetch Ape In Multiplayer leaderboard
  const fetchApeInMultiplayerLeaderboard = async () => {
    setLoadingApeInMultiplayer(true)
    setApeInMultiplayerError(null)
    try {
      const leaderboardService = new LeaderboardService()
      const entries = await leaderboardService.getApeInLeaderboard("multiplayer", 100)
      setApeInMultiplayerLeaderboard(entries)
      setApeInMultiplayerDataLoaded(true)
    } catch (error) {
      console.error("[LeaderboardView] Error fetching Ape In Multiplayer leaderboard:", error)
      setApeInMultiplayerError("Failed to load leaderboard. Please try again.")
      setApeInMultiplayerLeaderboard([])
    } finally {
      setLoadingApeInMultiplayer(false)
    }
  }

  // Handle tab change (no fetch needed for cryptoku/ape-in, data comes from provider)
  const handleTabChange = (value: string) => {
    if (value === "ape-in-pvp" && !apeInPvpDataLoaded) {
      fetchApeInPvpLeaderboard()
    } else if (value === "ape-in-multiplayer" && !apeInMultiplayerDataLoaded) {
      fetchApeInMultiplayerLeaderboard()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">
          LEADERBOARD
        </h1>
        <p className="text-muted-foreground">Compete with the best players in the arcade</p>
      </div>

      {/* Your Rank */}
      <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-cyan-500/50 shadow-[0_0_30px_hsl(var(--neon-cyan)/0.3)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Trophy className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-cyan-400 mb-1">Your Rank</div>
              <div className="text-3xl font-bold font-display text-cyan-400">
                {userRank ? `#${userRank}` : "#—"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-400 mb-1">Your Points</div>
            <div className="text-3xl font-bold font-display text-purple-400">{userPoints.toLocaleString()}</div>
          </div>
        </div>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="overall" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5 bg-black/50 border border-purple-500/30">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="cryptoku">Cryptoku</TabsTrigger>
          <TabsTrigger value="ape-in">Ape In</TabsTrigger>
          <TabsTrigger value="ape-in-pvp">Ape In PvP</TabsTrigger>
          <TabsTrigger value="ape-in-multiplayer">Ape In Multiplayer</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-4">
            Total points across all games
          </p>
          {loadingOverall ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
          ) : overallLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leaderboard data available yet.
            </div>
          ) : (
            overallLeaderboard.map((entry) => (
              <LeaderboardCard key={entry.rank} entry={entry} />
            ))
          )}
        </TabsContent>

        <TabsContent value="cryptoku" className="space-y-3">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Cryptoku leaderboard - Ranked by best scores
            </p>
            {/* Mode toggle */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={cryptokuMode === "DEGEN" ? "default" : "outline"}
                size="sm"
                onClick={() => handleCryptokuModeChange("DEGEN")}
                disabled={loadingCryptoku}
              >
                DEGEN
              </Button>
              <Button
                variant={cryptokuMode === "APE" ? "default" : "outline"}
                size="sm"
                onClick={() => handleCryptokuModeChange("APE")}
                disabled={loadingCryptoku}
              >
                APE
              </Button>
            </div>
          </div>
          
          {loadingCryptoku ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
          ) : cryptokuError ? (
            <div className="text-center py-8 text-muted-foreground">{cryptokuError}</div>
          ) : !cryptokuLeaderboard || cryptokuLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Cryptoku scores yet. Be the first to play!
            </div>
          ) : (
            cryptokuLeaderboard.map((entry) => (
              <CryptokuLeaderboardCard key={entry.rank} entry={entry} formatTime={formatTime} formatAddress={formatAddress} currentUserAddress={address} />
            ))
          )}
        </TabsContent>

        <TabsContent value="ape-in" className="space-y-3">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Ape In single-player leaderboard - Best scores per user
            </p>
            {/* Mode toggle */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button
                variant={apeInSingleplayerMode === "aida" ? "default" : "outline"}
                size="sm"
                onClick={() => handleApeInSingleplayerModeChange("aida")}
                disabled={loadingApeIn}
              >
                Aida
              </Button>
              <Button
                variant={apeInSingleplayerMode === "lana" ? "default" : "outline"}
                size="sm"
                onClick={() => handleApeInSingleplayerModeChange("lana")}
                disabled={loadingApeIn}
              >
                Lana
              </Button>
              <Button
                variant={apeInSingleplayerMode === "nifty" ? "default" : "outline"}
                size="sm"
                onClick={() => handleApeInSingleplayerModeChange("nifty")}
                disabled={loadingApeIn}
              >
                Nifty
              </Button>
              <Button
                variant={apeInSingleplayerMode === "enj1n" ? "default" : "outline"}
                size="sm"
                onClick={() => handleApeInSingleplayerModeChange("enj1n")}
                disabled={loadingApeIn}
              >
                En-J1n
              </Button>
            </div>
          </div>
          
          {loadingApeIn ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
          ) : apeInError ? (
            <div className="text-center py-8 text-muted-foreground">{apeInError}</div>
          ) : !apeInSingleplayerLeaderboard || apeInSingleplayerLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Ape In {apeInSingleplayerMode} scores yet. Be the first to play!
            </div>
          ) : (
            <ApeInLeaderboardList entries={apeInSingleplayerLeaderboard} currentUserAddress={address} />
          )}
        </TabsContent>

        <TabsContent value="ape-in-pvp" className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-4">
            Ape In Player vs Player leaderboard - Best scores per user
          </p>
          
          {loadingApeInPvp ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
          ) : apeInPvpError ? (
            <div className="text-center py-8 text-muted-foreground">{apeInPvpError}</div>
          ) : apeInPvpLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Ape In PvP scores yet. Be the first to play!
            </div>
          ) : (
            <ApeInLeaderboardList entries={apeInPvpLeaderboard} currentUserAddress={address} />
          )}
        </TabsContent>

        <TabsContent value="ape-in-multiplayer" className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-4">
            Ape In Multiplayer mode leaderboard - Best scores per user
          </p>
          
          {loadingApeInMultiplayer ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
          ) : apeInMultiplayerError ? (
            <div className="text-center py-8 text-muted-foreground">{apeInMultiplayerError}</div>
          ) : apeInMultiplayerLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Ape In Multiplayer scores yet. Be the first to play!
            </div>
          ) : (
            <ApeInLeaderboardList entries={apeInMultiplayerLeaderboard} currentUserAddress={address} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  const rankColors = {
    1: "bg-pink-500/20 text-pink-400 border-pink-500/30 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]",
    2: "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_20px_hsl(var(--neon-purple)/0.3)]",
    3: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]",
  }

  const rankIcons = {
    1: <Trophy className="w-5 h-5" />,
    2: <Medal className="w-5 h-5" />,
    3: <Medal className="w-5 h-5" />,
  }

  return (
    <Card
      className={`p-6 bg-black/50 backdrop-blur-xl border-2 ${
        entry.rank <= 3 ? rankColors[entry.rank as 1 | 2 | 3] : "border-purple-500/20"
      } hover:border-pink-500/50 transition-all`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 flex items-center justify-center rounded-xl font-bold text-xl border-2 ${
              entry.rank <= 3 ? rankColors[entry.rank as 1 | 2 | 3] : "bg-muted/20 border-purple-500/20"
            }`}
          >
            {entry.rank <= 3 ? rankIcons[entry.rank as 1 | 2 | 3] : entry.rank}
          </div>

          <Avatar className="w-12 h-12 border-2 border-purple-500/30">
            <AvatarImage src={entry.avatar || "/placeholder.svg"} />
            <AvatarFallback>{entry.address.slice(2, 4).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div>
            <div className="font-medium font-mono text-lg">{entry.address}</div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {entry.wins} wins
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {entry.streak} streak
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold font-display text-pink-400">{entry.points.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">points</div>
        </div>
      </div>
    </Card>
  )
}

function CryptokuLeaderboardCard({ 
  entry, 
  formatTime, 
  formatAddress,
  currentUserAddress
}: { 
  entry: CryptokuLeaderboardEntry
  formatTime: (seconds: number) => string
  formatAddress: (address: string) => string
  currentUserAddress?: string | null
}) {
  const rankColors = {
    1: "bg-pink-500/20 text-pink-400 border-pink-500/30 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]",
    2: "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_20px_hsl(var(--neon-purple)/0.3)]",
    3: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]",
  }

  const rankIcons = {
    1: <Trophy className="w-5 h-5" />,
    2: <Medal className="w-5 h-5" />,
    3: <Medal className="w-5 h-5" />,
  }

  const formattedAddress = formatAddress(entry.address)
  const displayName = entry.username || formattedAddress
  // Defensive check: guard toLowerCase() calls
  const normalizedCurrentAddress = currentUserAddress ? currentUserAddress.toLowerCase() : ""
  const normalizedEntryAddress = entry.address ? entry.address.toLowerCase() : ""
  const isCurrentUser = !!currentUserAddress && !!entry.address && normalizedEntryAddress === normalizedCurrentAddress

  return (
    <Card
      className={`p-6 bg-black/50 backdrop-blur-xl border-2 ${
        entry.rank <= 3 ? rankColors[entry.rank as 1 | 2 | 3] : "border-purple-500/20"
      } hover:border-pink-500/50 transition-all ${isCurrentUser ? "ring-2 ring-pink-500/50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 flex items-center justify-center rounded-xl font-bold text-xl border-2 ${
              entry.rank <= 3 ? rankColors[entry.rank as 1 | 2 | 3] : "bg-muted/20 border-purple-500/20"
            }`}
          >
            {entry.rank <= 3 ? rankIcons[entry.rank as 1 | 2 | 3] : entry.rank}
          </div>

          <Avatar className="w-12 h-12 border-2 border-purple-500/30">
            <AvatarImage src={entry.avatar_url || "/placeholder.svg"} />
            <AvatarFallback>{formattedAddress.slice(2, 4).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div>
            <div className="font-medium font-mono text-lg">
              {isCurrentUser ? "YOU" : displayName.toUpperCase()}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{formatTime(entry.timeSeconds)}</span>
              {entry.hintsUsed > 0 && <span>• {entry.hintsUsed} hints</span>}
              {entry.errors > 0 && <span>• {entry.errors} errors</span>}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold font-display text-pink-400">{entry.score.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">score</div>
        </div>
      </div>
    </Card>
  )
}
