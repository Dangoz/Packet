'use client'

import { useLoginWithEmail, useLoginWithSms } from '@privy-io/react-auth'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'

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
export function LoginForm({ onBack }: { onBack?: () => void }) {
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
                if (onBack) {
                  onBack()
                } else {
                  window.location.reload()
                }
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
