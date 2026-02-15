'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { GridBackground, ProfilePill, PacketCard, SectionLabel, PacketButton, StatCard } from '@/components/inspired'
import { useBalance } from '@/hooks/useBalance'
import { useSend } from '@/hooks/useSend'
import { useTransactionHistory } from '@/hooks/useTransactionHistory'
import { SendModal } from '@/components/SendModal'
import { ReceiveModal } from '@/components/ReceiveModal'

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
})

/* ── Inline action button for the action grid ── */
function ActionTile({
  icon,
  label,
  onClick,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-3 border p-5 transition-all ${
        accent
          ? 'border-pkt-accent/40 bg-pkt-accent/[0.06] hover:bg-pkt-accent/[0.12] hover:border-pkt-accent/60'
          : 'border-pkt-border bg-white/[0.02] hover:bg-white/[0.05] hover:border-pkt-accent/30'
      }`}
    >
      {/* Corner tick */}
      <div
        className={`absolute -left-px -top-px h-2.5 w-2.5 border-l-2 border-t-2 transition-opacity ${
          accent ? 'border-pkt-accent opacity-80' : 'border-pkt-accent opacity-0 group-hover:opacity-60'
        }`}
      />
      <div
        className={`grid h-10 w-10 place-items-center border ${accent ? 'border-pkt-accent/40' : 'border-white/10'}`}
      >
        {icon}
      </div>
      <span
        className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${
          accent ? 'text-pkt-accent' : 'text-pkt-text-secondary'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

/* ── Transaction row ── */
function TxRow({
  type,
  amount,
  memo,
  timestamp,
  hash,
}: {
  type: 'send' | 'receive'
  amount: string
  memo?: string
  timestamp: string
  hash?: string
}) {
  const isSend = type === 'send'
  return (
    <div className="group flex items-center gap-3 border-b border-pkt-border/50 py-3 last:border-0">
      {/* Direction indicator */}
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center border ${
          isSend ? 'border-red-400/30 bg-red-400/[0.06]' : 'border-emerald-400/30 bg-emerald-400/[0.06]'
        }`}
      >
        <svg
          className={`h-3.5 w-3.5 ${isSend ? 'rotate-45 text-red-400' : '-rotate-[135deg] text-emerald-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium uppercase tracking-wider text-pkt-text">
            {isSend ? 'Sent' : 'Received'}
          </span>
          {memo && <span className="truncate font-mono text-[10px] text-pkt-text-tertiary">&middot; {memo}</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-mono text-[10px] text-pkt-text-tertiary">{timestamp}</span>
          {hash && (
            <a
              href={`https://explore.tempo.xyz/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-pkt-text-tertiary/50 transition-colors hover:text-pkt-accent"
            >
              {hash.slice(0, 8)}...
            </a>
          )}
        </div>
      </div>

      {/* Amount */}
      <span className={`shrink-0 font-mono text-sm font-bold ${isSend ? 'text-red-400' : 'text-emerald-400'}`}>
        {isSend ? '-' : '+'}${amount}
      </span>
    </div>
  )
}

/* ── SVG Icons ── */
const SendIcon = (
  <svg
    className="h-4 w-4 text-pkt-text-secondary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
)
const ReceiveIcon = (
  <svg
    className="h-4 w-4 text-pkt-text-secondary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
    <path d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
  </svg>
)
const PacketIcon = (
  <svg className="h-4 w-4 text-pkt-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
)

/* ════════════════════════════════════════════════
    Main App Page
════════════════════════════════════════════════ */
export default function AppPage() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const router = useRouter()

  const [showSend, setShowSend] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [sendAmount, setSendAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [memo, setMemo] = useState('')

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
  const walletAddress = embeddedWallet?.address || ''

  const { balance, symbol, loading: balanceLoading } = useBalance(walletAddress)
  const { send, isSending, error: sendError, txHash, reset: resetSend } = useSend()
  const {
    transactions: txHistory,
    loading: txLoading,
    error: txError,
  } = useTransactionHistory(walletAddress, txHash || undefined)

  const transactions = txHistory.map((tx) => ({
    type: tx.type,
    amount: tx.amount,
    timestamp: tx.formattedTimestamp,
    hash: tx.hash,
    memo: tx.memo,
  }))

  // Auth guard
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pkt-bg">
        <span className="font-mono text-[10px] uppercase tracking-[4px] text-pkt-text-tertiary">
          {'> initializing_'}
        </span>
      </div>
    )
  }

  const handleSend = async () => {
    try {
      await send(recipient, sendAmount, memo)
    } catch {
      // Error handled by hook
    }
  }

  const copyAddress = () => navigator.clipboard.writeText(walletAddress)

  return (
    <GridBackground glow>
      <ProfilePill />

      {/* ── Nav ── */}
      <motion.nav {...fade(0)} className="mx-auto flex max-w-2xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center border border-pkt-border bg-white/[0.06] -skew-x-6">
            <div className="h-1.5 w-1.5 bg-pkt-accent skew-x-6" />
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-[3px] text-pkt-text">Packet</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-pkt-text-secondary">Testnet</span>
        </div>
      </motion.nav>

      <main className="mx-auto max-w-2xl px-6 pb-16 pt-8">
        {/* ════════════════════════════════════════
            BALANCE
        ════════════════════════════════════════ */}
        <motion.div {...fade(0.08)}>
          <PacketCard header="Balance">
            <div className="flex items-end justify-between gap-4">
              <div>
                {balanceLoading && balance === '0.00' ? (
                  <div className="h-12 w-40 animate-pulse bg-white/10" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">${balance}</span>
                    <span className="font-mono text-sm text-pkt-text-tertiary">{symbol}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-pkt-text-tertiary">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="text-pkt-text-tertiary transition-colors hover:text-pkt-accent"
                    title="Copy address"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Decorative barcode */}
              <div className="hidden items-end gap-[2px] sm:flex">
                {Array.from({ length: 20 }, (_, i) => (
                  <div
                    key={i}
                    className="bg-pkt-accent/40"
                    style={{ height: `${Math.random() * 24 + 8}px`, width: Math.random() > 0.5 ? 2 : 1 }}
                  />
                ))}
              </div>
            </div>
          </PacketCard>
        </motion.div>

        {/* ════════════════════════════════════════
            ACTIONS
        ════════════════════════════════════════ */}
        <motion.div {...fade(0.16)} className="mt-6">
          <SectionLabel className="mb-3">Actions</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <ActionTile icon={SendIcon} label="Send" onClick={() => setShowSend(true)} />
            <ActionTile icon={ReceiveIcon} label="Receive" onClick={() => setShowReceive(true)} />
            <ActionTile icon={PacketIcon} label="Lucky Split" onClick={() => {}} accent />
          </div>
        </motion.div>

        {/* ════════════════════════════════════════
            QUICK STATS
        ════════════════════════════════════════ */}
        <motion.div {...fade(0.24)} className="mt-6">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<span className="font-mono text-[10px] font-bold text-pkt-accent">{transactions.length}</span>}
              label="Transactions"
            />
            <StatCard
              icon={<span className="font-mono text-[10px] font-bold text-emerald-400">$0</span>}
              label="Total Received"
            />
            <StatCard
              icon={<span className="font-mono text-[10px] font-bold text-red-400">$0</span>}
              label="Total Sent"
            />
          </div>
        </motion.div>

        {/* ════════════════════════════════════════
            RECENT ACTIVITY
        ════════════════════════════════════════ */}
        <motion.div {...fade(0.32)} className="mt-6">
          <PacketCard header="Recent Activity">
            {txLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse bg-white/10" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 animate-pulse bg-white/10" />
                      <div className="h-2 w-16 animate-pulse bg-white/5" />
                    </div>
                    <div className="h-4 w-14 animate-pulse bg-white/10" />
                  </div>
                ))}
              </div>
            ) : txError ? (
              <div className="py-6 text-center">
                <span className="font-mono text-[11px] text-red-400">Failed to load transactions</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center border border-pkt-border">
                  <div className="h-2 w-2 rotate-45 bg-pkt-text-tertiary" />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-pkt-text-tertiary">
                  No transactions yet
                </p>
                <p className="mt-1 font-mono text-[10px] text-pkt-text-tertiary/60">
                  Send or receive funds to get started
                </p>
              </div>
            ) : (
              <div>
                {transactions.map((tx, i) => (
                  <motion.div
                    key={tx.hash || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.36 + i * 0.05 }}
                  >
                    <TxRow type={tx.type} amount={tx.amount} memo={tx.memo} timestamp={tx.timestamp} hash={tx.hash} />
                  </motion.div>
                ))}
              </div>
            )}
          </PacketCard>
        </motion.div>

        {/* ── Footer meta ── */}
        <motion.div {...fade(0.4)} className="mt-8 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-pkt-text-tertiary">
            {'[ tempo.moderato ]'}
          </span>
          <span className="font-mono text-[9px] text-pkt-text-tertiary/50">Packet v1.0</span>
        </motion.div>
      </main>

      {/* ── Modals ── */}
      <SendModal
        isOpen={showSend}
        onClose={() => {
          setShowSend(false)
          resetSend()
          setSendAmount('')
          setRecipient('')
          setMemo('')
        }}
        recipientAddress={recipient}
        onRecipientChange={setRecipient}
        amount={sendAmount}
        onAmountChange={setSendAmount}
        memo={memo}
        onMemoChange={setMemo}
        onConfirm={handleSend}
        isSending={isSending}
        error={sendError}
        txHash={txHash}
      />
      <ReceiveModal
        isOpen={showReceive}
        onClose={() => setShowReceive(false)}
        walletAddress={walletAddress}
        onCopyAddress={copyAddress}
      />
    </GridBackground>
  )
}
