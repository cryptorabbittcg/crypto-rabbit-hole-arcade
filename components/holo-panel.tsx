import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type HoloPanelAccent = "cyan" | "pink" | "purple"

interface HoloPanelProps {
  title?: ReactNode
  accent?: HoloPanelAccent
  className?: string
  children: ReactNode
}

const accentRingClasses: Record<HoloPanelAccent, string> = {
  cyan: "ring-1 ring-cyan-400/40 shadow-[0_0_40px_hsl(var(--neon-cyan)/0.35)]",
  pink: "ring-1 ring-pink-400/40 shadow-[0_0_40px_hsl(var(--neon-pink)/0.35)]",
  purple: "ring-1 ring-purple-400/40 shadow-[0_0_40px_hsl(var(--neon-purple)/0.35)]",
}

const accentChipClasses: Record<HoloPanelAccent, string> = {
  cyan: "from-cyan-400 via-sky-400 to-emerald-400",
  pink: "from-pink-400 via-fuchsia-400 to-rose-400",
  purple: "from-purple-400 via-violet-400 to-indigo-400",
}

export function HoloPanel({ title, accent = "cyan", className, children }: HoloPanelProps) {
  return (
    <section
      className={cn(
        "holo-panel relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "transition-shadow duration-300",
        accentRingClasses[accent],
        className,
      )}
    >
      {/* Soft holographic glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px rounded-[1.35rem] opacity-70 mix-blend-screen"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.32), transparent 55%),
            radial-gradient(circle at 100% 0%, rgba(244, 114, 182, 0.26), transparent 60%),
            radial-gradient(circle at 100% 100%, rgba(167, 139, 250, 0.25), transparent 55%)
          `,
        }}
      />

      {/* Inner cyber grid tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1px] rounded-[1.35rem] opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: "46px 46px",
          maskImage:
            "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent), linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent), linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          WebkitMaskComposite: "source-in",
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-5 py-6 md:px-8 md:py-8">
        {title && (
          <header className="mb-5 md:mb-6 flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-8 rounded-xl border border-white/20 bg-gradient-to-br",
                "flex items-center justify-center text-xs font-semibold uppercase tracking-[0.16em]",
                accentChipClasses[accent],
              )}
            >
              <span className="text-[0.65rem] text-cyber-dark">CS</span>
            </div>
            <div>
              <h2 className="font-display text-lg md:text-2xl font-semibold tracking-tight text-white text-glow">
                {title}
              </h2>
              <div className="mt-1 h-px w-24 bg-gradient-to-r from-white/60 via-white/10 to-transparent" />
            </div>
          </header>
        )}

        <div className="space-y-4 text-sm md:text-base text-muted-foreground">{children}</div>
      </div>
    </section>
  )
}

export default HoloPanel




