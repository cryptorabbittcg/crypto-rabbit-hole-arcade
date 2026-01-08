import { NextRequest, NextResponse } from "next/server"
import { getCryptokuHints, updateCryptokuHints } from "@/lib/cryptoku-store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 })
    }

    const normalizedAddress = address.toLowerCase()
    const currentHints = await getCryptokuHints(address)

    if (currentHints.hintBalance <= 0) {
      return NextResponse.json(
        { error: "No hints remaining", hintBalance: currentHints.hintBalance },
        { status: 400 }
      )
    }

    // Decrement hint balance
    const updatedHints = await updateCryptokuHints(address, (hints) => ({
      ...hints,
      hintBalance: hints.hintBalance - 1,
    }))

    return NextResponse.json({
      success: true,
      hintBalance: updatedHints.hintBalance,
    })
  } catch (error) {
    console.error("Error using hint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

