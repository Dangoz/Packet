'use client'

import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth'
import { motion } from 'motion/react'
import { ExternalLink, Users, Clock } from 'lucide-react'
import { PacketCard, PacketBadge, SectionLabel } from '@/components/inspired'
import { useMyPools, type PoolData } from '@/hooks/useMyPools'

export default function PacketsPage() {
  const { wallets } = useWallets()
  const wallet = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0]
  const { pools, loading, error } = useMyPools(wallet?.address)

  const active = pools.filter((p) => !p.isFullyClaimed && !p.isExpired)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Your Packets</SectionLabel>
        <PacketBadge>{loading ? '...' : `${active.length} active`}</PacketBadge>
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

      {/* Pool list */}
      {!loading && !error && pools.length > 0 && (
        <div className="flex flex-col gap-3">
          {pools.map((pool, i) => (
            <motion.div
              key={pool.poolId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <PoolRow pool={pool} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function PoolRow({ pool }: { pool: PoolData }) {
  const progress = pool.totalShares > 0 ? pool.claimedShares / pool.totalShares : 0

  const statusLabel = pool.isFullyClaimed ? 'claimed' : pool.isExpired ? 'expired' : 'active'

  const statusColor = pool.isFullyClaimed
    ? 'text-pkt-text-tertiary'
    : pool.isExpired
      ? 'text-red-400'
      : 'text-emerald-400'

  const statusDot = pool.isFullyClaimed
    ? 'bg-pkt-text-tertiary'
    : pool.isExpired
      ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]'
      : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'

  const expiresDate = new Date(pool.expiresAt * 1000)
  const now = new Date()
  const hoursLeft = Math.max(0, Math.floor((expiresDate.getTime() - now.getTime()) / 3600000))
  const expiryLabel = pool.isExpired
    ? `Expired ${formatRelative(pool.expiresAt)}`
    : hoursLeft < 1
      ? 'Expires <1h'
      : `${hoursLeft}h left`

  return (
    <div className="pkt-corner-ticks relative border border-pkt-border bg-pkt-surface backdrop-blur-xl">
      <div className="flex items-stretch">
        {/* Left: Envelope accent strip */}
        <div
          className="w-1.5 shrink-0"
          style={{
            background: pool.isFullyClaimed
              ? 'var(--pkt-text-tertiary)'
              : pool.isExpired
                ? '#c81414'
                : 'linear-gradient(180deg, rgba(200,20,20,0.9), rgba(180,140,0,0.9))',
          }}
        />

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3.5">
          {/* Top row: memo + status */}
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-xs font-bold text-pkt-text">{pool.memo || '(no memo)'}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
              <span className={`font-mono text-[10px] uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
            </div>
          </div>

          {/* Middle: amount + shares */}
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-lg font-bold text-pkt-text">
              ${parseFloat(pool.totalAmount).toFixed(2)}
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
              <Users className="h-3 w-3" />
              {pool.claimedShares}/{pool.totalShares} claimed
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
              <Clock className="h-3 w-3" />
              {expiryLabel}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full overflow-hidden bg-white/[0.06]">
            <motion.div
              className="h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                background: pool.isFullyClaimed
                  ? 'var(--pkt-text-tertiary)'
                  : 'linear-gradient(90deg, var(--pkt-accent), rgba(255,208,0,0.6))',
              }}
            />
          </div>

          {/* Bottom: pool id + explorer */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-pkt-text-tertiary">
              {'[ '}
              {pool.poolId.slice(0, 10)}...{pool.poolId.slice(-6)}
              {' ]'}
            </span>
            {pool.txHash && (
              <a
                href={`https://explore.tempo.xyz/tx/${pool.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-pkt-accent transition-all hover:brightness-110"
              >
                Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatRelative(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
