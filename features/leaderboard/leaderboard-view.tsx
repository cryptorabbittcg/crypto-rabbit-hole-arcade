"use client"

import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingUp, Zap, Medal } from "@/components/icons"
import { useArcade } from "@/components/providers"

type LeaderboardEntry = {
  rank: number
  address: string
  points: number
  wins: number
  streak: number
  avatar?: string
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
  const { points } = useArcade()

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
              <div className="text-3xl font-bold font-display text-cyan-400">#0</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-400 mb-1">Your Points</div>
            <div className="text-3xl font-bold font-display text-purple-400">0</div>
          </div>
        </div>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="overall" className="space-y-4">
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
          {GLOBAL_LEADERBOARD.map((entry) => (
            <LeaderboardCard key={entry.rank} entry={entry} />
          ))}
        </TabsContent>

        <TabsContent value="cryptoku" className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-4">
            Cryptoku leaderboard - Ranked by best scores
          </p>
          {GLOBAL_LEADERBOARD.map((entry) => (
            <LeaderboardCard key={entry.rank} entry={entry} />
          ))}
        </TabsContent>

        <TabsContent value="ape-in" className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-4">
            Ape In single-player leaderboard
          </p>
          {GLOBAL_LEADERBOARD.map((entry) => (
            <LeaderboardCard key={entry.rank} entry={entry} />
          ))}
        </TabsContent>

        <TabsContent value="ape-in-pvp" className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-4">
            Ape In Player vs Player leaderboard
          </p>
          {GLOBAL_LEADERBOARD.map((entry) => (
            <LeaderboardCard key={entry.rank} entry={entry} />
          ))}
        </TabsContent>

        <TabsContent value="ape-in-multiplayer" className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-4">
            Ape In Multiplayer mode leaderboard
          </p>
          {GLOBAL_LEADERBOARD.map((entry) => (
            <LeaderboardCard key={entry.rank} entry={entry} />
          ))}
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
