/**
 * Wallet balance utilities using wagmi/viem
 * Works with Glyph wallet through wagmi's standard interface
 * 
 * The Glyph wallet is accessible via wagmi hooks (useAccount, useBalance, useWalletClient)
 * This provides standard wallet functionality for viewing balances and sending transactions.
 */

import { createPublicClient, http, formatUnits } from "viem"
import { apeChainMainnet } from "@/lib/wagmi-chains"
import { APE_ADDRESS } from "@/adapters/well-known"

// ERC20 balanceOf ABI
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

/**
 * Fetch APE token balance for an address using viem public client
 * This works independently and can be called from anywhere
 * 
 * Note: The connected Glyph wallet is accessible via wagmi hooks:
 * - useAccount() - Get connected address
 * - useBalance() - Get native token balance
 * - useWalletClient() - Get wallet client for transactions
 * - useReadContract() - Read contract data
 * - useWriteContract() - Write contract transactions
 * 
 * @param address - Wallet address
 * @returns Balance as formatted string (e.g., "123.4567")
 */
export async function getApeBalance(address: string): Promise<string> {
  if (!address) return "0.0000"

  try {
    // Create a public client for reading on-chain data
    // This doesn't require wallet connection - just reads from chain
    const publicClient = createPublicClient({
      chain: apeChainMainnet,
      transport: http(),
    })

    const balance = await publicClient.readContract({
      address: APE_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    })

    // Format from wei (18 decimals) to human-readable
    const formatted = formatUnits(balance, 18)
    return parseFloat(formatted).toFixed(4)
  } catch (error: any) {
    console.error("Error fetching APE balance:", error)
    // Return 0 on error rather than failing
    return "0.0000"
  }
}

