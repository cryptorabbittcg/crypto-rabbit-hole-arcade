import { NextRequest, NextResponse } from "next/server"
import { getCryptokuHints } from "@/lib/cryptoku-store"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    const playerHints = await getCryptokuHints(address)

    return NextResponse.json({
      hintBalance: playerHints.hintBalance,
      gamesUntilNextFreeHint: playerHints.gamesUntilNextFreeHint,
    })
  } catch (error) {
    console.error("Error fetching hints balance:", error)
    // Provide more specific error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isKVError = errorMessage.includes("KV") || errorMessage.includes("not configured")
    
    // Return default hints if KV is not configured (allows game to work)
    if (isKVError) {
      console.warn("KV not configured - returning default hints balance")
      return NextResponse.json({
        hintBalance: 3,
        gamesUntilNextFreeHint: 10,
      })
    }
    
    return NextResponse.json(
      { 
        error: `Failed to fetch hints balance: ${errorMessage}` 
      },
      { status: 500 }
    )
  }
}

