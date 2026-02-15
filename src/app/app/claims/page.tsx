'use client'

import { useWallets } from '@privy-io/react-auth'
import { motion } from 'motion/react'
import { ExternalLink, Gift } from 'lucide-react'
import NumberFlow from '@number-flow/react'
import { PacketCard, PacketBadge, SectionLabel } from '@/components/inspired'
import { useMyClaims, type ClaimData } from '@/hooks/useMyClaims'

export default function ClaimsPage() {
  const { wallets } = useWallets()
  const wallet = wallets[0]
  const { claims, loading, error } = useMyClaims(wallet?.address)

  const totalWon = claims.reduce((sum, c) => sum + parseFloat(c.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Your Claims</SectionLabel>
        <PacketBadge>{loading ? '...' : `${claims.length} claimed`}</PacketBadge>
      </div>

      {/* Summary strip */}
      {!loading && claims.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between border border-pkt-border bg-pkt-surface/50 px-5 py-3"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">Total won</span>
          <span className="font-mono text-lg font-bold text-pkt-accent">
            <NumberFlow
              value={totalWon}
              format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            />
          </span>
        </motion.div>
      )}

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
              Failed to load claims
            </p>
            <p className="max-w-xs font-mono text-[11px] text-pkt-text-tertiary">{error}</p>
          </div>
        </PacketCard>
      )}

      {/* Empty */}
      {!loading && !error && claims.length === 0 && (
        <PacketCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 grid h-16 w-16 place-items-center border border-dashed border-pkt-border">
              <Gift className="h-6 w-6 text-pkt-text-tertiary" />
            </div>
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-pkt-text-secondary">
              No claims yet
            </p>
            <p className="max-w-xs text-sm text-pkt-text-tertiary">
              When you claim shares from Lucky Split packets, your winnings will appear here.
            </p>
          </div>
        </PacketCard>
      )}

      {/* Claims list */}
      {!loading && !error && claims.length > 0 && (
        <div className="flex flex-col gap-3">
          {claims.map((claim, i) => (
            <motion.div
              key={`${claim.poolId}-${claim.claimIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <ClaimRow claim={claim} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClaimRow({ claim }: { claim: ClaimData }) {
  const amountNum = parseFloat(claim.amount)
  const totalNum = parseFloat(claim.poolTotalAmount)
  const pct = totalNum > 0 ? ((amountNum / totalNum) * 100).toFixed(1) : '0'
  const timeLabel = claim.timestamp ? formatRelative(claim.timestamp) : ''

  return (
    <div className="pkt-corner-ticks relative border border-pkt-border bg-pkt-surface backdrop-blur-xl">
      <div className="flex items-stretch">
        {/* Left: red-gold accent strip */}
        <div
          className="w-1.5 shrink-0"
          style={{ background: 'linear-gradient(180deg, rgba(200,20,20,0.9), rgba(180,140,0,0.9))' }}
        />

        {/* Content */}
        <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3.5">
          {/* Main info */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* Memo + creator */}
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-xs font-bold text-pkt-text">
                {claim.poolMemo || '(no memo)'}
              </span>
            </div>

            {/* From + time */}
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
              <span>from {claim.creatorLabel}</span>
              {timeLabel && (
                <>
                  <span className="text-pkt-border">|</span>
                  <span>{timeLabel}</span>
                </>
              )}
            </div>

            {/* Share context */}
            <span className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
              {pct}% of ${totalNum.toFixed(2)} ({claim.claimIndex + 1}/{claim.poolTotalShares} claimed)
            </span>
          </div>

          {/* Right: amount + explorer */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="font-mono text-lg font-bold text-pkt-accent">+${amountNum.toFixed(2)}</span>
            {claim.txHash && (
              <a
                href={`https://explore.tempo.xyz/tx/${claim.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] text-pkt-text-tertiary transition-colors hover:text-pkt-accent"
              >
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
