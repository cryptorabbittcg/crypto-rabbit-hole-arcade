"use client"

import { useState, useEffect } from "react"
import { useArcade } from "@/components/providers"
import { useAccount } from "wagmi"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { GameService } from "@/lib/supabase/services/game.service"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Star, Gamepad2, Users, Gift, Edit2, Copy, Check } from "@/components/icons"

export default function ProfileView() {
  const { profile, updateProfile, tickets, points, isConnected, address } = useArcade()
  const { address: wagmiAddress } = useAccount()
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(profile.username)
  const [copied, setCopied] = useState(false)
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfileData() {
      const profileAddress = wagmiAddress || address
      if (!profileAddress) {
        setLoading(false)
        return
      }

      try {
        const [supabaseProfile, games] = await Promise.all([
          ProfileService.getProfile(profileAddress),
          GameService.getRecentGames(profileAddress, 5),
        ])

        if (supabaseProfile) {
          setUsername(supabaseProfile.username)
        }

        setRecentGames(games)
      } catch (error) {
        console.error("[v0] Failed to load profile data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfileData()
  }, [wagmiAddress, address])

  const handleSave = async () => {
    updateProfile({ username })
    setIsEditing(false)

    const profileAddress = wagmiAddress || address
    if (profileAddress) {
      try {
        await ProfileService.updateProfile(profileAddress, { username })
      } catch (error) {
        console.error("[v0] Failed to update username:", error)
      }
    }
  }

  const copyReferralLink = () => {
    const link = `https://cryptorabbitarcade.vercel.app?ref=${profile.referralCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-purple-500/5 to-cyan-500/10 p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Avatar className="w-32 h-32 border-4 border-primary shadow-[0_0_30px_hsl(var(--neon-cyan)/0.5)]">
            <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.username} />
            <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left space-y-2">
            {isEditing ? (
              <div className="flex gap-2 items-center justify-center md:justify-start">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="max-w-xs"
                  placeholder="Username"
                />
                <Button onClick={handleSave} size="sm">
                  Save
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  {profile.username}
                </h1>
                <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {isConnected && (
              <p className="text-sm text-muted-foreground font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              Member since {profile.joinedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {profile.stats.achievements.map((achievement) => (
                <Badge key={achievement} variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                  <Trophy className="w-3 h-3 mr-1" />
                  {achievement}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Card className="bg-black/50 border-2 border-pink-500/50 p-4 text-center shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]">
              <div className="text-xs text-pink-400 mb-1">TICKETS</div>
              <div className="text-3xl font-bold text-pink-400">{tickets}</div>
            </Card>
            <Card className="bg-black/50 border-2 border-cyan-500/50 p-4 text-center shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]">
              <div className="text-xs text-cyan-400 mb-1">POINTS</div>
              <div className="text-3xl font-bold text-cyan-400">{points}</div>
            </Card>
          </div>
        </div>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard icon={Gamepad2} label="Games Played" value={profile.stats.gamesPlayed} color="pink" />
            <StatCard
              icon={Trophy}
              label="Total Score"
              value={profile.stats.totalScore.toLocaleString()}
              color="purple"
            />
            <StatCard icon={Star} label="Achievements" value={profile.stats.achievements.length} color="cyan" />
          </div>

          <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
            <h3 className="font-display text-xl font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center text-muted-foreground py-4">Loading activity...</div>
              ) : recentGames.length > 0 ? (
                recentGames.map((game) => (
                  <ActivityItem
                    key={game.id}
                    title={`${game.game_type.toUpperCase()} Game`}
                    description={`${game.result === "won" ? "Won" : "Lost"} - Earned ${game.points_earned} points`}
                    time={new Date(game.created_at).toLocaleDateString()}
                  />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">No recent activity</div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-primary" />
              <h3 className="font-display text-xl font-bold">Your Referral Code</h3>
            </div>

            <div className="flex gap-2 mb-4">
              <Input value={profile.referralCode} readOnly className="font-mono text-lg font-bold" />
              <Button onClick={copyReferralLink} variant="outline">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Share your referral code and earn 5 tickets + 150 points for each friend who joins!
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black/50 border-2 border-primary/50 rounded-lg p-4 text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-3xl font-bold text-primary">{profile.referralCount}</div>
                <div className="text-xs text-muted-foreground">Total Referrals</div>
              </div>
              <div className="bg-black/50 border-2 border-secondary/50 rounded-lg p-4 text-center">
                <Star className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="text-3xl font-bold text-secondary">{profile.referralEarnings}</div>
                <div className="text-xs text-muted-foreground">Points Earned</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
            <h3 className="font-display text-xl font-bold mb-4">Referral Rewards</h3>
            <div className="space-y-3">
              <RewardTier tier="Bronze" referrals={1} reward="5 Tickets + 150 Points" />
              <RewardTier tier="Silver" referrals={5} reward="25 Tickets + 1000 Points" />
              <RewardTier tier="Gold" referrals={10} reward="50 Tickets + 2500 Points" />
              <RewardTier tier="Platinum" referrals={25} reward="150 Tickets + 10000 Points" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <AchievementCard title="First Win" description="Win your first game" unlocked={true} icon="🏆" />
            <AchievementCard title="10 Games" description="Play 10 games" unlocked={true} icon="🎮" />
            <AchievementCard title="High Roller" description="Earn 10,000 points" unlocked={true} icon="💎" />
            <AchievementCard title="Card Collector" description="Collect 50 cards" unlocked={true} icon="🃏" />
            <AchievementCard title="Social Butterfly" description="Refer 10 friends" unlocked={false} icon="🦋" />
            <AchievementCard
              title="Arcade Master"
              description="Reach top 10 on leaderboard"
              unlocked={false}
              icon="👑"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors = {
    pink: "border-pink-500/50 text-pink-400 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]",
    purple: "border-purple-500/50 text-purple-400 shadow-[0_0_20px_hsl(var(--neon-purple)/0.3)]",
    cyan: "border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]",
  }

  return (
    <Card className={`p-6 bg-black/50 border-2 ${colors[color as keyof typeof colors]} text-center`}>
      <Icon className="w-8 h-8 mx-auto mb-2" />
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  )
}

function ActivityItem({ title, description, time }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/50">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <div className="text-xs text-muted-foreground">{time}</div>
    </div>
  )
}

function RewardTier({ tier, referrals, reward }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/10 border border-border/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center font-bold">{referrals}</div>
        <div>
          <div className="font-medium">{tier} Tier</div>
          <div className="text-sm text-muted-foreground">{referrals} referrals</div>
        </div>
      </div>
      <div className="text-sm font-medium text-primary">{reward}</div>
    </div>
  )
}

function AchievementCard({ title, description, unlocked, icon }: any) {
  return (
    <Card className={`p-6 ${unlocked ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-border/50 opacity-50"}`}>
      <div className="flex items-center gap-4">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <div className="font-bold">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        {unlocked && (
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            Unlocked
          </Badge>
        )}
      </div>
    </Card>
  )
}
