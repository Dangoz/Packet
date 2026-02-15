'use client'

import { usePrivy, useLoginWithEmail, useLoginWithSms } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/* ── Animated Packet Cards ── */
const PACKETS = [
  { amount: '$8.42', color: 'rgba(200, 20, 20, 0.85)', label: 'Lucky' },
  { amount: '$2.17', color: 'rgba(180, 140, 0, 0.85)', label: 'Fortune' },
  { amount: '$14.90', color: 'rgba(200, 20, 20, 0.85)', label: 'Prosperity' },
  { amount: '$0.73', color: 'rgba(30, 30, 30, 0.9)', label: 'Mystery' },
  { amount: '$5.00', color: 'rgba(180, 140, 0, 0.85)', label: 'Blessing' },
]

function ShufflingPackets() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % PACKETS.length)
    }, 2400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-[360px] w-[260px]">
      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,208,0,0.06) 0%, transparent 70%)' }}
      />

      {PACKETS.map((pkt, i) => {
        const offset = (i - active + PACKETS.length) % PACKETS.length
        const isTop = offset === 0
        const zIndex = PACKETS.length - offset

        return (
          <motion.div
            key={i}
            animate={{
              y: offset * 14,
              x: offset * 6 - 15,
              scale: 1 - offset * 0.04,
              rotateZ: offset * 2.5 - 3,
              opacity: offset > 3 ? 0 : 1 - offset * 0.15,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2"
            style={{ zIndex, marginLeft: -80, marginTop: -120 }}
          >
            <div
              className="relative flex h-[240px] w-[160px] flex-col items-center border border-white/20 backdrop-blur-sm"
              style={{
                background: pkt.color,
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              }}
            >
              {/* Circle seal */}
              <div className="mt-8 h-12 w-12 rounded-full border border-white/40" />
              {/* Hatching */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
                }}
              />

              {/* Amount (visible on top card) */}
              <AnimatePresence>
                {isTop && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-10 flex flex-col items-center"
                  >
                    <span className="font-mono text-2xl font-bold text-white">{pkt.amount}</span>
                    <span className="mt-1 font-mono text-[8px] uppercase tracking-[3px] text-white/60">
                      {pkt.label}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom label */}
              <span className="absolute bottom-3 font-mono text-[8px] uppercase tracking-[2px] text-white/50">
                Packet
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ── OTP Input ── */
function OtpInput({ length = 6, onComplete }: { length?: number; onComplete: (code: string) => void }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return
      const char = value.slice(-1)
      const next = [...values]
      next[index] = char
      setValues(next)

      if (char && index < length - 1) {
        inputsRef.current[index + 1]?.focus()
      }

      const code = next.join('')
      if (code.length === length && next.every((v) => v)) {
        onComplete(code)
      }
    },
    [values, length, onComplete],
  )

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !values[index] && index > 0) {
        inputsRef.current[index - 1]?.focus()
      }
    },
    [values],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
      if (!pasted) return
      const next = [...values]
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
      setValues(next)
      const focusIdx = Math.min(pasted.length, length - 1)
      inputsRef.current[focusIdx]?.focus()
      if (pasted.length === length) onComplete(pasted)
    },
    [values, length, onComplete],
  )

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-10 border border-pkt-border bg-white/[0.03] text-center font-mono text-lg text-white outline-none transition-colors focus:border-pkt-accent focus:bg-pkt-accent/5"
        />
      ))}
    </div>
  )
}

/* ── Login Form ── */
function LoginForm() {
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')

  const email = useLoginWithEmail()
  const sms = useLoginWithSms()

  const flow = method === 'email' ? email : sms
  const awaitingCode = flow.state.status === 'awaiting-code-input' || flow.state.status === 'submitting-code'
  const sending = flow.state.status === 'sending-code'
  const submitting = flow.state.status === 'submitting-code'

  useEffect(() => {
    if (flow.state.status === 'error') {
      setError(flow.state.error?.message || 'Something went wrong. Try again.')
    }
  }, [flow.state])

  const handleSendCode = async () => {
    setError('')
    try {
      if (method === 'email') {
        await email.sendCode({ email: identifier })
      } else {
        await sms.sendCode({ phoneNumber: identifier })
      }
    } catch {
      setError('Failed to send code. Check your input.')
    }
  }

  const handleVerify = async (code: string) => {
    setError('')
    try {
      await flow.loginWithCode({ code })
    } catch {
      setError('Invalid code. Please try again.')
    }
  }

  return (
    <div>
      {/* Method tabs */}
      <div className="mb-6 flex gap-0 border border-pkt-border">
        {(['email', 'phone'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMethod(m)
              setIdentifier('')
              setError('')
            }}
            className={`flex-1 py-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              method === m
                ? 'bg-pkt-accent text-black font-bold'
                : 'bg-transparent text-pkt-text-secondary hover:text-pkt-text'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!awaitingCode ? (
          /* ── Step 1: Enter identifier ── */
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
          >
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary">
              {method === 'email' ? 'Email address' : 'Phone number'}
            </label>
            <input
              type={method === 'email' ? 'email' : 'tel'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && identifier && handleSendCode()}
              placeholder={method === 'email' ? 'you@example.com' : '+1 234 567 8900'}
              className="h-12 w-full border border-pkt-border border-l-[3px] border-l-pkt-accent bg-white/[0.03] px-4 font-mono text-sm text-white outline-none placeholder:text-pkt-text-tertiary focus:border-pkt-accent focus:bg-pkt-accent/5 transition-colors"
            />

            <button
              onClick={handleSendCode}
              disabled={!identifier || sending}
              className="mt-4 flex h-12 w-full items-center justify-between bg-pkt-accent px-5 font-bold uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none pkt-clip-sm"
            >
              <span>{sending ? 'Sending...' : 'Send Code'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
          </motion.div>
        ) : (
          /* ── Step 2: Enter OTP ── */
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary">
              Enter the code sent to
            </label>
            <p className="mb-4 font-mono text-sm text-pkt-accent">{identifier}</p>

            <OtpInput onComplete={handleVerify} />

            {submitting && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary">
                Verifying...
              </p>
            )}

            <button
              onClick={() => {
                setIdentifier('')
                setError('')
                // Reset by switching method back and forth
                setMethod((m) => m)
                // Force a re-mount by navigating
                window.location.reload()
              }}
              className="mt-6 font-mono text-[11px] uppercase tracking-wider text-pkt-text-tertiary transition-colors hover:text-pkt-text"
            >
              &larr; Use a different {method}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 font-mono text-[11px] text-red-400">
          {error}
        </motion.p>
      )}
    </div>
  )
}

/* ── Page ── */
export default function LoginPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/app')
    }
  }, [ready, authenticated, router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pkt-bg">
        <span className="font-mono text-[10px] uppercase tracking-[4px] text-pkt-text-tertiary">
          {'> initializing_'}
        </span>
      </div>
    )
  }

  if (authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pkt-bg">
        <span className="font-mono text-[10px] uppercase tracking-[4px] text-pkt-text-tertiary">
          {'> redirecting_'}
        </span>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-pkt-bg">
      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--pkt-grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--pkt-grid-color) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ═══════════════════════════════════════
          LEFT — Shuffling Packets Visual
      ═══════════════════════════════════════ */}
      <div className="relative z-[1] hidden w-1/2 flex-col items-center justify-center overflow-hidden border-r border-pkt-border md:flex">
        {/* Diagonal hatch */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,208,0,0.015) 10px, rgba(255,208,0,0.015) 11px)',
          }}
        />

        {/* Animated packets */}
        <ShufflingPackets />

        {/* Bottom label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 left-8 right-8 flex items-end justify-between"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-pkt-text-tertiary">
              {'[ lucky.split ]'}
            </p>
            <p className="mt-1 font-mono text-[9px] text-pkt-text-tertiary/60">Provably fair on-chain randomness</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-pkt-text-tertiary">Live</span>
          </div>
        </motion.div>

        {/* Top-left logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute left-8 top-8 flex items-center gap-3"
        >
          <div className="grid h-8 w-8 place-items-center border border-pkt-border bg-white/[0.06] -skew-x-6">
            <div className="h-2 w-2 bg-pkt-accent skew-x-6" />
          </div>
          <span className="font-mono text-sm font-bold uppercase tracking-[3px] text-pkt-text">Packet</span>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT — Auth Form
      ═══════════════════════════════════════ */}
      <div className="relative z-[1] flex w-full flex-col items-center justify-center px-6 md:w-1/2 md:px-12">
        {/* Mobile-only logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-6 top-6 flex items-center gap-3 md:hidden"
        >
          <div className="grid h-7 w-7 place-items-center border border-pkt-border bg-white/[0.06] -skew-x-6">
            <div className="h-1.5 w-1.5 bg-pkt-accent skew-x-6" />
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-[3px] text-pkt-text">Packet</span>
        </motion.div>

        <div className="w-full max-w-sm">
          {/* Section marker */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-pkt-accent">{'// sign in'}</span>
              <div className="h-px flex-1 bg-pkt-border" />
            </div>
            <h2 className="mt-5 text-2xl font-bold uppercase tracking-tight text-white">Welcome</h2>
            <p className="mt-2 text-sm text-pkt-text-secondary">Sign in with your phone or email to get started.</p>
          </motion.div>

          {/* Auth form card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
          >
            <div className="relative border border-pkt-border bg-pkt-surface p-6">
              {/* Corner ticks */}
              <div className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-pkt-accent/50" />
              <div className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-pkt-accent/50" />

              <LoginForm />
            </div>
          </motion.div>

          {/* Reassurances */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-pkt-border" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-pkt-text-tertiary">
                secure &middot; private
              </span>
              <div className="h-px flex-1 bg-pkt-border" />
            </div>

            <ul className="mt-4 space-y-2">
              {[
                'No seed phrases or extensions needed',
                'Wallet created automatically for you',
                'Your phone or email is your identity',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <div className="mt-[5px] h-1 w-1 shrink-0 rotate-45 bg-pkt-text-tertiary" />
                  <span className="font-mono text-[10px] leading-relaxed text-pkt-text-tertiary">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => router.push('/')}
              className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-tertiary transition-colors hover:text-pkt-text"
            >
              &larr; Back to home
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
