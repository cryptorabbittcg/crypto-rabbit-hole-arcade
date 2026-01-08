import { NextRequest, NextResponse } from "next/server"
import { getCryptokuHints, updateCryptokuHints } from "@/lib/cryptoku-store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, amount = 10 } = body // Default: 10 hints for 1.0 $APE

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    // TODO: Integrate with Glyph transaction verification
    // For now, this is a stub that always succeeds
    const normalizedAddress = address.toLowerCase()

    // Add purchased hints
    const updatedHints = await updateCryptokuHints(address, (hints) => ({
      ...hints,
      hintBalance: hints.hintBalance + amount,
    }))

    return NextResponse.json({
      success: true,
      hintBalance: updatedHints.hintBalance,
      message: `Purchased ${amount} hints for 1.0 $APE (stub - transaction verification pending)`,
    })
  } catch (error) {
    console.error("Error purchasing hints:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

