import { NextRequest, NextResponse } from "next/server"
import { ApeInFreePlaysService } from "@/lib/supabase/services/ape-in-free-plays.service"
import type { GameMode } from "@/features/games/ape-in/types/game"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")
    const gameMode = searchParams.get("gameMode") as GameMode | null

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    if (!gameMode) {
      return NextResponse.json({ error: "Game mode required" }, { status: 400 })
    }

    const freePlaysService = new ApeInFreePlaysService()
    const remaining = await freePlaysService.getFreePlaysRemainingByWallet(address, gameMode)

    return NextResponse.json({
      remaining,
      maxPerDay: 5,
    })
  } catch (error) {
    console.error("Error fetching free plays balance:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { 
        error: `Failed to fetch free plays balance: ${errorMessage}` 
      },
      { status: 500 }
    )
  }
}

