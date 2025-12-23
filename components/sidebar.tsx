"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, Package, Wallet, Users, Settings, Trophy, User, Swords, Rocket, Sparkles } from "@/components/icons"
import Image from "next/image"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: Gamepad2, label: "Arcade Hub" },
  { href: "/inventory", icon: Wallet, label: "Inventory" },
  { href: "/mint", icon: Package, label: "Mint Packs" },
  { href: "/card-battle", icon: Swords, label: "Card Battle" },
  { href: "/social", icon: Users, label: "Social Raids" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/ciphers-sentinels", icon: Rocket, label: "C&S Mint" },
  { href: "/ciphers-sentinels-mint", icon: Sparkles, label: "Mint Info" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/admin", icon: Settings, label: "Admin Panel" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 fixed left-0 top-0 h-screen flex-col gap-4 p-4 border-r border-border/50 bg-card/20 backdrop-blur-xl z-30 overflow-hidden">
      <Link href="/" className="flex items-center gap-3 mb-4 group">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]">
          <Image src="/300x300 Square Logo.png" alt="Crypto Rabbit" width={48} height={48} className="object-cover" />
        </div>
        <div>
          <div className="font-display text-lg font-bold bg-gradient-to-r from-neon-cyan via-neon-pink to-neon-purple bg-clip-text text-transparent">
            Crypto Rabbit
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const isCSMint = item.href === "/ciphers-sentinels"
          const isMintInfo = item.href === "/ciphers-sentinels-mint"

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                isCSMint
                  ? "rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-black text-sm font-semibold shadow-[0_0_25px_hsl(var(--neon-cyan)/0.7)] border border-cyan-300/70 animate-pulse hover:shadow-[0_0_30px_hsl(var(--neon-cyan)/0.9)]"
                  : isMintInfo
                    ? "hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_15px_hsl(var(--neon-cyan)/0.2)] border border-purple-400/30"
                    : cn(
                        "hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_15px_hsl(var(--neon-cyan)/0.2)]",
                        isActive &&
                          "bg-primary/20 text-primary shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)] border border-primary/30",
                      ),
              )}
            >
              <Icon className={cn("w-5 h-5", isCSMint && "text-black")} />
              <span className={cn("font-medium", isCSMint && "font-semibold")}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-4 rounded-xl bg-card/40 backdrop-blur-xl border border-border/50">
        <div className="text-xs text-muted-foreground mb-2">Powered by</div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">ApeChain</span>
          <span className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
            Otherside
          </span>
        </div>
      </div>
    </aside>
  )
}
