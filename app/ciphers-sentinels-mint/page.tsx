import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"

import HoloPanel from "@/components/holo-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImagePlaceholder } from "@/components/image-placeholder"

export const metadata: Metadata = {
  title: "Mint Info — Ciphers & Sentinels | The Crypto Rabbit Hole",
  description: "Founder PFP identities for The Crypto Rabbit Hole. Mint Date: TBA. Final pricing confirmed before mint.",
}

// Force Vercel rebuild - all mint page updates included

const DISCORD_URL = "https://discord.gg/GJBbZHHUtY"
const NOTIFY_URL = "/notify"
const COMMUNITY_URL = "/community"

function CtaBlock() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
      <Button
        asChild
        size="lg"
        className="bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-sm md:text-base font-semibold shadow-[0_0_24px_hsl(var(--neon-cyan)/0.45)]"
      >
        <a href={NOTIFY_URL}>Get Notified</a>
      </Button>
      <Button
        asChild
        size="lg"
        variant="outline"
        className="border-white/20 bg-black/40 text-sm md:text-base hover:border-cyan-400/80 hover:text-cyan-300"
      >
        <a href={DISCORD_URL} target="_blank" rel="noreferrer">
          Join the Community
        </a>
      </Button>
    </div>
  )
}

export default function CiphersSentinelsMintPage() {
  return (
    <div className="space-y-10 md:space-y-12">
      {/* SECTION 1 — HERO */}
      <HoloPanel accent="cyan">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs font-mono uppercase tracking-[0.16em] text-cyan-300 border border-cyan-400/50">
              <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
              <span>Ciphers &amp; Sentinels</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
              Ciphers &amp; Sentinels
            </h1>
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              Founder PFPs for The Crypto Rabbit Hole®
            </p>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              Premium founder PFPs for the Crypto Rabbit Hole universe — a playable gaming ecosystem inspired by crypto,
              strategy, and community.
            </p>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              Ciphers &amp; Sentinels are the genesis identities of our universe. They grant access, rewards, voting
              rights, playable avatars, and long-term benefits across everything we build next.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 uppercase tracking-[0.18em] text-[0.64rem] font-semibold shadow-[0_0_18px_rgba(52,211,153,0.45)]">
                Mint Date: TBA
              </Badge>
              <div className="flex items-center gap-2 rounded-2xl border border-cyan-500/50 bg-black/40 px-3 py-2 text-xs font-mono text-cyan-200">
                <span className="opacity-70">Final pricing confirmed before mint</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaBlock />
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

      {/* SECTION 2 — WHAT YOU'RE BECOMING */}
      <HoloPanel accent="purple" title="Your On-Chain Identity">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="space-y-4 lg:w-2/3">
            <p className="text-sm md:text-base text-muted-foreground">
              Ciphers and Sentinels are founder identities in the world of Esoteria — the universe behind The Crypto
              Rabbit Hole.
            </p>
            <p className="text-sm md:text-base text-muted-foreground">
              This is not just a profile picture. It's your identity inside the Rabbit Hole.
            </p>
            <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                <span>Your avatar</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                <span>Your access key</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                <span>Your reward layer</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                <span>Your long-term seat in the ecosystem</span>
              </li>
            </ul>
          </div>
          <div className="lg:w-1/3">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-cyan-500/60 bg-gradient-to-br from-cyan-500/20 via-slate-900/90 to-sky-500/20 shadow-[0_0_40px_rgba(34,211,238,0.45)]">
              <Image
                src="/images/design-mode/Cipher%20Concept.png"
                alt="Cipher PFP"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </HoloPanel>

      {/* SECTION 3 — CIPHERS & SENTINELS PFPs */}
      <HoloPanel accent="purple">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="space-y-6 lg:w-1/3">
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-white mb-2">Ciphers &amp; Sentinels PFPs</h2>
              <p className="text-sm md:text-base text-muted-foreground font-medium">
                Two archetypes. One shared universe.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Collection Overview</h3>
              <div className="space-y-1">
                <p className="text-sm md:text-base text-white font-semibold">10,000 total PFPs</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <h4 className="font-display text-lg text-cyan-300">CIPHERS</h4>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">
                    Explorers • Analysts • Navigators
                  </p>
                  <p className="text-sm md:text-base text-muted-foreground">
                    80% supply (8,000) — the agile foundation of Esoteria's population.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-display text-lg text-fuchsia-300">SENTINELS</h4>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">
                    Guardians • Protectors • Elite Constructs
                  </p>
                  <p className="text-sm md:text-base text-muted-foreground">
                    20% supply (2,000) — rare, powerful, prestige class.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Collection Details</h4>
              <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                  <span>4 body types (Cipher/Sentinel × Male/Female)</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                  <span>~600 layers across the forms to avoid crossovers</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
                  <span>Designed as playable avatars and long-term identity passes</span>
                </li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground pt-2">
                Each PFP represents your place in the world of Esoteria and The Crypto Rabbit Hole® ecosystem.
              </p>
            </div>
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
                  src="/images/design-mode/Sentinel%20Concept.png"
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

      {/* SECTION 4 — THE JOURNEY */}
      <HoloPanel accent="purple" title="From a single comment to a playable universe">
        <div className="space-y-6">
          <div className="space-y-4 text-sm md:text-base text-muted-foreground">
            <p>
              In 2020, I told my traders and portfolio managers: "I've gone down the crypto rabbit hole… just wait for
              me, it'll be worth it."
            </p>
            <p>
              I first discovered crypto in 2017. By 2021, BAYC proved NFTs could power identity + community + culture —
              and I wanted to bring that energy to the mainstream in a way that was fun, approachable, and game-first.
            </p>
            <p>
              The spark came from real life: our pet bunny became the first avatar. From there, I built the game
              mechanics on paper and iterated through countless versions with my three sons — then created a board to
              make the game easy to learn and flow naturally.
            </p>
            <p>
              Since then, The Crypto Rabbit Hole has become a functioning TCG with a refined CryptoPunk aesthetic:
              futuristic, clean, and digital.
            </p>
            <p>
              We've run live events (including with non-crypto players), built a Tabletopia sandbox so anyone can test
              globally, and launched the Arcade with mini-games that will feed into participation rewards leading into
              the next phase.
            </p>
          </div>

          {/* Image Gallery - Full Width, Multiple Images */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
            <ImagePlaceholder label="Journey Image 1" aspectRatio="video" />
            <ImagePlaceholder label="Journey Image 2" aspectRatio="video" />
            <ImagePlaceholder label="Journey Image 3" aspectRatio="video" />
          </div>
        </div>
      </HoloPanel>

      {/* SECTION B — FOUNDER PASS VALUE STACK */}
      <HoloPanel accent="pink" title="The Founder Pass Value Stack">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            Every genesis avatar grants founder utility designed to compound as the ecosystem expands:
          </p>

          {/* Cipher Founder Benefits - Expandable */}
          <div className="space-y-4">
            <details className="group rounded-2xl border border-white/10 bg-black/40 px-4 py-3 transition-colors hover:border-pink-400/60">
              <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
                <div>
                  <h3 className="font-display text-lg text-cyan-300 mb-1">Cipher Founder Benefits</h3>
                  <p className="text-xs text-muted-foreground">All genesis avatars receive these benefits</p>
                </div>
                <span className="rounded-full border border-pink-400/50 bg-pink-500/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-pink-200 group-open:hidden">
                  Expand
                </span>
                <span className="rounded-full border border-pink-400/50 bg-pink-500/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-pink-200 hidden group-open:inline-block">
                  Collapse
                </span>
              </summary>
              <div className="mt-4 space-y-2 group-open:animate-in group-open:fade-in-0">
                <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Playable Otherside-compatible rig</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Legendary card packs (airdrop)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Epic card packs (airdrop)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Exclusive game board + dice skins</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Physical promo pack for holders</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Early access to future mints (guaranteed WL)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Founder voting rights + governance access</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Trait-based rewards system (rarer traits → more perks)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>Founder-only card variations</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                    <span>5–10% discount on ALL card pack purchases</span>
                  </li>
                </ul>
              </div>
            </details>
          </div>

          {/* Sentinel Elite Benefits - Expandable */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <details className="group rounded-2xl border border-white/10 bg-black/40 px-4 py-3 transition-colors hover:border-fuchsia-400/60">
              <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
                <div>
                  <h3 className="font-display text-lg text-fuchsia-300 mb-1">Sentinel Elite Benefits</h3>
                  <p className="text-xs text-muted-foreground">Everything in Cipher benefits plus:</p>
                </div>
                <span className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-fuchsia-200 group-open:hidden">
                  Expand
                </span>
                <span className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-fuchsia-200 hidden group-open:inline-block">
                  Collapse
                </span>
              </summary>
              <div className="mt-4 space-y-2 group-open:animate-in group-open:fade-in-0">
                <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                    <span>Extra packs</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                    <span>Double voting power</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                    <span>Exclusive Sentinel arena content</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                    <span>Signed physical founder promo pack</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                    <span>Premium cosmetics</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                    <span>Priority in future CxRH drops (guaranteed WL)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                    <span>15–20% discount on ALL card pack purchases</span>
                  </li>
                </ul>
              </div>
            </details>
          </div>

          <p className="text-sm md:text-base text-white font-medium pt-4 border-t border-white/10">
            This is far more than a PFP — it is a multi-utility identity pass.
          </p>

          <ImagePlaceholder label="Utility Icons / Perks Graphic" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION 5 — WHAT ALREADY EXISTS */}
      <HoloPanel accent="purple" title="Built, Playable, and Already Tested">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            This isn't a concept. The foundation is already live and has been tested in real play sessions.
          </p>
          <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>Fully playable TCG sandbox on Tabletopia</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>Live Arcade with multiple mini-games</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>75 original Gen-1 cards completed and ready for rarity modes</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>Expansion set planned and ready to develop (another 75 cards)</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>Successful live events with non-crypto and non-TCG players</span>
            </li>
          </ul>
          <ImagePlaceholder label="Tabletopia / Playmat / Cards" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION C — UPDATED: WHAT UNLOCKS AFTER PFP LAUNCH */}
      <HoloPanel accent="cyan" title="What Unlocks After the PFP Launch">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            The PFP launch activates what's already built and accelerates what comes next.
          </p>

          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-400/30 bg-black/40 p-4 space-y-3">
              <h3 className="font-display text-lg text-cyan-300">Card packs: 12 weeks after launch</h3>
              <p className="text-sm text-muted-foreground">
                Gen-1 card pack release with animated pack opening experiences and wallet integration.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Digital Card Game Features
              </h4>
              <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                  <span>Animated pack opening experiences</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                  <span>Full wallet integration for on-chain card ownership</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                  <span>Player vs Player (PvP) competitive modes</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                  <span>Seasonal expansions with new card sets</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                  <span>Trait-linked gameplay mechanics</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                  <span>Ranked ladders and competitive seasons</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                  <span>Multiplayer arenas for team-based gameplay</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-400/30 bg-black/40 p-4 space-y-3 mt-4">
              <h3 className="font-display text-lg text-emerald-300">Digital beta: 12 months after launch</h3>
              <p className="text-sm text-muted-foreground">
                Full digital beta game build with all features integrated and live.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm md:text-base text-muted-foreground pt-2">
            <p>• Seasonal modes and community events</p>
            <p>• More arcade games and participation rewards</p>
            <p>• Expansion development and deck-building options</p>
          </div>

          <ImagePlaceholder label="Roadmap / Timeline" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION D — SIMPLIFIED: FOUNDER ACCESS TIERS */}
      <HoloPanel accent="pink" title="Founder Access Tiers">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            Two access tiers designed for collectors, players, and long-term supporters. Exact allocations will be
            detailed before mint.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Cipher Founder Pass */}
            <div className="rounded-2xl border border-cyan-400/30 bg-black/40 p-5 space-y-4">
              <div className="space-y-2">
                <h3 className="font-display text-xl text-cyan-300">Cipher Founder Pass</h3>
                <Badge className="border border-cyan-400/60 bg-cyan-500/15 text-[0.65rem] uppercase tracking-[0.16em]">
                  8,000 supply
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                The innovators, traders, and explorers. Agile, adaptable, and connected to the flow of the chain.
              </p>
              <ul className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-cyan-400/70" />
                  <span>All founder perks</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-cyan-400/70" />
                  <span>Early access to games and modes</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-cyan-400/70" />
                  <span>Gen-1 card pack eligibility</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-cyan-400/70" />
                  <span>Participation rewards</span>
                </li>
              </ul>
            </div>

            {/* Sentinel Elite Pass */}
            <div className="rounded-2xl border border-fuchsia-400/30 bg-black/40 p-5 space-y-4">
              <div className="space-y-2">
                <h3 className="font-display text-xl text-fuchsia-300">Sentinel Elite Pass</h3>
                <Badge className="border border-fuchsia-400/60 bg-fuchsia-500/15 text-[0.65rem] uppercase tracking-[0.16em]">
                  2,000 supply
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                The guardians and power players. Stronger presence, enhanced perks, elevated rarity.
              </p>
              <ul className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>All Cipher perks plus elite benefits</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Priority access to all releases</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Increased reward weighting</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Sentinel-exclusive content</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Special recognition and legacy status</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 mt-4">
            <p className="text-xs md:text-sm text-muted-foreground italic">
              Note: An alternate mint/upgrade concept may allow Cipher holders to upgrade to Sentinel status. Details
              will be confirmed before mint.
            </p>
          </div>

          <ImagePlaceholder label="Tier Icons / Badges" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION 8 — PRICING & TRANSPARENCY */}
      <HoloPanel accent="cyan" title="Pricing & Transparency">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            Final pricing confirmed before mint. We commit to clear communication and a fair launch — no surprises.
          </p>
          <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>Mint Date: TBA</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>Chain: ApeChain</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>Avatars: Otherside-ready</span>
            </li>
          </ul>
          <ImagePlaceholder label="Clean Info Panel / Minimal Graphic" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION 9 — WHY BACK THIS NOW */}
      <HoloPanel accent="purple" title="The Founder Window">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            We are on the cusp of launch. The game, cards, and arcade foundation already exist — this is the entry point
            that fuels the next phase.
          </p>
          <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>The foundation is built</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>The universe already exists</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>Community feedback has shaped real iterations</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
              <span>This is the founder window — it won't repeat in the same way</span>
            </li>
          </ul>
          <ImagePlaceholder label="Community / Portal Visual" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION 10 — FINAL CTA */}
      <HoloPanel accent="cyan">
        <div className="space-y-6 text-center">
          <h2 className="font-display text-2xl md:text-3xl text-white">The Rabbit Hole Is Open</h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Mint Date: TBA. Follow along, join the community, and get notified when the next announcement lands.
          </p>
          <CtaBlock />
          <div className="pt-4">
            <Link
              href="/ciphers-sentinels"
              className="text-sm text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
            >
              View Ciphers &amp; Sentinels Overview
            </Link>
          </div>
        </div>
      </HoloPanel>
    </div>
  )
}

