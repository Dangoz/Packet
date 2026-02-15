'use client'

import {
  ActionButtonsGrid,
  BalanceCard,
  BatchSendModal,
  ReceiveModal,
  RecentActivity,
  SendModal,
  UserPill,
  WalletContainer,
  WalletHeader,
} from '@/components'
import { useSend } from '@/hooks/useSend'
import { useTransactionHistory } from '@/hooks/useTransactionHistory'
import { useBalance } from '@/hooks/useBalance'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AppPage() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const router = useRouter()
  const [showSend, setShowSend] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [showBatchSend, setShowBatchSend] = useState(false)
  const [sendAmount, setSendAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [memo, setMemo] = useState('')

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  // Use the Privy embedded wallet, not MetaMask
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
  const walletAddress = embeddedWallet?.address || ''
  const { balance, symbol, loading } = useBalance(walletAddress)
  const { send, isSending, error, txHash, reset } = useSend()
  const {
    transactions: txHistory,
    loading: txLoading,
    error: txError,
  } = useTransactionHistory(walletAddress, txHash || undefined)

  // Format transaction history for display
  const transactions = txHistory.map((tx) => ({
    type: tx.type,
    amount: tx.amount,
    timestamp: tx.formattedTimestamp,
    hash: tx.hash,
    memo: tx.memo,
  }))

  const handleSend = async () => {
    try {
      await send(recipient, sendAmount, memo)
    } catch (err) {
      // Error is already handled by the hook
      console.error('Send failed:', err)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress)
  }

  // Show loading while Privy initializes or if not authenticated (redirecting)
  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white/50 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <UserPill />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full"
      >
        <WalletContainer>
          <WalletHeader />
          <BalanceCard
            balance={balance}
            symbol={symbol}
            walletAddress={walletAddress}
            onCopyAddress={copyToClipboard}
            loading={loading}
          />
          <ActionButtonsGrid
            onSendClick={() => setShowSend(true)}
            onReceiveClick={() => setShowReceive(true)}
            onBatchClick={() => setShowBatchSend(true)}
          />
          <RecentActivity transactions={transactions} loading={txLoading} error={txError} symbol={symbol} />
        </WalletContainer>
      </motion.div>
      <SendModal
        isOpen={showSend}
        onClose={() => {
          setShowSend(false)
          reset()
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
        error={error}
        txHash={txHash}
      />
      <ReceiveModal
        isOpen={showReceive}
        onClose={() => setShowReceive(false)}
        walletAddress={walletAddress}
        onCopyAddress={copyToClipboard}
      />
      <BatchSendModal isOpen={showBatchSend} onClose={() => setShowBatchSend(false)} />
    </>
  )
}
