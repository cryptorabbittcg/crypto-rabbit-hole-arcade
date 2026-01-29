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

    // If player busted, execute bot turn and return bot actions
    let botActions: any[] | undefined = undefined
    if (!rollResult.success && gameState.mode !== 'pvp' && gameState.mode !== 'multiplayer' && gameState.mode !== 'tournament') {
      // Player busted - bot's turn
      // Get updated state once (rollDiceAction already updated it)
      const updatedState = await GameService.getGameData(gameId)
      if (updatedState.gameStatus === 'playing') {
        botActions = await GameService.executeBotTurn(gameId)
      }
    }

    // Build response - only fetch final state if we need it (bot turn executed)
    // Otherwise, rollDiceAction already updated the state, so we can use rollResult data
    const response: any = {
      value: rollResult.value,
      success: rollResult.success,
      message: rollResult.message,
      satsGained: rollResult.satsGained,
      turnScore: rollResult.turnScore,
    }

    if (botActions) {
      response.botActions = botActions
      // Only fetch final state if bot turn was executed (to get updated scores)
      const finalState = await GameService.getGameData(gameId)
      response.turnScore = finalState.playerTurnScore // Update turn score in case bot turn changed it
    }

    console.log('✅ Dice rolled:', rollResult.value, rollResult.success ? 'Success' : 'Failed', botActions ? `(Bot turn: ${botActions.length} actions)` : '')

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Error rolling dice:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

