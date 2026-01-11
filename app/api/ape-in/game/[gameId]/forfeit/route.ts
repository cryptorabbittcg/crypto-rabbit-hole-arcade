import { NextRequest, NextResponse } from "next/server"
import { GameService } from "@/lib/ape-in/game-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> | { gameId: string } }
) {
  try {
    // Await params if it's a Promise (Next.js 15+), otherwise use directly
    const resolvedParams = params instanceof Promise ? await params : params
    const { gameId } = resolvedParams

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      )
    }

    // Get game to check state
    const gameState = GameService.getGameData(gameId)

    if (!gameState) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    // Check if game is active
    if (gameState.gameStatus !== 'playing' && gameState.gameStatus !== 'waiting') {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 400 }
      )
    }

    if (!gameState.playerId) {
      return NextResponse.json(
        { error: "Player ID not found" },
        { status: 400 }
      )
    }

    // Forfeit: opponent wins
    const forfeitedState = GameService.forfeitGame(gameId, gameState.playerId)

    console.log('✅ Game forfeited:', gameId)

    return NextResponse.json(forfeitedState)
  } catch (error: any) {
    console.error('❌ Error forfeiting game:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

