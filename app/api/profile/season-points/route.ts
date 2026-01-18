import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CURRENT_SEASON } from "@/lib/season"

/**
 * Server-side API route to compute season points from transactions
 * Uses admin client to bypass RLS
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

    // Create admin client
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error("[ProfileSeasonPoints] Failed to create admin client")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Step 1: Get profile by wallet using admin client (bypasses RLS)
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("wallet_address", normalizedAddress)
      .maybeSingle()

    if (profileError) {
      console.error("[ProfileSeasonPoints] Error fetching profile:", {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
      })
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ seasonPoints: 0 })
    }

    // Step 2: Sum points transactions for current season
    const { data: transactions, error: txError } = await adminClient
      .from("transactions")
      .select("amount")
      .eq("user_id", profile.id)
      .eq("currency", "points")
      .eq("season", CURRENT_SEASON)

    if (txError) {
      console.error("[ProfileSeasonPoints] Error querying transactions:", {
        error: txError,
        code: txError.code,
        message: txError.message,
        userId: profile.id,
      })
      return NextResponse.json({ error: "Failed to fetch season points" }, { status: 500 })
    }

    const transactionsList = transactions || []
    const seasonPoints = transactionsList.reduce((sum, tx) => sum + (tx.amount ?? 0), 0)

    console.log("[ProfileSeasonPoints] Computed season points", {
      wallet: normalizedAddress.substring(0, 10) + "...",
      userId: profile.id,
      season: CURRENT_SEASON,
      transactionCount: transactionsList.length,
      seasonPoints,
    })

    const res = NextResponse.json({ seasonPoints })
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (error) {
    console.error("[ProfileSeasonPoints] Unhandled error:", {
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
