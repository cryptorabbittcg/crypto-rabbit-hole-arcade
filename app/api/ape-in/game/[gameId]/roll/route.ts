import { NextRequest, NextResponse } from "next/server"
import { getGame, updateGame } from "@/lib/ape-in/game-store"
import { rollDice, calculateDiceSuccess, applyCardPenalty, checkGameWon } from "@/lib/ape-in/game-logic"
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

    // Roll dice
    const roll = rollDice()
    gameState.lastRoll = roll

    // Calculate success
    const { success, message } = calculateDiceSuccess(gameState.currentCard, roll)

    if (success) {
      // Add card value to turn score
      let turnScore = gameState.playerTurnScore + gameState.currentCard.value

      // Apply penalty if Bearish card
      if (gameState.currentCard.type === 'Bearish' && gameState.currentCard.penalty) {
        turnScore = applyCardPenalty(gameState.playerTurnScore, gameState.currentCard.penalty)
      }

      gameState.playerTurnScore = Math.max(0, turnScore)

      // Check for Ape In activation (Special card)
      if (gameState.currentCard.type === 'Special' && gameState.currentCard.name === 'Ape_In') {
        gameState.apeInActive = true
      }
    } else {
      // Failed roll - turn score resets, turn ends
      gameState.playerTurnScore = 0
      gameState.isPlayerTurn = false
      gameState.currentCard = null
      gameState.roundCount += 1
    }

    // Check for game win
    const { isWon, winner } = checkGameWon(
      gameState.playerScore + gameState.playerTurnScore,
      gameState.opponentScore,
      gameState.winningScore,
      gameState.roundCount,
      gameState.maxRounds
    )

    if (isWon) {
      gameState.gameStatus = 'finished'
      const gameStateWithNames = gameState as GameState & { playerName?: string; opponentName?: string }
      gameState.winner = winner === 'player' ? gameStateWithNames.playerName || 'Player' : gameStateWithNames.opponentName || 'Opponent'
    }

    // Clear current card after roll
    const currentCard = gameState.currentCard
    if (!success || isWon) {
      gameState.currentCard = null
    }

    // Update stored game
    updateGame(gameId, gameState, stored.deck)

    console.log('✅ Dice rolled:', roll, success ? 'Success' : 'Failed')

    return NextResponse.json({
      value: roll,
      success,
      message,
    })
  } catch (error) {
    console.error('❌ Error rolling dice:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

