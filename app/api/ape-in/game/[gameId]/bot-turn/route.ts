import { NextResponse } from "next/server"
import { GameService } from "@/lib/ape-in/game-service"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params

    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 })
    }

    const gameState: any = await GameService.getGameData(gameId)
    if (!gameState) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    // Only valid for bot games (not PvP/multiplayer/tournament)
    if (gameState.mode === "pvp" || gameState.mode === "multiplayer" || gameState.mode === "tournament") {
      return NextResponse.json({ error: "Bot turn not supported for this mode" }, { status: 400 })
    }

    if (gameState.gameStatus !== "playing") {
      return NextResponse.json({ error: "Game is not active" }, { status: 400 })
    }

    // NOTE:
    // The classic Ape In single-player flow is client-driven: the UI blocks input during bot replay,
    // and the server does not strictly manage `isPlayerTurn`. So we intentionally do NOT gate
    // bot turns on `isPlayerTurn` here; we just execute and return bot actions.

    const botActions = await GameService.executeBotTurn(gameId)
    const finalState = await GameService.getGameData(gameId)

    return NextResponse.json({ botActions, finalState })
  } catch (error: any) {
    console.error("❌ Error executing bot turn:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

