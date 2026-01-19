import { NextRequest, NextResponse } from "next/server"

/**
 * DEPRECATED: This endpoint no longer grants hints.
 * Use the new purchase flow:
 * 1. POST /api/cryptoku/hints/purchase-intent (creates purchase intent)
 * 2. Send transaction via wallet (native APE)
 * 3. POST /api/cryptoku/hints/confirm-purchase (verifies transaction and grants hints)
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Deprecated. Use purchase-intent + confirm-purchase.",
      message: "This endpoint has been disabled. Please use the new purchase flow with transaction verification."
    },
    { status: 410 }
  )
}

