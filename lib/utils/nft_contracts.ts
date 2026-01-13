/**
 * NFT Contracts Allowlist for ApeChain
 * 
 * This file contains the list of NFT contracts that are allowed for avatar selection.
 * Contracts should be added here with their metadata (name, symbol, etc.)
 */

export type NFTContractConfig = {
  address: `0x${string}`
  name: string
  standard: "ERC721" | "ERC1155"
}

export const NFT_CONTRACTS: NFTContractConfig[] = [
  // BAYC (Bored Ape Yacht Club) - placeholder address
  // TODO: Replace with actual ApeChain contract addresses once available
  // {
  //   address: "0x..." as `0x${string}`,
  //   name: "Bored Ape Yacht Club",
  //   standard: "ERC721",
  // },
  // MAYC (Mutant Ape Yacht Club)
  // {
  //   address: "0x..." as `0x${string}`,
  //   name: "Mutant Ape Yacht Club",
  //   standard: "ERC721",
  // },
  // Otherdeed
  // {
  //   address: "0x..." as `0x${string}`,
  //   name: "Otherdeed",
  //   standard: "ERC721",
  // },
  // MARS
  // {
  //   address: "0x..." as `0x${string}`,
  //   name: "MARS",
  //   standard: "ERC721",
  // },
]

