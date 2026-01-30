import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileService } from "@/lib/supabase/services/profile.service"

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params
    const playerAddress = request.nextUrl.searchParams.get("playerAddress")

    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 })
    }

    if (!isUuid(matchId)) {
      return NextResponse.json({ error: "Invalid matchId" }, { status: 400 })
    }

    if (!playerAddress) {
      return NextResponse.json({ error: "playerAddress query parameter is required" }, { status: 400 })
    }

    if (!isValidAddress(playerAddress)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 })
    }

    const normalizedAddress = playerAddress.toLowerCase()
    const adminClient = createAdminClient()

    const profileService = new ProfileService(adminClient)
    const profile = await profileService.getProfileByWallet(normalizedAddress)

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { data: match, error: matchError } = await adminClient
      .from("pvp_matches")
      .select("id, game_code, player1_id, player2_id, match_status, started_at, last_action_at, winner_id, forfeited_by, ended_at, game_state")
      .eq("id", matchId)
      .eq("game_code", "ape_in")
      .maybeSingle()

    if (matchError || !match) {
      if (matchError) console.error("[PvPMatchGet] Error fetching match:", matchError)
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    const isParticipant =
      (match.player1_id && match.player1_id === profile.id) ||
      (match.player2_id && match.player2_id === profile.id)

    if (!isParticipant) {
      return NextResponse.json({ error: "Access denied: not a match participant" }, { status: 403 })
    }

    return NextResponse.json({
      requester_user_id: profile.id,
      match_status: match.match_status,
      // For UI compatibility only (Option A removes match_type/match_code from storage)
      match_type: "public",
      match_code: null,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      started_at: match.started_at,
      last_action_at: match.last_action_at,
      winner_id: match.winner_id,
      forfeited_by: match.forfeited_by,
      ended_at: match.ended_at,
      game_state: match.game_state,
      // Legacy roll fields removed under Option A
      player1_roll: null,
      player2_roll: null,
      first_turn_player: null,
      rolled_at: null,
      roll_seed: null,
    })
  } catch (error: any) {
    console.error("[PvPMatchGet] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
