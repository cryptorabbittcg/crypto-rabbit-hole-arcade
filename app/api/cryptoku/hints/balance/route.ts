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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

