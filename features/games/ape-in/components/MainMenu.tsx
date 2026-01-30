"use client"

import { motion } from 'framer-motion'
import { GameMode } from '../types/game'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from 'wagmi'
import { ensureApeChain } from '@/lib/wallet-chain'
import ParticleBackground from './ParticleBackground'
import { useArcade } from '@/components/providers'
import { BOT_CONFIGS } from '../utils/botConfig'
import StatsModal from './StatsModal'
import LeaderboardModal from './LeaderboardModal'
import PvPMatchModal from '../pvp/components/PvPMatchModal'
import { X } from 'lucide-react'

const PENDING_PLAY_PURCHASE_KEY = "ape-in:pendingPlayPurchase"
const FREE_PLAY_MODES = ["aida", "lana", "enj1n", "nifty"] as const
const FALLBACK_CHAIN_ID = 33139 // ApeChain mainnet (fallback only)

type PendingPlayPurchase = {
  address: string
  intentId: string
  txHash: `0x${string}`
}

interface MainMenuProps {
  onSelectMode: (mode: GameMode) => void
  playerAddress: string | null
  onClose?: () => void // Callback to close Ape In and return to Arcade Hub
}

interface GameModeCard {
  mode: GameMode
  name: string
  description: string
  color: string
  difficulty?: string
  icon: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  price: number
}

// Generate game modes from bot config (with safety checks)
function getGameModes(): GameModeCard[] {
  // Safety check for BOT_CONFIGS
  if (!BOT_CONFIGS || typeof BOT_CONFIGS !== 'object') {
    console.error('⚠️ BOT_CONFIGS not available, using fallback game modes')
    return [
      { mode: 'sandy', name: 'Sandy', description: 'Tutorial mode', color: 'from-yellow-500 to-orange-500', difficulty: 'Tutorial', icon: '🟡', rarity: 'common', price: 0 },
      { mode: 'aida', name: 'Aida', description: 'Medium difficulty', color: 'from-purple-500 to-pink-500', difficulty: 'Medium', icon: '🟣', rarity: 'uncommon', price: 0.1 },
      { mode: 'lana', name: 'Lana', description: 'Hard difficulty', color: 'from-blue-500 to-cyan-500', difficulty: 'Hard', icon: '🔵', rarity: 'rare', price: 0.1 },
      { mode: 'enj1n', name: 'En-J1n', description: 'Expert difficulty', color: 'from-red-500 to-orange-600', difficulty: 'Expert', icon: '🔴', rarity: 'epic', price: 0.1 },
      { mode: 'nifty', name: 'Nifty', description: 'Medium-Hard difficulty', color: 'from-orange-500 to-yellow-500', difficulty: 'Medium-Hard', icon: '🟠', rarity: 'rare', price: 0.1 },
    ]
  }

  return [
    {
      mode: 'sandy',
      name: BOT_CONFIGS.sandy?.name || 'Sandy',
      description: BOT_CONFIGS.sandy?.description || 'Tutorial mode',
      color: 'from-yellow-500 to-orange-500',
      difficulty: BOT_CONFIGS.sandy?.difficulty || 'Tutorial',
      icon: '🟡',
      rarity: 'common',
      price: BOT_CONFIGS.sandy?.price ?? 0,
    },
    {
      mode: 'aida',
      name: BOT_CONFIGS.aida?.name || 'Aida',
      description: BOT_CONFIGS.aida?.description || 'Medium difficulty',
      color: 'from-purple-500 to-pink-500',
      difficulty: BOT_CONFIGS.aida?.difficulty || 'Medium',
      icon: '🟣',
      rarity: 'uncommon',
      price: BOT_CONFIGS.aida?.price ?? 0.1,
    },
    {
      mode: 'lana',
      name: BOT_CONFIGS.lana?.name || 'Lana',
      description: BOT_CONFIGS.lana?.description || 'Hard difficulty',
      color: 'from-blue-500 to-cyan-500',
      difficulty: BOT_CONFIGS.lana?.difficulty || 'Hard',
      icon: '🔵',
      rarity: 'rare',
      price: BOT_CONFIGS.lana?.price ?? 0.1,
    },
    {
      mode: 'enj1n',
      name: BOT_CONFIGS.enj1n?.name || 'En-J1n',
      description: BOT_CONFIGS.enj1n?.description || 'Expert difficulty',
      color: 'from-red-500 to-orange-600',
      difficulty: BOT_CONFIGS.enj1n?.difficulty || 'Expert',
      icon: '🔴',
      rarity: 'epic',
      price: BOT_CONFIGS.enj1n?.price ?? 0.1,
    },
    {
      mode: 'nifty',
      name: BOT_CONFIGS.nifty?.name || 'Nifty',
      description: BOT_CONFIGS.nifty?.description || 'Medium-Hard difficulty',
      color: 'from-orange-500 to-yellow-500',
      difficulty: BOT_CONFIGS.nifty?.difficulty || 'Medium-Hard',
      icon: '🟠',
      rarity: 'rare',
      price: BOT_CONFIGS.nifty?.price ?? 0.1,
    },
    {
      mode: 'pvp',
      name: 'PvP',
      description: 'Face off against another player in real-time!',
      color: 'from-pink-500 to-purple-600',
      icon: '⚔️',
      rarity: 'epic',
      price: 0.1,
    },
    {
      mode: 'multiplayer',
      name: 'Multiplayer',
      description: '3-10 players compete for the top spot!',
      color: 'from-green-500 to-teal-500',
      icon: '👥',
      rarity: 'epic',
      price: 0.1,
    },
    {
      mode: 'tournament',
      name: 'Tournament',
      description: 'Compete in brackets for ultimate glory!',
      color: 'from-indigo-500 to-purple-600',
      icon: '🏆',
      rarity: 'legendary',
      price: 0.1,
    },
  ]
}

export default function MainMenu({ onSelectMode, playerAddress, onClose }: MainMenuProps) {
  const { address, profile } = useArcade()
  const identity = {
    address: playerAddress || address || null,
    username: profile?.username,
    avatar: profile?.avatar,
  }
  
  // Wagmi hooks
  const { address: wagmiAddress, isConnected } = useAccount()
  const chainId = useChainId()
  const { sendTransactionAsync, isPending: isSendingTransaction } = useSendTransaction()
  const { switchChainAsync } = useSwitchChain()
  
  // UI state
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [hoveredGuide, setHoveredGuide] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showPvPMatchModal, setShowPvPMatchModal] = useState(false)
  
  // Play balance state (server-authoritative)
  const [freePlaysByMode, setFreePlaysByMode] = useState<Record<string, number>>({})
  const [purchasedPlaysRemaining, setPurchasedPlaysRemaining] = useState<number>(0)
  const [totalPlaysRemaining, setTotalPlaysRemaining] = useState<number>(0) // Menu-level: max(free) + purchased
  
  // Purchase flow state
  const [isBuyingPlays, setIsBuyingPlays] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const confirmingRef = useRef(false)
  const hasServerTotalRef = useRef(false) // Track if server provided total (prevents fallback override)
  
  // Get game modes with safety checks (called during render, not module load)
  const gameModes = getGameModes()
  
  // Fetch play balance for all free modes (server-authoritative)
  const fetchPlayBalance = useCallback(async () => {
    if (!identity.address) return
    
    const address = identity.address // Type narrowing
    
    // ✅ Reset server total flag - treat fetch as baseline (client computed)
    // This allows fallback to work again if future events omit totals
    hasServerTotalRef.current = false
    
    try {
      // Fetch balances for all free play modes
      const balancePromises = FREE_PLAY_MODES.map(async (mode) => {
        try {
          const response = await fetch(
            `/api/ape-in/plays/balance?address=${encodeURIComponent(address)}&mode=${mode}`
          )
          if (response.ok) {
            const data = await response.json()
            return { mode, data }
          }
          return null
        } catch (error) {
          console.error(`[MainMenu] Error fetching balance for mode ${mode}:`, error)
          return null
        }
      })
      
      const results = await Promise.all(balancePromises)
      
      // Extract free plays per mode and purchased plays (global, same from any response)
      const freePlaysMap: Record<string, number> = {}
      let purchasedMax = 0
      const purchasedSeen: number[] = []
      
      results.forEach((result) => {
        if (result?.data) {
          freePlaysMap[result.mode] = result.data.freePlaysRemaining || 0
          // Purchased plays are global - take max across all successful responses
          // (resilient to partial failures or caching mismatches)
          const p = Number(result.data.purchasedPlaysRemaining ?? 0)
          purchasedSeen.push(p)
          purchasedMax = Math.max(purchasedMax, p)
        }
      })
      
      // Warn if purchased balance differs across responses (smoke alarm for caching/issues)
      const uniquePurchased = Array.from(new Set(purchasedSeen))
      if (uniquePurchased.length > 1) {
        console.warn("[MainMenu] Purchased balance mismatch across balance responses:", uniquePurchased)
      }
      
      // Compute menu-level totals
      const purchasedFinal = purchasedMax
      const maxFreeRemaining = Math.max(...Object.values(freePlaysMap), 0)
      const menuTotal = maxFreeRemaining + purchasedFinal
      
      setFreePlaysByMode(freePlaysMap)
      setPurchasedPlaysRemaining(purchasedFinal)
      setTotalPlaysRemaining(menuTotal)
      
      console.log("[MainMenu] Play balance updated:", {
        freePlaysByMode: freePlaysMap,
        purchasedPlaysRemaining: purchasedFinal,
        totalPlaysRemaining: menuTotal,
      })
    } catch (error) {
      console.error("[MainMenu] Error fetching play balance:", error)
    }
  }, [identity.address])
  
  // Fetch balance on mount and when address changes
  useEffect(() => {
    fetchPlayBalance()
  }, [fetchPlayBalance])
  
  // Refetch balance when user returns to menu (tab focus, visibility change, mobile resume)
  useEffect(() => {
    const onFocus = () => {
      console.log("[MainMenu] Window/tab focused - refreshing play balance")
      fetchPlayBalance()
    }
    
    const onVisibility = () => {
      if (!document.hidden) {
        onFocus()
      }
    }
    
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [fetchPlayBalance])
  
  // Listen for instant sync from game creation (server-authoritative balances)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{
        address?: string
        mode?: string
        freePlaysRemaining?: number
        purchasedPlaysRemaining?: number
        totalPlaysRemaining?: number
      }>).detail
      
      if (!detail) return
      
      // Ignore if event is for a different wallet (prevents wrong user updates)
      if (detail.address && identity.address && detail.address.toLowerCase() !== identity.address.toLowerCase()) {
        console.log("[MainMenu] Ignoring play balance event for different wallet:", detail.address)
        return
      }
      
      console.log("[MainMenu] Instant sync from game creation:", detail)
      
      // Update purchased plays (global)
      if (typeof detail.purchasedPlaysRemaining === "number") {
        setPurchasedPlaysRemaining(detail.purchasedPlaysRemaining)
      }
      
      // Update free plays for specific mode (mode-specific)
      if (detail.mode && typeof detail.freePlaysRemaining === "number") {
        setFreePlaysByMode((prev) => ({
          ...prev,
          [detail.mode!]: detail.freePlaysRemaining!,
        }))
      }
      
      // Note: detail.totalPlaysRemaining is mode-specific (freePlaysRemaining[that mode] + purchased)
      // We don't use it for menu-level totalPlaysRemaining, which is max(free across modes) + purchased
      // The fallback effect will compute menu total correctly from freePlaysByMode + purchasedPlaysRemaining
    }
    
    window.addEventListener("apein:playBalances", handler)
    return () => {
      window.removeEventListener("apein:playBalances", handler)
      // Reset ref when listener is torn down (on address change)
      hasServerTotalRef.current = false
    }
  }, [identity.address])
  
  // Fallback: recompute total plays from free + purchased if server didn't provide it
  // (ensures menu total stays accurate even if server omits totalPlaysRemaining)
  // This is gated to NEVER override server-provided totals (server might calculate differently)
  useEffect(() => {
    // ✅ Never override server total (even if computed differs - server is authoritative)
    if (hasServerTotalRef.current) return
    
    const maxFree = Math.max(...Object.values(freePlaysByMode), 0)
    const computedTotal = maxFree + purchasedPlaysRemaining
    
    // Only update if computed differs from current (avoids pointless rerenders)
    setTotalPlaysRemaining((prev) => (prev === computedTotal ? prev : computedTotal))
  }, [freePlaysByMode, purchasedPlaysRemaining])
  
  // Recovery effect: auto-confirm pending purchases on mount
  useEffect(() => {
    const address = identity.address
    if (!address) return
    
    const maybeRecover = async () => {
      try {
        const raw = localStorage.getItem(PENDING_PLAY_PURCHASE_KEY)
        if (!raw) return
        
        const pending: PendingPlayPurchase = JSON.parse(raw)
        if (!pending?.address || !pending?.intentId || !pending?.txHash) {
          localStorage.removeItem(PENDING_PLAY_PURCHASE_KEY)
          return
        }
        
        // Only recover for the currently active player
        if (pending.address.toLowerCase() !== address.toLowerCase()) {
          return
        }
        
        // Prevent parallel confirmations
        if (confirmingRef.current) return
        confirmingRef.current = true
        
        console.log("[BuyPlays] Recovering pending purchase:", pending)
        
        // Try confirm
        const confirmResponse = await fetch("/api/ape-in/plays/confirm-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending),
        })
        
        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json().catch(() => ({}))
          // If expired, clear localStorage
          if (errorData?.error?.includes("expired")) {
            localStorage.removeItem(PENDING_PLAY_PURCHASE_KEY)
            setPurchaseError("Purchase intent expired. Please try again.")
          }
          // Otherwise leave it for retry
          return
        }
        
        const confirmData = await confirmResponse.json()
        if (confirmData?.success) {
          localStorage.removeItem(PENDING_PLAY_PURCHASE_KEY)
          setPurchaseError(null)
          // Refresh balance
          await fetchPlayBalance()
          console.log("[BuyPlays] Recovery successful, plays credited")
        }
      } catch (e) {
        console.error("[BuyPlays] Recovery failed:", e)
      } finally {
        confirmingRef.current = false
      }
    }
    
    maybeRecover()
  }, [identity.address, fetchPlayBalance])
  
  // Show toast message helper
  const showToastMessage = useCallback((msg: string) => {
    setPurchaseError(msg)
    setTimeout(() => setPurchaseError(null), 4000)
  }, [])
  
  // Buy plays function (mirrors Cryptoku's purchaseHint)
  const buyPlays = useCallback(async () => {
    if (!identity.address) return showToastMessage("Player address required")
    
    if (isBuyingPlays) return
    setIsBuyingPlays(true)
    setPurchaseError(null)
    
    try {
      // 1) Create intent
      const intentResponse = await fetch("/api/ape-in/plays/purchase-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          address: identity.address,
          gameMode: "ape-in",
        }),
      })
      
      if (!intentResponse.ok) {
        const data = await intentResponse.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to create purchase intent")
      }
      
      const intentData = await intentResponse.json()
      
      if (!intentData?.intentId || !intentData?.recipient || !intentData?.priceWei) {
        throw new Error("Invalid purchase intent response")
      }
      
      // Use chainId from intent (server-authoritative), fallback to 33139 if missing
      const targetChainId = intentData.chainId ?? FALLBACK_CHAIN_ID
      
      console.log("[BuyPlays] Intent created:", {
        intentId: intentData.intentId,
        recipient: intentData.recipient,
        priceWei: intentData.priceWei,
        chainId: targetChainId,
      })
      
      // 2) Ensure correct chain (use server-provided chainId)
      if (chainId !== targetChainId) {
        try {
          if (switchChainAsync) {
            await switchChainAsync({ chainId: targetChainId })
          } else {
            await ensureApeChain()
          }
          // Give providers a moment to settle
          await new Promise((r) => setTimeout(r, 750))
        } catch (switchError: any) {
          if (switchError?.code === 4001 || String(switchError?.message || "").toLowerCase().includes("reject")) {
            throw new Error("Chain switch was rejected. Please switch to ApeChain and try again.")
          }
          throw new Error(switchError?.message || "Failed to switch chain. Please switch manually and try again.")
        }
      }
      
      // 3) Require wagmi connection ONLY at transaction time
      if (!isConnected || !wagmiAddress) {
        throw new Error("Please reconnect your wallet to complete the purchase")
      }
      
      if (wagmiAddress.toLowerCase() !== identity.address.toLowerCase()) {
        throw new Error("Wallet address mismatch. Please reconnect your wallet.")
      }
      
      // 4) Send tx (await hash!) - use server-provided chainId
      if (!sendTransactionAsync) {
        throw new Error("sendTransactionAsync not available. Please update wagmi or use a compatible wallet.")
      }
      
      const txHash = await sendTransactionAsync({
        to: intentData.recipient as `0x${string}`,
        value: BigInt(intentData.priceWei),
        chainId: targetChainId,
      })
      
      console.log("[BuyPlays] Transaction sent, hash:", txHash)
      
      // 4) Persist pending immediately (this is your "never lose credit" guarantee)
      const pending: PendingPlayPurchase = {
        address: identity.address,
        intentId: intentData.intentId,
        txHash: txHash as `0x${string}`,
      }
      localStorage.setItem(PENDING_PLAY_PURCHASE_KEY, JSON.stringify(pending))
      
      // 5) Confirm (with lock to prevent parallel calls)
      if (confirmingRef.current) {
        throw new Error("Purchase confirmation already in progress")
      }
      confirmingRef.current = true
      
      try {
        const confirmResponse = await fetch("/api/ape-in/plays/confirm-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending),
        })
        
        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json().catch(() => ({}))
          // keep localStorage so recovery effect can finalize later
          throw new Error(errorData?.error || "Payment sent. Finalizing plays… If they don't appear, refresh the page.")
        }
        
        const confirmData = await confirmResponse.json()
        if (confirmData?.success) {
          localStorage.removeItem(PENDING_PLAY_PURCHASE_KEY)
          showToastMessage("Purchased 5 plays for 1.0 $APE")
          console.log("[BuyPlays] Purchase completed successfully")
          
          // Refresh balance
          await fetchPlayBalance()
          
          return
        }
        
        throw new Error(confirmData?.error || "Purchase verification failed")
      } finally {
        confirmingRef.current = false
      }
    } catch (err: any) {
      const msg = String(err?.message || "Failed to purchase plays")
      const lower = msg.toLowerCase()
      
      // Detect actual user rejection (wallet tx rejection, not chain switch)
      const isUserRejected =
        lower.includes("user rejected") ||
        lower.includes("user denied") ||
        lower.includes("denied transaction") ||
        lower.includes("rejected request") ||
        String(err?.code || "") === "4001" ||
        err?.name === "UserRejectedRequestError"
      
      // Handle errors with appropriate messages
      if (lower.includes("chain switch was rejected")) {
        showToastMessage("Chain switch was rejected. Please switch to ApeChain and try again.")
      } else if (isUserRejected) {
        showToastMessage("Transaction rejected by user")
      } else if (lower.includes("insufficient")) {
        showToastMessage("Insufficient funds. Please ensure you have enough APE.")
      } else {
        showToastMessage(msg)
      }
      
      console.error("[BuyPlays] Error:", err)
    } finally {
      setIsBuyingPlays(false)
    }
  }, [
    identity.address,
    isConnected,
    wagmiAddress,
    isBuyingPlays,
    chainId,
    switchChainAsync,
    sendTransactionAsync,
    showToastMessage,
    fetchPlayBalance,
  ])

  const handleModeSelect = async (mode: GameMode) => {
    setPaymentError(null)
    setPaymentLoading(mode)
    
    try {
      // PvP mode: Open match modal instead of starting game
      if (mode === 'pvp') {
        console.log('✅ Opening PvP match modal')
        setShowPvPMatchModal(true)
        setPaymentLoading(null)
        return
      }

      // URGENT: Sandy (tutorial) should always launch, no checks
      if (mode === 'sandy') {
        console.log('✅ Launching Sandy tutorial (always allowed, no checks)')
        onSelectMode(mode)
        return // Exit early - Sandy needs no other checks
      }

      // Check if identity is available for paid games
      if (!identity.address) {
        setPaymentError('Please wait for identity to play paid games')
        return
      }

      // Server-authoritative play availability check
      // For free modes (aida/lana/enj1n/nifty), check if free plays available for this specific mode
      const freePlayModes = ['aida', 'lana', 'enj1n', 'nifty']
      const hasFreeForMode = freePlayModes.includes(mode) && (freePlaysByMode[mode] ?? 0) > 0
      const purchasedAvailable = purchasedPlaysRemaining > 0
      
      // If no plays available (neither free for this mode nor purchased), block and show error
      if (!hasFreeForMode && !purchasedAvailable) {
        setPaymentError('No plays remaining. Buy 5 plays to continue.')
        return
      }

      // Plays available (either free for this mode or purchased) - proceed to game
      // NOTE: Play consumption happens server-side in GamePage.tsx after game is successfully created
      // to prevent loss if game creation fails
      console.log('✅ Plays available:', {
        mode,
        hasFreeForMode,
        freePlaysForMode: freePlaysByMode[mode] ?? 0,
        purchasedAvailable,
        purchasedPlaysRemaining,
      })

      // Navigate to game (via callback)
      onSelectMode(mode)
    } catch (error) {
      console.error('❌ Game mode selection failed:', error)
      setPaymentError('Failed to start game. Please try again.')
    } finally {
      setPaymentLoading(null)
    }
  }

  const guideSteps = [
    {
      id: 'draw',
      icon: '/features/games/ape-in/assets/images/cards/Historacle_1_Sats.jpg',
      title: 'Draw Cards',
      desc: 'Click the deck to draw cards and earn sats (points). Each card type has different values!',
      isImage: true,
    },
    {
      id: 'roll',
      icon: '🎲',
      title: 'Roll Dice',
      desc: 'After drawing, roll the dice. Roll a 1 and you lose all turn sats. Keep rolling to stack more!',
      isImage: false,
    },
    {
      id: 'stack',
      icon: '💰',
      title: 'Stack Sats',
      desc: 'Bank your turn sats anytime to add them to your score. First to reach the target wins!',
      isImage: false,
    },
    {
      id: 'bears',
      icon: '🐻',
      title: 'Watch for Bears',
      desc: 'Bearish cards threaten your score! Roll even to dodge penalties: reset, half, or -10 points.',
      isImage: false,
    },
    {
      id: 'apein',
      icon: '🚀',
      title: 'Ape In!',
      desc: 'Draw this special card to DOUBLE your next card\'s value. Risk it all for massive gains!',
      isImage: false,
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0">
        <ParticleBackground />
      </div>

      <div className="container mx-auto px-2 sm:px-4 pt-2 sm:pt-4 pb-2 sm:pb-4 relative z-20 max-w-6xl">
        {/* Top bar with My Stats, Leaderboard, and Close button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-3 sm:mb-4"
        >
          <button
            onClick={() => setShowStatsModal(true)}
            className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold text-xs md:text-sm hover:shadow-lg hover:shadow-purple-400/20 transition-all"
          >
            📊 My Stats
          </button>

          <button
            onClick={() => setShowLeaderboard(true)}
            className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 font-bold text-xs md:text-sm hover:shadow-lg hover:shadow-purple-400/20 transition-all"
          >
            🏆 Leaderboard
          </button>

          {/* Close button to return to Arcade Hub */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg border-2 border-red-500/50 bg-red-500/20 hover:bg-red-500/30 font-bold text-xs md:text-sm hover:shadow-lg hover:shadow-red-500/30 transition-all text-red-400 hover:text-red-300"
              title="Return to Arcade Hub"
            >
              <X className="w-4 h-4 inline mr-1" />
              Exit
            </button>
          )}
        </motion.div>

        {/* Compact Hero Section - Tagline directly under banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-center mb-3 sm:mb-6"
        >
          <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-2xl mx-auto px-2 leading-relaxed">
            Push your luck • Draw cards • Roll dice • Stack sats to victory!
          </p>
        </motion.div>

        {/* Horizontal Guide Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-4"
        >
          {/* How-to buttons */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-4xl mx-auto mb-3 sm:mb-6 px-2">
            {guideSteps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                onMouseEnter={() => setHoveredGuide(step.id)}
                onMouseLeave={() => setHoveredGuide(null)}
                className="relative group"
              >
                <div className={`px-2 sm:px-4 py-2 sm:py-3 rounded-xl bg-slate-800/80 backdrop-blur border transition-all cursor-help flex items-center gap-2 sm:gap-3 ${
                  hoveredGuide === step.id 
                    ? 'border-purple-500/70 bg-purple-900/20 shadow-lg shadow-purple-500/20' 
                    : 'border-slate-700/50 hover:border-purple-500/50'
                }`}>
                  {step.isImage ? (
                    <img src={step.icon} alt={step.title} className="w-5 h-5 sm:w-6 sm:h-6 rounded object-cover" />
                  ) : (
                    <span className="text-lg sm:text-xl">{step.icon}</span>
                  )}
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">{step.title}</span>
                  <motion.span
                    animate={{ rotate: hoveredGuide === step.id ? 180 : 0 }}
                    className="text-slate-500 text-xs hidden sm:inline"
                  >
                    ▼
                  </motion.span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Single static info box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: hoveredGuide ? 1 : 0,
              y: hoveredGuide ? 0 : 20
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-2xl mx-auto"
            style={{ pointerEvents: hoveredGuide ? 'auto' : 'none' }}
          >
            {hoveredGuide && (
              <div className="bg-gradient-to-br from-slate-800/95 to-slate-700/95 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-2xl shadow-purple-500/10">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    {(() => {
                      const step = guideSteps.find(s => s.id === hoveredGuide)
                      return step?.isImage ? (
                        <img src={step.icon} alt={step.title} className="w-12 h-12 rounded-xl object-cover border border-purple-500/30" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-2xl">{step?.icon}</span>
                        </div>
                      )
                    })()}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">
                    {guideSteps.find(s => s.id === hoveredGuide)?.title}
                  </h3>
                  
                  <p className="text-slate-300 leading-relaxed text-base">
                    {guideSteps.find(s => s.id === hoveredGuide)?.desc}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Payment Error Display */}
        {paymentError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-md mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm"
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-400">⚠️</span>
              <p className="text-red-300 text-sm font-medium">{paymentError}</p>
            </div>
          </motion.div>
        )}
        
        {/* Purchase Error Display */}
        {purchaseError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-md mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm"
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-400">⚠️</span>
              <p className="text-red-300 text-sm font-medium">{purchaseError}</p>
            </div>
          </motion.div>
        )}
        
        {/* Buy Plays CTA - Show when total plays === 0 */}
        {identity.address && totalPlaysRemaining === 0 && !isBuyingPlays && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mb-4"
          >
            <button
              onClick={buyPlays}
              disabled={isBuyingPlays || isSendingTransaction}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBuyingPlays || isSendingTransaction ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </span>
              ) : (
                "Buy 5 Plays (1 APE)"
              )}
            </button>
          </motion.div>
        )}
        
        {/* Buy Plays Loading Overlay */}
        {isBuyingPlays && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="bg-slate-800 rounded-xl p-6 max-w-sm mx-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                <p className="text-white font-semibold">Purchasing plays...</p>
                <p className="text-slate-400 text-sm text-center">
                  Please confirm the transaction in your wallet
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Compact Game Modes Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-2"
        >
          <h2 className="text-base sm:text-lg font-bold text-center mb-2 sm:mb-3 text-slate-200 px-2">Choose Your Opponent</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto px-2">
            {gameModes.map((gameMode, index) => (
              <CompactGameCard
                key={gameMode.mode}
                gameMode={gameMode}
                index={index}
                onSelect={handleModeSelect}
                isHovered={hoveredCard === gameMode.mode}
                onHoverChange={setHoveredCard}
                identity={identity}
                isLoading={paymentLoading === gameMode.mode}
                freePlaysByMode={freePlaysByMode}
                purchasedPlaysRemaining={purchasedPlaysRemaining}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <StatsModal onClose={() => setShowStatsModal(false)} playerAddress={playerAddress} />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} currentUserAddress={identity.address} />
      )}

      {/* PvP Match Modal */}
      {showPvPMatchModal && (
        <PvPMatchModal
          onClose={() => setShowPvPMatchModal(false)}
          playerAddress={identity.address}
        />
      )}
    </div>
  )
}

// Compact Game Card Component
function CompactGameCard({ 
  gameMode, 
  index, 
  onSelect,
  isHovered,
  onHoverChange,
  identity,
  isLoading = false,
  freePlaysByMode,
  purchasedPlaysRemaining
}: { 
  gameMode: GameModeCard
  index: number
  onSelect: (mode: GameMode) => void
  isHovered: boolean
  onHoverChange: (mode: string | null) => void
  identity: { address: string | null; username?: string; avatar?: string }
  isLoading?: boolean
  freePlaysByMode: Record<string, number>
  purchasedPlaysRemaining: number
}) {
  // Phase 1: Enable PvP button (remove from disabled list)
  // multiplayer and tournament remain disabled
  const disabled = ['multiplayer', 'tournament'].includes(gameMode.mode)
  const [imageFormat, setImageFormat] = useState<'gif' | 'png'>('gif')
  const isBotMode = ['sandy', 'aida', 'lana', 'enj1n', 'nifty'].includes(gameMode.mode)
  
  // Test if GIF loads, fallback to PNG
  useEffect(() => {
    if (!isBotMode) return
    
    const img = new Image()
    img.onload = () => setImageFormat('gif')
    img.onerror = () => {
      console.log(`GIF failed for ${gameMode.mode}, using PNG...`)
      setImageFormat('png')
    }
    img.src = `/features/games/ape-in/assets/images/bots/${gameMode.mode}.gif`
  }, [gameMode.mode, isBotMode])
  
  // Determine display price (server-authoritative)
  const getDisplayPrice = () => {
    if (gameMode.mode === 'sandy') return { price: 0, text: 'FREE', isFree: true }
    
    // Get free plays for this specific mode (server-fetched)
    const freePlaysForMode = freePlaysByMode[gameMode.mode] || 0
    
    if (freePlaysForMode > 0) {
      return { price: 0, text: `Free plays: ${freePlaysForMode}`, isFree: true, isDailyFree: true }
    }
    
    // No free plays for this mode - show cost (uses purchased plays if available)
    return { price: 0.1, text: purchasedPlaysRemaining > 0 ? 'Uses purchased play' : 'Cost: 0.1 APE', isFree: false }
  }
  
  const displayPrice = getDisplayPrice()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
      whileHover={disabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onMouseEnter={() => onHoverChange(gameMode.mode)}
      onMouseLeave={() => onHoverChange(null)}
      onClick={() => !disabled && !isLoading && onSelect(gameMode.mode)}
      className={`${disabled || isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} relative`}
    >
      <div className={`bg-gradient-to-br ${gameMode.color} p-[1px] rounded-xl h-full shadow-lg hover:shadow-xl transition-shadow`}>
        <div 
          className={`rounded-xl p-2 sm:p-3 h-full flex flex-col relative overflow-hidden ${
            ['sandy', 'aida', 'lana', 'enj1n', 'nifty'].includes(gameMode.mode)
              ? '' 
              : 'bg-slate-800/95'
          }`}
          style={
            isBotMode
              ? {
                  backgroundImage: `url(/features/games/ape-in/assets/images/bots/${gameMode.mode}.${imageFormat})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }
              : undefined
          }
        >
          {/* Dark overlay for text readability */}
          {isBotMode && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 rounded-xl pointer-events-none z-0" />
          )}
          
          {/* Phase 1: Only show "Coming Soon" for multiplayer/tournament, not PvP */}
          {disabled && gameMode.mode !== 'pvp' && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
              <span className="text-xs font-bold text-slate-400 px-2 py-1 bg-slate-800/80 rounded">Coming Soon</span>
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span className="text-xs text-white font-semibold">Processing Payment...</span>
              </div>
            </div>
          )}
          
          
          <div className="flex items-center justify-end mb-1 sm:mb-2 relative z-10">
            {gameMode.difficulty && (
              <span className="text-[9px] sm:text-[10px] font-semibold text-white uppercase px-1 sm:px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/20">
                {gameMode.difficulty}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold mb-1 text-white relative z-10 drop-shadow-lg">{gameMode.name}</h3>
          <p className="text-white/90 text-[10px] sm:text-[11px] mb-2 sm:mb-3 line-clamp-2 leading-tight relative z-10 drop-shadow-md">{gameMode.description}</p>
          
          {/* zkVerify Verification Indicator */}
          <div className="flex items-center justify-center gap-1 mb-2 relative z-10">
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[9px] text-emerald-300 font-medium drop-shadow-md">zkVerify Protected</span>
          </div>
          
          {/* Price Display */}
          <div className="mb-2 sm:mb-3 relative z-10">
            {displayPrice.isFree ? (
              <div className={`flex items-center justify-center px-2 py-1 rounded-lg border backdrop-blur-sm ${
                displayPrice.isDailyFree 
                  ? 'bg-blue-500/30 border-blue-400/50' 
                  : 'bg-green-500/30 border-green-400/50'
              }`}>
                <span className={`text-[9px] sm:text-[10px] font-bold ${
                  displayPrice.isDailyFree ? 'text-blue-200' : 'text-green-200'
                }`}>
                  {displayPrice.text}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center px-2 py-1 bg-orange-500/30 rounded-lg border border-orange-400/50 backdrop-blur-sm">
                <span className="text-[9px] sm:text-[10px] font-bold text-orange-200">
                  {displayPrice.text}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-auto relative z-10">
            {gameMode.mode === 'pvp' && (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none">
                <div className="px-2 py-1 rounded-md bg-amber-400 text-slate-900 text-[10px] font-bold shadow-lg border border-amber-200 whitespace-nowrap">
                  Under construction
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-400" />
              </div>
            )}
            <button
              className={`w-full px-2 py-1 sm:py-1.5 rounded-lg font-semibold text-[10px] sm:text-xs bg-gradient-to-r ${gameMode.color} ${disabled ? 'opacity-50' : 'hover:opacity-90'} shadow-lg`}
              disabled={disabled}
            >
              {disabled ? 'Soon' : 'Play →'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
