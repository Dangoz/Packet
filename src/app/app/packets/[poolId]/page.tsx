'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useWallets } from '@privy-io/react-auth'
import { motion } from 'motion/react'
import NumberFlow, { continuous } from '@number-flow/react'
import { formatUnits, type Address, type Hex } from 'viem'
import { ArrowLeft, Share2, Trophy } from 'lucide-react'
import { PacketCard, PacketEnvelope } from '@/components/inspired'
import { ShareModal } from '@/components/ShareModal'
import { usePool } from '@/hooks/usePool'
import { resolveIdentities, truncateAddress } from '@/lib/resolve-identities'
import { parseBannerId } from '@/lib/memo'
import { getBannerSrc } from '@/lib/banners'
import { cn } from '@/lib/utils'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

export default function PacketDetailPage() {
  const params = useParams<{ poolId: string }>()
  const rawPoolId = params.poolId
  const isValidFormat = POOL_ID_RE.test(rawPoolId)
  const poolId = isValidFormat ? (rawPoolId as Hex) : undefined

  const { wallets } = useWallets()
  const wallet = wallets[0]

  const { pool, claims, loading, error } = usePool(poolId, wallet?.address as Address | undefined)

  const [identityMap, setIdentityMap] = useState<Record<string, string>>({})
  const [identitiesLoading, setIdentitiesLoading] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  // Resolve claimer identities when claims change
  useEffect(() => {
    if (claims.length === 0) return

    const addresses = [...new Set(claims.map((c) => c.claimer))]
    // Skip addresses we already resolved
    const unresolved = addresses.filter((a) => !identityMap[a.toLowerCase()])
    if (unresolved.length === 0) return

    setIdentitiesLoading(true)
    resolveIdentities(unresolved).then((map) => {
      setIdentityMap((prev) => ({ ...prev, ...map }))
      setIdentitiesLoading(false)
    })
  }, [claims]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sort claims by amount descending for leaderboard
  const sortedClaims = [...claims].sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0))

  const isActive = pool ? !pool.isFullyClaimed && !pool.isExpired : false
  const statusLabel = pool?.isRefunded
    ? 'Refunded'
    : pool?.isFullyClaimed
      ? 'All Claimed'
      : pool?.isExpired
        ? 'Expired'
        : 'Active'
  const statusColor = pool?.isRefunded
    ? 'text-amber-400'
    : pool?.isFullyClaimed
      ? 'text-pkt-text-secondary'
      : pool?.isExpired
        ? 'text-red-400'
        : 'text-emerald-400'

  const totalAmount = pool ? parseFloat(formatUnits(pool.totalAmount, 6)) : 0
  const remainingAmount = pool ? parseFloat(formatUnits(pool.remainingAmount, 6)) : 0

  const bannerSrc = pool?.memoRaw ? getBannerSrc(parseBannerId(pool.memoRaw)) : null

  const expiresDate = pool?.expiresAt
    ? new Date(pool.expiresAt * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Back link */}
      <Link
        href="/app/packets"
        className="flex items-center gap-2 self-start font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary transition-colors hover:text-pkt-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Packets
      </Link>

      {/* Loading */}
      {loading && !pool && (
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

      {/* Invalid / Not Found / Error */}
      {!loading && !pool && (
        <PacketCard header={error ? 'Error' : 'Not Found'}>
          <p className="text-center font-mono text-sm text-pkt-text-secondary">
            {error || "This packet doesn't exist or couldn't be loaded."}
          </p>
        </PacketCard>
      )}

      {/* Pool loaded */}
      {pool && pool.exists && (
        <>
          {/* Envelope card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <PacketEnvelope
              bannerSrc={bannerSrc}
              dimmed={pool.isFullyClaimed || pool.isExpired}
              bottom="progress"
              claimedShares={pool.realClaimedShares}
              totalShares={pool.totalShares}
              statusOverlay={
                pool.isRefunded ? 'Refunded' : pool.isFullyClaimed ? 'All claimed' : pool.isExpired ? 'Expired' : null
              }
            >
              <span className="font-mono text-3xl font-bold text-white">
                <NumberFlow
                  value={totalAmount}
                  format={{
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: totalAmount % 1 === 0 ? 0 : 2,
                    maximumFractionDigits: 2,
                  }}
                  transformTiming={{ duration: 300, easing: 'ease-out' }}
                  spinTiming={{ duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                  plugins={[continuous]}
                  willChange
                />
              </span>

              <span className="w-full text-center font-mono text-[11px] leading-snug text-white/70 line-clamp-2">
                {pool.memo || 'Lucky Split'}
              </span>
            </PacketEnvelope>
          </motion.div>

          {/* Pool Details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="w-full max-w-md"
          >
            <PacketCard header="Pool Details">
              <div className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <span className="text-pkt-text-tertiary">{'[ total ]'}</span>
                  <span className="text-pkt-text">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-pkt-text-tertiary">{'[ shares ]'}</span>
                  <span className="text-pkt-text-secondary">
                    {pool.realClaimedShares}/{pool.totalShares} claimed
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-pkt-text-tertiary">{'[ remaining ]'}</span>
                  <span className="text-pkt-text-secondary">${remainingAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-pkt-text-tertiary">{'[ status ]'}</span>
                  <span className={statusColor}>{statusLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-pkt-text-tertiary">{'[ expires ]'}</span>
                  <span className="text-pkt-text-secondary">{expiresDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-pkt-text-tertiary">{'[ pool.id ]'}</span>
                  <span className="text-pkt-text-tertiary">
                    {rawPoolId.slice(0, 10)}...{rawPoolId.slice(-6)}
                  </span>
                </div>
              </div>
            </PacketCard>
          </motion.div>

          {/* Share button (active only) */}
          {isActive && (
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              onClick={() => setShareOpen(true)}
              className="flex w-full max-w-md items-center justify-center gap-2 border border-pkt-accent bg-pkt-accent/10 py-3 font-mono text-xs font-bold uppercase tracking-wider text-pkt-accent transition-colors hover:bg-pkt-accent/20"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Packet
            </motion.button>
          )}

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="w-full max-w-md"
          >
            <PacketCard header="Leaderboard">
              {sortedClaims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="mb-1 font-mono text-xs font-bold uppercase tracking-wider text-pkt-text-secondary">
                    No claims yet
                  </p>
                  <p className="max-w-xs text-sm text-pkt-text-tertiary">
                    Share this packet and see who claims the biggest share!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sortedClaims.map((entry, rank) => {
                    const isUser = wallet?.address
                      ? entry.claimer.toLowerCase() === wallet.address.toLowerCase()
                      : false
                    const amount = parseFloat(formatUnits(entry.amount, 6))
                    const identity =
                      identityMap[entry.claimer.toLowerCase()] ||
                      (identitiesLoading ? truncateAddress(entry.claimer) : truncateAddress(entry.claimer))
                    const isTop = rank === 0

                    return (
                      <div
                        key={entry.index}
                        className={cn(
                          'flex items-center justify-between border px-3 py-2',
                          isUser
                            ? 'border-pkt-accent/30 bg-pkt-accent/5'
                            : isTop
                              ? 'border-pkt-accent/20 bg-white/[0.02]'
                              : 'border-pkt-border bg-white/[0.02]',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'font-mono text-[10px]',
                              isTop ? 'text-pkt-accent' : 'text-pkt-text-tertiary',
                            )}
                          >
                            #{String(rank + 1).padStart(2, '0')}
                          </span>
                          {isTop && <Trophy className="h-3 w-3 text-pkt-accent" />}
                          <span className="font-mono text-[11px] text-pkt-text-secondary">{identity}</span>
                          {isUser && (
                            <span className="border border-pkt-accent/40 bg-pkt-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-pkt-accent">
                              You
                            </span>
                          )}
                        </div>
                        <span
                          className={cn('font-mono text-[11px] font-bold', isTop ? 'text-pkt-accent' : 'text-pkt-text')}
                        >
                          ${amount.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </PacketCard>
          </motion.div>

          {/* ShareModal */}
          {shareOpen && (
            <ShareModal
              isOpen={shareOpen}
              onClose={() => setShareOpen(false)}
              poolId={rawPoolId}
              memo={pool.memo}
              amount={formatUnits(pool.totalAmount, 6)}
              totalShares={pool.totalShares}
              claimedShares={pool.realClaimedShares}
            />
          )}
        </>
      )}
    </div>
  )
}
