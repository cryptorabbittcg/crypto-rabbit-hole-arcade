"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Users,
  Package,
  Trophy,
  Activity,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Plus,
  Loader2,
} from "@/components/icons"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/hooks/use-supabase-auth"

const ADMIN_EMAIL = "info@thecryptorabbithole.io"
const ADMIN_PASSWORD = "adminCxR@bb1t"

type SystemStats = {
  totalUsers: number
  activeUsers: number
  totalPacks: number
  totalRevenue: number
  avgSessionTime: string
  conversionRate: number
}

const STATS: SystemStats = {
  totalUsers: 1247,
  activeUsers: 342,
  totalPacks: 5678,
  totalRevenue: 12450,
  avgSessionTime: "24m 32s",
  conversionRate: 3.2,
}

export default function AdminPanel() {
  const { toast } = useToast()
  const { user, loading: authLoading, signIn } = useSupabaseAuth()
  const [newRaidTitle, setNewRaidTitle] = useState("")
  const [newRaidReward, setNewRaidReward] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (user && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      })
    }
  }, [user, isAdmin, toast])

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsAuthenticating(true)

    if (loginEmail !== ADMIN_EMAIL || loginPassword !== ADMIN_PASSWORD) {
      toast({
        title: "Invalid Credentials",
        description: "Please check your email and password.",
        variant: "destructive",
      })
      setIsAuthenticating(false)
      return
    }

    const { error } = await signIn(loginEmail, loginPassword)
    setIsAuthenticating(false)

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Login Successful",
        description: "Welcome to the Admin Panel",
      })
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md w-full bg-black/50 backdrop-blur-xl border-2 border-purple-500/30">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-2">
                ADMIN LOGIN
              </h1>
              <p className="text-muted-foreground">Please sign in to access the admin panel</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="border-purple-500/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="border-purple-500/30"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    )
  }

  function handleCreateRaid() {
    if (!newRaidTitle || !newRaidReward) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Raid Created!",
      description: `New raid "${newRaidTitle}" has been created with ${newRaidReward} points reward.`,
    })

    setNewRaidTitle("")
    setNewRaidReward("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-2">
            ADMIN PANEL
          </h1>
          <p className="text-muted-foreground">Manage your arcade platform</p>
        </div>
        <Badge variant="outline" className="text-pink-400 border-pink-500/30 bg-pink-500/10">
          <AlertCircle className="w-3 h-3 mr-1" />
          Admin Access
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Users"
          value={STATS.totalUsers.toLocaleString()}
          color="pink"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Active Now"
          value={STATS.activeUsers.toLocaleString()}
          color="purple"
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Packs Sold"
          value={STATS.totalPacks.toLocaleString()}
          color="cyan"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Revenue"
          value={`${STATS.totalRevenue} APE`}
          color="pink"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Session"
          value={STATS.avgSessionTime}
          color="purple"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Conversion"
          value={`${STATS.conversionRate}%`}
          color="cyan"
        />
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="raids" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-black/50 border border-purple-500/30">
          <TabsTrigger value="raids">Social Raids</TabsTrigger>
          <TabsTrigger value="packs">Pack Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="raids" className="space-y-4">
          <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-purple-500/30">
            <h3 className="font-display text-xl font-bold mb-4 text-pink-400">Create New Raid</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="raid-title">Raid Title</Label>
                  <Input
                    id="raid-title"
                    placeholder="Enter raid title"
                    value={newRaidTitle}
                    onChange={(e) => setNewRaidTitle(e.target.value)}
                    className="border-purple-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="raid-reward">Points Reward</Label>
                  <Input
                    id="raid-reward"
                    type="number"
                    placeholder="500"
                    value={newRaidReward}
                    onChange={(e) => setNewRaidReward(e.target.value)}
                    className="border-purple-500/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="raid-description">Description</Label>
                <Textarea
                  id="raid-description"
                  placeholder="Describe the raid task..."
                  className="border-purple-500/30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="raid-platform">Platform</Label>
                  <Select>
                    <SelectTrigger id="raid-platform" className="border-purple-500/30">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="raid-max">Max Participants</Label>
                  <Input id="raid-max" type="number" placeholder="500" className="border-purple-500/30" />
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]"
                onClick={handleCreateRaid}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Raid
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="packs" className="space-y-4">
          <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-purple-500/30">
            <h3 className="font-display text-xl font-bold mb-4 text-purple-400">Pack Configuration</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pack-name">Pack Name</Label>
                  <Input id="pack-name" placeholder="Premium Pack" className="border-purple-500/30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-price">Price (APE)</Label>
                  <Input id="pack-price" type="number" placeholder="15" className="border-purple-500/30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-cards">Cards per Pack</Label>
                  <Input id="pack-cards" type="number" placeholder="8" className="border-purple-500/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pack-rarity">Rarity Distribution</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="Common %" className="border-purple-500/30" />
                  <Input placeholder="Rare %" className="border-purple-500/30" />
                  <Input placeholder="Epic %" className="border-purple-500/30" />
                  <Input placeholder="Legendary %" className="border-purple-500/30" />
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 shadow-[0_0_20px_hsl(var(--neon-purple)/0.3)]">
                <Plus className="w-4 h-4 mr-2" />
                Create Pack Type
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-purple-500/30">
            <h3 className="font-display text-xl font-bold mb-4 text-cyan-400">User Management</h3>
            <div className="space-y-4">
              <Input placeholder="Search users by address..." className="border-purple-500/30" />
              <div className="text-center py-8 text-muted-foreground">User management interface coming soon</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-purple-500/30">
            <h3 className="font-display text-xl font-bold mb-4 text-pink-400">Platform Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entropy-address">Pyth Entropy Contract</Label>
                <Input id="entropy-address" placeholder="0x..." className="border-purple-500/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oft-address">APE OFT Address</Label>
                <Input id="oft-address" placeholder="0x..." className="border-purple-500/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherside-id">Otherside App ID</Label>
                <Input id="otherside-id" placeholder="app-id" className="border-purple-500/30" />
              </div>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]">
                <Settings className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ icon, label, value, color }: any) {
  const colorClasses = {
    pink: "border-pink-500/30 shadow-[0_0_15px_hsl(var(--neon-pink)/0.2)] text-pink-400",
    purple: "border-purple-500/30 shadow-[0_0_15px_hsl(var(--neon-purple)/0.2)] text-purple-400",
    cyan: "border-cyan-500/30 shadow-[0_0_15px_hsl(var(--neon-cyan)/0.2)] text-cyan-400",
  }

  return (
    <Card className={`p-4 bg-black/50 backdrop-blur-xl border-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="mb-2">{icon}</div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-bold font-display">{value}</div>
    </Card>
  )
}
