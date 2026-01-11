import { NextRequest, NextResponse } from "next/server"
import { GameService } from "@/lib/ape-in/game-service"

export async function GET(
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

    return NextResponse.json(gameState)
  } catch (error: any) {
    console.error('❌ Error getting game:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

