import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileService } from "@/lib/supabase/services/profile.service"

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export async function POST(request: NextRequest) {
  try {
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

    /**
     * Phase 1: Guard
     * If user already has an active Ape In PvP match, return it
     */
    const { data: existing, error: existingError } = await adminClient
      .from("pvp_matches")
      .select("id, match_status, player1_id, player2_id")
      .eq("game_code", "ape_in")
      .in("match_status", ["waiting", "active", "in_progress"])
      .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!existingError && existing?.id) {
      // Determine if we're the creator (player1) or joiner (player2)
      const isCreator = existing.player1_id === profile.id
      return NextResponse.json({ matchId: existing.id, created: isCreator })
    }

    /**
     * Phase 2: Find or create public match
     */
    const { data: matchId, error: rpcError } = await adminClient.rpc("pvp_find_or_create_public_match", {
      p_game_code: "ape_in",
      p_user_id: profile.id,
    })

    if (rpcError) {
      console.error("[ApeInPvPPublic] RPC error:", rpcError)
      return NextResponse.json({ error: "Failed to create or find match" }, { status: 500 })
    }

    if (!matchId) {
      return NextResponse.json({ error: "Match creation failed" }, { status: 500 })
    }

    /**
     * Phase 3: Determine role (creator vs joiner)
     */
    const { data: match, error: matchCheckError } = await adminClient
      .from("pvp_matches")
      .select("player1_id")
      .eq("id", matchId)
      .maybeSingle()

    if (matchCheckError || !match) {
      console.error("[ApeInPvPPublic] Error checking match:", matchCheckError)
      return NextResponse.json({ error: "Failed to verify match" }, { status: 500 })
    }

    const isCreator = match.player1_id === profile.id

    return NextResponse.json({ matchId, created: isCreator })
  } catch (error: any) {
    console.error("[ApeInPvPPublic] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
