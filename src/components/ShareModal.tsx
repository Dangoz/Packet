'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Link2, Copy, Check, Users, ExternalLink } from 'lucide-react'
import { PacketCard, PacketButton } from '@/components/inspired'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  poolId: string
  memo: string
  amount: string
  totalShares: number
  claimedShares: number
  txHash?: string
  onCreateAnother?: () => void
  inline?: boolean
}

export function ShareModal({
  isOpen,
  onClose,
  poolId,
  memo,
  amount,
  totalShares,
  claimedShares,
  txHash,
  onCreateAnother,
  inline,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const claimUrl = typeof window !== 'undefined' ? `${window.location.origin}/claim/${poolId}` : ''

  const handleCopy = async () => {
    if (!claimUrl) return
    await navigator.clipboard.writeText(claimUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sharesLeft = totalShares - claimedShares

  const content = (
    <PacketCard header={inline ? 'Share Your Packet' : 'Share Packet'}>
      {/* Close button (modal only) */}
      {!inline && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-pkt-text-tertiary transition-colors hover:text-pkt-text"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-col gap-5">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="border border-pkt-border bg-white p-3">
            <QRCodeSVG value={claimUrl} size={160} level="H" />
          </div>
        </div>

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

        {/* Share on X */}
        <button
          onClick={() => {
            const text = onCreateAnother
              ? `I just created a $${parseFloat(amount).toFixed(2)} Lucky Split on Packet — ${totalShares} shares, random amounts. Claim yours before they're gone!`
              : `$${parseFloat(amount).toFixed(2)} Lucky Split on Packet — ${sharesLeft} of ${totalShares} shares left. Claim yours before they're gone!`
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(claimUrl)}`
            window.open(url, '_blank', 'noopener,noreferrer')
          }}
          className="flex w-full items-center justify-center gap-2 border border-pkt-border py-2.5 font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary transition-colors hover:border-pkt-text hover:text-pkt-text"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>

        {/* Pool metadata */}
        <div className="flex flex-col gap-2 border border-pkt-border bg-white/[0.02] p-3">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider">
            <span className="text-pkt-text-tertiary">{'[ memo ]'}</span>
            <span className="max-w-[60%] truncate text-pkt-text-secondary">{memo || '(none)'}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider">
            <span className="text-pkt-text-tertiary">{'[ amount ]'}</span>
            <span className="text-pkt-text">${parseFloat(amount).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider">
            <span className="text-pkt-text-tertiary">{'[ shares ]'}</span>
            <span className="flex items-center gap-1 text-pkt-text-secondary">
              <Users className="h-3 w-3" />
              {claimedShares}/{totalShares} claimed
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider">
            <span className="text-pkt-text-tertiary">{'[ pool ]'}</span>
            <span className="text-pkt-text-tertiary">
              {poolId.slice(0, 10)}...{poolId.slice(-6)}
            </span>
          </div>
        </div>

        {/* Explorer link (when txHash provided) */}
        {txHash && (
          <div className="flex items-center justify-end">
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
        )}

        {/* Action buttons (create page) */}
        {onCreateAnother && (
          <div className="flex gap-3">
            <button
              onClick={() => window.open('/app/packets', '_self')}
              className="flex flex-1 items-center justify-center gap-1.5 border border-pkt-border py-2.5 font-mono text-[11px] uppercase tracking-wider text-pkt-text-secondary transition-colors hover:border-pkt-accent/50 hover:text-pkt-accent"
            >
              <Users className="h-3 w-3" />
              View Packets
            </button>
            <PacketButton className="flex-1 py-2.5" onClick={onCreateAnother}>
              Create Another
            </PacketButton>
          </div>
        )}
      </div>
    </PacketCard>
  )

  if (inline) {
    return content
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
