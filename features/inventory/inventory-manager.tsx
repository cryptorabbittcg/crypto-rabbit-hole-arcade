"use client"

import { useState, useEffect } from "react"
import { fetchUserNfts, stakeNft, unstakeNft, type Nft } from "@/adapters/nft.adapter"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Lock, Unlock, Filter, Grid3x3, List } from "@/components/icons"
import Image from "next/image"
import { useArcade } from "@/components/providers"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function InventoryManager() {
  const { addTxn, updateTxn, addPoints, address } = useArcade()
  const { toast } = useToast()
  const [nfts, setNfts] = useState<Nft[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    loadNfts()
  }, [address])

  async function loadNfts() {
    setLoading(true)
    // Only fetch NFTs that are actually owned in wallets
    const data = await fetchUserNfts(address || undefined)
    // Only show NFTs that are owned in wallets - no cards from context
    setNfts(data)
    setLoading(false)
  }

  async function handleStake(nft: Nft) {
    const id = crypto.randomUUID()
    addTxn({ id, title: `Staking ${nft.name}`, status: "prepare" })

    const success = await stakeNft(nft.id)
    if (success) {
      updateTxn(id, { status: "confirmed" })
      setNfts(nfts.map((n) => (n.id === nft.id ? { ...n, staked: true } : n)))
      addPoints(100)
      toast({
        title: "NFT Staked!",
        description: `${nft.name} is now staked. +100 points earned!`,
      })
    } else {
      updateTxn(id, { status: "error", error: "Staking failed" })
    }
  }

  async function handleUnstake(nft: Nft) {
    const id = crypto.randomUUID()
    addTxn({ id, title: `Unstaking ${nft.name}`, status: "prepare" })

    const success = await unstakeNft(nft.id)
    if (success) {
      updateTxn(id, { status: "confirmed" })
      setNfts(nfts.map((n) => (n.id === nft.id ? { ...n, staked: false } : n)))
      toast({
        title: "NFT Unstaked!",
        description: `${nft.name} has been unstaked.`,
      })
    } else {
      updateTxn(id, { status: "error", error: "Unstaking failed" })
    }
  }

  const filteredNfts = nfts.filter((nft) => {
    if (filter === "all") return true
    if (filter === "staked") return nft.staked
    if (filter === "unstaked") return !nft.staked
    return nft.rarity === filter
  })

  const stakedCount = nfts.filter((n) => n.staked).length
  const totalValue = nfts.length * 0.5

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            NFT INVENTORY
          </h1>
          <p className="text-muted-foreground">Manage your NFT collection and staking</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 border-purple-500/30">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All NFTs</SelectItem>
              <SelectItem value="staked">Staked</SelectItem>
              <SelectItem value="unstaked">Unstaked</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="common">Common</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-purple-500/20">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")}>
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-pink-500/30 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]">
          <div className="text-sm text-pink-400 mb-1">Total NFTs</div>
          <div className="text-3xl font-bold font-display text-pink-400">{nfts.length}</div>
        </Card>
        <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-purple-500/30 shadow-[0_0_20px_hsl(var(--neon-purple)/0.3)]">
          <div className="text-sm text-purple-400 mb-1">Staked NFTs</div>
          <div className="text-3xl font-bold font-display text-purple-400">{stakedCount}</div>
        </Card>
        <Card className="p-6 bg-black/50 backdrop-blur-xl border-2 border-cyan-500/30 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]">
          <div className="text-sm text-cyan-400 mb-1">Est. Value</div>
          <div className="text-3xl font-bold font-display text-cyan-400">{totalValue} APE</div>
        </Card>
      </div>

      {/* NFT Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : filteredNfts.length === 0 ? (
        <Card className="p-12 text-center bg-black/50 backdrop-blur-xl border-2 border-purple-500/20">
          <p className="text-muted-foreground">No NFTs found matching your filters.</p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredNfts.map((nft) => (
            <NftCard key={nft.id} nft={nft} onStake={handleStake} onUnstake={handleUnstake} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNfts.map((nft) => (
            <NftListItem key={nft.id} nft={nft} onStake={handleStake} onUnstake={handleUnstake} />
          ))}
        </div>
      )}
    </div>
  )
}

function NftCard({
  nft,
  onStake,
  onUnstake,
}: {
  nft: Nft
  onStake: (nft: Nft) => void
  onUnstake: (nft: Nft) => void
}) {
  const rarityColors = {
    common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    rare: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    legendary: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  }

  return (
    <Card className="overflow-hidden bg-black/50 backdrop-blur-xl border-2 border-purple-500/20 hover:border-pink-500/50 transition-all group">
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        <Image
          src={nft.image || "/placeholder.svg"}
          alt={nft.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {nft.staked && (
          <div className="absolute top-2 right-2 p-2 rounded-lg bg-pink-500/90 backdrop-blur-sm">
            <Lock className="w-4 h-4 text-white" />
          </div>
        )}
        {nft.rarity && (
          <Badge className={`absolute top-2 left-2 ${rarityColors[nft.rarity]} border`}>{nft.rarity}</Badge>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold truncate">{nft.name}</h3>
          <p className="text-xs text-muted-foreground">{nft.contract}</p>
        </div>

        {nft.staked ? (
          <Button variant="outline" className="w-full bg-transparent border-pink-500/30" onClick={() => onUnstake(nft)}>
            <Unlock className="w-4 h-4 mr-2" />
            Unstake
          </Button>
        ) : (
          <Button
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]"
            onClick={() => onStake(nft)}
          >
            <Lock className="w-4 h-4 mr-2" />
            Stake
          </Button>
        )}
      </div>
    </Card>
  )
}

function NftListItem({
  nft,
  onStake,
  onUnstake,
}: {
  nft: Nft
  onStake: (nft: Nft) => void
  onUnstake: (nft: Nft) => void
}) {
  const rarityColors = {
    common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    rare: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    legendary: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  }

  return (
    <Card className="p-4 bg-black/50 backdrop-blur-xl border-2 border-purple-500/20 hover:border-pink-500/50 transition-all">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted/20 flex-shrink-0">
          <Image src={nft.image || "/placeholder.svg"} alt={nft.name} fill className="object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{nft.name}</h3>
            {nft.rarity && <Badge className={`${rarityColors[nft.rarity]} border text-xs`}>{nft.rarity}</Badge>}
            {nft.staked && (
              <Badge variant="outline" className="text-xs border-pink-500/30">
                <Lock className="w-3 h-3 mr-1" />
                Staked
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{nft.contract}</p>
        </div>

        <div className="flex-shrink-0">
          {nft.staked ? (
            <Button variant="outline" className="border-pink-500/30 bg-transparent" onClick={() => onUnstake(nft)}>
              <Unlock className="w-4 h-4 mr-2" />
              Unstake
            </Button>
          ) : (
            <Button
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-[0_0_20px_hsl(var(--neon-pink)/0.3)]"
              onClick={() => onStake(nft)}
            >
              <Lock className="w-4 h-4 mr-2" />
              Stake
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
