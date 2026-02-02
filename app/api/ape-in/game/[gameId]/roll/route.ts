import { NextRequest, NextResponse } from "next/server"
import { GameService } from "@/lib/ape-in/game-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      )
    }

    // Get game to check state
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
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    // Check if it's player's turn
    if (!gameState.isPlayerTurn) {
      return NextResponse.json(
        { error: "Not player's turn" },
        { status: 400 }
      )
    }

    // Check if there's a card drawn
    if (!gameState.currentCard) {
      return NextResponse.json(
        { error: "No card drawn. Draw a card first." },
        { status: 400 }
      )
    }

    // Check if game is active
    if (gameState.gameStatus !== 'playing') {
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

    // Roll dice using GameService (handles all game logic)
    const rollResult = await GameService.rollDiceAction(gameId, gameState.playerId, "balanced")

    // NOTE:
    // Historically we executed the bot turn synchronously on a bust and returned botActions.
    // That makes "roll 1" feel laggy because it blocks on bot AI/turn execution.
    // We now return quickly and let the client call /bot-turn to fetch/replay bot actions.
    const response: any = {
      value: rollResult.value,
      success: rollResult.success,
      message: rollResult.message,
      satsGained: rollResult.satsGained,
      turnScore: rollResult.turnScore,
    }

    console.log('✅ Dice rolled:', rollResult.value, rollResult.success ? 'Success' : 'Failed')

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Error rolling dice:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

