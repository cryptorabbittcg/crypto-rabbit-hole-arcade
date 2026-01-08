"use client";

import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { GlyphWalletProvider } from "@use-glyph/sdk-react"
import { apeChainMainnet } from "@/lib/wagmi-chains"

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: [apeChainMainnet],
  transports: {
    [apeChainMainnet.id]: http(),
  },
})

// Create query client
const queryClient = new QueryClient()

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <GlyphWalletProvider askForSignature={true}>
          {children}
        </GlyphWalletProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
