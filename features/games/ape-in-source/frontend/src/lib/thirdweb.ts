import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";
import { getArcadeSession } from "./arcade-session";

/**
 * Get Thirdweb Client ID from arcade session or environment variable
 * Priority: Arcade Session > Environment Variable > Placeholder
 */
function getThirdwebClientId(): string {
  const session = getArcadeSession()
  
  if (session?.thirdwebClientId) {
    console.log('✅ Using Thirdweb Client ID from arcade session')
    return session.thirdwebClientId
  }
  
  const envClientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID
  if (envClientId) {
    console.log('✅ Using Thirdweb Client ID from environment variable')
    return envClientId
  }
  
  console.warn('⚠️ No Thirdweb Client ID found, using placeholder')
  return "placeholder-client-id-replace-me"
}

// Create the ThirdWeb client
// Client ID comes from arcade session (if available) or environment variable
const clientId = getThirdwebClientId()
console.log('🔧 Thirdweb Client ID source:', clientId ? 'Found' : 'Missing')

export const client = createThirdwebClient({
  clientId,
});

// Define ApeChain Curtis testnet chain (matching Cryptoku working config)
export const curtisChain = defineChain({
  id: parseInt(import.meta.env.VITE_CHAIN_ID || "33111"), // ApeChain Curtis testnet
  rpc: import.meta.env.VITE_RPC_URL || "https://curtis.rpc.caldera.xyz/http",
  name: import.meta.env.VITE_CHAIN_NAME || "ApeChain Curtis Testnet",
  nativeCurrency: {
    name: "APE",
    symbol: "APE", 
    decimals: 18,
  },
});

// Define supported wallets
export const wallet = createWallet("io.metamask");

// Export commonly used wallets
export const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
];
