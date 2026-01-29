import { NextRequest, NextResponse } from "next/server"
import { GameService } from "@/lib/ape-in/game-service"
import { GameMode } from "@/features/games/ape-in/types/game"
import { ApeInPlaysConsumptionService } from "@/lib/supabase/services/ape-in-plays-consumption.service"
import { getGame } from "@/lib/ape-in/game-store"

const VALID_MODES = [
  "sandy",
  "aida",
  "lana",
  "enj1n",
  "nifty",
  "pvp",
  "multiplayer",
  // "tournament", // Removed - not yet supported
] as const satisfies readonly GameMode[]

// Never trust client hints for ranked modes.
function sanitizeIsDailyFree(mode: GameMode, isDailyFree: unknown): boolean {
  // Only Sandy is allowed to be "free" via this flag.
  // Ranked modes must be server-authoritative via consumePlayForMode().
  if (mode === "sandy") return Boolean(isDailyFree)
  return false
}

function shortWallet(wallet?: string): string | undefined {
  if (!wallet) return undefined
  if (wallet.length <= 12) return wallet
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, playerName, walletAddress, isDailyFree } = body

    // Validation
    if (!mode || !playerName) {
      return NextResponse.json(
        { error: "Mode and player name are required" },
        { status: 400 }
      )
    }

    // Validate mode
    if (!VALID_MODES.includes(mode as (typeof VALID_MODES)[number])) {
      return NextResponse.json(
        { error: `Invalid mode: ${mode}` },
        { status: 400 }
      )
    }

    const gameMode = mode as (typeof VALID_MODES)[number]
    const isSandy = gameMode === "sandy"

    // Sandy mode can be created without wallet address
    if (!isSandy && !walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required for ranked modes" },
        { status: 400 }
      )
    }

    // NOTE: Never trust client "isDailyFree" for ranked modes
    const safeIsDailyFree = sanitizeIsDailyFree(gameMode, isDailyFree)

    // Sandy is always free - skip play consumption
    if (isSandy) {
      console.log("🎮 Creating Sandy tutorial (always free):", {
        mode: gameMode,
        playerName,
      })

      const gameState = await GameService.createGame(
        gameMode,
        playerName,
        walletAddress,
        safeIsDailyFree
      )
      
      // Verify game was stored
      try {
        const stored = await getGame(gameState.gameId)
        if (stored) {
          console.log('✅ Verified: Game stored successfully and can be retrieved')
        } else {
          console.error('❌ WARNING: Game created but could not be retrieved immediately')
        }
      } catch (error) {
        console.error('❌ Error verifying game storage:', error)
      }
      
      return NextResponse.json({
        ...gameState,
        freePlaysRemaining: 0, // Not applicable for Sandy
        purchasedPlaysRemaining: 0, // Not applicable for Sandy
        totalPlaysRemaining: 0, // Not applicable for Sandy
        consumedType: null, // Sandy is free
      })
    }

    // For ranked modes: consume play server-side (atomic)
    const consumptionService = new ApeInPlaysConsumptionService()

    const playConsumed = await consumptionService.consumePlayForMode(
      walletAddress,
      gameMode
    )

    // Defensive check: invariant violation detection
    if (playConsumed.success && playConsumed.consumedType === null) {
      console.error("⚠️ Invariant violation: success without consumedType", {
        walletAddress: shortWallet(walletAddress),
        gameMode,
      })
      // Continue anyway - service contract should prevent this
    }
    
    if (!playConsumed.success) {
      return NextResponse.json(
        {
          error: playConsumed.error || "No plays available",
          freePlaysRemaining: playConsumed.freePlaysRemaining || 0,
          purchasedPlaysRemaining: playConsumed.purchasedPlaysRemaining || 0,
          totalPlaysRemaining: playConsumed.totalPlaysRemaining || 0,
        },
        { status: 400 }
      )
    }

    console.log("🎮 Creating game (play consumed):", {
      mode: gameMode,
      playerName,
      walletAddress: shortWallet(walletAddress),
      consumedType: playConsumed.consumedType,
      remainingPlays: playConsumed.totalPlaysRemaining,
    })

    // Consume-first, no-refund (MVP):
    // If GameService.createGame fails after consumption, play remains consumed.
    const gameState = await GameService.createGame(
      gameMode,
      playerName,
      walletAddress,
      safeIsDailyFree // always false for ranked modes
    )

    console.log("✅ Game created and stored:", gameState.gameId, "Mode:", gameMode)
    
    // Verify game was stored by trying to retrieve it
    try {
      const stored = await getGame(gameState.gameId)
      if (stored) {
        console.log('✅ Verified: Game stored successfully and can be retrieved')
      } else {
        console.error('❌ WARNING: Game created but could not be retrieved immediately')
      }
    } catch (error) {
      console.error('❌ Error verifying game storage:', error)
    }

    // Return game state + remaining balances (for UI sync)
    return NextResponse.json({
      ...gameState,
      freePlaysRemaining: playConsumed.freePlaysRemaining,
      purchasedPlaysRemaining: playConsumed.purchasedPlaysRemaining,
      totalPlaysRemaining: playConsumed.totalPlaysRemaining, // Computed on server
      consumedType: playConsumed.consumedType, // 'free' | 'purchased'
    })
  } catch (error) {
    console.error('❌ Error creating game:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
