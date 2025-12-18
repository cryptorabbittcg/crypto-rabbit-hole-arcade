"use client"

import { Bell, Rocket, Users } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { useArcade } from "@/components/providers"
import Image from "next/image"
import Link from "next/link"
import { ProfileMenu } from "./profile-menu"

export default function Topbar() {
  const { tickets, points } = useArcade()

  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="flex items-center justify-between gap-2 md:gap-4 px-4 md:px-6 py-3">
        {/* Left: logo */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="md:hidden flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_15px_hsl(var(--neon-cyan)/0.3)]">
              <Image src="/images/design-mode/Artboard-1.png" alt="Crypto Rabbit" fill className="object-cover" />
            </div>
            <span className="font-display text-sm font-bold bg-gradient-to-r from-neon-cyan to-neon-pink bg-clip-text text-transparent">
              CRA
            </span>
          </Link>

        </div>

        {/* Center: Ciphers & Sentinels Mint CTA */}
        <div className="flex-1 flex justify-center">
          <Button
            asChild
            size="sm"
            className="h-10 md:h-11 px-4 md:px-6 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-cyber-dark text-xs md:text-sm font-semibold shadow-[0_0_25px_hsl(var(--neon-cyan)/0.7)] border border-cyan-300/70 animate-pulse"
          >
            <Link href="/ciphers-sentinels" className="flex items-center gap-2">
              <Rocket className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Ciphers &amp; Sentinels Mint</span>
              <span className="sm:hidden">C&S Mint</span>
            </Link>
          </Button>
        </div>

        {/* Right: tickets / points / wallet */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <div className="px-2.5 md:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400/40 via-yellow-400/20 to-orange-400/40 border border-amber-300/80 shadow-[0_0_20px_rgba(250,204,21,0.75)]">
              <span className="text-xs md:text-sm mr-1.5 md:mr-2">🎫</span>
              <span className="text-xs md:text-sm font-bold text-amber-50 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">
                {tickets}
              </span>
            </div>
            <div className="px-2.5 md:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-emerald-500/20 border border-cyan-400/70 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.5)]">
              <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.18em] text-cyan-200 mr-1.5">
                Points
              </span>
              <span className="text-xs md:text-sm font-bold text-cyan-100 text-glow">{points}</span>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="relative hidden md:flex">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <ProfileMenu />
        </div>
      </div>
    </div>
  )
}
