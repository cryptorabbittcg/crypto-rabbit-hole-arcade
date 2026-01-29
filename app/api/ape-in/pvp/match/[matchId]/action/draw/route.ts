import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileService } from "@/lib/supabase/services/profile.service"

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> | { matchId: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const matchId = resolvedParams?.matchId

    if (!matchId || !isUuid(matchId)) {
      return NextResponse.json({ error: "Invalid matchId" }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const playerAddress = body?.playerAddress
    if (!playerAddress || !isValidAddress(playerAddress)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const profileService = new ProfileService(adminClient)
    const profile = await profileService.getProfileByWallet(playerAddress.toLowerCase())
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { data, error } = await adminClient.rpc("pvp_action_draw", {
      p_match_id: matchId,
      p_actor_user_id: profile.id,
    })

    if (error) {
      console.error("[PvPActionDraw] RPC error:", error)
      return NextResponse.json({ error: error.message || "Failed to draw" }, { status: 400 })
    }

    return NextResponse.json(data?.[0] ?? data ?? null)
  } catch (error: any) {
    console.error("[PvPActionDraw] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

