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
    // getGameData throws if game not found, so we catch it
    let gameState: any
    try {
      gameState = await GameService.getGameData(gameId)
    } catch (error: any) {
      console.error('❌ Game not found:', gameId, error.message)
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    if (!gameState) {
      console.error('❌ Game state is null for:', gameId)
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }
    
    console.log('✅ Game found:', gameId, 'Status:', gameState.gameStatus, 'IsPlayerTurn:', gameState.isPlayerTurn)

    // Check if it's player's turn
    if (!gameState.isPlayerTurn) {
      return NextResponse.json(
        { error: "Not player's turn" },
        { status: 400 }
      )
    }

    // Check if game is active
    if (gameState.gameStatus !== 'playing' && gameState.gameStatus !== 'waiting') {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 400 }
      )
    }

    // Start game if in waiting state (first draw starts the game and round 1)
    if (gameState.gameStatus === 'waiting') {
      gameState.gameStatus = 'playing'
      // Ensure round 1 is set when game starts (first draw initiates round 1)
      if (gameState.roundCount === 0) {
        gameState.roundCount = 1
      }
      // Update game state to reflect game start
      const { updateGame } = await import('@/lib/ape-in/game-store')
      await updateGame(gameId, gameState)
    }

    // Draw card using weighted drawing (no physical deck)
    if (!gameState.playerId) {
      return NextResponse.json(
        { error: "Player ID not found" },
        { status: 400 }
      )
    }

    const card = await GameService.drawCard(gameId, gameState.playerId)

    // Return updated game state along with card for frontend sync
    const updatedState = await GameService.getGameData(gameId)
    
    console.log('✅ Card drawn:', card.name, 'Round:', updatedState.roundCount, 'Game Status:', updatedState.gameStatus)

    // Return card with gameState for frontend to sync
    // Format: { card: Card, gameState: GameState }
    return NextResponse.json({
      card,
      gameState: updatedState
    })
  } catch (error: any) {
    console.error('❌ Error drawing card:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

