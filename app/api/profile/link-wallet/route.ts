import { NextRequest, NextResponse } from "next/server"
import { ProfileService } from "@/lib/supabase/services/profile.service"
import { verifySignature, parseLinkedWalletMessage, isTimestampValid } from "@/lib/crypto/verifySignature"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAddress } from "viem"

// Wallet type allowlist
const ALLOWED_WALLET_TYPES = ["metamask"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { primaryAddress, linkedAddress, type, message, signature } = body

    // Validate required fields
    if (!primaryAddress || !linkedAddress || !type || !message || !signature) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 })
    }

    // Validate wallet type
    if (!ALLOWED_WALLET_TYPES.includes(type as (typeof ALLOWED_WALLET_TYPES)[number])) {
      return NextResponse.json({ ok: false, error: `Invalid wallet type. Allowed types: ${ALLOWED_WALLET_TYPES.join(", ")}` }, { status: 400 })
    }

    // Normalize addresses
    const normalizedPrimary = primaryAddress.toLowerCase()
    const normalizedLinked = linkedAddress.toLowerCase()

    // Validate address format using viem
    if (!isAddress(normalizedPrimary) || !isAddress(normalizedLinked)) {
      return NextResponse.json({ ok: false, error: "Invalid address format" }, { status: 400 })
    }

    // Parse and validate message
    const parsed = parseLinkedWalletMessage(message, normalizedPrimary, normalizedLinked)
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Invalid message format" }, { status: 400 })
    }

    // Check timestamp (must be within 10 minutes)
    if (!isTimestampValid(parsed.timestamp)) {
      return NextResponse.json({ ok: false, error: "Message expired (must be within 10 minutes)" }, { status: 400 })
    }

    // Verify signature
    const isValid = await verifySignature(message, signature, normalizedLinked)
    if (!isValid) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
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
    // This is a single-user action (user linking their own wallet),
    // and we only update linked_wallets + updated_at fields (no race conditions on other fields)
    console.log(`[link-wallet] Attempting to link wallet ${normalizedLinked.substring(0, 10)}... to profile ${profile.id.substring(0, 8)}...`)
    const success = await profileService.addLinkedWallet(profile.id, normalizedLinked, type)
    if (!success) {
      // Check if it's a limit issue
      const current = await profileService.getLinkedWallets(profile.id)
      if (current.length >= 5) {
        console.log(`[link-wallet] Failed: Maximum linked wallets reached (5) for profile ${profile.id.substring(0, 8)}...`)
        return NextResponse.json({ ok: false, error: "Maximum linked wallets reached (5)" }, { status: 400 })
      }
      console.log(`[link-wallet] Failed: Wallet already linked or failed to link for profile ${profile.id.substring(0, 8)}...`)
      return NextResponse.json({ ok: false, error: "Wallet already linked or failed to link" }, { status: 400 })
    }

    // Get updated linked wallets
    const linkedWallets = await profileService.getLinkedWallets(profile.id)
    console.log(`[link-wallet] Success: Linked wallet ${normalizedLinked.substring(0, 10)}... to profile ${profile.id.substring(0, 8)}... (total: ${linkedWallets.length})`)

    return NextResponse.json({ ok: true, linked_wallets: linkedWallets })
  } catch (error) {
    console.error("[link-wallet] Error:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}

