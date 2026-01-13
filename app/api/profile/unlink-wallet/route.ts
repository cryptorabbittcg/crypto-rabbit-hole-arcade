import { NextRequest, NextResponse } from "next/server"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAddress } from "viem"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { primaryAddress, linkedAddress } = body

    // Validate required fields
    if (!primaryAddress || !linkedAddress) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 })
    }

    // Normalize addresses
    const normalizedPrimary = primaryAddress.toLowerCase()
    const normalizedLinked = linkedAddress.toLowerCase()

    // Validate address format using viem
    if (!isAddress(normalizedPrimary) || !isAddress(normalizedLinked)) {
      return NextResponse.json({ ok: false, error: "Invalid address format" }, { status: 400 })
    }

    // Admin client required: linked-wallet operations need to bypass RLS
    // to read/modify linked_wallets JSONB field, which RLS policies don't support
    const adminClient = createAdminClient()
    const profileService = new ProfileService(adminClient)
    const profile = await profileService.getProfileByWallet(normalizedPrimary)
    if (!profile) {
      return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 })
    }

    // Read → modify → write pattern is acceptable here:
    // This is a single-user action (user unlinking their own wallet),
    // and we only update linked_wallets + updated_at fields (no race conditions on other fields)
    console.log(`[unlink-wallet] Attempting to unlink wallet ${normalizedLinked.substring(0, 10)}... from profile ${profile.id.substring(0, 8)}...`)
    const success = await profileService.removeLinkedWallet(profile.id, normalizedLinked)
    if (!success) {
      console.log(`[unlink-wallet] Failed: Wallet not linked for profile ${profile.id.substring(0, 8)}...`)
      return NextResponse.json({ ok: false, error: "Wallet not linked" }, { status: 404 })
    }

    // Get updated linked wallets
    const linkedWallets = await profileService.getLinkedWallets(profile.id)
    console.log(`[unlink-wallet] Success: Unlinked wallet ${normalizedLinked.substring(0, 10)}... from profile ${profile.id.substring(0, 8)}... (remaining: ${linkedWallets.length})`)

    return NextResponse.json({ ok: true, linked_wallets: linkedWallets })
  } catch (error) {
    console.error("[unlink-wallet] Error:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}

