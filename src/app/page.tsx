'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { motion } from 'motion/react'

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

/* ── Split visualization: one source splitting to many ── */
function SplitVisual() {
  return (
    <div className="relative h-full w-full">
      {/* Radial glow behind */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,208,0,0.06) 0%, transparent 60%)' }}
      />

      {/* Central diamond */}
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-pkt-accent/60 bg-pkt-accent/10 shadow-[0_0_30px_rgba(255,208,0,0.15)]" />
      <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-pkt-accent/20" />

      {/* Radiating lines to outer diamonds */}
      {[
        { x: '20%', y: '25%' },
        { x: '75%', y: '18%' },
        { x: '80%', y: '65%' },
        { x: '15%', y: '72%' },
        { x: '50%', y: '12%' },
      ].map((pos, i) => (
        <div key={i}>
          {/* Connection line */}
          <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ zIndex: 0 }}>
            <line
              x1="50%"
              y1="50%"
              x2={pos.x}
              y2={pos.y}
              stroke="rgba(255,208,0,0.12)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>
          {/* Outer diamond */}
          <div
            className="absolute h-5 w-5 rotate-45 border border-white/20 bg-white/5"
            style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%) rotate(45deg)' }}
          />
        </div>
      ))}

      {/* Corner ticks */}
      <div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-pkt-accent/40" />
      <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-pkt-accent/40" />
      <div className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-pkt-accent/40" />
      <div className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-pkt-accent/40" />

      {/* Labels */}
      <span className="absolute bottom-3 left-3 font-mono text-[8px] uppercase tracking-widest text-pkt-text-tertiary">
        {'[ split.protocol ]'}
      </span>
      <span className="absolute right-3 top-3 font-mono text-[8px] text-pkt-accent/50">sys.active</span>
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
        <motion.nav {...fade(0)} className="mx-auto flex max-w-6xl items-center justify-between px-8 pt-6 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center border border-pkt-border bg-white/[0.06] -skew-x-6">
              <div className="h-2 w-2 bg-pkt-accent skew-x-6" />
            </div>
            <span className="font-mono text-sm font-bold uppercase tracking-[3px] text-pkt-text">Packet</span>
          </div>

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
        <section className="mx-auto max-w-6xl px-8 lg:px-12">
          <div className="grid min-h-[80vh] items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left: copy */}
            <div className="pt-16 lg:pt-0">
              <motion.div {...fade(0.1)} className="flex items-center gap-3">
                <div className="h-px w-8 bg-pkt-accent" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-pkt-accent">
                  P2P Payments Reimagined
                </span>
              </motion.div>

              <motion.h1
                {...fade(0.15)}
                className="mt-6 text-[clamp(2.5rem,5vw,4.2rem)] font-extrabold uppercase leading-[0.92] tracking-tight text-white"
              >
                Split money
                <br />
                with friends,
                <br />
                <span className="text-pkt-accent">not headaches.</span>
              </motion.h1>

              <motion.p
                {...fade(0.2)}
                className="mt-6 max-w-md text-base leading-relaxed text-pkt-text-secondary lg:text-lg"
              >
                Scan a QR. Money moves instantly. Create a Lucky Split and watch friends race to claim their random
                share. No wallets, no gas, no crypto visible.
              </motion.p>

              <motion.div {...fade(0.25)} className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => router.push('/login')}
                  className="flex h-14 items-center gap-3 bg-pkt-accent px-8 font-bold uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.98] pkt-clip-md"
                >
                  Get Started
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
            <motion.div {...fade(0.2)} className="relative hidden lg:block">
              <div className="relative mx-auto h-[420px] w-full max-w-md border border-pkt-border bg-pkt-surface/50 backdrop-blur-sm">
                <SplitVisual />
              </div>
              {/* Floating meta label */}
              <div className="absolute -bottom-4 -right-4 border border-pkt-border bg-pkt-bg px-3 py-1.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-pkt-text-tertiary">
                  Verifiable on-chain randomness
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            PERFORATION LINE — full width break
        ════════════════════════════════════════════════════ */}
        <motion.div {...fade(0.35)} className="relative mx-auto max-w-6xl px-8 lg:px-12">
          <div className="h-px w-full bg-pkt-accent/40 shadow-[0_0_8px_var(--pkt-accent)]" />
          <div
            className="absolute -top-[4px] left-8 h-[9px] w-[9px] bg-pkt-accent lg:left-12"
            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
          />
          <span className="absolute -top-[14px] right-8 font-mono text-[9px] text-pkt-accent/70 lg:right-12">
            protocol.active
          </span>
        </motion.div>

        {/* ════════════════════════════════════════════════════
            METRICS STRIP — 4-column stats
        ════════════════════════════════════════════════════ */}
        <motion.section {...fade(0.4)} className="mx-auto max-w-6xl px-8 py-16 lg:px-12">
          <div className="grid grid-cols-2 gap-px bg-pkt-border lg:grid-cols-4">
            {[
              { value: '< 0.5s', label: 'Settlement', detail: 'Deterministic finality' },
              { value: '$0.00', label: 'Gas Fees', detail: 'Fully sponsored' },
              { value: '100%', label: 'On-Chain', detail: 'Every transaction verifiable' },
              { value: 'Fair', label: 'Randomness', detail: 'Provable split algorithm' },
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
        <section className="mx-auto max-w-6xl px-8 pb-20 lg:px-12">
          <motion.div {...fade(0.45)} className="mb-10 flex items-center gap-3">
            <span className="font-mono text-[10px] text-pkt-accent">{'// how it works'}</span>
            <div className="h-px flex-1 bg-pkt-border" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-pkt-text-tertiary">
              {'[ 3 steps ]'}
            </span>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            {[
              {
                num: '01',
                title: 'Sign up with your phone',
                desc: 'Enter your phone number or email. A secure wallet is created for you in the background. No seed phrases, no extensions, no setup.',
              },
              {
                num: '02',
                title: 'Pay anyone instantly',
                desc: 'Every user has a QR code. Scan it, enter an amount, tap confirm. Settlement happens in under a second on Tempo. Both parties pay zero fees.',
              },
              {
                num: '03',
                title: 'Create a Lucky Split',
                desc: 'Pool money and set the number of shares. Friends claim random amounts — someone gets the big share, someone gets pocket change. Provably fair, always fun.',
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
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-8 py-20 lg:grid-cols-2 lg:gap-20 lg:px-12">
            {/* Left: visual representation of a split distribution */}
            <motion.div {...fade(0.55)} className="order-2 lg:order-1">
              <div className="relative border border-pkt-border bg-pkt-surface p-6">
                {/* Header */}
                <div className="mb-4 flex items-center gap-2 border-b border-pkt-border pb-3">
                  <span className="font-mono text-pkt-accent">{'//'}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-pkt-text">Lucky Split</span>
                  <span className="ml-auto font-mono text-[9px] text-pkt-text-tertiary">$20.00 pool</span>
                </div>
                {/* Distribution bars */}
                {[
                  { name: 'Alice', amount: '$8.42', pct: 42 },
                  { name: 'Bob', amount: '$4.18', pct: 21 },
                  { name: 'Carol', amount: '$0.73', pct: 4 },
                  { name: 'Dave', amount: '$6.67', pct: 33 },
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
            <motion.div {...fade(0.55)} className="order-1 lg:order-2">
              <div className="flex items-center gap-3">
                <div className="h-px w-8 bg-pkt-accent" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-pkt-accent">Core Mechanic</span>
              </div>
              <h2 className="mt-4 text-3xl font-extrabold uppercase leading-tight tracking-tight text-white lg:text-4xl">
                Lucky Split
                <br />
                <span className="text-pkt-accent">makes payments fun.</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-pkt-text-secondary">
                Put $20 in a pool for 4 friends. Each person claims a random share — maybe $8, maybe $0.73. The
                randomness is computed on-chain so every split is provably fair and auditable.
              </p>
              <p className="mt-3 text-base leading-relaxed text-pkt-text-secondary">
                It&apos;s the mechanic behind WeChat&apos;s viral red envelopes — now with verifiable fairness that no
                centralized platform can offer.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            FINAL CTA
        ════════════════════════════════════════════════════ */}
        <motion.section
          {...fade(0.6)}
          className="mx-auto flex max-w-6xl flex-col items-center px-8 py-24 text-center lg:px-12"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-pkt-accent">{'// get started'}</span>
          <h2 className="mt-4 text-2xl font-extrabold uppercase tracking-tight text-white lg:text-3xl">
            Ready to send your first payment?
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-pkt-text-secondary">
            Sign up with your phone number. No downloads, no extensions, no seed phrases. Just open the app and go.
          </p>

          <button
            onClick={() => router.push('/login')}
            className="mt-8 flex h-14 items-center gap-3 bg-pkt-accent px-10 font-bold uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.98] pkt-clip-md"
          >
            Open Packet
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
          <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6 lg:px-12">
            <div className="flex items-center gap-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
                Packet Protocol
              </span>
              <span className="hidden font-mono text-[10px] text-pkt-text-tertiary/50 sm:inline">
                P2P Payments &middot; Lucky Split &middot; Provably Fair
              </span>
            </div>
            <Barcode count={24} className="h-4" />
          </div>
        </footer>
      </div>
    </div>
  )
}
