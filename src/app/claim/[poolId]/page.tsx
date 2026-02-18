'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { formatUnits, type Address, type Hex } from 'viem'
import { Loader2 } from 'lucide-react'
import NumberFlow, { continuous } from '@number-flow/react'
import { GridBackground, PacketLogo, PacketCard, PacketButton } from '@/components/inspired'
import { getDisplayInfo } from '@/lib/user'
import { parseBannerId } from '@/lib/memo'
import { getBannerSrc } from '@/lib/banners'
import { usePool } from '@/hooks/usePool'
import { useClaim } from '@/hooks/useClaim'
import { Progress } from '@/components/ui/progress'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

// Deterministic diamond particle positions (no Math.random — avoids hydration issues)
const DIAMONDS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * 360 + (i % 2 ? 14 : -14)
  const rad = (angle * Math.PI) / 180
  return {
    x: Math.cos(rad) * (100 + (i % 5) * 20),
    y: Math.sin(rad) * (100 + (i % 5) * 20),
    size: 5 + (i % 3) * 2,
    delay: i * 0.025,
  }
})

function DiamondBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {DIAMONDS.map((d, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 border border-pkt-accent bg-pkt-accent/30"
          style={{
            width: d.size,
            height: d.size,
            marginLeft: -d.size / 2,
            marginTop: -d.size / 2,
          }}
          initial={{ scale: 0, x: 0, y: 0, rotate: 45, opacity: 1 }}
          animate={{ scale: [0, 1.2, 0.8], x: d.x, y: d.y, opacity: [1, 1, 0] }}
          transition={{ duration: 0.7, delay: d.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  )
}

export default function ClaimPoolPage() {
  const params = useParams<{ poolId: string }>()
  const router = useRouter()
  const rawPoolId = params.poolId
  const isValidFormat = POOL_ID_RE.test(rawPoolId)
  const poolId = isValidFormat ? (rawPoolId as Hex) : undefined

  const { ready, authenticated, user } = usePrivy()
  const { label, initials } = getDisplayInfo(user)
  const { wallets } = useWallets()
  const wallet = wallets[0]

  const { pool, userHasClaimed, userClaimAmount, loading, refetch } = usePool(
    poolId,
    wallet?.address as Address | undefined,
  )

  const { claim, status: claimStatus, claimedAmount } = useClaim(poolId ?? ('0x' as Hex))

  // Refetch pool data after successful claim
  useEffect(() => {
    if (claimStatus === 'success') refetch()
  }, [claimStatus, refetch])

  const isClaiming = claimStatus === 'building' || claimStatus === 'signing' || claimStatus === 'broadcasting'

  // Amount to show on the envelope
  const showClaimedAmount = claimStatus === 'success' && claimedAmount != null
  const showPriorClaim = userHasClaimed && userClaimAmount != null
  const showClaimResult = showClaimedAmount || showPriorClaim
  const showClaimPendingReveal = claimStatus === 'success' && !showClaimResult
  const displayAmount = showClaimedAmount
    ? parseFloat(formatUnits(claimedAmount, 6))
    : showPriorClaim
      ? parseFloat(formatUnits(userClaimAmount, 6))
      : pool
        ? parseFloat(formatUnits(pool.totalAmount, 6))
        : 0

  // Did the user JUST claim in this session? (not a returning visitor)
  const justClaimed = claimStatus === 'success' && claimedAmount != null

  const bannerSrc = pool?.memoRaw ? getBannerSrc(parseBannerId(pool.memoRaw)) : null

  // True once all data needed for the action area is available
  const contentReady = !loading && !!pool?.exists && ready

  // Can this user claim? (userHasClaimed must be exactly false, not null/unknown)
  const canClaim =
    authenticated &&
    wallet &&
    pool?.exists &&
    !pool.isFullyClaimed &&
    !pool.isExpired &&
    userHasClaimed === false &&
    claimStatus !== 'success'

  return (
    <GridBackground>
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/">
            <PacketLogo />
          </Link>

          {authenticated && user && (
            <div className="flex items-center gap-3 px-3 py-2">
              {/* Diamond avatar */}
              <div className="relative grid h-7 w-7 place-items-center">
                <div className="absolute inset-0 rotate-45 border border-pkt-accent/50 bg-pkt-accent/10" />
                <span className="relative z-[1] text-[10px] font-bold text-pkt-accent">{initials}</span>
              </div>

              {/* Label */}
              <span className="hidden max-w-[100px] truncate font-mono text-[11px] text-pkt-text-secondary md:inline">
                {label}
              </span>

              {/* Status dot */}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center px-4 pt-[max(2rem,calc(50vh-280px))] md:px-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          {/* Invalid URL */}
          {!isValidFormat && (
            <PacketCard header="Invalid Link">
              <p className="text-center font-mono text-sm text-pkt-text-secondary">
                This packet link is invalid. Check the URL and try again.
              </p>
            </PacketCard>
          )}

          {/* Stable envelope + action container — eliminates layout shift */}
          {isValidFormat && (loading || pool?.exists) && (
            <>
              {/* Stable envelope container — never changes dimensions */}
              <div
                className="relative flex h-[340px] w-[240px] items-center justify-center"
                style={{
                  clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                }}
              >
                {/* Skeleton fill — shown while loading */}
                {loading && !pool && (
                  <motion.div
                    className="absolute inset-0 animate-pulse border border-white/10 bg-white/[0.03]"
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  />
                )}

                {/* Real envelope content — fades in over the same box */}
                {pool && pool.exists && (
                  <motion.div
                    className="absolute inset-0 z-[1] flex flex-col items-center justify-between overflow-hidden border border-white/20"
                    style={{
                      background: bannerSrc
                        ? '#111'
                        : 'linear-gradient(160deg, rgba(200, 20, 20, 0.85) 0%, rgba(180, 140, 0, 0.85) 100%)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      scale: justClaimed ? 1.05 : 1,
                    }}
                    transition={
                      justClaimed ? { type: 'spring', stiffness: 300, damping: 20 } : { duration: 0.3, ease: 'easeOut' }
                    }
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

                    {/* Circle seal / checkmark on success */}
                    <AnimatePresence mode="wait">
                      {justClaimed ? (
                        <motion.div
                          key="check"
                          className="mt-8 grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-white/10"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                        >
                          <svg
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <motion.path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
                            />
                          </svg>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="seal"
                          className="mt-8 h-14 w-14 rounded-full border border-white/40"
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Amount + Memo */}
                    <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2 px-4">
                      <span className="font-mono text-3xl font-bold text-white">
                        <NumberFlow
                          value={displayAmount}
                          format={{
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: displayAmount % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          }}
                          transformTiming={{ duration: 300, easing: 'ease-out' }}
                          spinTiming={{ duration: 1400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                          plugins={[continuous]}
                          willChange
                        />
                      </span>

                      <span className="w-full text-center font-mono text-[11px] leading-snug text-white/70 line-clamp-2">
                        {pool.memo || 'Lucky Split'}
                      </span>

                      <AnimatePresence>
                        {showClaimResult && (
                          <motion.span
                            className="mt-1 font-mono text-[9px] uppercase tracking-widest text-white/50"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: justClaimed ? 0.4 : 0, duration: 0.3, ease: 'easeOut' }}
                          >
                            your share
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Progress section */}
                    <div className="relative z-[1] mb-4 flex w-full flex-col items-center gap-2 px-6">
                      <Progress value={(pool.claimedShares / pool.totalShares) * 100} />
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
                          {pool.claimedShares}/{pool.totalShares} claimed
                        </span>
                        <span className="font-mono text-[8px] uppercase tracking-[2px] text-white/50">Packet</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Pulsing glow behind envelope during claiming */}
                <AnimatePresence>
                  {isClaiming && (
                    <motion.div
                      key="glow"
                      className="pointer-events-none absolute inset-0 z-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div
                        className="absolute -inset-16 animate-pkt-glow-pulse"
                        style={{
                          background: 'radial-gradient(circle, rgba(255, 208, 0, 0.12) 0%, transparent 70%)',
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success burst effects */}
                <AnimatePresence>
                  {justClaimed && (
                    <>
                      {/* Expanding gold ring */}
                      <motion.div
                        key="ring"
                        className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 border-2 border-pkt-accent"
                        initial={{ scale: 0.3, opacity: 0.9 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />

                      {/* Gold flash behind envelope */}
                      <motion.div
                        key="flash"
                        className="pointer-events-none absolute -inset-16 z-0"
                        style={{
                          background: 'radial-gradient(circle, rgba(255, 208, 0, 0.2) 0%, transparent 60%)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />

                      {/* Diamond particles */}
                      <DiamondBurst key="diamonds" />
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Stable action container */}
              <div className="flex min-h-[60px] w-full flex-col items-center gap-3">
                {loading && !pool && (
                  <motion.div
                    className="h-[48px] w-full max-w-xs animate-pulse border border-white/10 bg-white/[0.03]"
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                  />
                )}
                {contentReady && (
                  <motion.div
                    className="flex w-full flex-col items-center gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    {/* ── State: Just claimed this session (animated reveal) ── */}
                    {justClaimed && showClaimResult && (
                      <>
                        <motion.div
                          className="w-full max-w-xs border border-pkt-accent/30 bg-pkt-accent/5 p-4 text-center"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-accent">
                            You claimed ${displayAmount.toFixed(2)}
                          </span>
                        </motion.div>
                        <motion.div
                          className="flex w-full max-w-xs flex-col items-center gap-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5, duration: 0.3 }}
                        >
                          <motion.span
                            className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.3 }}
                          >
                            Redirecting to app...
                          </motion.span>
                          <PacketButton className="w-full py-3" onClick={() => router.push('/app')}>
                            Open App
                          </PacketButton>
                        </motion.div>
                      </>
                    )}

                    {/* ── State: Just claimed, pending reveal ── */}
                    {showClaimPendingReveal && (
                      <div className="w-full max-w-xs border border-pkt-accent/30 bg-pkt-accent/5 p-4 text-center">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-accent">
                          Claim confirmed. Calculating your share...
                        </span>
                      </div>
                    )}

                    {/* ── State: Returning visitor (already claimed) ── */}
                    {!justClaimed && showClaimResult && (
                      <>
                        <div className="w-full max-w-xs border border-pkt-accent/30 bg-pkt-accent/5 p-4 text-center">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-accent">
                            You claimed ${displayAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex w-full max-w-xs flex-col items-center gap-2">
                          <PacketButton className="w-full py-3" onClick={() => router.push('/app')}>
                            Open App
                          </PacketButton>
                        </div>
                      </>
                    )}

                    {/* ── State: Not authenticated ── */}
                    {!authenticated && !showClaimResult && !isClaiming && !pool.isFullyClaimed && !pool.isExpired && (
                      <Link href={`/login?redirect=/claim/${rawPoolId}`}>
                        <PacketButton className="w-full max-w-xs py-3">Log in to claim</PacketButton>
                      </Link>
                    )}

                    {/* ── State: Can claim ── */}
                    {canClaim && !isClaiming && (
                      <PacketButton className="w-full max-w-xs py-3" onClick={claim}>
                        Open Packet
                      </PacketButton>
                    )}

                    {/* ── State: Claiming in progress ── */}
                    {isClaiming && (
                      <PacketButton className="w-full max-w-xs py-3" disabled>
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {claimStatus === 'building' && 'Building transaction...'}
                          {claimStatus === 'signing' && 'Sign in wallet...'}
                          {claimStatus === 'broadcasting' && 'Broadcasting...'}
                        </span>
                      </PacketButton>
                    )}

                    {/* ── State: Fully claimed (user missed out) ── */}
                    {pool.isFullyClaimed && userHasClaimed !== true && claimStatus !== 'success' && (
                      <div className="w-full max-w-xs border border-pkt-border bg-pkt-surface/50 p-4 text-center">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary">
                          All shares have been claimed
                        </span>
                      </div>
                    )}

                    {/* ── State: Expired ── */}
                    {pool.isExpired && userHasClaimed !== true && claimStatus !== 'success' && (
                      <div className="w-full max-w-xs border border-pkt-border bg-pkt-surface/50 p-4 text-center">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary">
                          This packet has expired
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </>
          )}

          {/* Not found */}
          {isValidFormat && !loading && pool && !pool.exists && (
            <PacketCard header="Not Found">
              <p className="text-center font-mono text-sm text-pkt-text-secondary">
                This packet doesn&apos;t exist. It may have been created on a different network.
              </p>
            </PacketCard>
          )}
        </div>
      </main>
    </GridBackground>
  )
}
