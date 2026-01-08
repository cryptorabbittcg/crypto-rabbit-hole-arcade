"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, Package, Wallet, Users, Trophy, User, Swords } from "@/components/icons"
import { cn } from "@/lib/utils"

const navItems: Array<{ href: string; icon: typeof Gamepad2; label: string; soon?: boolean }> = [
  { href: "/", icon: Gamepad2, label: "Arcade" },
  { href: "/inventory", icon: Wallet, label: "Inventory" },
  { href: "/mint", icon: Package, label: "Mint" },
  { href: "/card-battle", icon: Swords, label: "Battle" }, // Added Card Battle link
  { href: "/social", icon: Users, label: "Social" },
  { href: "/leaderboard", icon: Trophy, label: "Ranks" },
  { href: "/profile", icon: User, label: "Profile" },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50">
      <div className="grid grid-cols-7 gap-1 p-2">
        {" "}
        {/* Changed to 7 columns for new item */}
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all",
                "hover:bg-primary/10",
                isActive && "bg-primary/20 text-primary shadow-[0_0_15px_hsl(var(--neon-cyan)/0.3)]",
              )}
            >
              <Icon className="w-5 h-5" />
              <div className="flex flex-col items-center gap-0.5 w-full">
                <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
                {item.soon && (
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-400/70 bg-emerald-500/25 text-emerald-100 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse">
                    SOON
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
