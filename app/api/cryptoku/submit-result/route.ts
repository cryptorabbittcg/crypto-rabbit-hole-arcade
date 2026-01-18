import { NextRequest, NextResponse } from "next/server"
import {
  getCryptokuStats,
  updateCryptokuStats,
} from "@/lib/cryptoku-stats"
import { CryptokuHintsService } from "@/lib/supabase/services/cryptoku-hints.service"
import { CryptokuLeaderboardService } from "@/lib/supabase/services/cryptoku-leaderboard.service"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createAdminClient } from "@/lib/supabase/admin"

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
  // This prevents scores from going too low even with heavy penalties
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

    // Validation
    if (!playerAddress || !mode || !runId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["NOOB", "DEGEN", "APE"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    const normalizedAddress = playerAddress.toLowerCase()

    // NOOB mode: Early return - NO mutations (no streak, no counters, no hints, no leaderboard)
    if (mode === "NOOB") {
      return NextResponse.json({
        success: true,
        unranked: true,
        message: "NOOB mode is unranked",
      })
    }

    // Forfeited games: Early return - NO mutations (no streak, no counters, no hints, no leaderboard)
    if (forfeited) {
      return NextResponse.json({
        success: true,
        unranked: true,
        message: "Forfeited games are not ranked",
      })
    }

    // Only process completed ranked games (DEGEN or APE)
    // If not completed or invalid mode, return early without mutations
    if (!completed || !["DEGEN", "APE"].includes(mode)) {
      return NextResponse.json({
        success: true,
        unranked: true,
        message: "Only completed ranked games are logged",
      })
    }

    // Get player stats
    const playerStats = await getCryptokuStats(normalizedAddress)
    const isCleanRun = hintsUsed === 0 && errors === 0

    // Calculate score
    const score = calculateScore(mode, timeSeconds, hintsUsed, errors, playerStats.cleanStreak)

    // Update clean streak and completion counts
    const updatedStats = await updateCryptokuStats(normalizedAddress, (stats) => {
      const newStats = { ...stats }
      
      // Update clean streak
      if (isCleanRun) {
        newStats.cleanStreak += 1
      } else {
        newStats.cleanStreak = 0
      }

      // Update completion counts
      if (mode === "DEGEN") {
        newStats.degenCompletedCount += 1
      } else if (mode === "APE") {
        newStats.apeCompletedCount += 1
      }
      newStats.totalCompletedCount += 1

      return newStats
    })

    // Update hints economy: +1 hint every 10 completed ranked games (atomic operation)
    const hintsService = new CryptokuHintsService()
    const profileService = new ProfileService()
    
    // PHASE 1 FIX: Add retry-only profile lookup (mobile profile sync may be in progress)
    // Retry up to 3 times with 800ms delays if profile not found
    let profile = await profileService.getProfileByWallet(normalizedAddress)
    let retryAttempt = 0
    const maxRetries = 2 // 3 total attempts (initial + 2 retries)
    
    while (!profile && retryAttempt < maxRetries) {
      console.log(`[CryptokuSubmit] Profile not found, retrying (attempt ${retryAttempt + 1}/${maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, 800))
      profile = await profileService.getProfileByWallet(normalizedAddress)
      retryAttempt++
    }
    
    if (!profile) {
      console.error("[CryptokuSubmit] Profile not found after retries for address:", normalizedAddress.substring(0, 10) + "...")
      return NextResponse.json(
        { 
          error: "PROFILE_NOT_READY",
          message: "Profile not ready yet. Please reconnect and try again in a moment."
        },
        { status: 425 } // 425 Too Early - profile sync in progress
      )
    }
    
    console.log("[CryptokuSubmit] Profile found:", {
      userId: profile.id,
      address: normalizedAddress.substring(0, 10) + "...",
      mode,
      score,
    })
    
    let hintsRewardResult
    try {
      hintsRewardResult = await hintsService.rewardHint(profile.id)
    } catch (error) {
      console.error("[CryptokuSubmit] Error rewarding hint:", error)
      hintsRewardResult = { hintsEarned: 0, hints: { hintBalance: 0, gamesUntilNextFreeHint: 10, totalRankedCompleted: 0 } }
    }

    // Create admin client for points awarding (bypasses RLS)
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      console.error("[CryptokuSubmit] Error creating admin client:", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Server configuration error" },
        { status: 500 }
      )
    }

    // Check if this run already exists (idempotency check)
    const { data: existingEntry, error: checkError } = await adminClient
      .from('cryptoku_leaderboard')
      .select('id')
      .eq('run_id', runId)
      .maybeSingle()

    if (checkError) {
      console.error("[CryptokuSubmit] Error checking for duplicate run:", {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
      })
      // Continue anyway - this is not critical, just for idempotency
    }

    // If existingEntry exists, this is a duplicate run
    const isDuplicateRun = existingEntry !== null

    // Add to leaderboard (Supabase) - use admin client to bypass RLS
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
      console.error("[CryptokuSubmit] Failed to add leaderboard entry", {
        runId,
        address: normalizedAddress.substring(0, 10) + "...",
        mode,
        score,
      })
      return NextResponse.json(
        { error: "Failed to save leaderboard entry" },
        { status: 500 }
      )
    }
    
    console.log("[CryptokuSubmit] Leaderboard entry added successfully", { runId, score })

    // Award points only for ranked modes (DEGEN/APE) and only if this is a new submission
    // Points = score (MVP)
    const rankedMode = mode === "DEGEN" || mode === "APE"
    const eligibleForPoints = rankedMode && completed && !forfeited
    const pointsEarned = eligibleForPoints && !isDuplicateRun ? score : 0

    if (pointsEarned > 0 && profile) {
      console.log("[CryptokuSubmit] Awarding points", {
        userId: profile.id,
        mode,
        score,
        pointsEarned,
        isDuplicateRun,
      })

      const { data: balanceData, error: balanceError } = await adminClient.rpc('update_user_balance', {
        p_user_id: profile.id,
        p_ape_change: 0,
        p_tickets_change: 0,
        p_points_change: pointsEarned,
        p_transaction_type: 'game_reward',
        p_description: `Reward from cryptoku ${mode}`,
      })

      if (balanceError) {
        console.error("[CryptokuSubmit] Error updating user balance:", {
          code: balanceError.code,
          message: balanceError.message,
          details: balanceError.details,
          hint: balanceError.hint,
        })
        return NextResponse.json(
          { 
            error: "Failed to award points",
            details: balanceError.message,
            score,
            pointsEarned: 0, // Return 0 since update failed
          },
          { status: 500 }
        )
      }
      
      console.log("[CryptokuSubmit] Points awarded successfully", {
        userId: profile.id,
        pointsEarned,
        balanceData,
      })
    } else if (isDuplicateRun && eligibleForPoints) {
      console.log("[CryptokuSubmit] Duplicate run detected, skipping points", { runId })
    } else if (!profile) {
      console.error("[CryptokuSubmit] Cannot award points: profile is null")
    } else if (pointsEarned === 0) {
      console.log("[CryptokuSubmit] No points earned", {
        rankedMode,
        completed,
        forfeited,
        isDuplicateRun,
        score,
      })
    }

    return NextResponse.json({
      success: true,
      score,
      pointsEarned,
      cleanStreak: updatedStats.cleanStreak,
      hintsEarned: hintsRewardResult.hintsEarned,
      hintBalance: hintsRewardResult.hints.hintBalance,
      gamesUntilNextFreeHint: hintsRewardResult.hints.gamesUntilNextFreeHint,
    })
  } catch (error) {
    console.error("[CryptokuSubmit] Unhandled error submitting result:", {
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

// Deployment trigger
