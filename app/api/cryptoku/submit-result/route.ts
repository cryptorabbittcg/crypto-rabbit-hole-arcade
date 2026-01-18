import { NextRequest, NextResponse } from "next/server"
import { CryptokuLeaderboardService } from "@/lib/supabase/services/cryptoku-leaderboard.service"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCryptokuStats } from "@/lib/cryptoku-stats"
import { CURRENT_SEASON } from "@/lib/season"

// Server-side scoring formula
function calculateScore(
  mode: "NOOB" | "DEGEN" | "APE",
  timeSeconds: number,
  hintsUsed: number,
  errors: number,
  cleanStreak: number
): number {
  // Starting points based on difficulty mode
  const startingPoints = mode === "DEGEN" ? 500 : mode === "APE" ? 800 : 0

  // Time decay: lose 0.2 points per second
  const timeDecay = timeSeconds * 0.2
  const baseTimeScore = Math.max(0, startingPoints - timeDecay)

  // Penalties
  const hintPenalty = 15 * hintsUsed
  const errorPenalty = 20 * errors

  // Bonuses
  const isCleanRun = hintsUsed === 0 && errors === 0
  const cleanRunBonus = isCleanRun ? 50 : 0

  // Streak bonus (only for clean runs, capped at 100)
  const streakBonus = isCleanRun ? Math.min(10 * cleanStreak, 100) : 0

  // Calculate raw score: starting points - time decay - penalties + bonuses
  const rawScore = baseTimeScore - hintPenalty - errorPenalty + cleanRunBonus + streakBonus
  
  // Minimum score floor: ensure completion always rewards at least 20 points
  const minScore = 20
  const score = Math.max(minScore, Math.round(rawScore))

  return score
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      playerAddress,
      mode,
      runId,
      timeSeconds,
      hintsUsed,
      errors,
      completed,
      forfeited,
    } = body

    console.log("[CryptokuSubmit] Step 0: Received request", {
      runId,
      mode,
      address: playerAddress ? playerAddress.substring(0, 10) + "..." : "missing",
    })

    // Validation
    if (!playerAddress || !mode || !runId) {
      console.error("[CryptokuSubmit] Step 0: Missing required fields", { playerAddress: !!playerAddress, mode, runId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["NOOB", "DEGEN", "APE"].includes(mode)) {
      console.error("[CryptokuSubmit] Step 0: Invalid mode", { mode })
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    // Step 1: Normalize address lowercase
    const normalizedAddress = playerAddress.toLowerCase()
    console.log("[CryptokuSubmit] Step 1: Normalized address", {
      original: playerAddress.substring(0, 10) + "...",
      normalized: normalizedAddress.substring(0, 10) + "...",
    })

    // Early returns for unranked modes
    if (mode === "NOOB") {
      console.log("[CryptokuSubmit] NOOB mode - unranked, returning early")
      return NextResponse.json({
        pointsEarned: 0,
        isDuplicate: false,
        unranked: true,
      })
    }

    if (forfeited) {
      console.log("[CryptokuSubmit] Forfeited game - unranked, returning early", { runId })
      return NextResponse.json({
        pointsEarned: 0,
        isDuplicate: false,
        unranked: true,
      })
    }

    if (!completed || !["DEGEN", "APE"].includes(mode)) {
      console.log("[CryptokuSubmit] Not completed or invalid mode - unranked, returning early", { completed, mode })
      return NextResponse.json({
        pointsEarned: 0,
        isDuplicate: false,
        unranked: true,
      })
    }

    // Step 1 (continued): Resolve user_id from profiles (create if needed)
    const profileService = new ProfileService()
    let profile = await profileService.getProfileByWallet(normalizedAddress)
    
    if (!profile) {
      console.log("[CryptokuSubmit] Step 1: Profile not found, creating new profile", {
        address: normalizedAddress.substring(0, 10) + "...",
      })
      // Create profile if it doesn't exist
      profile = await profileService.createProfile({
        wallet_address: normalizedAddress,
        username: `Player_${normalizedAddress.substring(2, 8)}`, // Generate a default username
      })
      
      if (!profile) {
        console.error("[CryptokuSubmit] Step 1: Failed to create profile", {
          address: normalizedAddress.substring(0, 10) + "...",
        })
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        )
      }
    }

    console.log("[CryptokuSubmit] Step 1: Profile resolved", {
      userId: profile.id,
      address: normalizedAddress.substring(0, 10) + "...",
    })

    // Get clean streak for score calculation (read-only, no updates)
    const playerStats = await getCryptokuStats(normalizedAddress)
    const score = calculateScore(mode, timeSeconds, hintsUsed, errors, playerStats.cleanStreak)
    
    console.log("[CryptokuSubmit] Step 1: Score calculated", {
      score,
      mode,
      timeSeconds,
      hintsUsed,
      errors,
      cleanStreak: playerStats.cleanStreak,
    })

    // Create admin client
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error("[CryptokuSubmit] Step 1: Failed to create admin client")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Step 2: Duplicate check BEFORE any insert
    console.log("[CryptokuSubmit] Step 2: Checking for duplicate run_id", { runId })
    const { data: existingEntry, error: checkError } = await adminClient
      .from('cryptoku_leaderboard')
      .select('run_id')
      .eq('run_id', runId)
      .maybeSingle()

    if (checkError) {
      console.error("[CryptokuSubmit] Step 2: Error checking for duplicate", {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
        runId,
      })
      return NextResponse.json(
        { error: "Failed to check for duplicate run" },
        { status: 500 }
      )
    }

    if (existingEntry) {
      console.log("[CryptokuSubmit] Step 2: Duplicate run_id detected, returning early", {
        runId,
        existingEntry,
      })
      return NextResponse.json({
        pointsEarned: 0,
        isDuplicate: true,
      })
    }

    console.log("[CryptokuSubmit] Step 2: No duplicate found, proceeding with insert", { runId })

    // Step 3A: Insert cryptoku_leaderboard row
    console.log("[CryptokuSubmit] Step 3A: Inserting leaderboard entry", {
      runId,
      address: normalizedAddress.substring(0, 10) + "...",
      mode,
      score,
    })

    const leaderboardService = new CryptokuLeaderboardService(adminClient)
    const leaderboardResult = await leaderboardService.addEntry({
      runId,
      address: normalizedAddress,
      mode,
      score,
      timeSeconds,
      hintsUsed,
      errors,
      timestamp: Date.now(),
      completed: true,
      forfeited: false,
    })

    if (!leaderboardResult) {
      console.error("[CryptokuSubmit] Step 3A: Failed to insert leaderboard entry", {
        runId,
        mode,
        score,
      })
      return NextResponse.json(
        { error: "Failed to save leaderboard entry" },
        { status: 500 }
      )
    }

    console.log("[CryptokuSubmit] Step 3A: Leaderboard entry inserted successfully", { runId })

    // Step 3B: Insert game_sessions row (admin client)
    console.log("[CryptokuSubmit] Step 3B: Inserting game_sessions row", {
      userId: profile.id,
      game_type: 'cryptoku',
      game_mode: mode,
      duration: timeSeconds,
      score,
      result: 'won',
      points_earned: score,
      run_id: runId,
    })

    const startedAt = new Date().toISOString()
    const endedAt = new Date().toISOString()

    const { data: sessionData, error: sessionError } = await adminClient
      .from('game_sessions')
      .insert({
        user_id: profile.id,
        game_type: 'cryptoku',
        game_mode: mode,
        duration: timeSeconds,
        score: score,
        result: 'won',
        points_earned: score, // ranked only (DEGEN/APE)
        started_at: startedAt,
        ended_at: endedAt,
        run_id: runId,
        season: CURRENT_SEASON,
      })
      .select('id')
      .single()

    if (sessionError) {
      console.error("[CryptokuSubmit] Step 3B: Failed to insert game_sessions row", {
        code: sessionError.code,
        message: sessionError.message,
        details: sessionError.details,
        hint: sessionError.hint,
        runId,
      })
      return NextResponse.json(
        { error: "Failed to save game session" },
        { status: 500 }
      )
    }

    console.log("[CryptokuSubmit] Step 3B: Game session inserted successfully", {
      sessionId: sessionData.id,
      runId,
    })

    // Step 3C: Award points ONLY ONCE using update_user_balance (admin client)
    const description = `cryptoku ${mode} run_id:${runId}`
    console.log("[CryptokuSubmit] Step 3C: Awarding points via update_user_balance", {
      userId: profile.id,
      amount: score,
      currency: 'points',
      description,
    })

    const { error: balanceError } = await adminClient.rpc('update_user_balance', {
      p_user_id: profile.id,
      p_ape_change: 0,
      p_tickets_change: 0,
      p_points_change: score,
      p_transaction_type: 'game_reward',
      p_description: description,
      p_season: CURRENT_SEASON,
    })

    if (balanceError) {
      console.error("[CryptokuSubmit] Step 3C: Failed to award points", {
        code: balanceError.code,
        message: balanceError.message,
        details: balanceError.details,
        hint: balanceError.hint,
        runId,
      })
      return NextResponse.json(
        { error: "Failed to award points" },
        { status: 500 }
      )
    }

    console.log("[CryptokuSubmit] Step 3C: Points awarded successfully", {
      userId: profile.id,
      pointsAwarded: score,
      runId,
    })

    // Step 3D: Return success
    console.log("[CryptokuSubmit] Step 3D: Request completed successfully", {
      runId,
      score,
      pointsEarned: score,
      isDuplicate: false,
    })

    return NextResponse.json({
      score,
      pointsEarned: score,
      isDuplicate: false,
    })

  } catch (error) {
    console.error("[CryptokuSubmit] Unhandled error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : typeof error,
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
