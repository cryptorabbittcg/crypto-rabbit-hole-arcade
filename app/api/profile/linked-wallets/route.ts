import { NextRequest, NextResponse } from "next/server"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAddress } from "viem"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ ok: false, error: "Missing address parameter" }, { status: 400 })
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase()

    // Validate address format using viem
    if (!isAddress(normalizedAddress)) {
      return NextResponse.json({ ok: false, error: "Invalid address format" }, { status: 400 })
    }

    // Admin client required: linked-wallet operations need to bypass RLS
    // to read linked_wallets JSONB field, which RLS policies don't support
    const adminClient = createAdminClient()
    const profileService = new ProfileService(adminClient)
    const profile = await profileService.getProfileByWallet(normalizedAddress)
    if (!profile) {
      console.log(`[linked-wallets] Profile not found for address: ${normalizedAddress.substring(0, 10)}...`)
      return NextResponse.json({ ok: true, linked_wallets: [] })
    }

    // Get linked wallets
    const linkedWallets = await profileService.getLinkedWallets(profile.id)
    console.log(`[linked-wallets] Found ${linkedWallets.length} linked wallet(s) for profile: ${profile.id.substring(0, 8)}...`)

    return NextResponse.json({ ok: true, linked_wallets: linkedWallets })
  } catch (error) {
    console.error("[linked-wallets] Error:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}

