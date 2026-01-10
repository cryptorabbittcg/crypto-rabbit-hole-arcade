import { NextRequest, NextResponse } from "next/server"
import { getGame, updateGame } from "@/lib/ape-in/game-store"
import { checkGameWon, botShouldContinue, drawCard, rollDice, calculateDiceSuccess, applyCardPenalty } from "@/lib/ape-in/game-logic"
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

    const { gameState, deck } = stored

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

    // Stack: Add turn score to player score, end turn
    gameState.playerScore += gameState.playerTurnScore
    gameState.playerTurnScore = 0
    gameState.isPlayerTurn = false
    gameState.currentCard = null
    gameState.roundCount += 1

    // Check for game win
    let { isWon, winner } = checkGameWon(
      gameState.playerScore,
      gameState.opponentScore,
      gameState.winningScore,
      gameState.roundCount,
      gameState.maxRounds
    )

    // Bot turn (simplified - one action per stack)
    if (!isWon && !gameState.isPlayerTurn) {
      // Bot decides whether to continue
      const shouldContinue = botShouldContinue(
        gameState.mode,
        gameState.opponentScore,
        gameState.opponentTurnScore,
        gameState.playerScore,
        gameState.winningScore,
        gameState.roundCount
      )

      if (shouldContinue) {
        // Bot draws card and rolls
        const { card, remainingDeck: newDeck } = drawCard(deck)
        if (card) {
          gameState.currentCard = card
          const roll = rollDice()
          const { success } = calculateDiceSuccess(card, roll)

          if (success) {
            gameState.opponentTurnScore += card.value
          } else {
            gameState.opponentTurnScore = 0
            gameState.isPlayerTurn = true
          }

          // Update deck
          deck.length = 0
          deck.push(...newDeck)
        }
      } else {
        // Bot stacks (ends turn)
        gameState.opponentScore += gameState.opponentTurnScore
        gameState.opponentTurnScore = 0
        gameState.isPlayerTurn = true
      }

      // Check win again after bot turn
      const winCheck = checkGameWon(
        gameState.playerScore,
        gameState.opponentScore,
        gameState.winningScore,
        gameState.roundCount,
        gameState.maxRounds
      )
      isWon = winCheck.isWon
      winner = winCheck.winner
    }

    if (isWon) {
      gameState.gameStatus = 'finished'
      const gameStateWithNames = gameState as GameState & { playerName?: string; opponentName?: string }
      gameState.winner = winner === 'player' ? gameStateWithNames.playerName || 'Player' : gameStateWithNames.opponentName || 'Opponent'
    }

    // Update stored game
    updateGame(gameId, gameState, deck)

    console.log('✅ Stacked:', { playerScore: gameState.playerScore, isPlayerTurn: gameState.isPlayerTurn })

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('❌ Error stacking:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

