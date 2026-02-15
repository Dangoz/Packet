/**
 * Hook for creating a Lucky Split pool on-chain.
 *
 * Flow:
 * 1. Build Tempo batch transaction with two calls:
 *    - approve(packetPoolAddress, amount) on pathUSD
 *    - createPool(poolId, shares, memo, token, amount) on PacketPool
 * 2. Sign with Privy's secp256k1_sign
 * 3. Broadcast via eth_sendRawTransaction
 */

import { pathUsd, packetPoolAddress } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { txToast } from '@/lib/txToast'
import { estimateBatchGas } from '@/lib/tempo'
import { useWallets } from '@privy-io/react-auth'
import { useState } from 'react'
import { encodeMemo } from '@/lib/memo'
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseUnits,
  keccak256,
  encodePacked,
  type Address,
  type Hex,
} from 'viem'
import { tempoActions, Abis, Chain } from 'tempo.ts/viem'
import { TransactionEnvelopeTempo, SignatureEnvelope } from 'tempo.ts/ox'

const tempoModerato = Chain.define({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'pathUSD', symbol: 'pathUSD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  feeToken: pathUsd,
})()

export type CreatePoolStatus = 'idle' | 'building' | 'signing' | 'broadcasting' | 'success' | 'error'

export function useCreatePool() {
  const { wallets } = useWallets()
  const [status, setStatus] = useState<CreatePoolStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [poolId, setPoolId] = useState<Hex | null>(null)

  const createPool = async (amount: string, shares: number, memo: string, bannerId: number = 0) => {
    setStatus('building')
    setError(null)
    setTxHash(null)
    setPoolId(null)

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

      // Generate unique pool ID: keccak256(creator, timestamp, random)
      const randomBytes = crypto.getRandomValues(new Uint8Array(32))
      const randomHex = `0x${Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('')}` as Hex
      const generatedPoolId = keccak256(
        encodePacked(['address', 'uint256', 'bytes32'], [wallet.address as Address, BigInt(Date.now()), randomHex]),
      )
      setPoolId(generatedPoolId)

      // Encode memo as bytes32 with banner ID in last byte
      const encodedMemo = encodeMemo(memo, bannerId)

      // Parse amount to 6 decimals
      const parsedAmount = parseUnits(amount, 6)

      // Build two calls: approve + createPool
      const calls = [
        {
          to: pathUsd as Address,
          data: encodeFunctionData({
            abi: Abis.tip20,
            functionName: 'approve',
            args: [packetPoolAddress, parsedAmount],
          }),
        },
        {
          to: packetPoolAddress as Address,
          data: encodeFunctionData({
            abi: packetPoolAbi,
            functionName: 'createPool',
            args: [generatedPoolId, shares, encodedMemo, pathUsd, parsedAmount],
          }),
        },
      ]

      // Estimate gas for the full batch, fee data, and nonce in parallel
      const [gasEstimate, feeData, nonce] = await Promise.all([
        estimateBatchGas(wallet.address as Address, calls),
        publicClient.estimateFeesPerGas(),
        publicClient.getTransactionCount({
          address: wallet.address as Address,
        }),
      ])

      // Build Tempo transaction envelope
      const envelope = TransactionEnvelopeTempo.from({
        chainId: tempoModerato.id,
        calls,
        nonce: BigInt(nonce),
        gas: gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        feeToken: pathUsd as Address,
      })

      // Sign
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

      // Broadcast
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
      setStatus('success')
      t.success(hash, 'Packet created!')

      return { txHash: hash, poolId: generatedPoolId }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Create pool error:', err)
      setStatus('error')
      setError(errorMsg)
      t.error(errorMsg, 'Failed to create packet')
    }
  }

  const reset = () => {
    setStatus('idle')
    setError(null)
    setTxHash(null)
    setPoolId(null)
  }

  return { createPool, status, error, txHash, poolId, reset }
}

function parseSignature(sig: Hex): { r: Hex; s: Hex; yParity: 0 | 1 } {
  const sigHex = sig.slice(2)
  const r = `0x${sigHex.slice(0, 64)}` as Hex
  const s = `0x${sigHex.slice(64, 128)}` as Hex
  const v = parseInt(sigHex.slice(128, 130), 16)
  const yParity = (v === 27 || v === 0 ? 0 : 1) as 0 | 1
  return { r, s, yParity }
}
