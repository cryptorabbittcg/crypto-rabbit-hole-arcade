/**
 * React hook for fetching APE token balance using wagmi
 * Works with Glyph wallet through wagmi's standard interface
 */

import { useReadContract } from "wagmi"
import { formatUnits } from "viem"
import { apeChainMainnet } from "@/lib/wagmi-chains"
import { APE_ADDRESS } from "@/adapters/well-known"
import { useAccount } from "wagmi"

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
 * Hook to get APE token balance for the connected wallet
 * @returns Formatted balance string (e.g., "123.4567") or "0.0000" if not connected
 */
export function useApeBalance() {
  const { address, isConnected } = useAccount()

  const { data: balance, isLoading, error } = useReadContract({
    address: APE_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: apeChainMainnet.id,
    query: {
      enabled: isConnected && !!address,
    },
  })

  if (!isConnected || !address) {
    return { balance: "0.0000", isLoading: false, error: null }
  }

  if (isLoading) {
    return { balance: "0.0000", isLoading: true, error: null }
  }

  if (error || !balance) {
    return { balance: "0.0000", isLoading: false, error }
  }

  const formatted = formatUnits(balance as bigint, 18)
  return {
    balance: parseFloat(formatted).toFixed(4),
    isLoading: false,
    error: null,
  }
}

