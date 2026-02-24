'use client'

import { useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { motion, AnimatePresence } from 'motion/react'
import NumberFlow, { continuous } from '@number-flow/react'
import { PacketCard, PacketButton, SectionLabel, PacketEnvelope } from '@/components/inspired'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SplitSquareHorizontal, Loader2, Check } from 'lucide-react'
import { ShareModal } from '@/components/ShareModal'
import { NftGalleryModal } from '@/components/NftGalleryModal'
import { useBalance } from '@/hooks/useBalance'
import { useCreatePool } from '@/hooks/useCreatePool'
import { cn } from '@/lib/utils'
import { BANNERS, CUSTOM_BANNER_ID, getBannerSrc } from '@/lib/banners'

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
  const [customBannerUrl, setCustomBannerUrl] = useState('')
  const [showNftGallery, setShowNftGallery] = useState(false)
  const [nftSelected, setNftSelected] = useState(false)

  const amountNum = parseFloat(amount) || 0
  const sharesNum = parseInt(shares) || 0
  const memoLen = new TextEncoder().encode(memo).length

  const isCreating = status === 'building' || status === 'signing' || status === 'broadcasting'
  const created = status === 'success' && !!txHash

  const isCustomBanner = bannerId === CUSTOM_BANNER_ID
  const isValid =
    amountNum > 0 &&
    amountNum <= rawBalance &&
    sharesNum >= 1 &&
    sharesNum <= 255 &&
    amountNum >= sharesNum * 0.01 &&
    memoLen > 0 &&
    memoLen <= 30 &&
    (!isCustomBanner || customBannerUrl.trim().length > 0)

  const avg = sharesNum > 0 ? amountNum / sharesNum : 0
  const maxPossible = Math.min(avg * 2, amountNum - (sharesNum - 1) * 0.01)
  const showStats = amountNum > 0 && sharesNum > 0

  const bannerSrc = isCustomBanner ? customBannerUrl || null : getBannerSrc(bannerId)

  const handleCreate = async () => {
    if (!isValid || isCreating) return
    await createPool(amount, sharesNum, memo, bannerId, isCustomBanner ? customBannerUrl : undefined)
  }

  const handleReset = () => {
    reset()
    setAmount('')
    setShares('')
    setMemo('Happy Lunar New Year!')
    setBannerId(0)
    setCustomBannerUrl('')
    setNftSelected(false)
  }

  return (
    <>
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
            <PacketEnvelope
              size="lg"
              bannerSrc={bannerSrc}
              shadow="0 0 60px rgba(200,20,20,0.15)"
              seal={
                <div className="mt-10 grid h-16 w-16 place-items-center rounded-full border border-white/40 bg-white/10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-7 w-7 text-white" strokeWidth={2.5} />
                  </motion.div>
                </div>
              }
              bottom={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="border border-white/30 bg-black/30 px-4 py-1 font-mono text-[11px] uppercase tracking-wider text-white/80">
                    {sharesNum} {sharesNum === 1 ? 'share' : 'shares'}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[3px] text-white/40">Packet Created</span>
                </motion.div>
              }
            >
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
            </PacketEnvelope>

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
                    <span className={sharesNum < 1 && shares !== '' ? 'text-red-400' : 'text-pkt-text-secondary'}>
                      1
                    </span>
                  </span>
                </div>

                {/* Memo */}
                <div className="flex flex-col gap-2">
                  <SectionLabel>Memo</SectionLabel>
                  <Input
                    placeholder="Happy Lunar New Year!"
                    value={memo}
                    onChange={(e) => {
                      const next = e.target.value
                      if (new TextEncoder().encode(next).length <= 30) setMemo(next)
                    }}
                    disabled={isCreating}
                  />
                  <span className="self-end font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
                    {memoLen}/30
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

                    {/* NFT gallery option */}
                    <button
                      type="button"
                      onClick={() => setShowNftGallery(true)}
                      disabled={isCreating}
                      className={cn(
                        'relative h-[72px] w-[50px] shrink-0 overflow-hidden border transition-all',
                        isCustomBanner && nftSelected
                          ? 'border-pkt-accent shadow-[0_0_8px_rgba(255,208,0,0.25)]'
                          : 'border-dashed border-pkt-border hover:border-pkt-text-tertiary',
                      )}
                    >
                      {nftSelected && customBannerUrl ? (
                        <img src={customBannerUrl} alt="NFT" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-mono text-[8px] uppercase tracking-wider text-pkt-text-tertiary">
                          NFT
                        </span>
                      )}
                    </button>

                    {/* Custom URL option */}
                    <button
                      type="button"
                      onClick={() => {
                        setBannerId(CUSTOM_BANNER_ID)
                        setNftSelected(false)
                        setCustomBannerUrl('')
                      }}
                      disabled={isCreating}
                      className={cn(
                        'flex h-[72px] w-[50px] shrink-0 items-center justify-center border transition-all',
                        isCustomBanner && !nftSelected
                          ? 'border-pkt-accent shadow-[0_0_8px_rgba(255,208,0,0.25)]'
                          : 'border-dashed border-pkt-border hover:border-pkt-text-tertiary',
                      )}
                    >
                      <span className="font-mono text-[8px] uppercase tracking-wider text-pkt-text-tertiary">URL</span>
                    </button>
                  </div>

                  {/* Custom banner URL input (only for manual URL, not NFT) */}
                  <AnimatePresence>
                    {isCustomBanner && !nftSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <Input
                          placeholder="https://example.com/banner.png"
                          value={customBannerUrl}
                          onChange={(e) => setCustomBannerUrl(e.target.value)}
                          disabled={isCreating}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                <PacketEnvelope
                  bannerSrc={bannerSrc}
                  bottom={
                    <div className="flex flex-col items-center gap-2">
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
                  }
                >
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
                </PacketEnvelope>

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

      <NftGalleryModal
        isOpen={showNftGallery}
        onClose={() => setShowNftGallery(false)}
        onSelect={(imageUrl) => {
          setBannerId(CUSTOM_BANNER_ID)
          setCustomBannerUrl(imageUrl)
          setNftSelected(true)
        }}
      />
    </>
  )
}
