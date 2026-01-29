import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileService } from "@/lib/supabase/services/profile.service"

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> | { matchId: string } }
) {
  try {
    // Handle params as either Promise (Next.js 15+) or direct object (Next.js 14)
    const resolvedParams = params instanceof Promise ? await params : params
    const matchId = resolvedParams?.matchId

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

    // Call atomic RPC to join match and generate rolls
    const { data: matchData, error: rpcError } = await adminClient.rpc(
      "join_public_match_and_roll",
      {
        p_match_id: matchId,
        p_user_id: profile.id,
        p_wallet_address: normalizedAddress,
        p_username: profile.username || `Player${normalizedAddress.slice(2, 8)}`,
        p_avatar_url: profile.avatar_url || null,
      }
    )

    if (rpcError) {
      console.error("[PvPMatchJoin] RPC error:", rpcError)
      
      // Handle specific error cases
      if (rpcError.message?.includes("Match not found")) {
        return NextResponse.json({ error: "Match not found or not public" }, { status: 404 })
      }
      if (rpcError.message?.includes("Cannot join own match")) {
        return NextResponse.json({ error: "Cannot join own match" }, { status: 403 })
      }
      
      return NextResponse.json({ error: "Failed to join match" }, { status: 500 })
    }

    if (!matchData || matchData.length === 0) {
      return NextResponse.json({ error: "Join failed: no match data returned" }, { status: 500 })
    }

    // RPC returns array, take first row
    const match = matchData[0]

    return NextResponse.json({
      id: match.id,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      player1_address: match.player1_address,
      player2_address: match.player2_address,
      player1_name: match.player1_name,
      player2_name: match.player2_name,
      player1_avatar_url: match.player1_avatar_url,
      player2_avatar_url: match.player2_avatar_url,
      match_status: match.match_status,
      player1_roll: match.player1_roll,
      player2_roll: match.player2_roll,
      first_turn_player: match.first_turn_player,
      rolled_at: match.rolled_at,
      roll_seed: match.roll_seed,
      created_at: match.created_at,
      started_at: match.started_at,
    })
  } catch (error: any) {
    console.error("[PvPMatchJoin] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
