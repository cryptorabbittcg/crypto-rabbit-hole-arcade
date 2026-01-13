import { createPublicClient, http, isAddress, type Address } from "viem"
import { apeChainMainnet } from "@/lib/wagmi-chains"
import { NFT_CONTRACTS } from "@/lib/utils/nft_contracts"

export type Nft = {
  id: string
  contract: string
  tokenId: string
  name: string
  image: string
  collectionName: string
  staked?: boolean
  rarity?: "common" | "rare" | "epic" | "legendary"
}

// ERC721 ABI for balanceOf and tokenURI
const ERC721_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Create public client for ApeChain
const publicClient = createPublicClient({
  chain: apeChainMainnet,
  transport: http(apeChainMainnet.rpcUrls.default.http[0], {
    timeout: 10000,
  }),
})

/**
 * Fetch token URI and parse metadata
 */
async function fetchTokenMetadata(
  contractAddress: Address,
  tokenId: bigint,
  collectionName: string,
): Promise<{ name: string; image: string } | null> {
  try {
    const tokenURI = await publicClient.readContract({
      address: contractAddress,
      abi: ERC721_ABI,
      functionName: "tokenURI",
      args: [tokenId],
    })

    if (!tokenURI) return null

    // Handle IPFS and HTTP URIs
    let uri = tokenURI
    if (uri.startsWith("ipfs://")) {
      uri = `https://ipfs.io/ipfs/${uri.slice(7)}`
    } else if (uri.startsWith("ipfs/")) {
      uri = `https://ipfs.io/${uri}`
    }

    const response = await fetch(uri)
    if (!response.ok) return null

    const metadata = await response.json()
    return {
      name: metadata.name || `${collectionName} #${tokenId.toString()}`,
      image: metadata.image || metadata.image_url || "",
    }
  } catch (error) {
    console.error(`[NFT Adapter] Error fetching metadata for token ${tokenId}:`, error)
    return null
  }
}

/**
 * Fetch all NFTs for a given wallet address from allowed contracts
 */
export async function fetchUserNfts(address?: string): Promise<Nft[]> {
  if (!address || !isAddress(address)) {
    return []
  }

  // If no contracts configured, return empty array
  if (NFT_CONTRACTS.length === 0) {
    console.warn("[NFT Adapter] No NFT contracts configured in allowlist")
    return []
  }

  const walletAddress = address as Address
  const nfts: Nft[] = []

  try {
    // Fetch NFTs from each contract in parallel
    const contractPromises = NFT_CONTRACTS.map(async (contractConfig) => {
      const contractAddress = contractConfig.address

      try {
        // Get balance
        const balance = await publicClient.readContract({
          address: contractAddress,
          abi: ERC721_ABI,
          functionName: "balanceOf",
          args: [walletAddress],
        })

        if (balance === 0n) {
          return [] // No tokens owned
        }

        // Fetch token IDs (limited to first 100 for performance)
        const tokenIds: bigint[] = []
        const maxTokens = Number(balance) > 100 ? 100 : Number(balance)

        for (let i = 0; i < maxTokens; i++) {
          try {
            const tokenId = await publicClient.readContract({
              address: contractAddress,
              abi: ERC721_ABI,
              functionName: "tokenOfOwnerByIndex",
              args: [walletAddress, BigInt(i)],
            })
            tokenIds.push(tokenId)
          } catch (error) {
            // Some contracts may not support tokenOfOwnerByIndex
            console.warn(`[NFT Adapter] tokenOfOwnerByIndex not supported for ${contractConfig.name}`)
            break
          }
        }

        // Fetch metadata for each token
        const nftPromises = tokenIds.map(async (tokenId) => {
          const metadata = await fetchTokenMetadata(contractAddress, tokenId, contractConfig.name)
          if (!metadata) return null

          return {
            id: `${contractAddress}-${tokenId.toString()}`,
            contract: contractAddress,
            tokenId: tokenId.toString(),
            name: metadata.name,
            image: metadata.image,
            collectionName: contractConfig.name,
          } as Nft
        })

        const contractNfts = await Promise.all(nftPromises)
        return contractNfts.filter((nft): nft is Nft => nft !== null)
      } catch (error) {
        console.error(`[NFT Adapter] Error fetching NFTs from ${contractConfig.name}:`, error)
        return []
      }
    })

    const allContractNfts = await Promise.all(contractPromises)
    nfts.push(...allContractNfts.flat())
  } catch (error) {
    console.error("[NFT Adapter] Error fetching user NFTs:", error)
    // Return empty array on error (graceful degradation)
    return []
  }

  return nfts
}

export async function stakeNft(id: string): Promise<boolean> {
  // Mock implementation - staking not implemented yet
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return true
}

export async function unstakeNft(id: string): Promise<boolean> {
  // Mock implementation - staking not implemented yet
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return true
}
