import { NextRequest, NextResponse } from "next/server"
import { CryptokuHintsService } from "@/lib/supabase/services/cryptoku-hints.service"
import { ProfileService } from "@/lib/supabase/services/profile.service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    const hintsService = new CryptokuHintsService()
    const profileService = new ProfileService()
    
    // Get profile to get user_id
    const profile = await profileService.getProfileByWallet(address)
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Use hint (atomic operation)
    const result = await hintsService.useHint(profile.id)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to use hint",
          hintBalance: result.hints.hintBalance 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      hintBalance: result.hints.hintBalance,
    })
  } catch (error) {
    console.error("Error using hint:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { 
        error: `Failed to use hint: ${errorMessage}` 
      },
      { status: 500 }
    )
  }
}

