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
import { Trophy, Star, Gamepad2, Users, Gift, Edit2, Copy, Check, Wallet } from "@/components/icons"
import { shortenAddress } from "@/lib/utils/display-name"
import type { Profile } from "@/lib/supabase/database.types"
import type { NormalizedGameSession } from "@/lib/supabase/services/game.service"

export default function ProfileView() {
  const { profile, updateProfile, tickets, points, isConnected, address } = useArcade()
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(profile.username)
  const [copied, setCopied] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)
  const [referralCopied, setReferralCopied] = useState(false)
  const [recentGames, setRecentGames] = useState<NormalizedGameSession[]>([])
  const [loading, setLoading] = useState(true)
  const [supabaseProfile, setSupabaseProfile] = useState<Profile | null>(null)

  // Prefer useArcade().address if present, else fallback to useAccount().address
  const profileAddress = address || wagmiAddress
  const displayAddress = profileAddress ? shortenAddress(profileAddress) : "Not connected"

  useEffect(() => {
    let cancelled = false

    async function loadProfileData() {
      if (!profileAddress) {
        if (!cancelled) {
          setLoading(false)
        }
        return
      }

      try {
        const profileService = new ProfileService()
        const [profileData, games] = await Promise.all([
          profileService.getProfileByWallet(profileAddress),
          GameService.getRecentGames(profileAddress, 10),
        ])

        if (cancelled) return

        if (profileData) {
          setSupabaseProfile(profileData)
          setUsername(profileData.username)
        }

        setRecentGames(games)
      } catch (error) {
        if (!cancelled) {
          console.error("[ProfileView] Failed to load profile data:", error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProfileData()

    return () => {
      cancelled = true
    }
  }, [profileAddress])

  const handleSave = async () => {
    updateProfile({ username })
    setIsEditing(false)

    if (profileAddress) {
      try {
        const profileService = new ProfileService()
        const currentProfile = await profileService.getProfileByWallet(profileAddress)
        if (currentProfile) {
          await profileService.updateProfile(currentProfile.id, { username })
          // Reload profile data
          const updated = await profileService.getProfileByWallet(profileAddress)
          if (updated) {
            setSupabaseProfile(updated)
          }
        }
      } catch (error) {
        console.error("[ProfileView] Failed to update username:", error)
      }
    }
  }

  const copyToClipboard = (text: string, setter: (value: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const copyAddress = () => {
    if (profileAddress) {
      copyToClipboard(profileAddress, setAddressCopied)
    }
  }

  const copyReferralCode = () => {
    copyToClipboard(profile.referralCode, setReferralCopied)
  }

  const copyReferralLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || ""
    const link = `${origin}/?ref=${profile.referralCode}`
    copyToClipboard(link, setCopied)
  }

  // Format duration in seconds to human readable format
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return "0s"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  // Format game type for display
  const formatGameType = (gameType: string): string => {
    return gameType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Check if linked wallets UI should be shown
  const showLinkedWallets = process.env.NEXT_PUBLIC_LINKED_WALLETS_UI === "true"

  // Get stats from Supabase profile or use defaults
  const stats = {
    gamesPlayed: supabaseProfile?.total_games_played ?? 0,
    wins: supabaseProfile?.total_wins ?? 0,
    losses: supabaseProfile?.total_losses ?? 0,
    winStreak: supabaseProfile?.win_streak ?? 0,
    bestWinStreak: (supabaseProfile as any)?.best_win_streak ?? (supabaseProfile as any)?.highest_win_streak ?? 0,
    totalPlaytime: (supabaseProfile as any)?.total_playtime ?? 0,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Card with 3 zones */}
      <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-purple-500/5 to-cyan-500/10 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Zone A: Identity (Left) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-24 h-24 border-4 border-primary shadow-[0_0_30px_hsl(var(--neon-cyan)/0.5)]">
                <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.username} />
                <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex gap-2 items-center">
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
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent truncate">
                      {profile.username || "Guest"}
                    </h1>
                    <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon" className="h-6 w-6">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {profileAddress && (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-sm text-muted-foreground font-mono">{displayAddress}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={copyAddress}
                      title="Copy address"
                    >
                      {addressCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                )}

                <p className="text-sm text-muted-foreground mt-1">
                  Member since{" "}
                  {(supabaseProfile?.created_at
                    ? new Date(supabaseProfile.created_at)
                    : profile.joinedAt
                  ).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          {/* Zone B: Wallet (Middle/Right) */}
          <div className="lg:col-span-4 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Primary Wallet: Glyph</h3>
              {profileAddress && (
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-mono">{displayAddress}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyAddress}
                    title="Copy address"
                  >
                    {addressCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Badge
                  variant={wagmiConnected ? "default" : "secondary"}
                  className={wagmiConnected ? "bg-green-500/20 text-green-400 border-green-500/50" : ""}
                >
                  {wagmiConnected ? "Connected" : "Not connected"}
                </Badge>
                {wagmiConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex items-center gap-1"
                  >
                    <a href="https://useglyph.io/profile" target="_blank" rel="noopener noreferrer">
                      <Wallet className="w-4 h-4" />
                      Manage Wallet
                      <span className="text-xs">↗</span>
                    </a>
                  </Button>
                ) : (
                  <div className="flex flex-col items-start gap-1">
                    <Button variant="outline" size="sm" disabled className="flex items-center gap-1">
                      <Wallet className="w-4 h-4" />
                      Manage Wallet
                    </Button>
                    <span className="text-xs text-muted-foreground">Connect wallet to manage</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Zone C: Balances (Right) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
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
      </Card>

      {/* Linked Wallets Section (Feature Flagged) */}
      {showLinkedWallets && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Linked Wallets</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/10">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">MetaMask</div>
                  <div className="text-sm text-muted-foreground">Not linked</div>
                </div>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard icon={Gamepad2} label="Games Played" value={stats.gamesPlayed} color="pink" />
            <StatCard icon={Trophy} label="Wins" value={stats.wins} color="purple" />
            <StatCard icon={Gamepad2} label="Losses" value={stats.losses} color="cyan" />
            <StatCard icon={Star} label="Win Streak" value={stats.winStreak} color="pink" />
            <StatCard icon={Trophy} label="Best Win Streak" value={stats.bestWinStreak} color="purple" />
            <StatCard icon={Gamepad2} label="Total Playtime" value={formatDuration(stats.totalPlaytime)} color="cyan" />
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
                    gameType={formatGameType(game.gameType)}
                    gameMode={game.gameMode || ""}
                    score={game.score}
                    pointsEarned={game.pointsEarned}
                    duration={game.durationSeconds}
                    createdAt={game.createdAt}
                  />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">No recent activity</div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-primary" />
              <h3 className="font-display text-xl font-bold">Your Referral Code</h3>
            </div>

            <div className="flex gap-2 mb-4">
              <Input value={profile.referralCode} readOnly className="font-mono text-lg font-bold" />
              <Button onClick={copyReferralCode} variant="outline">
                {referralCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <Card className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-bold mb-2">Achievements Coming Soon</h3>
            <p className="text-muted-foreground">We're working on an exciting achievements system!</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
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

function ActivityItem({
  gameType,
  gameMode,
  score,
  pointsEarned,
  duration,
  createdAt,
}: {
  gameType: string
  gameMode: string
  score: number
  pointsEarned: number
  duration: number
  createdAt: string
}) {
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "0s"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return dateString
    }
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/50">
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          {gameType}
          {gameMode && <span className="text-muted-foreground ml-2">({gameMode})</span>}
        </div>
        <div className="text-sm text-muted-foreground">
          Score: {score} • {pointsEarned > 0 && `+${pointsEarned} points`} • Duration: {formatDuration(duration)}
        </div>
      </div>
      <div className="text-xs text-muted-foreground ml-4">{formatDate(createdAt)}</div>
    </div>
  )
}

function RewardTier({ tier, referrals, reward }: { tier: string; referrals: number; reward: string }) {
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
