'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import NumberFlow, { continuous } from '@number-flow/react'
import { formatUnits, type Address, type Hex } from 'viem'
import { Loader2 } from 'lucide-react'
import { GridBackground, PacketLogo, PacketCard, PacketButton } from '@/components/inspired'
import { LoginForm } from '@/components/LoginForm'
import { getDisplayInfo } from '@/lib/user'
import { usePool } from '@/hooks/usePool'
import { useClaim } from '@/hooks/useClaim'
import { cn } from '@/lib/utils'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

const STATUS_LABELS: Record<string, string> = {
  building: 'Building transaction...',
  signing: 'Sign in wallet...',
  broadcasting: 'Broadcasting...',
}

export default function ClaimPoolPage() {
  const params = useParams<{ poolId: string }>()
  const rawPoolId = params.poolId
  const isValidFormat = POOL_ID_RE.test(rawPoolId)
  const poolId = isValidFormat ? (rawPoolId as Hex) : undefined

  const { ready, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const wallet = wallets.find((w) => w.walletClientType === 'privy')
  const { label, initials } = getDisplayInfo(user ?? null)

  const { pool, claims, userHasClaimed, userClaimAmount, loading, refetch } = usePool(
    poolId,
    wallet?.address as Address | undefined,
  )

  const { claim, status: claimStatus, error: claimError, txHash, claimedAmount } = useClaim(poolId ?? ('0x' as Hex))

  const [showLogin, setShowLogin] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Auto-close login modal when auth succeeds
  useEffect(() => {
    if (authenticated) setShowLogin(false)
  }, [authenticated])

  // When claim succeeds, trigger reveal + refetch pool data
  useEffect(() => {
    if (claimStatus === 'success') {
      setRevealed(true)
      refetch()
    }
  }, [claimStatus, refetch])

  const isClaiming = claimStatus === 'building' || claimStatus === 'signing' || claimStatus === 'broadcasting'

  // Determine display amount for the envelope card
  const displayAmount =
    revealed && claimedAmount != null
      ? parseFloat(formatUnits(claimedAmount, 6))
      : userHasClaimed && userClaimAmount != null
        ? parseFloat(formatUnits(userClaimAmount, 6))
        : pool
          ? parseFloat(formatUnits(pool.totalAmount, 6))
          : 0

  // State machine
  const state = !isValidFormat
    ? 'invalid'
    : loading && !pool
      ? 'loading'
      : pool && !pool.exists
        ? 'not-found'
        : pool?.isExpired
          ? 'expired'
          : pool?.isFullyClaimed
            ? 'fully-claimed'
            : !ready
              ? 'loading'
              : !authenticated
                ? 'unauthenticated'
                : userHasClaimed
                  ? 'already-claimed'
                  : revealed
                    ? 'revealed'
                    : isClaiming
                      ? 'claiming'
                      : claimStatus === 'success'
                        ? 'revealed'
                        : 'ready'

  return (
    <GridBackground>
      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/">
            <PacketLogo />
          </Link>

          {ready &&
            (authenticated ? (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="relative grid h-7 w-7 place-items-center">
                  <div className="absolute inset-0 rotate-45 border border-pkt-accent/50 bg-pkt-accent/10" />
                  <span className="relative z-[1] text-[10px] font-bold text-pkt-accent">{initials}</span>
                </div>
                <span className="hidden max-w-[120px] truncate font-mono text-[11px] text-pkt-text-secondary md:inline">
                  {label}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="border border-pkt-border px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary transition-colors hover:border-pkt-accent/60 hover:text-pkt-accent"
              >
                Log in
              </button>
            ))}
        </div>
      </header>

      {/* ═══ Main Content ═══ */}
      <main className="flex flex-1 flex-col items-center px-4 py-8 md:px-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          {/* ── Error / Invalid / Not Found States ── */}
          {state === 'invalid' && (
            <PacketCard header="Invalid Link">
              <p className="text-center font-mono text-sm text-pkt-text-secondary">
                This packet link is invalid. Check the URL and try again.
              </p>
            </PacketCard>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center gap-6">
              {/* Skeleton envelope */}
              <div
                className="h-[340px] w-[240px] animate-pulse border border-white/10 bg-white/[0.03]"
                style={{
                  clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                }}
              />
              <div className="h-4 w-32 animate-pulse bg-white/[0.05]" />
            </div>
          )}

          {state === 'not-found' && (
            <PacketCard header="Not Found">
              <p className="text-center font-mono text-sm text-pkt-text-secondary">
                This packet doesn&apos;t exist. It may have been created on a different network.
              </p>
            </PacketCard>
          )}

          {/* ── Envelope Card (shown for all active states) ── */}
          {pool && pool.exists && state !== 'loading' && state !== 'invalid' && state !== 'not-found' && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
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
                      {revealed || userHasClaimed ? (
                        <NumberFlow
                          value={displayAmount}
                          format={{
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }}
                          spinTiming={{ duration: 2000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                          plugins={[continuous]}
                          willChange
                        />
                      ) : (
                        <NumberFlow
                          value={displayAmount}
                          format={{
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: displayAmount % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          }}
                          transformTiming={{ duration: 300, easing: 'ease-out' }}
                          spinTiming={{ duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                          plugins={[continuous]}
                          willChange
                        />
                      )}
                    </span>

                    <span className="max-w-full truncate text-center font-mono text-[11px] text-white/70">
                      {pool.memo || 'Lucky Split'}
                    </span>

                    {(revealed || userHasClaimed) && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-1 font-mono text-[9px] uppercase tracking-widest text-white/50"
                      >
                        {revealed ? 'your share' : 'you claimed'}
                      </motion.span>
                    )}
                  </div>

                  {/* Bottom badge */}
                  <div className="relative z-[1] mb-3 flex flex-col items-center gap-2">
                    <span className="border border-white/30 bg-black/30 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/80">
                      {pool.claimedShares}/{pool.totalShares} claimed
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-[2px] text-white/50">Packet</span>
                  </div>
                </div>
              </motion.div>

              {/* ── Action Area ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="flex w-full flex-col items-center gap-4"
              >
                {state === 'unauthenticated' && (
                  <PacketButton className="w-full max-w-xs py-3" onClick={() => setShowLogin(true)}>
                    Log in to claim
                  </PacketButton>
                )}

                {state === 'ready' && (
                  <PacketButton className="w-full max-w-xs py-3" onClick={claim}>
                    Open Packet
                  </PacketButton>
                )}

                {state === 'claiming' && (
                  <PacketButton className="w-full max-w-xs py-3" disabled>
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {STATUS_LABELS[claimStatus] || 'Processing...'}
                    </span>
                  </PacketButton>
                )}

                {state === 'expired' && (
                  <div className="w-full max-w-xs border border-pkt-border bg-pkt-surface/50 p-4 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary">
                      This packet has expired
                    </span>
                  </div>
                )}

                {state === 'fully-claimed' && (
                  <div className="w-full max-w-xs border border-pkt-border bg-pkt-surface/50 p-4 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary">
                      All shares have been claimed
                    </span>
                  </div>
                )}

                {(state === 'already-claimed' || state === 'revealed') && (
                  <div className="w-full max-w-xs border border-pkt-accent/30 bg-pkt-accent/5 p-4 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-accent">
                      You claimed ${displayAmount.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Claim error */}
                <AnimatePresence>
                  {claimStatus === 'error' && claimError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full max-w-xs overflow-hidden border border-red-400/30 bg-red-400/10 p-3"
                    >
                      <span className="font-mono text-[11px] text-red-400">{claimError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Explorer link */}
                {txHash && (
                  <motion.a
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    href={`https://explore.tempo.xyz/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] uppercase tracking-wider text-pkt-accent transition-all hover:brightness-110"
                  >
                    View on Explorer &rarr;
                  </motion.a>
                )}
              </motion.div>

              {/* ── Claims Distribution ── */}
              {claims.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="w-full"
                >
                  <PacketCard header="Distribution">
                    <div className="flex flex-col gap-2">
                      {claims.map((entry) => {
                        const isUser = wallet?.address
                          ? entry.claimer.toLowerCase() === wallet.address.toLowerCase()
                          : false
                        const amount = parseFloat(formatUnits(entry.amount, 6))
                        return (
                          <div
                            key={entry.index}
                            className={cn(
                              'flex items-center justify-between border px-3 py-2',
                              isUser ? 'border-pkt-accent/30 bg-pkt-accent/5' : 'border-pkt-border bg-white/[0.02]',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-pkt-text-tertiary">
                                #{String(entry.index + 1).padStart(2, '0')}
                              </span>
                              <span className="font-mono text-[11px] text-pkt-text-secondary">
                                {entry.claimer.slice(0, 6)}...{entry.claimer.slice(-4)}
                              </span>
                              {isUser && (
                                <span className="border border-pkt-accent/40 bg-pkt-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-pkt-accent">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] font-bold text-pkt-text">${amount.toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </PacketCard>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ═══ Inline Login Modal ═══ */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowLogin(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-4 w-full max-w-sm"
            >
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-pkt-accent">{'// sign in'}</span>
                  <div className="h-px flex-1 bg-pkt-border" />
                </div>
                <h2 className="mt-3 text-xl font-bold uppercase tracking-tight text-white">Sign in to claim</h2>
                <p className="mt-1 text-sm text-pkt-text-secondary">Log in with your phone or email to continue.</p>
              </div>

              <div className="relative border border-pkt-border bg-pkt-surface p-6">
                <div className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-pkt-accent/50" />
                <div className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-pkt-accent/50" />

                <button
                  onClick={() => setShowLogin(false)}
                  className="absolute right-3 top-3 grid h-7 w-7 place-items-center text-pkt-text-tertiary transition-colors hover:text-pkt-text"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>

                <LoginForm onBack={() => setShowLogin(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GridBackground>
  )
}
