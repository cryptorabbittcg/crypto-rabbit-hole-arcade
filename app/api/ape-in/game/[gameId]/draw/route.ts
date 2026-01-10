import { NextRequest, NextResponse } from "next/server"
import { getGame, updateGame } from "@/lib/ape-in/game-store"
import { drawCard } from "@/lib/ape-in/game-logic"

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
    if (gameState.gameStatus !== 'playing' && gameState.gameStatus !== 'waiting') {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 400 }
      )
    }

    // Start game if in waiting state
    if (gameState.gameStatus === 'waiting') {
      gameState.gameStatus = 'playing'
    }

    // Draw card
    const { card, remainingDeck } = drawCard(deck)

    if (!card) {
      return NextResponse.json(
        { error: "Deck is empty" },
        { status: 400 }
      )
    }

    // Update game state
    gameState.currentCard = card

    // Update stored game
    updateGame(gameId, gameState, remainingDeck)

    console.log('✅ Card drawn:', card.name)

    return NextResponse.json(card)
  } catch (error) {
    console.error('❌ Error drawing card:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

