"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, Trophy, Zap, Clock, CheckCircle2, Twitter, MessageCircle } from "@/components/icons"
import { useArcade } from "@/components/providers"
import { useToast } from "@/hooks/use-toast"

type Raid = {
  id: string
  title: string
  description: string
  platform: "twitter" | "discord"
  reward: number
  participants: number
  maxParticipants: number
  timeLeft: string
  status: "active" | "completed" | "upcoming"
  action: string
}

const RAIDS: Raid[] = [
  {
    id: "1",
    title: "Twitter Engagement Raid",
    description: "Like, retweet, and comment on our latest announcement",
    platform: "twitter",
    reward: 500,
    participants: 234,
    maxParticipants: 500,
    timeLeft: "2h 34m",
    status: "active",
    action: "https://twitter.com/cryptorabbit",
  },
  {
    id: "2",
    title: "Discord Community Event",
    description: "Join our Discord and participate in the community discussion",
    platform: "discord",
    reward: 300,
    participants: 156,
    maxParticipants: 300,
    timeLeft: "5h 12m",
    status: "active",
    action: "https://discord.gg/cryptorabbit",
  },
  {
    id: "3",
    title: "Share Your Best Play",
    description: "Share a screenshot of your highest score with #CryptoRabbitArcade",
    platform: "twitter",
    reward: 750,
    participants: 89,
    maxParticipants: 200,
    timeLeft: "1d 3h",
    status: "active",
    action: "https://twitter.com/intent/tweet?text=Check%20out%20my%20score!%20%23CryptoRabbitArcade",
  },
  {
    id: "4",
    title: "Weekly Tournament",
    description: "Compete in the weekly leaderboard challenge",
    platform: "discord",
    reward: 1000,
    participants: 0,
    maxParticipants: 100,
    timeLeft: "Coming Soon",
    status: "upcoming",
    action: "",
  },
]

type LeaderboardEntry = {
  rank: number
  address: string
  points: number
  raids: number
  avatar?: string
}

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: "0x1234...5678", points: 15420, raids: 42 },
  { rank: 2, address: "0xabcd...efgh", points: 12890, raids: 38 },
  { rank: 3, address: "0x9876...5432", points: 11250, raids: 35 },
  { rank: 4, address: "0xfedc...ba98", points: 9870, raids: 31 },
  { rank: 5, address: "0x5555...6666", points: 8450, raids: 28 },
]

export default function SocialRaids() {
  const { addPoints, points } = useArcade()
  const { toast } = useToast()
  const [completedRaids, setCompletedRaids] = useState<Set<string>>(new Set())

  function handleJoinRaid(raid: Raid) {
    if (raid.status !== "active") return

    if (raid.action) {
      window.open(raid.action, "_blank")
    }

    setCompletedRaids(new Set(completedRaids).add(raid.id))
    addPoints(raid.reward)

    toast({
      title: "Raid Joined!",
      description: `You earned ${raid.reward} points! Complete the task to claim your reward.`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-2">
          SOCIAL RAIDS
        </h1>
        <div className="mb-4 p-4 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-lg text-center">
          <p className="text-xl font-bold text-yellow-400">Coming Soon</p>
        </div>
        <p className="text-muted-foreground">Join community events and earn rewards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-pink-500/50 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30">
              <Trophy className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <div className="text-sm text-pink-400">Your Points</div>
              <div className="text-2xl font-bold font-display text-pink-400">0</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-purple-500/50 shadow-[0_0_20px_hsl(var(--neon-purple)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-purple-400">Raids Completed</div>
              <div className="text-2xl font-bold font-display text-purple-400">0</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-cyan-500/50 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-cyan-400">Active Raiders</div>
              <div className="text-2xl font-bold font-display text-cyan-400">0</div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-4 text-pink-400">Active Raids</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RAIDS.map((raid) => (
            <RaidCard key={raid.id} raid={{...raid, participants: 0, timeLeft: "Coming Soon", status: "upcoming"}} completed={false} onJoin={handleJoinRaid} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-4 text-cyan-400">Top Raiders</h2>
        <Card className="bg-black/50 backdrop-blur-xl border-2 border-purple-500/30 overflow-hidden">
          <div className="p-8 text-center">
            <p className="text-xl font-bold text-muted-foreground">Coming Soon</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function RaidCard({
  raid,
  completed,
  onJoin,
}: {
  raid: Raid
  completed: boolean
  onJoin: (raid: Raid) => void
}) {
  const platformIcons = {
    twitter: <Twitter className="w-4 h-4" />,
    discord: <MessageCircle className="w-4 h-4" />,
  }

  const statusColors = {
    active: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    completed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    upcoming: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  }

  const progress = (raid.participants / raid.maxParticipants) * 100

  return (
    <Card className="bg-black/50 backdrop-blur-xl border-2 border-purple-500/20 hover:border-pink-500/50 transition-all">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30">
              {platformIcons[raid.platform]}
            </div>
            <div>
              <h3 className="font-semibold">{raid.title}</h3>
              <p className="text-xs text-muted-foreground">{raid.description}</p>
            </div>
          </div>
          <Badge className={`${statusColors[raid.status]} border`}>{raid.status}</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              0 / {raid.maxParticipants}
            </span>
          </div>
          <Progress value={0} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Coming Soon
            </div>
            <div className="flex items-center gap-1 text-pink-400 font-bold">
              <Trophy className="w-4 h-4" />+0
            </div>
          </div>

          <Button disabled size="sm" variant="outline" className="border-purple-500/30 bg-transparent">
            Coming Soon
          </Button>
        </div>
      </div>
    </Card>
  )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankColors = {
    1: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    2: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    3: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  }

  return (
    <div className="flex items-center justify-between p-4 hover:bg-purple-500/10 transition-colors border-b border-purple-500/10 last:border-0">
      <div className="flex items-center gap-4">
        <Badge
          className={`w-10 h-10 flex items-center justify-center font-bold border-2 ${
            entry.rank <= 3 ? rankColors[entry.rank as 1 | 2 | 3] : "bg-muted/20 border-purple-500/20"
          }`}
        >
          {entry.rank}
        </Badge>

        <Avatar className="border-2 border-purple-500/30">
          <AvatarImage src={entry.avatar || "/placeholder.svg"} />
          <AvatarFallback>{entry.address.slice(2, 4).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div>
          <div className="font-medium font-mono">{entry.address}</div>
          <div className="text-xs text-muted-foreground">{entry.raids} raids completed</div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-xl font-bold font-display text-pink-400">{entry.points.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">points</div>
      </div>
    </div>
  )
}
