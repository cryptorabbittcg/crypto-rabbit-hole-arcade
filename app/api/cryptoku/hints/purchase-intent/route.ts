import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createIntent } from "@/lib/payments/cryptokuHintsPayment"

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * POST /api/cryptoku/hints/purchase-intent
 * 
 * Creates a purchase intent for hint purchase with transaction verification.
 * Returns intent details for client to send transaction.
 * 
 * Request body: { address: string }
 * Response: { intentId, chainId, recipient, priceWei, amount, expiresAt }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

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

    // Create admin client for database operations
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error("[PurchaseIntent] Failed to create admin client")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Create intent via payment module
    const intent = await createIntent({
      address,
      adminClient,
    })

    // Return intent details for client to send transaction
    return NextResponse.json(intent)
  } catch (error: any) {
    console.error("[PurchaseIntent] Error in purchase-intent route:", error)
    
    if (error.message === "Profile not found") {
      return NextResponse.json(
        { error: "Profile not found. Please ensure you're connected with a registered wallet." },
        { status: 404 }
      )
    }

    if (error.message === "Failed to create purchase intent") {
      return NextResponse.json(
        { error: "Failed to create purchase intent" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
