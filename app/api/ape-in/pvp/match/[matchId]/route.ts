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
  { params }: { params: Promise<{ matchId: string }> | { matchId: string } }
) {
  try {
    // Handle params as either Promise (Next.js 15+) or direct object (Next.js 14)
    const resolvedParams = params instanceof Promise ? await params : params
    const matchId = resolvedParams?.matchId
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
      .from("ape_in_pvp_matches")
      .select("id, player1_id, player2_id, match_status, match_type, match_code, started_at, last_action_at, player1_roll, player2_roll, first_turn_player, rolled_at, roll_seed")
      .eq("id", matchId)
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
      match_status: match.match_status,
      match_type: match.match_type,
      match_code: match.match_code,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      started_at: match.started_at,
      last_action_at: match.last_action_at,
      // Phase 2: roll fields (null until rolls are generated)
      player1_roll: match.player1_roll,
      player2_roll: match.player2_roll,
      first_turn_player: match.first_turn_player,
      rolled_at: match.rolled_at,
      roll_seed: match.roll_seed,
    })
  } catch (error: any) {
    console.error("[PvPMatchGet] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
