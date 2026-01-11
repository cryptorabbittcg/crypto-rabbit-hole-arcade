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
  if (!address) {
    return "0.0000"
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.warn("[Wallet Balance] Invalid address format:", address)
    return "0.0000"
  }

  try {
    // Create a public client for reading on-chain data
    // This doesn't require wallet connection - just reads from chain
    const publicClient = createPublicClient({
      chain: apeChainMainnet,
      transport: http(apeChainMainnet.rpcUrls.default.http[0], {
        timeout: 10000, // 10 second timeout
      }),
    })

    // Validate contract address
    if (!APE_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(APE_ADDRESS)) {
      console.error("[Wallet Balance] Invalid APE contract address:", APE_ADDRESS)
      return "0.0000"
    }

    const balance = await publicClient.readContract({
      address: APE_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    })

    // Format from wei (18 decimals) to human-readable
    const formatted = formatUnits(balance as bigint, 18)
    return parseFloat(formatted).toFixed(4)
  } catch (error: any) {
    // Handle specific error types gracefully
    if (error?.name === "ContractFunctionExecutionError") {
      console.warn("[Wallet Balance] Contract execution error (wallet may have no balance or contract issue):", error.message)
    } else if (error?.message?.includes("Cannot decode zero data") || 
               error?.name === "AbiDecodingZeroDataError") {
      console.warn("[Wallet Balance] Empty data returned (wallet may not be ready or no balance):", error.message)
    } else if (error?.message?.includes("timeout") || error?.message?.includes("fetch")) {
      console.warn("[Wallet Balance] Network error (RPC may be unavailable):", error.message)
    } else {
      console.error("[Wallet Balance] Error fetching APE balance:", error)
    }
    // Return 0 on error rather than failing
    return "0.0000"
  }
}

