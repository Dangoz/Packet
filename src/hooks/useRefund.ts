/**
 * Hook for refunding unclaimed funds from an expired Lucky Split pool.
 *
 * Flow:
 * 1. Build Tempo transaction with single call: refund(poolId)
 * 2. Sign with Privy's secp256k1_sign
 * 3. Broadcast via sponsored fee-payer route
 * 4. Confirm remainingAmount === 0 on-chain (instant finality)
 */

import { packetPoolAddress } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { txToast } from '@/lib/txToast'
import { estimateBatchGas } from '@/lib/tempo'
import { useWallets } from '@privy-io/react-auth'
import { useState } from 'react'
import { createPublicClient, http, encodeFunctionData, concat, type Address, type Hex } from 'viem'
import { tempoActions, Chain } from 'tempo.ts/viem'
import { TransactionEnvelopeTempo, SignatureEnvelope } from 'tempo.ts/ox'

const tempoModerato = Chain.define({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'pathUSD', symbol: 'pathUSD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  feeToken: '0x20c0000000000000000000000000000000000000' as Address,
})()

export type RefundStatus = 'idle' | 'building' | 'signing' | 'broadcasting' | 'success' | 'error'

export function useRefund() {
  const { wallets } = useWallets()
  const [status, setStatus] = useState<RefundStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [refundedAmount, setRefundedAmount] = useState<bigint | null>(null)

  const refund = async (poolId: Hex) => {
    setStatus('building')
    setError(null)
    setTxHash(null)
    setRefundedAmount(null)

    const t = txToast()

    const wallet = wallets[0]
    if (!wallet?.address) {
      setStatus('error')
      setError('No wallet found. Login with email/SMS first.')
      t.error('No wallet found')
      return
    }

    try {
      t.loading('Building refund...')

      await wallet.switchChain(tempoModerato.id)
      const provider = await wallet.getEthereumProvider()

      const publicClient = createPublicClient({
        chain: tempoModerato,
        transport: http('https://rpc.moderato.tempo.xyz'),
      }).extend(tempoActions())

      // Read remaining amount before refund so we know how much was refunded
      const poolBefore = await publicClient.readContract({
        address: packetPoolAddress,
        abi: packetPoolAbi,
        functionName: 'getPool',
        args: [poolId],
      })
      const amountToRefund = poolBefore.remainingAmount

      const calls = [
        {
          to: packetPoolAddress as Address,
          data: encodeFunctionData({
            abi: packetPoolAbi,
            functionName: 'refund',
            args: [poolId],
          }),
        },
      ]

      // Pre-check via eth_call to detect contract reverts
      const callResponse = await fetch('https://rpc.moderato.tempo.xyz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ from: wallet.address, to: calls[0].to, data: calls[0].data }, 'latest'],
          id: 1,
        }),
      })
      const callResult = await callResponse.json()
      if (callResult.error) {
        const msg = callResult.error.message || ''
        if (msg.includes('NotPoolCreator')) throw new Error('Only the creator can refund')
        if (msg.includes('PoolNotExpired')) throw new Error('Packet has not expired yet')
        if (msg.includes('NothingToRefund')) throw new Error('Nothing to refund')
        if (msg.includes('PoolNotFound')) throw new Error('Packet not found')
        if (msg.toLowerCase().includes('insufficient funds for gas')) {
          console.warn('Ignoring eth_call insufficient-funds precheck for sponsored refund:', msg)
        } else {
          throw new Error(msg || 'Transaction would fail')
        }
      }

      const [gasEstimate, feeData, nonce] = await Promise.all([
        estimateBatchGas(wallet.address as Address, calls),
        publicClient.estimateFeesPerGas(),
        publicClient.getTransactionCount({ address: wallet.address as Address }),
      ])
      const gasLimit = gasEstimate < 2_000_000n ? 2_000_000n : gasEstimate

      const envelope = TransactionEnvelopeTempo.from({
        chainId: tempoModerato.id,
        calls,
        nonce: BigInt(nonce),
        gas: gasLimit,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        feePayerSignature: null,
      })

      const signPayload = TransactionEnvelopeTempo.getSignPayload(envelope)
      setStatus('signing')
      t.loading('Awaiting signature...')

      const rawSignature = await provider.request({
        method: 'secp256k1_sign',
        params: [signPayload],
      })

      const signature = parseSignature(rawSignature)

      const sig = SignatureEnvelope.from({
        type: 'secp256k1',
        signature: {
          r: BigInt(signature.r),
          s: BigInt(signature.s),
          yParity: signature.yParity,
        },
      })

      const serialized = TransactionEnvelopeTempo.serialize(envelope, {
        signature: sig,
      })
      const signedTx = concat([serialized, wallet.address as Address, '0xfeefeefeefee'])

      setStatus('broadcasting')
      t.loading('Broadcasting refund...')

      const sponsorResponse = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serializedTx: signedTx }),
      })
      const sponsorResult = await sponsorResponse.json()
      if (sponsorResult.error) {
        throw new Error(sponsorResult.error || 'Fee sponsor error')
      }

      const hash = sponsorResult.hash as string
      setTxHash(hash)
      setRefundedAmount(amountToRefund)

      setStatus('success')
      t.success(hash, 'Refund complete!')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Refund error:', err)
      setStatus('error')
      setError(errorMsg)
      t.error(errorMsg, 'Failed to refund')
    }
  }

  const reset = () => {
    setStatus('idle')
    setError(null)
    setTxHash(null)
    setRefundedAmount(null)
  }

  return { refund, status, error, txHash, refundedAmount, reset }
}

function parseSignature(sig: Hex): { r: Hex; s: Hex; yParity: 0 | 1 } {
  const sigHex = sig.slice(2)
  const r = `0x${sigHex.slice(0, 64)}` as Hex
  const s = `0x${sigHex.slice(64, 128)}` as Hex
  const v = parseInt(sigHex.slice(128, 130), 16)
  const yParity = (v === 27 || v === 0 ? 0 : 1) as 0 | 1
  return { r, s, yParity }
}
