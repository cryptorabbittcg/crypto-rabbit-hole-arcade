import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAndCompleteIntent } from "@/lib/payments/cryptokuHintsPayment"

/**
 * Validate Ethereum address format (40 hex chars)
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Validate transaction hash format (64 hex chars)
 */
function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash)
}

/**
 * POST /api/cryptoku/hints/confirm-purchase
 * 
 * Verifies on-chain transaction and grants hints.
 * 
 * Request body: { address: string, intentId: string, txHash: string }
 * Response: { success: boolean, hintBalance: number, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, intentId, txHash } = body

    // Validate input
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      )
    }

    if (!intentId) {
      return NextResponse.json(
        { error: "Intent ID is required" },
        { status: 400 }
      )
    }

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      )
    }

    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      )
    }

    if (!isValidTxHash(txHash)) {
      return NextResponse.json(
        { error: "Invalid transaction hash format" },
        { status: 400 }
      )
    }

    // Create admin client for database operations
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error("[ConfirmPurchase] Failed to create admin client")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Verify and complete intent via payment module
    const result = await verifyAndCompleteIntent({
      address,
      intentId,
      txHash,
      adminClient,
    })

    if (!result.success) {
      // Map errors to appropriate HTTP status codes
      const statusCode = 
        result.error?.includes("not found") ? 404 :
        result.error?.includes("expired") ? 400 :
        result.error?.includes("mismatch") || result.error?.includes("does not match") ? 403 :
        result.error?.includes("already used") || result.error?.includes("Replay") ? 400 :
        result.error?.includes("blockchain") || result.error?.includes("network") ? 503 :
        400

      return NextResponse.json(
        { error: result.error || "Verification failed" },
        { status: statusCode }
      )
    }

    // Success - return updated hint balance
    return NextResponse.json({
      success: true,
      hintBalance: result.hintBalance,
      message: "Purchase confirmed successfully",
    })
  } catch (error: any) {
    console.error("[ConfirmPurchase] Error in confirm-purchase route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
