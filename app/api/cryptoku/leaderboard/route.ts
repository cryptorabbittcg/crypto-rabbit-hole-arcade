import { NextRequest, NextResponse } from "next/server"
import { CryptokuLeaderboardService } from "@/lib/supabase/services/cryptoku-leaderboard.service"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get("mode") || "ALL"
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    // Validate mode
    const validatedMode = mode !== "ALL" && ["DEGEN", "APE"].includes(mode) ? (mode as "DEGEN" | "APE") : "ALL"

    const leaderboardService = new CryptokuLeaderboardService()
    const { entries, total } = await leaderboardService.getLeaderboard(validatedMode, limit)

    return NextResponse.json({
      entries: entries.map((entry, index) => ({
        rank: index + 1, // Rank based on position in sorted results
        runId: entry.runId,
        address: entry.address,
        username: entry.username ?? null,
        avatar_url: entry.avatar_url ?? null,
        mode: entry.mode,
        score: entry.score,
        timeSeconds: entry.timeSeconds,
        hintsUsed: entry.hintsUsed,
        errors: entry.errors,
        timestamp: entry.timestamp,
      })),
      total,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

