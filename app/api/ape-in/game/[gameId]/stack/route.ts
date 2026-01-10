import { NextRequest, NextResponse } from "next/server"
import { GameService } from "@/lib/ape-in/game-service"

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

    // Get game to check state
    const gameState = GameService.getGameData(gameId)

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

    // Stack: Add turn score to player score, end turn
    const updatedState = GameService.stackSats(gameId, gameState.playerId, false)

    // If game is still playing and not PvP/multiplayer/tournament, execute bot turn
    let botActions: any[] | undefined = undefined
    if (updatedState.gameStatus === 'playing' && updatedState.mode !== 'pvp' && updatedState.mode !== 'multiplayer' && updatedState.mode !== 'tournament') {
      botActions = GameService.executeBotTurn(gameId)
    }

    // Get final game state
    const finalState = GameService.getGameData(gameId)

    const response: any = {
      ...finalState,
    }

    if (botActions) {
      response.botActions = botActions
    }

    console.log('✅ Stacked:', { playerScore: finalState.playerScore, isPlayerTurn: finalState.isPlayerTurn, botActions: botActions?.length || 0 })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Error stacking:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

