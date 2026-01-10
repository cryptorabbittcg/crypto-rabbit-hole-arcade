import { NextRequest, NextResponse } from "next/server"
import { getGame, updateGame } from "@/lib/ape-in/game-store"
import { GameState } from "@/features/games/ape-in/types/game"

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      )
    }

    const stored = getGame(gameId)

    if (!stored) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    const { gameState } = stored

    // Check if game is active
    if (gameState.gameStatus !== 'playing' && gameState.gameStatus !== 'waiting') {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 400 }
      )
    }

    // Forfeit: opponent wins
    gameState.gameStatus = 'finished'
    const gameStateWithNames = gameState as GameState & { opponentName?: string }
    gameState.winner = gameStateWithNames.opponentName || 'Opponent'
    gameState.playerTurnScore = 0 // Reset turn score

    // Update stored game
    updateGame(gameId, gameState, stored.deck)

    console.log('✅ Game forfeited:', gameId)

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('❌ Error forfeiting game:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

