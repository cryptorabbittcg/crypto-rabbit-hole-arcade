import { NextRequest, NextResponse } from "next/server"
import { getGame } from "@/lib/ape-in/game-store"

export async function GET(
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

    const game = getGame(gameId)

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(game.gameState)
  } catch (error) {
    console.error('❌ Error getting game:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

