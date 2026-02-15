'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { PacketLogo } from '@/components/inspired'

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
})

/* ── Decorative barcode strip ── */
function Barcode({ count = 48, className = '' }: { count?: number; className?: string }) {
  const bars = useMemo(
    () => Array.from({ length: count }, () => ({ h: Math.random() * 55 + 35, w: Math.random() > 0.6 ? 2 : 1 })),
    [count],
  )
  return (
    <div className={`flex items-end gap-[2px] ${className}`}>
      {bars.map((b, i) => (
        <div
          key={i}
          className="bg-pkt-accent/80 shadow-[0_0_3px_var(--pkt-accent)]"
          style={{ height: `${b.h}%`, width: b.w }}
        />
      ))}
    </div>
  )
}

/* ── Split visualization: one pool splitting to many recipients ── */
const SPLIT_NODES = [
  { x: '18%', y: '22%', amount: '$42.15', align: 'right' as const },
  { x: '78%', y: '16%', amount: '$10.83', align: 'left' as const },
  { x: '82%', y: '62%', amount: '$29.50', align: 'left' as const },
  { x: '14%', y: '70%', amount: '$3.67', align: 'right' as const },
  { x: '52%', y: '10%', amount: '$13.85', align: 'left' as const },
]

function SplitVisual() {
  return (
    <div className="relative h-full w-full">
      {/* Radial glow behind */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,208,0,0.06) 0%, transparent 60%)' }}
      />

      {/* Central diamond — the pool */}
      <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-pkt-accent/60 bg-pkt-accent/10 shadow-[0_0_30px_rgba(255,208,0,0.15)] md:h-16 md:w-16" />
      <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-pkt-accent/20 md:h-8 md:w-8" />
      {/* Pool amount label */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[22px] font-mono text-[9px] font-bold text-pkt-accent/70 md:translate-y-[28px] md:text-[10px]">
        $100
      </span>

      {/* Radiating lines to recipient nodes */}
      {SPLIT_NODES.map((node, i) => (
        <div key={i}>
          {/* Connection line */}
          <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ zIndex: 0 }}>
            <line
              x1="50%"
              y1="50%"
              x2={node.x}
              y2={node.y}
              stroke="rgba(255,208,0,0.12)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>
          {/* Recipient diamond */}
          <div
            className="absolute h-4 w-4 rotate-45 border border-white/20 bg-white/5 md:h-5 md:w-5"
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%) rotate(45deg)' }}
          />
          {/* Split amount label beside each node */}
          <span
            className="absolute font-mono text-[8px] font-medium text-pkt-text-secondary md:text-[9px]"
            style={{
              left: node.x,
              top: node.y,
              transform: node.align === 'left' ? 'translate(8px, -50%)' : 'translate(calc(-100% - 8px), -50%)',
            }}
          >
            {node.amount}
          </span>
        </div>
      ))}

      {/* Corner ticks */}
      <div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-pkt-accent/40" />
      <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-pkt-accent/40" />
      <div className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-pkt-accent/40" />
      <div className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-pkt-accent/40" />

      {/* Labels */}
      <span className="absolute bottom-2 left-2 font-mono text-[7px] uppercase tracking-widest text-pkt-text-tertiary md:bottom-3 md:left-3 md:text-[8px]">
        {'[ split.protocol ]'}
      </span>
      <span className="absolute right-2 top-2 font-mono text-[7px] text-pkt-accent/50 md:right-3 md:top-3 md:text-[8px]">
        sys.active
      </span>
    </div>
  )
}

/* ── Activity Marquee — fake live claims ticker ── */
const CLAIM_FEED = [
  { user: '+1 (604) ***-1234', packet: 'Happy Horse Year', amount: '+$15.50' },
  { user: 'ka***@gmail.com', packet: 'Happy New Year', amount: '+$0.30' },
  { user: '+44 20 ****-8821', packet: 'Birthday Bash', amount: '+$42.15' },
  { user: 'mr***@hey.com', packet: 'Lunar Luck', amount: '+$7.88' },
  { user: '+1 (415) ***-9087', packet: 'Friday Vibes', amount: '+$1.05' },
  { user: 'ji***@outlook.com', packet: 'Office Party', amount: '+$23.40' },
  { user: '+86 138 ****-5512', packet: 'Dragon Year', amount: '+$68.00' },
  { user: 'li***@pm.me', packet: 'Game Night', amount: '+$3.67' },
  { user: '+1 (212) ***-4400', packet: 'Lucky Draw', amount: '+$0.12' },
  { user: 'rj***@icloud.com', packet: 'Housewarming', amount: '+$11.90' },
]

function ActivityMarquee() {
  return (
    <div className="relative overflow-hidden border-y border-pkt-border bg-white/[0.02] py-3">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-pkt-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-pkt-bg to-transparent" />

      <div className="flex animate-marquee gap-8">
        {[...CLAIM_FEED, ...CLAIM_FEED].map((item, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
            <span className="font-mono text-[10px] text-pkt-text-secondary">
              <span className="text-pkt-text">{item.user}</span>
              {' opened '}
              <span className="text-pkt-accent/80">{item.packet}</span>{' '}
              <span className="font-bold text-emerald-400">{item.amount}</span>
            </span>
            <span className="ml-4 text-pkt-text-tertiary/30">|</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/app')
    }
  }, [ready, authenticated, router])

  if (!ready || authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pkt-bg">
        <span className="font-mono text-[10px] uppercase tracking-[4px] text-pkt-text-tertiary">
          {'> initializing_'}
        </span>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-pkt-bg">
      {/* ── Background layers ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--pkt-grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--pkt-grid-color) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,208,0,0.012) 10px, rgba(255,208,0,0.012) 11px)',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 0%, rgba(255,208,0,0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(255,208,0,0.03) 0%, transparent 40%)',
        }}
      />

      <div className="relative z-[1]">
        {/* ════════════════════════════════════════════════════
            NAV
        ════════════════════════════════════════════════════ */}
        <motion.nav {...fade(0)} className="mx-auto flex max-w-7xl items-center justify-between px-8 pt-6 md:px-12">
          <PacketLogo />

          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary">
                Testnet Live
              </span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="border border-pkt-border bg-white/[0.04] px-5 py-2 font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary transition-all hover:border-pkt-accent/50 hover:text-pkt-text"
            >
              Launch App
            </button>
          </div>
        </motion.nav>

        {/* ════════════════════════════════════════════════════
            HERO — two-column on desktop, stacked on mobile
        ════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-8 md:px-12">
          <div className="grid min-h-[80vh] items-center gap-12 md:grid-cols-2 md:gap-20">
            {/* Left: copy */}
            <div className="pt-16 md:pt-0">
              <motion.div {...fade(0.1)} className="flex items-center gap-3">
                <div className="h-px w-8 bg-pkt-accent" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-pkt-accent">
                  Lucky Packets, Real Stakes
                </span>
              </motion.div>

              <motion.h1
                {...fade(0.15)}
                className="mt-6 text-[clamp(2.5rem,5vw,4.2rem)] font-extrabold uppercase leading-[0.92] tracking-tight text-white"
              >
                Fund a packet.
                <br />
                Friends race
                <br />
                <span className="text-pkt-accent">to open it.</span>
              </motion.h1>

              <motion.p
                {...fade(0.2)}
                className="mt-6 max-w-md text-base leading-relaxed text-pkt-text-secondary md:text-lg"
              >
                Drop money into a lucky packet and share it with friends. Everyone races to open it — each person gets a
                random split. Big wins, tiny shares, and bragging rights. All provably fair on-chain.
              </motion.p>

              <motion.div {...fade(0.25)} className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => router.push('/login')}
                  className="flex h-14 items-center gap-3 bg-pkt-accent px-8 font-bold uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.98] pkt-clip-md"
                >
                  Start Playing
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </button>
                <span className="font-mono text-[10px] uppercase text-pkt-text-tertiary">Free &middot; No install</span>
              </motion.div>

              {/* Barcode decoration */}
              <motion.div {...fade(0.3)} className="mt-10 flex items-center gap-4">
                <Barcode className="h-6" />
                <span className="font-mono text-[8px] uppercase leading-tight tracking-widest text-pkt-text-tertiary">
                  PKT
                  <br />
                  v1.0
                </span>
              </motion.div>
            </div>

            {/* Right: abstract split visual */}
            <motion.div {...fade(0.2)} className="relative">
              <div className="relative mx-auto h-[280px] w-full max-w-[320px] border border-pkt-border bg-pkt-surface/50 backdrop-blur-sm sm:h-[340px] sm:max-w-[380px] md:h-[420px] md:max-w-md">
                <SplitVisual />
              </div>
              {/* Floating meta label */}
              <div className="absolute -bottom-4 right-0 border border-pkt-border bg-pkt-bg px-3 py-1.5 md:-right-4">
                <span className="font-mono text-[9px] uppercase tracking-wider text-pkt-text-tertiary">
                  Lucky packet split &middot; fair randomness
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            ACTIVITY MARQUEE — live claims ticker
        ════════════════════════════════════════════════════ */}
        <motion.div {...fade(0.32)}>
          <ActivityMarquee />
        </motion.div>

        {/* ════════════════════════════════════════════════════
            PERFORATION LINE — full width break
        ════════════════════════════════════════════════════ */}
        <motion.div {...fade(0.35)} className="relative mx-auto max-w-7xl px-8 md:px-12">
          <div className="h-px w-full bg-pkt-accent/40 shadow-[0_0_8px_var(--pkt-accent)]" />
          <div
            className="absolute -top-[4px] left-8 h-[9px] w-[9px] bg-pkt-accent md:left-12"
            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
          />
          <span className="absolute -top-[14px] right-8 font-mono text-[9px] text-pkt-accent/70 md:right-12">
            protocol.active
          </span>
        </motion.div>

        {/* ════════════════════════════════════════════════════
            METRICS STRIP — 4-column stats
        ════════════════════════════════════════════════════ */}
        <motion.section {...fade(0.4)} className="mx-auto max-w-7xl px-8 py-16 md:px-12">
          <div className="grid grid-cols-2 gap-px bg-pkt-border md:grid-cols-4">
            {[
              { value: '< 0.5s', label: 'Instant Opens', detail: 'Claim your share in milliseconds' },
              { value: '$0.00', label: 'Zero Fees', detail: 'No gas, no catches' },
              { value: 'On-Chain', label: 'Provably Fair', detail: 'Every split is auditable' },
              { value: '🏆', label: 'Leaderboard', detail: 'Track who gets the biggest share' },
            ].map((stat, i) => (
              <div key={i} className="relative bg-pkt-bg p-6">
                {/* Top-left corner accent */}
                <div className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-pkt-accent/50" />
                <p className="font-mono text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-pkt-text-secondary">{stat.label}</p>
                <p className="mt-0.5 font-mono text-[10px] text-pkt-text-tertiary">{stat.detail}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════
            HOW IT WORKS — three numbered steps
        ════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-8 pb-20 md:px-12">
          <motion.div {...fade(0.45)} className="mb-10 flex items-center gap-3">
            <span className="font-mono text-[10px] text-pkt-accent">{'// how to play'}</span>
            <div className="h-px flex-1 bg-pkt-border" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-pkt-text-tertiary">
              {'[ 3 steps ]'}
            </span>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {[
              {
                num: '01',
                title: 'Fund a Packet',
                desc: 'Sign in with your phone or email — no crypto setup needed. Load up a packet with any amount, choose how many shares, and set the stakes.',
              },
              {
                num: '02',
                title: 'Share with Friends',
                desc: 'Send a link or QR code to your group. Everyone gets a shot at the packet. The race is on — first come, first served, and each share is random.',
              },
              {
                num: '03',
                title: 'Open & Compete',
                desc: 'Each person who opens the packet gets a random split — someone scores big, someone gets pocket change. Brag about your wins, climb the leaderboard, and challenge the next round.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                {...fade(0.5 + i * 0.08)}
                className="group relative border border-pkt-border bg-pkt-surface p-8 transition-colors hover:border-pkt-accent/30"
              >
                {/* Corner tick decorations */}
                <div className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-pkt-accent opacity-40 transition-opacity group-hover:opacity-100" />
                <div className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-pkt-accent opacity-40 transition-opacity group-hover:opacity-100" />

                <span className="font-mono text-[40px] font-bold leading-none text-white/[0.04]">{step.num}</span>
                <h3 className="mt-3 text-base font-bold uppercase tracking-wide text-pkt-text">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-pkt-text-secondary">{step.desc}</p>

                {/* Bottom accent bar */}
                <div className="mt-6 h-[2px] w-8 bg-pkt-accent/30 transition-all group-hover:w-12 group-hover:bg-pkt-accent/60" />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            LUCKY SPLIT FEATURE — two-column reversed
        ════════════════════════════════════════════════════ */}
        <section className="border-t border-pkt-border bg-white/[0.01]">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-8 py-20 md:grid-cols-2 md:gap-20 md:px-12">
            {/* Left: visual representation of a split distribution */}
            <motion.div {...fade(0.55)} className="order-2 md:order-1">
              <div className="relative border border-pkt-border bg-pkt-surface p-6">
                {/* Header */}
                <div className="mb-4 flex items-center gap-2 border-b border-pkt-border pb-3">
                  <span className="font-mono text-pkt-accent">{'//'}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-pkt-text">Lucky Split</span>
                  <span className="ml-auto font-mono text-[9px] text-pkt-text-tertiary">$100 pool</span>
                </div>
                {/* Distribution bars */}
                {[
                  { name: 'Alice', amount: '$42.15', pct: 42 },
                  { name: 'Bob', amount: '$20.88', pct: 21 },
                  { name: 'Carol', amount: '$3.67', pct: 4 },
                  { name: 'Dave', amount: '$33.30', pct: 33 },
                ].map((p) => (
                  <div key={p.name} className="mt-3 flex items-center gap-3">
                    <span className="w-12 font-mono text-[11px] text-pkt-text-secondary">{p.name}</span>
                    <div className="h-5 flex-1 bg-white/[0.03]">
                      <div className="h-full bg-pkt-accent/20" style={{ width: `${p.pct}%` }}>
                        <div
                          className="h-full w-full bg-pkt-accent/40"
                          style={{ width: `${Math.min(100, p.pct * 2)}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-14 text-right font-mono text-xs font-bold text-pkt-text">{p.amount}</span>
                  </div>
                ))}
                <p className="mt-4 border-t border-dashed border-pkt-border pt-3 font-mono text-[9px] uppercase tracking-wider text-pkt-text-tertiary">
                  Randomness seed: blockhash + claimIndex + msg.sender
                </p>
              </div>
            </motion.div>

            {/* Right: copy */}
            <motion.div {...fade(0.55)} className="order-1 md:order-2">
              <div className="flex items-center gap-3">
                <div className="h-px w-8 bg-pkt-accent" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-pkt-accent">The Game</span>
              </div>
              <h2 className="mt-4 text-3xl font-extrabold uppercase leading-tight tracking-tight text-white md:text-4xl">
                Who got the
                <br />
                <span className="text-pkt-accent">biggest share?</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-pkt-text-secondary">
                Fund a $100 packet for your group. Everyone races to open it — Alice scores $42.15, Dave gets $33.30,
                and Carol gets $3.67. The variance is what makes it fun.
              </p>
              <p className="mt-3 text-base leading-relaxed text-pkt-text-secondary">
                Inspired by WeChat&apos;s viral red envelope mechanic — but with on-chain randomness that&apos;s
                provably fair. No one can rig the split, not even the creator. Flex your wins, roast the losers.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            FINAL CTA
        ════════════════════════════════════════════════════ */}
        <motion.section
          {...fade(0.6)}
          className="mx-auto flex max-w-7xl flex-col items-center px-8 py-24 text-center md:px-12"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-pkt-accent">{'// your move'}</span>
          <h2 className="mt-4 text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl">
            Ready to drop your first packet?
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-pkt-text-secondary">
            Sign in with your phone number. Fund a packet. Share it with your group. Watch the chaos unfold.
          </p>

          <button
            onClick={() => router.push('/login')}
            className="mt-8 flex h-14 items-center gap-3 bg-pkt-accent px-10 font-bold uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.98] pkt-clip-md"
          >
            Drop a Packet
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>

          <div className="mt-4 flex items-center gap-6 font-mono text-[9px] uppercase text-pkt-text-tertiary">
            <span>Tempo Moderato Testnet</span>
            <span className="h-3 w-px bg-pkt-border" />
            <span>{'[ v1.0.0 ]'}</span>
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════ */}
        <footer className="border-t border-pkt-border">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 md:px-12">
            <div className="flex items-center gap-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">Packet</span>
              <span className="hidden font-mono text-[10px] text-pkt-text-tertiary/50 sm:inline">
                Lucky Packets &middot; Social Splits &middot; Provably Fair
              </span>
            </div>
            <Barcode count={24} className="h-4" />
          </div>
        </footer>
      </div>
    </div>
  )
}
