'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { ChevronRight, Check, Loader2, AlertCircle } from 'lucide-react'
import type { Hex } from 'viem'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PacketButton } from '@/components/inspired'
import { useRefund, type RefundStatus } from '@/hooks/useRefund'
import type { PoolData } from '@/hooks/useMyPools'

interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pools: PoolData[]
  onRefundComplete: () => void
}

type PoolRefundState = { status: RefundStatus; error?: string; txHash?: string }

export function RefundDialog({ open, onOpenChange, pools, onRefundComplete }: RefundDialogProps) {
  const { refund, status: hookStatus, reset } = useRefund()
  const [poolStates, setPoolStates] = useState<Record<string, PoolRefundState>>({})
  const [batchInProgress, setBatchInProgress] = useState(false)
  const batchAbortRef = useRef(false)

  const anyInProgress = batchInProgress || ['building', 'signing', 'broadcasting'].includes(hookStatus)

  const handleSingleRefund = async (poolId: Hex) => {
    setPoolStates((prev) => ({ ...prev, [poolId]: { status: 'building' } }))

    // Subscribe to hook status changes by running the refund and tracking state
    reset()
    try {
      // Update pool state as hook progresses
      const updateState = (s: RefundStatus) => setPoolStates((prev) => ({ ...prev, [poolId]: { status: s } }))

      updateState('building')
      await refund(poolId)

      // After refund completes, check if it succeeded or failed
      // The hook sets its own status, but since refund() is async and resolves after completion,
      // we can check the final state by reading the current hook values.
      // However, since hooks update asynchronously, we rely on the promise resolving = success.
      setPoolStates((prev) => ({ ...prev, [poolId]: { status: 'success' } }))
      onRefundComplete()
    } catch {
      setPoolStates((prev) => ({
        ...prev,
        [poolId]: { status: 'error', error: 'Refund failed' },
      }))
    }
  }

  const handleRefundAll = async () => {
    setBatchInProgress(true)
    batchAbortRef.current = false

    for (const pool of pools) {
      if (batchAbortRef.current) break
      const existing = poolStates[pool.poolId]
      if (existing?.status === 'success') continue

      reset()
      setPoolStates((prev) => ({ ...prev, [pool.poolId]: { status: 'building' } }))

      try {
        await refund(pool.poolId)
        setPoolStates((prev) => ({ ...prev, [pool.poolId]: { status: 'success' } }))
        onRefundComplete()
      } catch {
        setPoolStates((prev) => ({
          ...prev,
          [pool.poolId]: { status: 'error', error: 'Refund failed' },
        }))
      }
    }

    setBatchInProgress(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && anyInProgress) return
    if (!next) {
      setPoolStates({})
      reset()
      batchAbortRef.current = true
    }
    onOpenChange(next)
  }

  const allDone = pools.length > 0 && pools.every((p) => poolStates[p.poolId]?.status === 'success')
  const totalRefunded = pools
    .filter((p) => poolStates[p.poolId]?.status === 'success')
    .reduce((sum, p) => sum + parseFloat(p.remainingAmount), 0)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!anyInProgress}>
        <DialogHeader className="border-b border-pkt-border pb-4">
          <DialogTitle className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-pkt-accent" />
            Refund Expired Packets
          </DialogTitle>
          <DialogDescription>Unclaimed funds returned to your wallet</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
          {pools.map((pool, i) => {
            const state = poolStates[pool.poolId] ?? { status: 'idle' as const }
            const isProcessing = ['building', 'signing', 'broadcasting'].includes(state.status)

            return (
              <motion.div
                key={pool.poolId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                className="border border-pkt-border bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-pkt-text">{pool.memo || '(no memo)'}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-pkt-text-tertiary">
                      {pool.claimedShares}/{pool.totalShares} claimed
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-pkt-accent">
                    ${parseFloat(pool.remainingAmount).toFixed(2)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-end">
                  {state.status === 'success' ? (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                      <Check className="h-3 w-3" />
                      Refunded
                    </span>
                  ) : state.status === 'error' ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono text-[10px] text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        {state.error}
                      </span>
                      <button
                        onClick={() => handleSingleRefund(pool.poolId)}
                        className="font-mono text-[10px] uppercase tracking-wider text-pkt-accent hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : isProcessing ? (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {state.status === 'building'
                        ? 'Building...'
                        : state.status === 'signing'
                          ? 'Signing...'
                          : 'Broadcasting...'}
                    </span>
                  ) : (
                    <PacketButton
                      size="sm"
                      className="h-7 px-3 text-[10px]"
                      onClick={() => handleSingleRefund(pool.poolId)}
                      disabled={anyInProgress}
                    >
                      Refund
                    </PacketButton>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {allDone && totalRefunded > 0 && (
          <div className="border-t border-pkt-border pt-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary">Total refunded</p>
            <p className="mt-1 font-mono text-lg font-bold text-pkt-accent">${totalRefunded.toFixed(2)}</p>
          </div>
        )}

        {pools.length > 1 && !allDone && (
          <DialogFooter className="border-t border-pkt-border pt-4">
            <PacketButton className="w-full" onClick={handleRefundAll} disabled={anyInProgress}>
              {batchInProgress ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refunding...
                </span>
              ) : (
                `Refund All (${pools.length} packets)`
              )}
            </PacketButton>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
