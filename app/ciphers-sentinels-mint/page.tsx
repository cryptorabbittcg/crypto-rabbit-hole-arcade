import Link from "next/link"
import type { Metadata } from "next"

import HoloPanel from "@/components/holo-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImagePlaceholder } from "@/components/image-placeholder"

export const metadata: Metadata = {
  title: "Mint Info — Ciphers & Sentinels | The Crypto Rabbit Hole",
  description: "Founder PFP identities for The Crypto Rabbit Hole. Mint Date: TBA. Final pricing confirmed before mint.",
}

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
              <span>The Crypto Rabbit Hole</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
              Ciphers &amp; Sentinels
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              Founder PFPs for a living gaming universe — built for play, progression, and long-term utility.
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
            <ImagePlaceholder label="Hero Banner" aspectRatio="card" />
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
            <ImagePlaceholder label="Character / PFP Preview" aspectRatio="square" />
          </div>
        </div>
      </HoloPanel>

      {/* SECTION 3 — CIPHERS & SENTINELS */}
      <HoloPanel accent="cyan" title="Two Roles. One Rabbit Hole.">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-display text-lg md:text-xl text-cyan-300">CIPHERS</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                The innovators, traders, and explorers — agile, adaptable, and connected to the flow of the chain.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-lg md:text-xl text-fuchsia-300">SENTINELS</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                The guardians and power players — stronger presence, enhanced perks, elevated rarity.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Collection Details</h4>
            <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                <span>10,000 total supply</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                <span>Cipher: 8,000</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                <span>Sentinel: 2,000</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                <span>4 body types (Cipher / Sentinel × Male / Female)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                <span>~600 hand-crafted traits</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
                <span>Designed for Otherside-ready avatars</span>
              </li>
            </ul>
          </div>
          <ImagePlaceholder label="PFP Grid / Trait Preview" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION 4 — FOUNDER UTILITY SNAPSHOT */}
      <HoloPanel accent="pink" title="Founder Utility, Built to Compound">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            Holding a Cipher or Sentinel unlocks access across the Crypto Rabbit Hole ecosystem. Utility is layered —
            value compounds over time as new modes and drops come online.
          </p>
          <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-rose-400" />
              <span>Early access to games and modes</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-rose-400" />
              <span>Priority eligibility for Gen-1 card packs</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-rose-400" />
              <span>Founder-only events and leagues</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-rose-400" />
              <span>Participation rewards and drops</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-rose-400" />
              <span>Avatar utility across platforms</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-rose-400" />
              <span>Influence on future expansions</span>
            </li>
          </ul>
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

      {/* SECTION 6 — WHAT UNLOCKS AFTER PFP LAUNCH */}
      <HoloPanel accent="cyan" title="What Unlocks After the PFP Launch">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            The PFP launch activates what's already built and accelerates what comes next.
          </p>
          <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>Gen-1 card pack release: 12 weeks after launch</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>Seasonal modes and community events</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>More arcade games and participation rewards</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>Expansion development and deck-building options</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-4 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" />
              <span>Digital beta game build: 12 months after launch</span>
            </li>
          </ul>
          <ImagePlaceholder label="Roadmap / Timeline" aspectRatio="video" />
        </div>
      </HoloPanel>

      {/* SECTION 7 — FOUNDER ACCESS TIERS */}
      <HoloPanel accent="pink" title="Founder Access Tiers">
        <div className="space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            These tiers are access levels — designed for collectors, players, and long-term supporters. Exact
            allocations will be detailed before mint.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tier 1: Cipher Holder */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <h3 className="font-display text-lg text-cyan-300">Cipher Holder</h3>
              <ul className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-cyan-400/70" />
                  <span>1 Cipher PFP</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-cyan-400/70" />
                  <span>Founder role</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-cyan-400/70" />
                  <span>Early access to games</span>
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

            {/* Tier 2: Sentinel Holder */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <h3 className="font-display text-lg text-fuchsia-300">Sentinel Holder</h3>
              <ul className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>1 Sentinel PFP</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Enhanced founder role</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Priority access to releases</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Increased reward weighting</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-fuchsia-400/70" />
                  <span>Sentinel-exclusive content</span>
                </li>
              </ul>
            </div>

            {/* Tier 3: Dual Holder */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <h3 className="font-display text-lg text-purple-300">Dual Holder (Cipher + Sentinel)</h3>
              <ul className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-purple-400/70" />
                  <span>Both identities</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-purple-400/70" />
                  <span>Maximum access tier</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-purple-400/70" />
                  <span>Highest reward weighting</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-purple-400/70" />
                  <span>Priority across future drops</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-purple-400/70" />
                  <span>Special recognition and cosmetic perks</span>
                </li>
              </ul>
            </div>

            {/* Tier 4: Founder Vault */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <h3 className="font-display text-lg text-pink-300">Founder Vault (Limited)</h3>
              <ul className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                  <span>Multiple PFPs</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                  <span>Reserved allocations for future content</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                  <span>Physical reward eligibility (where applicable)</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                  <span>Direct feedback channel access</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-3 rounded-full bg-pink-400/70" />
                  <span>Legacy recognition inside Esoteria</span>
                </li>
              </ul>
            </div>
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

