"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Zap, Medal } from "@/components/icons"
import { useArcade } from "@/components/providers"
import { LeaderboardService, type ApeInLeaderboardEntry } from "@/lib/supabase/services/leaderboard.service"

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
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingOverall, setLoadingOverall] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [userPoints, setUserPoints] = useState<number>(points || 0)
  
  // Cryptoku leaderboard state
  const [cryptokuLeaderboard, setCryptokuLeaderboard] = useState<CryptokuLeaderboardEntry[]>([])
  const [cryptokuMode, setCryptokuMode] = useState<"DEGEN" | "APE">("DEGEN")
  const [loadingCryptoku, setLoadingCryptoku] = useState(false)
  const [cryptokuError, setCryptokuError] = useState<string | null>(null)
  const [cryptokuDataLoaded, setCryptokuDataLoaded] = useState(false)

  // Ape In leaderboard state
  const [apeInSingleplayerMode, setApeInSingleplayerMode] = useState<"aida" | "lana" | "nifty" | "enj1n">("aida")
  const [apeInSingleplayerLeaderboard, setApeInSingleplayerLeaderboard] = useState<ApeInLeaderboardEntry[]>([])
  const [loadingApeInSingleplayer, setLoadingApeInSingleplayer] = useState(false)
  const [apeInSingleplayerError, setApeInSingleplayerError] = useState<string | null>(null)
  const [apeInSingleplayerDataLoaded, setApeInSingleplayerDataLoaded] = useState(false)

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

  // Fetch Cryptoku leaderboard
  const fetchCryptokuLeaderboard = async (mode: "DEGEN" | "APE") => {
    setLoadingCryptoku(true)
    setCryptokuError(null)
    try {
      const response = await fetch(`/api/cryptoku/leaderboard?mode=${mode}&limit=100`)
      if (!response.ok) {
        throw new Error("Failed to fetch Cryptoku leaderboard")
      }
      const data = await response.json()
      
      // Map API response to CryptokuLeaderboardEntry format
      const entries: CryptokuLeaderboardEntry[] = data.entries.map((entry: any) => ({
        rank: entry.rank,
        address: entry.address || "0x0000...0000",
        score: entry.score,
        timeSeconds: entry.timeSeconds,
        hintsUsed: entry.hintsUsed || 0,
        errors: entry.errors || 0,
        mode: entry.mode as "DEGEN" | "APE"
      }))
      
      setCryptokuLeaderboard(entries)
      setCryptokuDataLoaded(true)
    } catch (error) {
      console.error("[LeaderboardView] Error fetching Cryptoku leaderboard:", error)
      setCryptokuError("Failed to load leaderboard. Please try again.")
      setCryptokuLeaderboard([])
    } finally {
      setLoadingCryptoku(false)
    }
  }

  // Handle Cryptoku mode change
  const handleCryptokuModeChange = (mode: "DEGEN" | "APE") => {
    setCryptokuMode(mode)
    fetchCryptokuLeaderboard(mode)
  }

  // Fetch Ape In leaderboard (singleplayer)
  const fetchApeInSingleplayerLeaderboard = async (mode: "aida" | "lana" | "nifty" | "enj1n") => {
    setLoadingApeInSingleplayer(true)
    setApeInSingleplayerError(null)
    try {
      const leaderboardService = new LeaderboardService()
      const entries = await leaderboardService.getApeInLeaderboard(mode, 100)
      setApeInSingleplayerLeaderboard(entries)
      setApeInSingleplayerDataLoaded(true)
    } catch (error) {
      console.error("[LeaderboardView] Error fetching Ape In singleplayer leaderboard:", error)
      setApeInSingleplayerError("Failed to load leaderboard. Please try again.")
      setApeInSingleplayerLeaderboard([])
    } finally {
      setLoadingApeInSingleplayer(false)
    }
  }

  // Fetch Ape In PvP leaderboard
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

  // Handle Ape In singleplayer mode change
  const handleApeInSingleplayerModeChange = (mode: "aida" | "lana" | "nifty" | "enj1n") => {
    setApeInSingleplayerMode(mode)
    fetchApeInSingleplayerLeaderboard(mode)
  }

  // Handle tab change to fetch data when tabs become active
  const handleTabChange = (value: string) => {
    if (value === "cryptoku" && !cryptokuDataLoaded) {
      fetchCryptokuLeaderboard(cryptokuMode)
    } else if (value === "ape-in" && !apeInSingleplayerDataLoaded) {
      fetchApeInSingleplayerLeaderboard(apeInSingleplayerMode)
    } else if (value === "ape-in-pvp" && !apeInPvpDataLoaded) {
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
          ) : cryptokuLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Cryptoku scores yet. Be the first to play!
            </div>
          ) : (
            cryptokuLeaderboard.map((entry) => (
              <CryptokuLeaderboardCard key={entry.rank} entry={entry} formatTime={formatTime} formatAddress={formatAddress} />
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
                disabled={loadingApeInSingleplayer}
              >
                Aida
              </Button>
              <Button
                variant={apeInSingleplayerMode === "lana" ? "default" : "outline"}
                size="sm"
                onClick={() => handleApeInSingleplayerModeChange("lana")}
                disabled={loadingApeInSingleplayer}
              >
                Lana
              </Button>
              <Button
                variant={apeInSingleplayerMode === "nifty" ? "default" : "outline"}
                size="sm"
                onClick={() => handleApeInSingleplayerModeChange("nifty")}
                disabled={loadingApeInSingleplayer}
              >
                Nifty
              </Button>
              <Button
                variant={apeInSingleplayerMode === "enj1n" ? "default" : "outline"}
                size="sm"
                onClick={() => handleApeInSingleplayerModeChange("enj1n")}
                disabled={loadingApeInSingleplayer}
              >
                En-J1n
              </Button>
            </div>
          </div>
          
          {loadingApeInSingleplayer ? (
            <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
          ) : apeInSingleplayerError ? (
            <div className="text-center py-8 text-muted-foreground">{apeInSingleplayerError}</div>
          ) : apeInSingleplayerLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Ape In {apeInSingleplayerMode} scores yet. Be the first to play!
            </div>
          ) : (
            apeInSingleplayerLeaderboard.map((entry) => (
              <ApeInLeaderboardCard key={entry.rank} entry={entry} formatAddress={formatAddress} address={address} />
            ))
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
            apeInPvpLeaderboard.map((entry) => (
              <ApeInLeaderboardCard key={entry.rank} entry={entry} formatAddress={formatAddress} address={address} />
            ))
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
            apeInMultiplayerLeaderboard.map((entry) => (
              <ApeInLeaderboardCard key={entry.rank} entry={entry} formatAddress={formatAddress} address={address} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ApeInLeaderboardCard({
  entry,
  formatAddress,
  address,
}: {
  entry: ApeInLeaderboardEntry
  formatAddress: (address: string) => string
  address: string | null | undefined
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

  const formattedAddress = formatAddress(entry.wallet_address)
  const displayName = entry.username || formattedAddress
  const isCurrentUser = address && entry.wallet_address.toLowerCase() === address.toLowerCase()
  
  // Format last played date
  const formatLastPlayed = (dateString: string | null): string => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString()
  }

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
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>{formattedAddress.slice(2, 4).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div>
            <div className="font-medium font-mono text-lg">
              {isCurrentUser ? "YOU" : displayName.toUpperCase()}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{entry.games_played} games</span>
              <span>•</span>
              <span>{formatLastPlayed(entry.last_played)}</span>
              {entry.mode && entry.mode !== "all" && entry.mode !== "best" && (
                <>
                  <span>•</span>
                  <span className="capitalize">{entry.mode}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold font-display text-pink-400">{entry.best_score.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">best score</div>
        </div>
      </div>
    </Card>
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
  formatAddress 
}: { 
  entry: CryptokuLeaderboardEntry
  formatTime: (seconds: number) => string
  formatAddress: (address: string) => string
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
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>{formattedAddress.slice(2, 4).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div>
            <div className="font-medium font-mono text-lg">{formattedAddress}</div>
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
