import Link from "next/link"
import Image from "next/image"

import HoloPanel from "@/components/holo-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Twitter, Unlock } from "@/components/icons"

const DISCORD_URL = "https://discord.gg/GJBbZHHUtY"
const X_PRIMARY_URL = "https://x.com/CryptoRabbitTCG"
const X_SECONDARY_URL = "https://x.com/CryptoRabitHole"

const PROGRESS_PCT = 22

const MILESTONE_THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const visiblePerks = [
  "Early founder role in Discord with priority feedback access to the Ciphers & Sentinels roadmap.",
  "Day-one access to curated playtest drops, prototype decks, and experimental game modes.",
  "Premium holo profile cosmetics and founder-only on-chain collectibles.",
]

const hiddenPerks = [
  "Private strategy channels with the design team to shape metas before they go live.",
  "IRL crossovers, collab drops, and surprise digital merch packages.",
  "Future on-chain governance hooks for arcade expansions and seasonal leagues.",
  "Priority allowlist for upcoming partner mints across the Crypto Rabbit ecosystem.",
]

const storySections = [
  {
    id: "story-so-far",
    title: "The Story So Far",
    body: "The Crypto Rabbit Arcade started as a small experiment in on-chain mini-games and trading cards. Ciphers & Sentinels is the narrative layer that stitches those experiments into a living universe — one where market chaos, signal noise, and player skill all collide.",
  },
  {
    id: "what-weve-built",
    title: "What We’ve Built",
    body: "We’ve shipped arcade-ready mini-games, prototype TCG mechanics, on-chain inventory, and leaderboards that already keep score across the Rabbit Hole. Under the hood lives a foundation for modular card sets, rarity curves, and event-driven seasons.",
  },
  {
    id: "what-next",
    title: "What We’re Building Next",
    body: "Ciphers & Sentinels is the first flagship mint that binds the Crypto Rabbit universe around a collection of playable identities. Your PFPs become pilots, avatars, and keys to a growing suite of modes — raids, drafts, leagues, and beyond.",
  },
  {
    id: "why-mint-now",
    title: "Why Mint / Why Join Now",
    body: "This is the founder window. Early supporters lock in perks, claim the earliest C&S identities, and help set the tone for how the Rabbit Hole evolves. We’ll never repeat this exact configuration of perks, roles, and mint mechanics again.",
  },
]

function CtaStrip() {
  return (
    <div className="mt-8">
      <HoloPanel accent="pink">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-base md:text-lg text-white">
              Ready to drop into the Ciphers & Sentinels founder wave?
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Join the Discord to get the whitelist role so you don't miss the mint window.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-sm md:text-base font-semibold shadow-[0_0_24px_hsl(var(--neon-pink)/0.4)]"
            >
              <a href={DISCORD_URL} target="_blank" rel="noreferrer">
                Join Discord (Get Whitelist Role)
              </a>
            </Button>
          </div>
        </div>
      </HoloPanel>
    </div>
  )
}

export default function CiphersSentinelsPage() {
  return (
    <div className="space-y-10 md:space-y-12">
      {/* HERO */}
      <HoloPanel accent="cyan">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs font-mono uppercase tracking-[0.16em] text-cyan-300 border border-cyan-400/50">
              <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
              <span>Ciphers &amp; Sentinels</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
              Ciphers &amp; Sentinels{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent text-glow">
                Mint Coming Soon
              </span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              Premium founder PFPs for the Crypto Rabbit Arcade. Claim your Cipher or Sentinel identity before the
              first wave of raids, leagues, and holo–deck drops goes live.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 uppercase tracking-[0.18em] text-[0.64rem] font-semibold shadow-[0_0_18px_rgba(52,211,153,0.45)]">
                Mint Coming Soon
              </Badge>
              <div className="flex items-center gap-2 rounded-2xl border border-cyan-500/50 bg-black/40 px-3 py-2 text-xs font-mono text-cyan-200">
                <span className="opacity-70">Countdown</span>
                <span className="text-cyan-100">TBA</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-sm md:text-base font-semibold shadow-[0_0_24px_hsl(var(--neon-cyan)/0.45)]"
              >
                <a href={DISCORD_URL} target="_blank" rel="noreferrer">
                  Join Discord (Get Whitelist Role)
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Follow the signal</span>
              <div className="flex gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-black/40 text-xs hover:border-cyan-400/80 hover:text-cyan-300"
                >
                  <a href={X_PRIMARY_URL} target="_blank" rel="noreferrer">
                    <Twitter className="mr-1 h-3 w-3" />
                    @CryptoRabbitTCG
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-black/40 text-xs hover:border-cyan-400/80 hover:text-cyan-300"
                >
                  <a href={X_SECONDARY_URL} target="_blank" rel="noreferrer">
                    <Twitter className="mr-1 h-3 w-3" />
                    @CryptoRabitHole
                  </a>
                </Button>
              </div>
            </div>
          </div>
          <div className="relative w-full max-w-sm mx-auto md:mx-0">
            <div className="relative aspect-[4/5] rounded-3xl border border-cyan-400/50 bg-black/60 cyber-grid overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.5)]">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 py-6">
                <div className="space-y-1.5">
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-cyan-300/90">
                    Founder Mint
                  </span>
                  <p className="font-display text-xs md:text-sm text-white">
                    Our official Ciphers &amp; Sentinels collection for the next era of The Crypto Rabbit Hole universe.
                  </p>
                  <p className="text-[0.65rem] md:text-xs text-cyan-200 uppercase tracking-[0.22em]">
                    Be part of the future of Esoteria!
                  </p>
                </div>

                <div className="mt-1 w-full max-w-xs rounded-2xl overflow-hidden border border-cyan-400/40 bg-black/70 shadow-[0_0_26px_rgba(34,211,238,0.6)]">
                  <div className="relative w-full aspect-[4/5]">
                    <Image
                      src="/images/design-mode/Cipher%20Concept.png"
                      alt="Cipher concept art"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                <p className="text-[0.7rem] text-muted-foreground max-w-xs">
                  Visuals, rarity tables, and full mint mechanics to be revealed in waves. This is your early ping.
                </p>
              </div>
              <div className="absolute inset-0 opacity-60 mix-blend-screen">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 0 0, rgba(56,189,248,0.4), transparent 60%), radial-gradient(circle at 100% 100%, rgba(244,114,182,0.4), transparent 60%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </HoloPanel>

      {/* PFP SHOWCASE */}
      <HoloPanel accent="purple">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="space-y-3 lg:w-1/3">
            <h2 className="font-display text-2xl md:text-3xl text-white">Ciphers &amp; Sentinels PFPs</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Two mirrored archetypes. Ciphers are signal-obsessed tacticians. Sentinels are hyper-precise guardians
              holding the line when markets and metas go chaotic.
            </p>
          </div>
          <div className="grid gap-6 lg:w-2/3 md:grid-cols-2">
            <div className="relative">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-display text-lg text-cyan-300">Cipher PFP</h3>
                <Badge className="border border-cyan-400/60 bg-cyan-500/15 text-[0.65rem] uppercase tracking-[0.16em]">
                  Tactical
                </Badge>
              </div>
              <div className="relative aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-2xl border border-cyan-500/60 bg-gradient-to-br from-cyan-500/20 via-slate-900/90 to-sky-500/20 shadow-[0_0_40px_rgba(34,211,238,0.45)]">
                <Image
                  src="/images/design-mode/Cipher%20Concept.png"
                  alt="Cipher PFP concept"
                  fill
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[0.6rem] md:text-xs uppercase tracking-[0.25em] text-white/80 bg-black/50 px-3 py-1 rounded-full rotate-[-22deg] shadow-[0_0_18px_rgba(0,0,0,0.9)]">
                    Not final image
                  </span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-display text-lg text-fuchsia-300">Sentinel PFP</h3>
                <Badge className="border border-fuchsia-400/60 bg-fuchsia-500/15 text-[0.65rem] uppercase tracking-[0.16em]">
                  Guardian
                </Badge>
              </div>
              <div className="relative aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-2xl border border-fuchsia-500/60 bg-gradient-to-br from-fuchsia-500/20 via-slate-900/90 to-purple-500/20 shadow-[0_0_40px_rgba(244,114,182,0.5)]">
                <Image
                  src="/images/design-mode/Cipher%20Concept.png"
                  alt="Sentinel PFP concept"
                  fill
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[0.6rem] md:text-xs uppercase tracking-[0.25em] text-white/80 bg-black/50 px-3 py-1 rounded-full rotate-[-22deg] shadow-[0_0_18px_rgba(0,0,0,0.9)]">
                    Not final image
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </HoloPanel>

      {/* FOUNDER PERKS ACCORDION */}
      <HoloPanel accent="purple">
        <div className="space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl text-white">Founder Perks</h2>
              <p className="text-sm text-muted-foreground">
                A snapshot of what we’re planning for early Ciphers &amp; Sentinels supporters. More details to be
                revealed as we approach mint.
              </p>
            </div>
            <Badge className="mt-1 w-fit border border-purple-400/60 bg-purple-500/15 text-[0.65rem] uppercase tracking-[0.16em]">
              View Founder Perks
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Visible at a glance
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {visiblePerks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <details className="group rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm transition-colors hover:border-purple-400/60">
                <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground group-open:text-purple-200">
                    View additional founder perks
                  </span>
                  <span className="rounded-full border border-purple-400/50 bg-purple-500/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-purple-200">
                    Expand
                  </span>
                </summary>
                <div className="mt-3 space-y-2 group-open:animate-in group-open:fade-in-0">
                  <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                    {hiddenPerks.map((perk) => (
                      <li key={perk} className="flex gap-2">
                        <span className="mt-1 h-1 w-3 rounded-full bg-purple-400/70" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="pt-1 text-[0.7rem] text-muted-foreground/80">
                    These are placeholder perks and subject to refinement as we ship more of the C&amp;S ecosystem.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </HoloPanel>

      <CtaStrip />

      {/* CAMPAIGN SECTIONS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {storySections.map((section, index) => (
          <HoloPanel
            key={section.id}
            accent={index % 2 === 0 ? "cyan" : "purple"}
            className="h-full flex flex-col justify-between"
            title={section.title}
          >
            <p>{section.body}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 aspect-video">
                <div className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  Image / Storyboard Placeholder
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 aspect-video">
                <div className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  Teaser Video / Clip Placeholder
                </div>
              </div>
            </div>
          </HoloPanel>
        ))}
      </div>

      <CtaStrip />

      {/* MILESTONES / UNLOCKS */}
      <HoloPanel accent="cyan">
        <div className="space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl text-white">Mint Milestones &amp; Unlocks</h2>
              <p className="text-sm text-muted-foreground">
                As the mint fills, new experiences, drops, and events unlock for Ciphers &amp; Sentinels founders.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-cyan-200">
              <span className="rounded-full bg-black/50 px-3 py-1 border border-cyan-500/60">
                Progress: <span className="font-semibold text-cyan-100">{PROGRESS_PCT}%</span>
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MILESTONE_THRESHOLDS.map((threshold) => {
              const unlocked = PROGRESS_PCT >= threshold
              const Icon = unlocked ? Unlock : Lock

              return (
                <div
                  key={threshold}
                  className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-black/40 px-4 py-3 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={unlocked ? "h-4 w-4 text-emerald-300" : "h-4 w-4 text-cyan-300/70"}
                      />
                      <span className="text-xs font-mono uppercase tracking-[0.16em] text-cyan-100">
                        {threshold}%{" "}
                        <span className="opacity-60">{unlocked ? "Unlocked" : "Locked"}</span>
                      </span>
                    </div>
                    <span
                      className={
                        unlocked
                          ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-200"
                          : "rounded-full bg-cyan-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-cyan-200/80"
                      }
                    >
                      {unlocked ? "Live" : "Soon"}
                    </span>
                  </div>
                  <p className="mt-2 text-[0.7rem] text-muted-foreground">
                    Placeholder unlock copy for the {threshold}% milestone — think new play mode, lore drop, or reward
                    bracket for founders.
                  </p>
                  {unlocked && (
                    <div className="mt-2 h-px w-full bg-gradient-to-r from-emerald-400/70 via-cyan-400/60 to-transparent" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </HoloPanel>

      <CtaStrip />

      {/* BACK TO ARCADE */}
      <div className="flex justify-center pt-4">
        <Button asChild variant="ghost" size="lg" className="text-xs md:text-sm text-muted-foreground">
          <Link href="/">Back to Arcade Hub</Link>
        </Button>
      </div>
    </div>
  )
}


