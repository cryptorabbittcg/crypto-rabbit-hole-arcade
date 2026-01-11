import { NextRequest, NextResponse } from "next/server"
import {
  getCryptokuStats,
  updateCryptokuStats,
  getCryptokuHints,
  updateCryptokuHints,
  addCryptokuLeaderboardEntry,
} from "@/lib/cryptoku-store"

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

    // Update hints economy: +1 hint every 10 completed ranked games
    const currentHints = await getCryptokuHints(normalizedAddress)
    const newTotalRankedCompleted = currentHints.totalRankedCompleted + 1
    const newHintsEarned = Math.floor(newTotalRankedCompleted / 10) - Math.floor((newTotalRankedCompleted - 1) / 10)
    
    const updatedHints = await updateCryptokuHints(normalizedAddress, (hints) => ({
      ...hints,
      totalRankedCompleted: newTotalRankedCompleted,
      hintBalance: hints.hintBalance + (newHintsEarned > 0 ? newHintsEarned : 0),
      gamesUntilNextFreeHint: 10 - (newTotalRankedCompleted % 10),
    }))

    // Add to leaderboard
    await addCryptokuLeaderboardEntry({
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

    return NextResponse.json({
      success: true,
      score,
      cleanStreak: updatedStats.cleanStreak,
      hintsEarned: newHintsEarned,
      hintBalance: updatedHints.hintBalance,
      gamesUntilNextFreeHint: updatedHints.gamesUntilNextFreeHint,
    })
  } catch (error) {
    console.error("Error submitting result:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

