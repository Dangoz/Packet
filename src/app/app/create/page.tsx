'use client'

import { useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { motion, AnimatePresence } from 'motion/react'
import NumberFlow, { continuous } from '@number-flow/react'
import { PacketCard, PacketButton, SectionLabel } from '@/components/inspired'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SplitSquareHorizontal, Loader2, Check } from 'lucide-react'
import { ShareModal } from '@/components/ShareModal'
import { useBalance } from '@/hooks/useBalance'
import { useCreatePool } from '@/hooks/useCreatePool'
import { cn } from '@/lib/utils'
import { BANNERS, getBannerSrc } from '@/lib/banners'

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
  const [bannerId, setBannerId] = useState(0)

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

  const bannerSrc = getBannerSrc(bannerId)

  const handleCreate = async () => {
    if (!isValid || isCreating) return
    await createPool(amount, sharesNum, memo, bannerId)
  }

  const handleReset = () => {
    reset()
    setAmount('')
    setShares('')
    setMemo('Happy Lunar New Year!')
    setBannerId(0)
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
              background: bannerSrc
                ? '#111'
                : 'linear-gradient(160deg, rgba(200, 20, 20, 0.9) 0%, rgba(180, 140, 0, 0.9) 100%)',
              clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
            }}
          >
            {/* Banner background */}
            {bannerSrc && (
              <>
                <img
                  src={bannerSrc}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/40" />
              </>
            )}

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
                className="w-full text-center font-mono text-sm leading-snug text-white/70 line-clamp-2"
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
            <ShareModal
              inline
              isOpen={true}
              onClose={() => {}}
              poolId={poolId!}
              memo={memo}
              amount={amount}
              totalShares={sharesNum}
              claimedShares={0}
              txHash={txHash!}
              onCreateAnother={handleReset}
            />
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

              {/* Banner */}
              <div className="flex flex-col gap-2">
                <SectionLabel>Banner</SectionLabel>
                <div className="flex gap-2">
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => setBannerId(0)}
                    disabled={isCreating}
                    className={cn(
                      'flex h-[72px] w-[50px] shrink-0 items-center justify-center border transition-all',
                      bannerId === 0
                        ? 'border-pkt-accent shadow-[0_0_8px_rgba(255,208,0,0.25)]'
                        : 'border-dashed border-pkt-border hover:border-pkt-text-tertiary',
                    )}
                  >
                    <span className="font-mono text-[8px] uppercase tracking-wider text-pkt-text-tertiary">None</span>
                  </button>

                  {BANNERS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBannerId(b.id)}
                      disabled={isCreating}
                      className={cn(
                        'relative h-[72px] w-[50px] shrink-0 overflow-hidden border transition-all',
                        bannerId === b.id
                          ? 'border-pkt-accent shadow-[0_0_8px_rgba(255,208,0,0.25)]'
                          : 'border-pkt-border hover:border-pkt-text-tertiary',
                      )}
                    >
                      <img src={b.src} alt={b.label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
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
                  background: bannerSrc
                    ? '#111'
                    : 'linear-gradient(160deg, rgba(200, 20, 20, 0.85) 0%, rgba(180, 140, 0, 0.85) 100%)',
                  clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                }}
              >
                {/* Banner background */}
                {bannerSrc && (
                  <>
                    <img
                      src={bannerSrc}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/40" />
                  </>
                )}

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
                        'w-full text-center font-mono text-[11px] leading-snug text-white/70 line-clamp-2',
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
