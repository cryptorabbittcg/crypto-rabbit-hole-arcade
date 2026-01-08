import { ENV } from "@/lib/env"
// Note: This adapter uses wagmi but wagmi is not configured in this project.
// This function is currently unused. If needed, either configure wagmi or migrate to thirdweb.
import type { Config } from "@wagmi/core"

const ABI = [
  {
    type: "function",
    name: "send",
    stateMutability: "payable",
    inputs: [
      { name: "_dstEid", type: "uint32" },
      { name: "_to", type: "bytes32" },
      { name: "_amountLD", type: "uint256" },
      { name: "_minAmountLD", type: "uint256" },
      { name: "_options", type: "bytes" },
      { name: "_composeMsg", type: "bytes" },
      { name: "_refundAddress", type: "address" },
    ],
    outputs: [{ name: "guid", type: "bytes32" }],
  },
] as const

export async function bridgeApe(to: `0x${string}`, amountWei: bigint) {
  if (!ENV.APE_OFT) throw new Error("APE OFT not set")

  // Wagmi is not configured in this project. This function requires wagmi config to work.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { getWalletClient } = await import("@wagmi/core")
  // @ts-ignore - wagmi config not available, this function is unused
  const wc = await getWalletClient({} as Config)
  if (!wc) throw new Error("Wallet not connected")

  const res = await wc.writeContract({
    address: ENV.APE_OFT as `0x${string}`,
    abi: ABI,
    functionName: "send",
    value: BigInt(0),
    args: [Number(ENV.LZ_DST_EID), to as any, amountWei, BigInt(0), "0x", "0x", to],
  })

  return res
}
