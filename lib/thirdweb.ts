import { createThirdwebClient, defineChain } from "thirdweb"
import { ENV } from "./env"

export const thirdwebClient = createThirdwebClient({
  clientId: ENV.THIRDWEB_CLIENT_ID || process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "demo",
})

// Define ApeChain (Curtis testnet)
export const apeChain = defineChain({
  id: 33111,
  name: "ApeChain Curtis",
  nativeCurrency: {
    name: "ApeCoin",
    symbol: "APE",
    decimals: 18,
  },
  rpc: "https://curtis.rpc.caldera.xyz/http",
  testnet: true,
})

// Helper to get contract addresses
export const contracts = {
  pythEntropy: ENV.PYTH_ENTROPY,
  apeOFT: ENV.APE_OFT,
  apeToken: ENV.APE_ADDRESS,
} as const
