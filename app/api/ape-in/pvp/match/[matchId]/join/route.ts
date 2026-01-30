import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileService } from "@/lib/supabase/services/profile.service"

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params

    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 })
    }

    // Phase 2: Validate matchId is a valid UUID
    function isUuid(v: string): boolean {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
    }

    if (!isUuid(matchId)) {
      return NextResponse.json({ error: "Invalid matchId format" }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const playerAddress = body?.playerAddress

    if (!playerAddress) {
      return NextResponse.json({ error: "playerAddress is required" }, { status: 400 })
    }

    if (!isValidAddress(playerAddress)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 })
    }

    const normalizedAddress = playerAddress.toLowerCase()
    const adminClient = createAdminClient()

    // Get or create profile (wallet -> profiles.id)
    const profileService = new ProfileService(adminClient)
    let profile = await profileService.getProfileByWallet(normalizedAddress)

    if (!profile) {
      profile = await profileService.createProfile({
        wallet_address: normalizedAddress,
        username: `Player${normalizedAddress.slice(2, 8)}`,
      })

      if (!profile) {
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
      }
    }

    console.log("[ApeInPvPMatchJoin] calling pvp_join_match_v1", { matchId })
    const { data: match, error: rpcError } = await adminClient.rpc("pvp_join_match_v1", {
      p_match_id: matchId,
      p_game_code: "ape_in",
      p_user_id: profile.id,
    })

    if (rpcError) {
      console.error("[ApeInPvPMatchJoin] RPC error:", rpcError)
      if (rpcError.message?.includes("match_not_found")) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 })
      }
      if (rpcError.message?.includes("match_full")) {
        return NextResponse.json({ error: "Match is full" }, { status: 409 })
      }
      return NextResponse.json({ error: rpcError.message || "Failed to join match" }, { status: 400 })
    }

    // Guardrail: never return a silent 200 with null fields.
    if (!match?.id) {
      return NextResponse.json({ error: "Join failed: match not returned" }, { status: 500 })
    }

    return NextResponse.json({
      id: match.id,
      match_status: match.match_status,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      started_at: match.started_at,
      ended_at: match.ended_at,
      winner_id: match.winner_id,
      forfeited_by: match.forfeited_by,
      last_action_at: match.last_action_at,
      game_state: match.game_state,
    })
  } catch (error: any) {
    console.error("[PvPMatchJoin] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
