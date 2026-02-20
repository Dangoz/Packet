'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth'
import { motion } from 'motion/react'
import { Share2 } from 'lucide-react'
import { PacketCard, PacketBadge, SectionLabel, PacketEnvelope } from '@/components/inspired'
import { ShareModal } from '@/components/ShareModal'
import { RefundDialog } from '@/components/RefundDialog'
import { useMyPools, type PoolData } from '@/hooks/useMyPools'
import { parseBannerId } from '@/lib/memo'
import { getBannerSrc } from '@/lib/banners'

export default function PacketsPage() {
  const { wallets } = useWallets()
  const wallet = wallets[0]
  const { pools, loading, error, refetch } = useMyPools(wallet?.address)
  const [sharePool, setSharePool] = useState<PoolData | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)

  const active = pools.filter((p) => !p.isFullyClaimed && !p.isExpired)
  const refundable = pools.filter((p) => p.isExpired && !p.isFullyClaimed && parseFloat(p.remainingAmount) > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Your Packets</SectionLabel>
        <div className="flex items-center gap-2">
          {refundable.length > 0 && (
            <button onClick={() => setRefundOpen(true)}>
              <PacketBadge className="cursor-pointer border-l-amber-500 text-amber-400 transition-colors hover:bg-white/10">
                {refundable.length} refundable
              </PacketBadge>
            </button>
          )}
          <PacketBadge>{loading ? '...' : `${active.length} active`}</PacketBadge>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <PacketCard>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 h-5 w-5 animate-spin border-2 border-pkt-text-tertiary border-t-pkt-accent" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-tertiary">
              Querying Tempo...
            </span>
          </div>
        </PacketCard>
      )}

      {/* Error */}
      {!loading && error && (
        <PacketCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-red-400">
              Failed to load packets
            </p>
            <p className="max-w-xs font-mono text-[11px] text-pkt-text-tertiary">{error}</p>
          </div>
        </PacketCard>
      )}

      {/* Empty */}
      {!loading && !error && pools.length === 0 && (
        <PacketCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 grid h-16 w-16 place-items-center border border-dashed border-pkt-border">
              <svg className="h-6 w-6 text-pkt-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-pkt-text-secondary">
              No packets created yet
            </p>
            <p className="mb-6 max-w-xs text-sm text-pkt-text-tertiary">
              Packets you create will appear here with their claim status and distribution details.
            </p>
            <Link
              href="/app/create"
              className="border border-pkt-accent bg-pkt-accent/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-pkt-accent transition-colors hover:bg-pkt-accent/20"
            >
              Create First Packet
            </Link>
          </div>
        </PacketCard>
      )}

      {/* Pool grid */}
      {!loading && !error && pools.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {pools.map((pool, i) => (
            <motion.div
              key={pool.poolId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Link href={`/app/packets/${pool.poolId}`}>
                <PoolCard pool={pool} onShare={() => setSharePool(pool)} />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
      {sharePool && (
        <ShareModal
          isOpen={!!sharePool}
          onClose={() => setSharePool(null)}
          poolId={sharePool.poolId}
          memo={sharePool.memo}
          amount={sharePool.totalAmount}
          totalShares={sharePool.totalShares}
          claimedShares={sharePool.realClaimedShares}
        />
      )}
      <RefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        pools={refundable}
        onRefundComplete={() => refetch()}
      />
    </div>
  )
}

function PoolCard({ pool, onShare }: { pool: PoolData; onShare: () => void }) {
  const isActive = !pool.isFullyClaimed && !pool.isExpired
  const isDimmed = pool.isFullyClaimed || pool.isExpired
  const bannerSrc = pool.memoRaw ? getBannerSrc(parseBannerId(pool.memoRaw)) : null

  const statusOverlay = pool.isRefunded
    ? 'Refunded'
    : pool.isFullyClaimed
      ? 'All claimed'
      : pool.isExpired
        ? 'Expired'
        : null

  return (
    <PacketEnvelope
      size="sm"
      bannerSrc={bannerSrc}
      dimmed={isDimmed}
      hoverable
      amount={`$${parseFloat(pool.totalAmount).toFixed(2)}`}
      memo={pool.memo || '(no memo)'}
      bottom="progress"
      claimedShares={pool.realClaimedShares}
      totalShares={pool.totalShares}
      statusOverlay={statusOverlay}
      topRight={
        isActive ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onShare()
            }}
            className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
          >
            <Share2 className="h-3 w-3" />
          </button>
        ) : undefined
      }
    />
  )
}
