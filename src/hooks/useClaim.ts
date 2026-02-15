/**
 * Hook for claiming a share from a Lucky Split pool.
 *
 * Flow:
 * 1. Build Tempo transaction with single call: claim(poolId)
 * 2. Sign with Privy's secp256k1_sign
 * 3. Broadcast via eth_sendRawTransaction
 * 4. Read claimed amount from on-chain state (instant finality)
 */

import { pathUsd, packetPoolAddress } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { txToast } from '@/lib/txToast'
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
  feeToken: pathUsd,
})()

export type ClaimStatus = 'idle' | 'building' | 'signing' | 'broadcasting' | 'success' | 'error'

export function useClaim(poolId: Hex) {
  const { wallets } = useWallets()
  const [status, setStatus] = useState<ClaimStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [claimedAmount, setClaimedAmount] = useState<bigint | null>(null)

  const claim = async () => {
    setStatus('building')
    setError(null)
    setTxHash(null)
    setClaimedAmount(null)

    const t = txToast()

    const wallet = wallets[0]
    if (!wallet?.address) {
      setStatus('error')
      setError('No wallet found. Login with email/SMS first.')
      t.error('No wallet found')
      return
    }

    try {
      t.loading('Building transaction...')

      await wallet.switchChain(tempoModerato.id)
      const provider = await wallet.getEthereumProvider()

      const publicClient = createPublicClient({
        chain: tempoModerato,
        transport: http('https://rpc.moderato.tempo.xyz'),
      }).extend(tempoActions())

      const calls = [
        {
          to: packetPoolAddress as Address,
          data: encodeFunctionData({
            abi: packetPoolAbi,
            functionName: 'claim',
            args: [poolId],
          }),
        },
      ]

      // Use eth_call to detect contract reverts without balance check (unlike eth_estimateGas)
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
        if (msg.includes('AlreadyClaimed')) throw new Error('You already claimed from this packet')
        if (msg.includes('PoolExpired')) throw new Error('This packet has expired')
        if (msg.includes('PoolFullyClaimed')) throw new Error('All shares have been claimed')
        if (msg.includes('PoolNotFound')) throw new Error('Packet not found')
        throw new Error(msg || 'Transaction would fail')
      }

      // Hardcoded gas — claim() is bounded, no need for eth_estimateGas (which checks balance)
      const gasEstimate = 500_000n

      const [feeData, nonce] = await Promise.all([
        publicClient.estimateFeesPerGas(),
        publicClient.getTransactionCount({ address: wallet.address as Address }),
      ])

      const envelope = TransactionEnvelopeTempo.from({
        chainId: tempoModerato.id,
        calls,
        nonce: BigInt(nonce),
        gas: gasEstimate * 3n,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        feeToken: pathUsd as Address,
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

      // Serialize with feePayerSignature: null to mark for sponsorship,
      // then append sender address + magic bytes so sponsor can infer sender
      const serialized = TransactionEnvelopeTempo.serialize(envelope, {
        signature: sig,
        feePayerSignature: null,
      })
      const signedTx = concat([serialized, wallet.address as Address, '0xfeefeefeefee'])

      setStatus('broadcasting')
      t.loading('Broadcasting to Tempo...')

      // Send to our API route for fee payer co-signing + broadcast
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

      // Read claimed amount — Tempo instant finality means state is already updated
      const [claimers, amounts] = (await publicClient.readContract({
        address: packetPoolAddress,
        abi: packetPoolAbi,
        functionName: 'getPoolClaims',
        args: [poolId],
      })) as [Address[], bigint[]]

      const idx = claimers.findIndex((c) => c.toLowerCase() === wallet.address.toLowerCase())
      if (idx >= 0) setClaimedAmount(amounts[idx])

      setStatus('success')
      t.success(hash, 'Packet claimed!')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Claim error:', err)
      setStatus('error')
      setError(errorMsg)
      t.error(errorMsg, 'Failed to claim')
    }
  }

  const reset = () => {
    setStatus('idle')
    setError(null)
    setTxHash(null)
    setClaimedAmount(null)
  }

  return { claim, status, error, txHash, claimedAmount, reset }
}

function parseSignature(sig: Hex): { r: Hex; s: Hex; yParity: 0 | 1 } {
  const sigHex = sig.slice(2)
  const r = `0x${sigHex.slice(0, 64)}` as Hex
  const s = `0x${sigHex.slice(64, 128)}` as Hex
  const v = parseInt(sigHex.slice(128, 130), 16)
  const yParity = (v === 27 || v === 0 ? 0 : 1) as 0 | 1
  return { r, s, yParity }
}
