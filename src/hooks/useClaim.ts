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
import { createPublicClient, http, encodeFunctionData, type Address, type Hex } from 'viem'
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

    const wallet = wallets.find((w) => w.walletClientType === 'privy')
    if (!wallet?.address) {
      setStatus('error')
      setError('No Privy embedded wallet found. Login with email/SMS first.')
      t.error('No Privy embedded wallet found')
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

      // Gas estimate with contract revert handling
      let gasEstimate: bigint
      try {
        gasEstimate = await publicClient.estimateGas({
          account: wallet.address as Address,
          to: calls[0].to,
          data: calls[0].data,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // Map contract revert names to user-friendly messages
        if (msg.includes('AlreadyClaimed')) throw new Error('You already claimed from this packet')
        if (msg.includes('PoolExpired')) throw new Error('This packet has expired')
        if (msg.includes('PoolFullyClaimed')) throw new Error('All shares have been claimed')
        if (msg.includes('PoolNotFound')) throw new Error('Packet not found')
        throw err
      }

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

      const signedTx = TransactionEnvelopeTempo.serialize(envelope, {
        signature: SignatureEnvelope.from({
          type: 'secp256k1',
          signature: {
            r: BigInt(signature.r),
            s: BigInt(signature.s),
            yParity: signature.yParity,
          },
        }),
      })

      setStatus('broadcasting')
      t.loading('Broadcasting to Tempo...')

      const response = await fetch('https://rpc.moderato.tempo.xyz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_sendRawTransaction',
          params: [signedTx],
          id: 1,
        }),
      })

      const rpcResult = await response.json()

      if (rpcResult.error) {
        throw new Error(rpcResult.error.message || 'RPC error')
      }

      const hash = rpcResult.result as string
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
