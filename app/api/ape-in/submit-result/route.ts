import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ProfileService } from "@/lib/supabase/services/profile.service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      playerAddress,
      mode,
      score,
      durationSeconds,
      result,
      opponentAddress,
      opponentScore,
      runId,
      metadata,
    } = body

    // Validation
    if (!playerAddress || !mode || score === undefined || durationSeconds === undefined || !result || !runId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validModes = ['aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer']
    if (!validModes.includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    const validResults = ['won', 'lost', 'draw', 'completed']
    if (!validResults.includes(result)) {
      return NextResponse.json({ error: "Invalid result" }, { status: 400 })
    }

    if (score < 0 || durationSeconds < 0) {
      return NextResponse.json({ error: "Score and durationSeconds must be >= 0" }, { status: 400 })
    }

    if (typeof runId !== 'string' || runId.trim() === '') {
      return NextResponse.json({ error: "runId must be a non-empty string" }, { status: 400 })
    }

    // Normalize wallet address
    const normalizedAddress = playerAddress.toLowerCase()

    // Get or create profile
    const profileService = new ProfileService()
    let profile = await profileService.getProfileByWallet(normalizedAddress)
    
    if (!profile) {
      // Create profile if doesn't exist
      profile = await profileService.createProfile({
        wallet_address: normalizedAddress,
        username: `Player${normalizedAddress.slice(2, 8)}`,
      })
      
      if (!profile) {
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
      }
    }

    // Calculate points (MVP: points = score)
    const pointsEarned = score

    // Create Supabase client for database operations
    const supabase = await createClient()

    // Attempt insert with idempotency via unique constraint on run_id
    // Use INSERT ... ON CONFLICT to handle duplicate run_id atomically
    const { data: sessionData, error: insertError } = await supabase
      .from('game_sessions')
      .insert({
        user_id: profile.id,
        game_type: 'ape_in',
        game_mode: mode,
        score: score,
        duration: durationSeconds,
        result: result,
        points_earned: pointsEarned,
        run_id: runId,
        ended_at: new Date().toISOString(),
        ape_earned: 0,
        tickets_earned: 0,
      })
      .select('id, points_earned')
      .single()

    let sessionId: string | null = null
    let shouldAwardPoints = false
    let existingPointsEarned = 0

    if (insertError) {
      // Check if error is due to unique constraint violation (duplicate run_id)
      if (insertError.code === '23505' || insertError.message?.includes('unique constraint') || insertError.message?.includes('duplicate key')) {
        // Duplicate run_id - fetch existing session (idempotent response)
        const { data: existingSession, error: fetchError } = await supabase
          .from('game_sessions')
          .select('id, points_earned')
          .eq('run_id', runId)
          .single()

        if (fetchError || !existingSession) {
          console.error('[ApeInSubmit] Error fetching existing session:', fetchError)
          return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
        }

        sessionId = existingSession.id
        existingPointsEarned = existingSession.points_earned || 0
        shouldAwardPoints = false // Don't award points again for duplicate
      } else {
        // Other database error
        console.error('[ApeInSubmit] Error inserting game session:', insertError)
        return NextResponse.json({ error: "Failed to save game session" }, { status: 500 })
      }
    } else {
      // Insert successful (new submission)
      if (!sessionData) {
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
      }
      sessionId = sessionData.id
      shouldAwardPoints = true // Award points for new submission
    }

    // Award points only for ranked modes (all Ape In modes are ranked)
    // Only award if this is a new submission (not duplicate)
    if (shouldAwardPoints && pointsEarned > 0) {
      const { error: balanceError } = await supabase.rpc('update_user_balance', {
        p_user_id: profile.id,
        p_ape_change: 0,
        p_tickets_change: 0,
        p_points_change: pointsEarned,
        p_transaction_type: 'game_reward',
        p_description: `Reward from ape_in ${mode}`,
      })

      if (balanceError) {
        console.error('[ApeInSubmit] Error updating user balance:', balanceError)
        // Continue even if balance update fails (session is already saved)
      }
    }

    // Update leaderboard.ape_in_high_score if this score is higher
    // Only update for completed/won results
    let highScoreUpdated = false
    if (result === 'won' || result === 'completed') {
      const { data: leaderboardData, error: leaderboardFetchError } = await supabase
        .from('leaderboard')
        .select('ape_in_high_score')
        .eq('user_id', profile.id)
        .single()

      if (!leaderboardFetchError && leaderboardData) {
        const currentHighScore = leaderboardData.ape_in_high_score || 0
        if (score > currentHighScore) {
          const { error: leaderboardUpdateError } = await supabase
            .from('leaderboard')
            .update({ ape_in_high_score: score })
            .eq('user_id', profile.id)

          if (!leaderboardUpdateError) {
            highScoreUpdated = true
          } else {
            console.error('[ApeInSubmit] Error updating leaderboard high score:', leaderboardUpdateError)
          }
        }
      } else if (leaderboardFetchError && leaderboardFetchError.code === 'PGRST116') {
        // Leaderboard entry doesn't exist - create it
        const { error: createError } = await supabase
          .from('leaderboard')
          .insert({
            user_id: profile.id,
            ape_in_high_score: score,
          })

        if (!createError) {
          highScoreUpdated = true
        } else {
          console.error('[ApeInSubmit] Error creating leaderboard entry:', createError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      pointsEarned: shouldAwardPoints ? pointsEarned : existingPointsEarned,
      highScoreUpdated: highScoreUpdated,
    })
  } catch (error) {
    console.error('[ApeInSubmit] Error submitting result:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

