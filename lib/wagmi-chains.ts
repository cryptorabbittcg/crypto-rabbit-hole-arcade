import { defineChain } from "viem"

// ApeChain Mainnet configuration for wagmi/viem
export const apeChainMainnet = defineChain({
  id: 33139,
  name: "ApeChain",
  nativeCurrency: {
    name: "ApeCoin",
    symbol: "APE",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.apechain.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "ApeScan",
      url: "https://apescan.io",
    },
  },
  testnet: false,
})

// ApeChain Testnet (Curtis) configuration for wagmi/viem
export const apeChainTestnet = defineChain({
  id: 33111,
  name: "ApeChain Curtis",
  nativeCurrency: {
    name: "ApeCoin",
    symbol: "APE",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://curtis.rpc.caldera.xyz/http"],
    },
  },
  blockExplorers: {
    default: {
      name: "ApeScan Curtis",
      url: "https://curtis.explorer.caldera.xyz",
    },
  },
  testnet: true,
})

