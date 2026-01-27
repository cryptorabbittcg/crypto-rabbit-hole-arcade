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

    // ✅ Phase 1 guard: if user already has an active public match, return it
    const { data: existing, error: existingError } = await adminClient
      .from("ape_in_pvp_matches")
      .select("id, match_status, match_type")
      .eq("match_type", "public")
      .in("match_status", ["waiting", "rolling_for_first"])
      .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!existingError && existing?.id) {
      return NextResponse.json({ matchId: existing.id })
    }

    // Call atomic RPC to find or create match
    const { data: matchId, error: rpcError } = await adminClient.rpc(
      "pvp_find_or_create_public_match",
      {
        p_user_id: profile.id,
        p_wallet_address: normalizedAddress,
        p_username: profile.username || `Player${normalizedAddress.slice(2, 8)}`,
        p_avatar_url: profile.avatar_url || null,
      }
    )

    if (rpcError) {
      console.error("[PvPMatchPublic] RPC error:", rpcError)
      return NextResponse.json({ error: "Failed to create or find match" }, { status: 500 })
    }

    if (!matchId) {
      return NextResponse.json({ error: "Match creation failed" }, { status: 500 })
    }

    return NextResponse.json({ matchId })
  } catch (error: any) {
    console.error("[PvPMatchPublic] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
