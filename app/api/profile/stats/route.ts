import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CURRENT_SEASON } from "@/lib/season"

/**
 * Server-side API route to compute profile stats from game_sessions
 * Uses admin client to bypass RLS, matching the pattern used in submit-result
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
    }

    // Normalize address: trim whitespace, then lowercase
    const normalizedAddress = walletAddress.trim().toLowerCase()

    // Step 0: Create admin client first (use for BOTH profile lookup and session queries)
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error("[ProfileStats] Failed to create admin client")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Step 1: Get profile by wallet using admin client (bypasses RLS)
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("wallet_address", normalizedAddress)
      .maybeSingle()

    if (profileError) {
      console.error("[ProfileStats] Error fetching profile:", {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
      })
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalPlaytime: 0,
      })
    }

    // Step 2: Query game_sessions using admin client (bypasses RLS)

    // Query game_sessions for this user_id (current season only)
    const { data: sessions, error } = await adminClient
      .from("game_sessions")
      .select("result, duration, started_at, ended_at")
      .eq("user_id", profile.id)
      .eq("season", CURRENT_SEASON)
      .order("ended_at", { ascending: false })

    if (error) {
      console.error("[ProfileStats] Error querying game_sessions:", {
        error,
        code: error.code,
        message: error.message,
        userId: profile.id,
      })
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    const sessionsList = sessions || []
    console.log("[ProfileStats] Computed stats", {
      wallet: normalizedAddress.substring(0, 10) + "...",
      userId: profile.id,
      sessionsCount: sessionsList.length,
      sampleResult: sessionsList[0]?.result || null,
    })

    // Compute stats
    const gamesPlayed = sessionsList.length
    let wins = 0
    let losses = 0
    let totalPlaytime = 0

    // Sessions are ordered by ended_at descending (most recent first)
    // Compute current win streak: consecutive wins from the most recent game
    let currentWinStreak = 0
    for (const session of sessionsList) {
      const result = (session.result ?? "").toLowerCase()
      if (result === "won" || result === "win") {
        currentWinStreak++
      } else {
        // Stop counting at first non-win
        break
      }
    }

    // Compute best win streak: maximum consecutive wins anywhere in history
    let bestWinStreak = 0
    let rollingStreak = 0
    for (const session of sessionsList) {
      const result = (session.result ?? "").toLowerCase()
      const duration = session.duration ?? 0
      totalPlaytime += duration

      if (result === "won" || result === "win") {
        wins++
        rollingStreak++
        bestWinStreak = Math.max(bestWinStreak, rollingStreak)
      } else if (result === "lost" || result === "loss") {
        losses++
        rollingStreak = 0
      } else {
        // For incomplete/draw results, reset streak but don't count as win/loss
        rollingStreak = 0
      }
    }

    const stats = {
      gamesPlayed,
      wins,
      losses,
      winStreak: currentWinStreak,
      bestWinStreak,
      totalPlaytime,
    }

    const res = NextResponse.json(stats)
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (error) {
    console.error("[ProfileStats] Unhandled error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
