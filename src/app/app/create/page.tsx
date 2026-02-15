'use client'

import { useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { motion, AnimatePresence } from 'motion/react'
import NumberFlow, { continuous } from '@number-flow/react'
import { PacketCard, PacketButton, SectionLabel } from '@/components/inspired'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SplitSquareHorizontal, ExternalLink, Loader2, Copy, Check, Users, Link2, Share2 } from 'lucide-react'
import { useBalance } from '@/hooks/useBalance'
import { useCreatePool } from '@/hooks/useCreatePool'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  building: 'Building transaction...',
  signing: 'Sign in wallet...',
  broadcasting: 'Broadcasting...',
}

export default function CreatePage() {
  const { wallets } = useWallets()
  const wallet = wallets[0]
  const { rawBalance, loading: balanceLoading } = useBalance(wallet?.address)
  const { createPool, status, error, txHash, poolId, reset } = useCreatePool()

  const [amount, setAmount] = useState('')
  const [shares, setShares] = useState('')
  const [memo, setMemo] = useState('Happy Lunar New Year!')
  const [copied, setCopied] = useState(false)

  const amountNum = parseFloat(amount) || 0
  const sharesNum = parseInt(shares) || 0
  const memoLen = new TextEncoder().encode(memo).length

  const isCreating = status === 'building' || status === 'signing' || status === 'broadcasting'
  const created = status === 'success' && !!txHash

  const isValid =
    amountNum > 0 &&
    amountNum <= rawBalance &&
    sharesNum >= 1 &&
    sharesNum <= 255 &&
    amountNum >= sharesNum * 0.01 &&
    memoLen > 0 &&
    memoLen <= 31

  const avg = sharesNum > 0 ? amountNum / sharesNum : 0
  const maxPossible = Math.min(avg * 2, amountNum - (sharesNum - 1) * 0.01)
  const showStats = amountNum > 0 && sharesNum > 0

  const handleCreate = async () => {
    if (!isValid || isCreating) return
    await createPool(amount, sharesNum, memo)
  }

  const handleReset = () => {
    reset()
    setCopied(false)
    setAmount('')
    setShares('')
    setMemo('Happy Lunar New Year!')
  }

  const claimUrl = poolId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/claim/${poolId}` : ''

  const handleCopy = async () => {
    if (!claimUrl) return
    await navigator.clipboard.writeText(claimUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence mode="wait">
      {created ? (
        /* ═══════════════════════════════════════════════
         *  SUCCESS — Centered packet card + sharing
         * ═══════════════════════════════════════════════ */
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-8 flex w-full flex-col items-center gap-8"
        >
          {/* Large envelope card */}
          <div
            className="relative flex h-[420px] w-[300px] flex-col items-center justify-between overflow-hidden border border-white/20 shadow-[0_0_60px_rgba(200,20,20,0.15)]"
            style={{
              background: 'linear-gradient(160deg, rgba(200, 20, 20, 0.9) 0%, rgba(180, 140, 0, 0.9) 100%)',
              clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
            }}
          >
            {/* Hatching overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                background:
                  'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
              }}
            />

            {/* Checkmark seal */}
            <div className="mt-10 grid h-16 w-16 place-items-center rounded-full border border-white/40 bg-white/10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Check className="h-7 w-7 text-white" strokeWidth={2.5} />
              </motion.div>
            </div>

            {/* Amount + Memo */}
            <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-3 px-6">
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-mono text-4xl font-bold text-white"
              >
                ${parseFloat(amount).toFixed(2)}
              </motion.span>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="max-w-full truncate text-center font-mono text-sm text-white/70"
              >
                {memo}
              </motion.span>
            </div>

            {/* Bottom info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative z-[1] mb-4 flex flex-col items-center gap-2"
            >
              <span className="border border-white/30 bg-black/30 px-4 py-1 font-mono text-[11px] uppercase tracking-wider text-white/80">
                {sharesNum} {sharesNum === 1 ? 'share' : 'shares'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[3px] text-white/40">Packet Created</span>
            </motion.div>
          </div>

          {/* Sharing section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="w-full max-w-md"
          >
            <PacketCard header="Share Your Packet">
              <div className="flex flex-col gap-5">
                {/* Claim link */}
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-pkt-accent/60">
                    <Link2 className="h-3 w-3" />
                    {'claim.link'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden border border-pkt-border bg-pkt-bg/50 px-3 py-2">
                      <p className="truncate font-mono text-[11px] text-pkt-text-secondary">{claimUrl}</p>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="grid h-9 w-9 shrink-0 place-items-center border border-pkt-border bg-pkt-bg/50 text-pkt-text-secondary transition-colors hover:border-pkt-accent/50 hover:text-pkt-accent"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Guidelines */}
                <div className="flex flex-col gap-3 border border-pkt-border bg-white/[0.02] p-4">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-pkt-text-tertiary">
                    <Share2 className="h-3 w-3" />
                    {'how.to.share'}
                  </span>
                  <div className="flex flex-col gap-2.5">
                    <GuidelineRow step="01" text="Copy the claim link above" />
                    <GuidelineRow step="02" text={`Send it to up to ${sharesNum} friends`} />
                    <GuidelineRow step="03" text="Each person claims a random split" />
                    <GuidelineRow step="04" text="Track claims in the Packets tab" />
                  </div>
                </div>

                {/* Pool ID + Explorer */}
                <div className="flex items-center justify-between">
                  {poolId && (
                    <span className="font-mono text-[9px] text-pkt-text-tertiary">
                      {'[ '}
                      {poolId.slice(0, 10)}...{poolId.slice(-6)}
                      {' ]'}
                    </span>
                  )}
                  <a
                    href={`https://explore.tempo.xyz/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-pkt-accent transition-all hover:brightness-110"
                  >
                    Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => window.open(`/app/packets`, '_self')}
                    className="flex flex-1 items-center justify-center gap-1.5 border border-pkt-border py-2.5 font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary transition-colors hover:border-pkt-accent/50 hover:text-pkt-accent"
                  >
                    <Users className="h-3 w-3" />
                    View Packets
                  </button>
                  <PacketButton className="flex-1 py-2.5" onClick={handleReset}>
                    Create Another
                  </PacketButton>
                </div>
              </div>
            </PacketCard>
          </motion.div>
        </motion.div>
      ) : (
        /* ═══════════════════════════════════════════════
         *  FORM — Create packet form + live preview
         * ═══════════════════════════════════════════════ */
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="mt-8 flex w-full flex-col items-center gap-8 md:flex-row md:items-center md:gap-0"
        >
          {/* ── Left: Form ── */}
          <PacketCard header="Create Packet" className="w-full max-w-sm md:w-[380px] md:max-w-none md:shrink-0">
            <div className="flex flex-col gap-6">
              {/* Amount */}
              <div className="flex flex-col gap-2">
                <SectionLabel>Amount ($)</SectionLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isCreating}
                  className="no-spinners"
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
                  Balance:{' '}
                  {balanceLoading ? (
                    '$—'
                  ) : (
                    <span className={amountNum > rawBalance ? 'text-red-400' : 'text-pkt-text-secondary'}>
                      ${rawBalance.toFixed(2)}
                    </span>
                  )}
                </span>
              </div>

              {/* Shares */}
              <div className="flex flex-col gap-2">
                <SectionLabel>Shares</SectionLabel>
                <Input
                  type="number"
                  min="1"
                  max="255"
                  step="1"
                  placeholder="1"
                  value={shares}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === 'e' || e.key === '-') e.preventDefault()
                  }}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d+$/.test(v)) setShares(v)
                  }}
                  disabled={isCreating}
                  className="no-spinners"
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
                  Min shares:{' '}
                  <span className={sharesNum < 1 && shares !== '' ? 'text-red-400' : 'text-pkt-text-secondary'}>1</span>
                </span>
              </div>

              {/* Memo */}
              <div className="flex flex-col gap-2">
                <SectionLabel>Memo</SectionLabel>
                <Input
                  maxLength={31}
                  placeholder="Happy Lunar New Year!"
                  value={memo}
                  onChange={(e) => {
                    const next = e.target.value
                    if (new TextEncoder().encode(next).length <= 31) setMemo(next)
                  }}
                  disabled={isCreating}
                />
                <span className="self-end font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
                  {memoLen}/31
                </span>
              </div>

              {/* Error */}
              <AnimatePresence>
                {status === 'error' && error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border border-red-400/30 bg-red-400/10 p-3"
                  >
                    <span className="font-mono text-[11px] text-red-400">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <PacketButton className="w-full py-3" disabled={!isValid || isCreating} onClick={handleCreate}>
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {STATUS_LABELS[status] || 'Processing...'}
                  </span>
                ) : (
                  'Create Packet'
                )}
              </PacketButton>
            </div>
          </PacketCard>

          {/* ── Center: Divider ── */}
          <Separator orientation="vertical" className="mx-8 hidden self-stretch bg-pkt-border md:block" />

          {/* ── Right: Live Preview ── */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              {/* Envelope card */}
              <div
                className="relative flex h-[340px] w-[240px] flex-col items-center justify-between overflow-hidden border border-white/20"
                style={{
                  background: 'linear-gradient(160deg, rgba(200, 20, 20, 0.85) 0%, rgba(180, 140, 0, 0.85) 100%)',
                  clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                }}
              >
                {/* Hatching overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07]"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
                  }}
                />

                {/* Circle seal */}
                <div className="mt-8 h-14 w-14 rounded-full border border-white/40" />

                {/* Amount + Memo */}
                <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2 px-4">
                  <span className="font-mono text-3xl font-bold text-white">
                    <NumberFlow
                      value={amountNum}
                      format={{
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: amountNum % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      }}
                      transformTiming={{ duration: 300, easing: 'ease-out' }}
                      spinTiming={{ duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                      trend={1}
                      plugins={[continuous]}
                      willChange
                    />
                  </span>

                  <AnimatePresence mode="wait">
                    <motion.span
                      key={memo || 'placeholder'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        'max-w-full truncate text-center font-mono text-[11px] text-white/70',
                        !memo && 'italic text-white/40',
                      )}
                    >
                      {memo || 'your message here'}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Share count badge */}
                <div className="relative z-[1] mb-3 flex flex-col items-center gap-2">
                  {sharesNum > 0 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border border-white/30 bg-black/30 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/80"
                    >
                      {sharesNum} {sharesNum === 1 ? 'share' : 'shares'}
                    </motion.span>
                  )}
                  <span className="font-mono text-[8px] uppercase tracking-[2px] text-white/50">Packet</span>
                </div>
              </div>

              {/* Split stats */}
              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full max-w-xs overflow-hidden"
                  >
                    <div className="border border-pkt-border bg-pkt-surface/50 p-4">
                      <span className="mb-3 flex items-center gap-1.5 font-mono text-[9px] text-pkt-accent/60">
                        <SplitSquareHorizontal className="h-3 w-3" />
                        split.preview
                      </span>

                      <div className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-wider">
                        <div className="flex items-center justify-between text-pkt-text-secondary">
                          <span className="text-pkt-text-tertiary">{'[ total ]'}</span>
                          <span>
                            ${amountNum.toFixed(2)} → {sharesNum} shares
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-pkt-text-secondary">
                          <span className="text-pkt-text-tertiary">{'[ avg ]'}</span>
                          <span>~${avg.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-pkt-text-secondary">
                          <span className="text-pkt-text-tertiary">{'[ range ]'}</span>
                          <span>$0.01 – ${maxPossible > 0 ? maxPossible.toFixed(2) : '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function GuidelineRow({ step, text }: { step: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-px shrink-0 font-mono text-[10px] font-bold text-pkt-accent/50">{step}</span>
      <span className="font-mono text-[11px] leading-relaxed text-pkt-text-secondary">{text}</span>
    </div>
  )
}
