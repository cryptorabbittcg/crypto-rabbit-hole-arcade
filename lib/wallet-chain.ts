/**
 * Utility functions for handling wallet chain switching with automatic chain addition
 */

import { apeChainMainnet } from "./chains"

/**
 * Ensures ApeChain is added to MetaMask and switches to it
 * Handles the case where the chain isn't added yet by adding it first
 */
export async function ensureApeChain(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not detected")
  }

  const chainId = `0x${apeChainMainnet.id.toString(16)}` // Convert to hex (0x8173 for 33139)

  try {
    // Try to switch to the chain
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    })
  } catch (err: any) {
    // If the chain is not added (error code 4902), add it first
    if (err?.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId,
              chainName: apeChainMainnet.name,
              rpcUrls: [apeChainMainnet.rpc],
              nativeCurrency: {
                name: apeChainMainnet.nativeCurrency.name,
                symbol: apeChainMainnet.nativeCurrency.symbol,
                decimals: apeChainMainnet.nativeCurrency.decimals,
              },
              blockExplorerUrls: apeChainMainnet.blockExplorers?.map((exp) => exp.url) || [],
            },
          ],
        })
        // After adding, try switching again
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        })
      } catch (addError) {
        console.error("Failed to add ApeChain to MetaMask:", addError)
        throw new Error("Failed to add ApeChain network. Please add it manually in MetaMask.")
      }
    } else {
      // Re-throw other errors
      throw err
    }
  }
}



