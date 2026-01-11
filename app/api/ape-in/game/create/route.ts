import { NextRequest, NextResponse } from "next/server"
import { GameService } from "@/lib/ape-in/game-service"
import { GameMode } from "@/features/games/ape-in/types/game"

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

    // Create game using GameService (uses weighted card drawing, no deck needed)
    const gameState = await GameService.createGame(
      mode as GameMode,
      playerName,
      walletAddress,
      isDailyFree || false
    )

    console.log('✅ Game created and stored:', gameState.gameId, 'Mode:', mode)
    
    // Verify game was stored by trying to retrieve it
    try {
      const { getGame } = await import('@/lib/ape-in/game-store')
      const stored = await getGame(gameState.gameId)
      if (stored) {
        console.log('✅ Verified: Game stored successfully and can be retrieved')
      } else {
        console.error('❌ WARNING: Game created but could not be retrieved immediately')
      }
    } catch (error) {
      console.error('❌ Error verifying game storage:', error)
    }

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('❌ Error creating game:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

