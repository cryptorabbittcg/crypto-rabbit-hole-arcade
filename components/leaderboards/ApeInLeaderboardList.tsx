"use client"

import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Medal } from "@/components/icons"
import type { ApeInLeaderboardEntry } from "@/lib/supabase/services/leaderboard.service"

function formatAddress(address: string): string {
  if (!address || address.length < 10) return "0x0000...0000"
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatLastPlayed(dateString: string | null): string {
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

function ApeInLeaderboardCard({
  entry,
  address,
}: {
  entry: ApeInLeaderboardEntry
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
  // Defensive check: guard toLowerCase() calls
  const normalizedCurrentAddress = address ? address.toLowerCase() : ""
  const normalizedEntryAddress = entry.wallet_address ? entry.wallet_address.toLowerCase() : ""
  const isCurrentUser = !!address && !!entry.wallet_address && normalizedEntryAddress === normalizedCurrentAddress

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
              {(entry.games_played ?? 0) > 0 && (
                <>
                  <span>{entry.games_played} games</span>
                  <span>•</span>
                </>
              )}
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

export interface ApeInLeaderboardListProps {
  entries: ApeInLeaderboardEntry[]
  currentUserAddress?: string | null
}

export function ApeInLeaderboardList({ entries, currentUserAddress }: ApeInLeaderboardListProps) {
  // Debug logging to verify entries are received correctly
  console.log('[ApeInLeaderboardList] entries len', entries?.length, 'first', entries?.[0])
  
  // Defensive check: ensure entries is an array
  if (!Array.isArray(entries) || entries.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <ApeInLeaderboardCard
          key={`${entry.user_id}-${entry.mode}-${entry.last_played ?? ""}-${entry.best_score}`}
          entry={entry}
          address={currentUserAddress}
        />
      ))}
    </div>
  )
}
