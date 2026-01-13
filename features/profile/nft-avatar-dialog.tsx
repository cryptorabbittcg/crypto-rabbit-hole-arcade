"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { fetchUserNfts, type Nft } from "@/adapters/nft.adapter"
import Image from "next/image"
import { Loader2 } from "@/components/icons"

interface NFTAvatarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (nft: Nft) => void
  walletAddress: string | null
}

export function NFTAvatarDialog({ open, onOpenChange, onSelect, walletAddress }: NFTAvatarDialogProps) {
  const [nfts, setNfts] = useState<Nft[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && walletAddress) {
      loadNFTs()
    } else if (open && !walletAddress) {
      setError("Wallet address is required")
    }
  }, [open, walletAddress])

  async function loadNFTs() {
    if (!walletAddress) return

    setLoading(true)
    setError(null)
    try {
      const fetchedNFTs = await fetchUserNfts(walletAddress)
      setNfts(fetchedNFTs)
      if (fetchedNFTs.length === 0) {
        setError("No NFTs found in your wallet")
      }
    } catch (err) {
      console.error("[NFTAvatarDialog] Error loading NFTs:", err)
      setError("Failed to load NFTs. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(nft: Nft) {
    onSelect(nft)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose NFT Avatar</DialogTitle>
          <DialogDescription>Select an NFT from your ApeChain wallet to use as your avatar</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              <span className="ml-3 text-muted-foreground">Loading NFTs...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={loadNFTs}>
                Retry
              </Button>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No NFTs found in your wallet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {nfts.map((nft) => (
                <Card
                  key={nft.id}
                  className="overflow-hidden cursor-pointer hover:border-primary/50 transition-all group"
                  onClick={() => handleSelect(nft)}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted/20">
                    <Image
                      src={nft.image || "/placeholder.svg"}
                      alt={nft.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="font-semibold text-sm truncate">{nft.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{nft.collectionName}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

