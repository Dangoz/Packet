'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { motion } from 'motion/react'
import { formatUnits, type Address, type Hex } from 'viem'
import { Loader2 } from 'lucide-react'
import { GridBackground, PacketLogo, PacketCard, PacketButton } from '@/components/inspired'
import { getDisplayInfo } from '@/lib/user'
import { parseBannerId } from '@/lib/memo'
import { getBannerSrc } from '@/lib/banners'
import { usePool } from '@/hooks/usePool'
import { useClaim } from '@/hooks/useClaim'
import { Progress } from '@/components/ui/progress'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

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

  const bannerSrc = pool?.memoRaw ? getBannerSrc(parseBannerId(pool.memoRaw)) : null

  // Can this user claim?
  const canClaim =
    authenticated &&
    wallet &&
    pool?.exists &&
    !pool.isFullyClaimed &&
    !pool.isExpired &&
    !userHasClaimed &&
    claimStatus !== 'success'

  // After successful claim + amount reveal, route user into the app.
  useEffect(() => {
    if (claimStatus !== 'success' || !showClaimResult) return
    const timeoutId = window.setTimeout(() => {
      router.push('/app')
    }, 2500)
    return () => window.clearTimeout(timeoutId)
  }, [claimStatus, showClaimResult, router])

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
      <main className="flex flex-1 flex-col items-center justify-center px-4 md:px-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          {/* Invalid URL */}
          {!isValidFormat && (
            <PacketCard header="Invalid Link">
              <p className="text-center font-mono text-sm text-pkt-text-secondary">
                This packet link is invalid. Check the URL and try again.
              </p>
            </PacketCard>
          )}

          {/* Loading skeleton */}
          {isValidFormat && loading && !pool && (
            <div className="flex flex-col items-center gap-6">
              <div
                className="h-[340px] w-[240px] animate-pulse border border-white/10 bg-white/[0.03]"
                style={{
                  clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                }}
              />
              <div className="h-4 w-32 animate-pulse bg-white/[0.05]" />
            </div>
          )}

          {/* Not found */}
          {isValidFormat && !loading && pool && !pool.exists && (
            <PacketCard header="Not Found">
              <p className="text-center font-mono text-sm text-pkt-text-secondary">
                This packet doesn&apos;t exist. It may have been created on a different network.
              </p>
            </PacketCard>
          )}

          {/* Envelope card */}
          {pool && pool.exists && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
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
                      ${displayAmount % 1 === 0 ? displayAmount.toFixed(0) : displayAmount.toFixed(2)}
                    </span>

                    <span className="max-w-full truncate text-center font-mono text-[11px] text-white/70">
                      {pool.memo || 'Lucky Split'}
                    </span>

                    {showClaimResult && (
                      <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-white/50">
                        your share
                      </span>
                    )}
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
                </div>
              </motion.div>

              {/* Action button */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="flex w-full flex-col items-center gap-3"
              >
                {/* Not logged in */}
                {ready && !authenticated && (
                  <Link href={`/login?redirect=/claim/${rawPoolId}`}>
                    <PacketButton className="w-full max-w-xs py-3">Log in to claim</PacketButton>
                  </Link>
                )}

                {/* Claim button */}
                {canClaim && !isClaiming && (
                  <PacketButton className="w-full max-w-xs py-3" onClick={claim}>
                    Open Packet
                  </PacketButton>
                )}

                {/* Claiming in progress */}
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

                {/* Already claimed / just claimed */}
                {showClaimResult && (
                  <div className="w-full max-w-xs border border-pkt-accent/30 bg-pkt-accent/5 p-4 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-accent">
                      You claimed ${displayAmount.toFixed(2)}
                    </span>
                  </div>
                )}

                {showClaimPendingReveal && (
                  <div className="w-full max-w-xs border border-pkt-accent/30 bg-pkt-accent/5 p-4 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-accent">
                      Claim confirmed. Calculating your share...
                    </span>
                  </div>
                )}

                {showClaimResult && (
                  <div className="flex w-full max-w-xs flex-col items-center gap-2">
                    {claimStatus === 'success' && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary">
                        Redirecting to app...
                      </span>
                    )}
                    <PacketButton className="w-full py-3" onClick={() => router.push('/app')}>
                      Open App
                    </PacketButton>
                  </div>
                )}

                {/* Fully claimed (and user hasn't claimed) */}
                {pool.isFullyClaimed && !userHasClaimed && claimStatus !== 'success' && (
                  <div className="w-full max-w-xs border border-pkt-border bg-pkt-surface/50 p-4 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary">
                      All shares have been claimed
                    </span>
                  </div>
                )}

                {/* Expired (and user hasn't claimed) */}
                {pool.isExpired && !userHasClaimed && claimStatus !== 'success' && (
                  <div className="w-full max-w-xs border border-pkt-border bg-pkt-surface/50 p-4 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary">
                      This packet has expired
                    </span>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>
    </GridBackground>
  )
}
