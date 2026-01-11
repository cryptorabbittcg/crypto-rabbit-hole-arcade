import { NextRequest, NextResponse } from "next/server"
import { CryptokuHintsService } from "@/lib/supabase/services/cryptoku-hints.service"
import { ProfileService } from "@/lib/supabase/services/profile.service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, amount = 10 } = body // Default: 10 hints for 1.0 $APE

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // TODO: Integrate with Glyph transaction verification
    // For now, this is a stub that always succeeds
    const hintsService = new CryptokuHintsService()
    const profileService = new ProfileService()
    
    // Get profile to get user_id
    const profile = await profileService.getProfileByWallet(address)
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Purchase hints (atomic operation)
    const result = await hintsService.purchaseHints(profile.id, amount)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to purchase hints",
          hintBalance: result.hints.hintBalance 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      hintBalance: result.hints.hintBalance,
      message: `Purchased ${amount} hints for 1.0 $APE (stub - transaction verification pending)`,
    })
  } catch (error) {
    console.error("Error purchasing hints:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

