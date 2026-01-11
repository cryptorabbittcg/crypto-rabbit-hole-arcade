import { NextRequest, NextResponse } from "next/server"
import { CryptokuHintsService } from "@/lib/supabase/services/cryptoku-hints.service"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    const hintsService = new CryptokuHintsService()
    const playerHints = await hintsService.getHintsByWallet(address)

    return NextResponse.json({
      hintBalance: playerHints.hintBalance,
      gamesUntilNextFreeHint: playerHints.gamesUntilNextFreeHint,
    })
  } catch (error) {
    console.error("Error fetching hints balance:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { 
        error: `Failed to fetch hints balance: ${errorMessage}` 
      },
      { status: 500 }
    )
  }
}

