import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Server-side API route to fetch recent game sessions
 * Uses admin client to bypass RLS, matching the pattern used in submit-result and stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get("wallet")
    const rawLimit = parseInt(searchParams.get("limit") || "10", 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
    }

    // Normalize address: trim whitespace, then lowercase
    const normalizedAddress = walletAddress.trim().toLowerCase()

    // Step 0: Create admin client first (use for BOTH profile lookup and session queries)
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error("[ProfileRecentGames] Failed to create admin client")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Step 1: Get profile by wallet using admin client (bypasses RLS)
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("wallet_address", normalizedAddress)
      .maybeSingle()

    if (profileError) {
      console.error("[ProfileRecentGames] Error fetching profile:", {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
      })
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json([])
    }

    // Step 2: Query game_sessions using admin client (bypasses RLS)

    // Query game_sessions for this user_id, ordered by ended_at descending
    const { data: sessions, error } = await adminClient
      .from("game_sessions")
      .select("id, game_type, game_mode, score, points_earned, result, duration, ended_at, run_id, started_at")
      .eq("user_id", profile.id)
      .order("ended_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[ProfileRecentGames] Error querying game_sessions:", {
        error,
        code: error.code,
        message: error.message,
        userId: profile.id,
      })
      return NextResponse.json({ error: "Failed to fetch recent games" }, { status: 500 })
    }

    const sessionsList = sessions || []
    console.log("[ProfileRecentGames] Fetched recent games", {
      wallet: normalizedAddress.substring(0, 10) + "...",
      userId: profile.id,
      sessionsCount: sessionsList.length,
      limit,
    })

    // Normalize sessions to match NormalizedGameSession type
    const normalizedSessions = sessionsList.map((session) => ({
      id: session.id ?? "",
      createdAt: session.ended_at ?? session.started_at ?? new Date().toISOString(),
      durationSeconds: session.duration ?? 0,
      gameType: session.game_type ?? "",
      gameMode: session.game_mode ?? null,
      score: session.score ?? 0,
      pointsEarned: session.points_earned ?? 0,
      result: session.result ?? null,
      endedAt: session.ended_at ?? null,
      runId: session.run_id ?? null,
    }))

    const res = NextResponse.json(normalizedSessions)
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (error) {
    console.error("[ProfileRecentGames] Unhandled error:", {
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
