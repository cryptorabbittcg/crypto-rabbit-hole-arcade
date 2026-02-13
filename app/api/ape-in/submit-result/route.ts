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

    // Normalize mode and result server-side to prevent casing mismatches
    const normalizedMode = String(mode).toLowerCase()
    const normalizedResult = String(result).toLowerCase()

    // Validation
    if (!playerAddress || !normalizedMode || score === undefined || durationSeconds === undefined || !normalizedResult || !runId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validModes = ['aida', 'lana', 'nifty', 'enj1n', 'pvp', 'multiplayer']
    if (!validModes.includes(normalizedMode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    const validResults = ['won', 'lost', 'draw', 'completed']
    if (!validResults.includes(normalizedResult)) {
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
        game_mode: normalizedMode,
        score: score,
        result: normalizedResult,
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
        // Duplicate run_id - fetch existing session scoped to this user + game (idempotent response)
        const { data: existingSession, error: fetchError } = await adminClient
          .from('game_sessions')
          .select('id, points_earned')
          .eq('run_id', runId)
          .eq('user_id', profile.id)
          .eq('game_type', 'ape_in')
          .maybeSingle()

        if (fetchError || !existingSession) {
          return NextResponse.json(
            { error: "Duplicate run_id for another user or game" },
            { status: 409 }
          )
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
    }

    // Award points only for ranked modes (all Ape In modes are ranked)
    // NOTE:
    // Points + transaction ledger + leaderboard are now handled by add_apein_result(run_id ties everything together).
    // Do NOT also call update_user_balance here, or you'll create duplicate transaction rows.

    // Update leaderboard + ledger via RPC (SECURITY DEFINER bypasses RLS)
    // Only update for completed/won results (using normalized result to prevent casing issues)
    let highScoreUpdated = false
    if (shouldAwardPoints && (normalizedResult === 'won' || normalizedResult === 'completed')) {
      const { data: rpcData, error: rpcError } = await adminClient.rpc(
        'add_apein_result',
        {
          p_run_id: runId,
          p_user_id: profile.id,
          p_mode: normalizedMode,
          p_season: CURRENT_SEASON,
          p_score: pointsEarned,
        }
      )

      if (rpcError) {
        console.error('[ApeInSubmit] add_apein_result RPC failed:', {
          code: rpcError.code,
          message: rpcError.message,
          details: (rpcError as any).details,
          hint: (rpcError as any).hint,
        })
      } else {
        // add_apein_result returns (user_id, mode, season, best_score, last_played)
        highScoreUpdated = true
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

