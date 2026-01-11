import { NextRequest, NextResponse } from "next/server"
import { ApeInFreePlaysService } from "@/lib/supabase/services/ape-in-free-plays.service"
import type { GameMode } from "@/features/games/ape-in/types/game"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, gameMode } = body

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    if (!gameMode) {
      return NextResponse.json({ error: "Game mode required" }, { status: 400 })
    }

    const freePlaysService = new ApeInFreePlaysService()
    const result = await freePlaysService.useFreePlay(address, gameMode)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to use free play",
          freePlaysRemaining: result.freePlaysRemaining 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      freePlaysRemaining: result.freePlaysRemaining,
    })
  } catch (error) {
    console.error("Error using free play:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { 
        error: `Failed to use free play: ${errorMessage}` 
      },
      { status: 500 }
    )
  }
}

