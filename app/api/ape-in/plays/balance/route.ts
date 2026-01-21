import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { ApeInPlaysConsumptionService } from "@/lib/supabase/services/ape-in-plays-consumption.service"

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * GET /api/ape-in/plays/balance
 * 
 * Returns play balance for a user (free + purchased).
 * 
 * Query params: ?address=...&mode=...
 * Response: { freePlaysRemaining, purchasedPlaysRemaining, totalPlaysRemaining }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")
    const mode = searchParams.get("mode") || "aida" // Default to aida for free plays check

    // Validate address
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      )
    }

    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      )
    }

    // Create admin client
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error("[Balance] Failed to create admin client")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Get profile
    const profileService = new ProfileService(adminClient)
    const normalizedAddress = address.toLowerCase()
    const profile = await profileService.getProfileByWallet(normalizedAddress)
    
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    // Get purchased plays balance
    const { data: purchasedBalance } = await adminClient
      .from("ape_in_purchased_plays_balances")
      .select("balance")
      .eq("user_id", profile.id)
      .maybeSingle()

    const purchasedPlaysRemaining = purchasedBalance?.balance || 0

    // Get free plays remaining (mode-specific)
    // Use the consumption service to get accurate counts without consuming
    // We'll query the database directly for free plays
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const freePlayModes = ["aida", "lana", "enj1n", "nifty"]
    let freePlaysRemaining = 0

    if (freePlayModes.includes(mode.toLowerCase())) {
      // Count free plays used today for this mode
      const { data: freePlaysToday } = await adminClient
        .from("ape_in_daily_free_plays")
        .select("plays_used")
        .eq("user_id", profile.id)
        .eq("game_mode", mode.toLowerCase())
        .eq("date_used", today)
        .maybeSingle()

      const playsUsed = freePlaysToday?.plays_used || 0
      freePlaysRemaining = Math.max(0, 5 - playsUsed) // 5 free plays per day
    }

    const totalPlaysRemaining = freePlaysRemaining + purchasedPlaysRemaining

    return NextResponse.json({
      freePlaysRemaining,
      purchasedPlaysRemaining,
      totalPlaysRemaining,
    })
  } catch (error: any) {
    console.error("[Balance] Error in balance route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
