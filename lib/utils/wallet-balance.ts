/**
 * Wallet balance utilities using wagmi/viem
 * Works with Glyph wallet through wagmi's standard interface
 * 
 * The Glyph wallet is accessible via wagmi hooks (useAccount, useBalance, useWalletClient)
 * This provides standard wallet functionality for viewing balances and sending transactions.
 */

import { createPublicClient, http, formatUnits } from "viem"
import { apeChainMainnet } from "@/lib/wagmi-chains"

// Note: Removed ERC20_ABI and APE_ADDRESS import
// On ApeChain, APE is native currency, so we use getBalance() instead of readContract()

/**
 * Fetch APE token balance for an address using viem public client
 * 
 * IMPORTANT: On ApeChain (33139), APE is the NATIVE currency, not an ERC-20 token.
 * We use getBalance() for native currency instead of readContract() for ERC-20.
 * 
 * Note: The connected Glyph wallet is accessible via wagmi hooks:
 * - useAccount() - Get connected address
 * - useBalance() - Get native token balance (USE THIS FOR APE ON APECHAIN)
 * - useWalletClient() - Get wallet client for transactions
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

    // On ApeChain, APE is native currency (like ETH on Ethereum)
    // Use getBalance() for native currency, NOT readContract() for ERC-20
    const balance = await publicClient.getBalance({
      address: address as `0x${string}`,
    })

    // Format from wei (18 decimals) to human-readable
    const formatted = formatUnits(balance, 18)
    return parseFloat(formatted).toFixed(4)
  } catch (error: any) {
    // Handle specific error types gracefully
    if (error?.message?.includes("timeout") || error?.message?.includes("fetch")) {
      console.warn("[Wallet Balance] Network error (RPC may be unavailable):", error.message)
    } else {
      console.error("[Wallet Balance] Error fetching APE balance:", error)
    }
    // Return 0 on error rather than failing
    return "0.0000"
  }
}

