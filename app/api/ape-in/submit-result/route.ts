import { NextRequest, NextResponse } from "next/server"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { CURRENT_SEASON } from "@/lib/season"

export async function POST(request: NextRequest) {
  // Diagnostic: Log runtime and env vars
  console.log("[ApeInSubmit] runtime", process.env.NEXT_RUNTIME, "node?", typeof process !== "undefined")
  console.log("[ApeInSubmit] has service key", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  
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

    // Log profile info for diagnostics
    console.log('[ApeInSubmit] profile', { 
      id: profile.id, 
      wallet: normalizedAddress 
    })

    // Calculate points (MVP: points = score)
    const pointsEarned = score

    // Create admin Supabase client for database operations (bypasses RLS)
    let adminClient
    try {
      adminClient = createAdminClient()
      // Log Supabase URL hostname for diagnostics
      console.log('[ApeInSubmit] supabase url', process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1] || 'not-set')
      
      // Diagnostic: Prove the API can read the leaderboard row (confirms same DB/env)
      const { data: diagData, error: diagError } = await adminClient
        .from('leaderboard')
        .select('user_id, season, ape_in_high_score, updated_at')
        .eq('user_id', profile.id)
        .maybeSingle()
      
      console.log('[ApeInSubmit] diag leaderboard readback', { diagData, diagError })
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
        p_description: `Reward from ape_in ${normalizedMode}`,
      })

      if (balanceError) {
        console.error('[ApeInSubmit] Error updating user balance:', {
          code: balanceError.code,
          message: balanceError.message,
        })
        // Continue even if balance update fails (session is already saved)
      }
    }

    // Update leaderboard via RPC (match Cryptoku pattern - SECURITY DEFINER bypasses RLS)
    // Only update for completed/won results (using normalized result to prevent casing issues)
    let highScoreUpdated = false
    if (normalizedResult === 'won' || normalizedResult === 'completed') {
      console.log('[ApeInSubmit] Calling add_apein_leaderboard_entry RPC', {
        userId: profile.id,
        score,
        season: CURRENT_SEASON,
      })

      const { data: rpcData, error: rpcError } = await adminClient.rpc(
        'add_apein_leaderboard_entry',
        {
          p_user_id: profile.id,
          p_score: score,
          p_season: CURRENT_SEASON,
        }
      )

      console.log('[ApeInSubmit] rpc add_apein_leaderboard_entry', { rpcData, rpcError })

      if (!rpcError && rpcData && rpcData.length > 0) {
        // rpcData[0].ape_in_high_score is now the correct max value
        const updatedHighScore = rpcData[0].ape_in_high_score
        highScoreUpdated = updatedHighScore >= score // Score was updated (may have been same or higher)
        console.log('[ApeInSubmit] Leaderboard updated via RPC', {
          userId: profile.id,
          score,
          updatedHighScore,
          highScoreUpdated,
        })
      } else if (rpcError) {
        console.error('[ApeInSubmit] leaderboard RPC failed:', {
          code: rpcError.code,
          message: rpcError.message,
          details: (rpcError as any).details,
          hint: (rpcError as any).hint,
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

