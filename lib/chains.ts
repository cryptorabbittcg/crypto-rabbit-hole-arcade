import { defineChain } from "thirdweb/chains"

const apeScanExplorer = { name: "ApeScan", url: "https://apescan.io" }
const apeScanCurtisExplorer = { name: "ApeScan Curtis", url: "https://curtis.explorer.caldera.xyz" }

export const apeChainMainnet = defineChain({
  id: 33139,
  name: "ApeChain",
  nativeCurrency: { name: "ApeCoin", symbol: "APE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.apechain.com"] },
  },
  blockExplorers: {
    default: apeScanExplorer,
  },
  testnet: false,
})

export const apeChainTestnet = defineChain({
  id: 33111,
  name: "ApeChain Curtis",
  nativeCurrency: { name: "ApeCoin", symbol: "APE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://curtis.rpc.caldera.xyz/http"] },
  },
  blockExplorers: {
    default: apeScanCurtisExplorer,
  },
  testnet: true,
})
