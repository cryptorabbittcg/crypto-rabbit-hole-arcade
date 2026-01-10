import { NextRequest, NextResponse } from "next/server"
import { createApeInGame, buildDeck } from "@/lib/ape-in/game-logic"
import { storeGame } from "@/lib/ape-in/game-store"
import { GameMode } from "@/features/games/ape-in/types/game"
import { isRankedMode } from "@/features/games/ape-in/utils/constants"

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
    const validModes: GameMode[] = ['sandy', 'aida', 'lana', 'enj1n', 'nifty', 'pvp', 'multiplayer', 'tournament']
    if (!validModes.includes(mode as GameMode)) {
      return NextResponse.json(
        { error: `Invalid mode: ${mode}` },
        { status: 400 }
      )
    }

    // Sandy mode can be created without wallet address
    const isSandy = mode === 'sandy'
    if (!isSandy && !walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required for ranked modes" },
        { status: 400 }
      )
    }

    // TODO: Check payment/play token for ranked modes (if needed)
    // For now, we'll allow game creation for all modes

    console.log('🎮 Creating game:', { mode, playerName, walletAddress: walletAddress?.slice(0, 10) + '...' })

    // Create game state
    const gameState = createApeInGame({
      mode: mode as GameMode,
      playerName,
      walletAddress,
      isDailyFree: isDailyFree || false,
    })

    // Build card deck
    const deck = buildDeck(mode as GameMode)

    // Store game
    storeGame(gameState.gameId, gameState, deck)

    console.log('✅ Game created:', gameState.gameId)

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('❌ Error creating game:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

