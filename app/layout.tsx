import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
// Temporarily disabled Orbitron font due to loading issues
// import { Orbitron } from "next/font/google"
import Providers from "./providers"
import { Providers as ArcadeProviders } from "@/components/providers"
import { LeaderboardProvider } from "@/components/leaderboard-provider"
import { ProfileSyncWrapper } from "@/components/profile-sync-wrapper"
import { ErrorBoundary } from "@/components/error-boundary"
import Sidebar from "@/components/sidebar"
import MobileNav from "@/components/mobile-nav"
import Topbar from "@/components/topbar"
import { ToastToaster } from "@/components/ui/toast-toaster"
import { GlobalAuthDialog } from "@/components/global-auth-dialog"

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "arial"],
})
// Temporarily disabled Orbitron font due to loading issues
// const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-display" })

export const metadata: Metadata = {
  title: "Crypto Rabbit Arcade | Web3 Gaming Hub",
  description: "The Crypto Rabbit Hole® - Mini Games, TCG, NFTs on ApeChain",
  generator: 'v0.app',
  icons: {
    icon: '/300x300 Square Logo.png',
    apple: '/300x300 Square Logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <Providers>
            <ArcadeProviders>
              <LeaderboardProvider>
                <ProfileSyncWrapper>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex-1 flex flex-col md:ml-64 lg:ml-72">
                    <Topbar />
                    <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-4">{children}</main>
                  </div>
                </div>
                <MobileNav />
                <ToastToaster />
                <GlobalAuthDialog />
                <div className="scanline pointer-events-none fixed inset-0 z-50" />
                </ProfileSyncWrapper>
              </LeaderboardProvider>
            </ArcadeProviders>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
