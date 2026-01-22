import { NextRequest, NextResponse } from "next/server"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { CURRENT_SEASON } from "@/lib/season"

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

    console.log("[ape-in submit-result] payload", {
      playerAddress: playerAddress ? `${playerAddress.substring(0, 10)}...` : undefined,
      mode,
      score,
      durationSeconds,
      result,
      runId,
    })

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

    // Create admin Supabase client for database operations (bypasses RLS)
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      console.error('[ApeInSubmit] Error creating admin client:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Server configuration error" },
        { status: 500 }
      )
    }

    // Attempt insert with idempotency via unique constraint on run_id
    // Use INSERT ... ON CONFLICT to handle duplicate run_id atomically
    const endedAt = new Date().toISOString()
    const startedAt = new Date(Date.now() - durationSeconds * 1000).toISOString()
    
    const { data: sessionData, error: insertError } = await adminClient
      .from('game_sessions')
      .insert({
        user_id: profile.id,
        game_type: 'ape_in',
        game_mode: mode,
        score: score,
        result: result,
        duration: durationSeconds,
        run_id: runId,
        started_at: startedAt,
        ended_at: endedAt,
        season: CURRENT_SEASON,
        points_earned: pointsEarned,
        ape_earned: 0,
        tickets_earned: 0,
      })
      .select('id')
      .single()

    let sessionId: string | null = null
    let shouldAwardPoints = false
    let existingPointsEarned = 0

    if (insertError) {
      // Check if error is due to unique constraint violation (duplicate run_id)
      if (insertError.code === '23505' || insertError.message?.includes('unique constraint') || insertError.message?.includes('duplicate key')) {
        // Duplicate run_id - fetch existing session (idempotent response)
        const { data: existingSession, error: fetchError } = await adminClient
          .from('game_sessions')
          .select('id')
          .eq('run_id', runId)
          .single()

        if (fetchError || !existingSession) {
          console.error('[ApeInSubmit] Error fetching existing session:', {
            code: fetchError?.code,
            message: fetchError?.message,
          })
          return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
        }

        sessionId = existingSession.id
        existingPointsEarned = 0 // Duplicate submission - no points earned
        shouldAwardPoints = false // Don't award points again for duplicate
      } else {
        // Other database error
        console.error('[ApeInSubmit] Error inserting game session:', {
          code: insertError.code,
          message: insertError.message,
        })
        return NextResponse.json({ error: "Failed to save game session" }, { status: 500 })
      }
    } else {
      // Insert successful (new submission)
      if (!sessionData) {
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
      }
      sessionId = sessionData.id
      shouldAwardPoints = true // Award points for new submission
      console.log("[ape-in submit-result] inserted run_id", runId)
    }

    // Award points only for ranked modes (all Ape In modes are ranked)
    // Only award if this is a new submission (not duplicate)
    if (shouldAwardPoints && pointsEarned > 0) {
      const { error: balanceError } = await adminClient.rpc('update_user_balance', {
        p_user_id: profile.id,
        p_ape_change: 0,
        p_tickets_change: 0,
        p_points_change: pointsEarned,
        p_transaction_type: 'game_reward',
        p_description: `Reward from ape_in ${mode}`,
      })

      if (balanceError) {
        console.error('[ApeInSubmit] Error updating user balance:', {
          code: balanceError.code,
          message: balanceError.message,
        })
        // Continue even if balance update fails (session is already saved)
      }
    }

    // Update leaderboard.ape_in_high_score atomically using UPSERT with GREATEST logic
    // Only update for completed/won results
    // This ensures a leaderboard row ALWAYS exists after a ranked Ape In game
    let highScoreUpdated = false
    if (result === 'won' || result === 'completed') {
      // Fetch current high score (if exists) - use maybeSingle to handle missing row gracefully
      const { data: existingLeaderboard } = await adminClient
        .from('leaderboard')
        .select('ape_in_high_score')
        .eq('user_id', profile.id)
        .maybeSingle()
      
      // Calculate new high score: max of current (or 0) and this score
      const currentHighScore = existingLeaderboard?.ape_in_high_score || 0
      const newHighScore = Math.max(currentHighScore, score)
      
      // Atomic UPSERT: creates row if missing, updates if exists
      // Always upsert to ensure row exists, even if score didn't increase
      const { data: upserted, error: upsertError } = await adminClient
        .from('leaderboard')
        .upsert({
          user_id: profile.id,
          season: CURRENT_SEASON,
          ape_in_high_score: newHighScore,
        }, {
          onConflict: 'user_id',
        })
        .select('user_id, ape_in_high_score')
        .single()
      
      if (!upsertError && upserted) {
        highScoreUpdated = score > currentHighScore
        console.log('[ApeInSubmit] Leaderboard upserted', {
          userId: profile.id,
          currentHighScore,
          newScore: newHighScore,
          scoreIncreased: highScoreUpdated,
          upsertedData: upserted,
        })
      } else {
        console.error('[ApeInSubmit] Error upserting leaderboard:', {
          code: upsertError?.code,
          message: upsertError?.message,
        })
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

