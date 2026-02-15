/**
 * Raw signing workaround for batch transactions with Privy embedded wallets.
 *
 * Flow:
 * 1. Build Tempo transaction envelope with calls array
 * 2. Get sign payload hash via TransactionEnvelopeTempo.getSignPayload()
 * 3. Sign hash with Privy's secp256k1_sign
 * 4. Serialize signed tx and broadcast via eth_sendRawTransaction
 */

import { pathUsd } from '@/constants'
import { txToast } from '@/lib/txToast'
import { estimateBatchGas } from '@/lib/tempo'
import { useWallets } from '@privy-io/react-auth'
import { useState } from 'react'
import { createPublicClient, http, encodeFunctionData, parseUnits, type Address, type Hex } from 'viem'
import { tempoActions, Abis, Chain } from 'tempo.ts/viem'
import { TransactionEnvelopeTempo, SignatureEnvelope } from 'tempo.ts/ox'

// Define Tempo Moderato chain with proper formatters
const tempoModerato = Chain.define({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'pathUSD', symbol: 'pathUSD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  feeToken: pathUsd,
})()

export interface Recipient {
  email: string
  amount: string
}

export interface BatchRawResult {
  txHash: string | null
  status: 'idle' | 'building' | 'signing' | 'broadcasting' | 'success' | 'error'
  error: string | null
}

export function useBatchSendRaw() {
  const { wallets } = useWallets()
  const [result, setResult] = useState<BatchRawResult>({
    txHash: null,
    status: 'idle',
    error: null,
  })

  const sendBatch = async (recipients: Recipient[]) => {
    setResult({ txHash: null, status: 'building', error: null })

    const t = txToast()

    // Find the Privy embedded wallet (not MetaMask or other injected wallets)
    const wallet = wallets.find((w) => w.walletClientType === 'privy')
    if (!wallet?.address) {
      setResult({
        txHash: null,
        status: 'error',
        error: 'No Privy embedded wallet found. Login with email/SMS to use batch transactions.',
      })
      t.error('No Privy embedded wallet found')
      return
    }

    try {
      t.loading('Building batch transaction...')

      // 1. Switch chain and get provider
      await wallet.switchChain(tempoModerato.id)
      const provider = await wallet.getEthereumProvider()

      // 2. Create public client for RPC calls
      const publicClient = createPublicClient({
        chain: tempoModerato,
        transport: http('https://rpc.moderato.tempo.xyz'),
      }).extend(tempoActions())

      // 3. Resolve addresses and get token metadata
      const addresses = await Promise.all(recipients.map((r) => resolveAddress(r.email)))
      const metadata = await publicClient.token.getMetadata({ token: pathUsd })

      // 4. Build calls array
      const calls = recipients.map((recipient, i) => ({
        to: pathUsd as Address,
        data: encodeFunctionData({
          abi: Abis.tip20,
          functionName: 'transfer',
          args: [addresses[i], parseUnits(recipient.amount, metadata.decimals)],
        }),
      }))

      // 5. Estimate gas for the full batch, fee data, and nonce in parallel
      const [gasEstimate, feeData, nonce] = await Promise.all([
        estimateBatchGas(wallet.address as Address, calls),
        publicClient.estimateFeesPerGas(),
        publicClient.getTransactionCount({
          address: wallet.address as Address,
        }),
      ])

      // 6. Build Tempo transaction envelope
      const envelope = TransactionEnvelopeTempo.from({
        chainId: tempoModerato.id,
        calls,
        nonce: BigInt(nonce),
        gas: gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        feeToken: pathUsd as Address,
      })

      // 9. Get sign payload (the hash to sign)
      const signPayload = TransactionEnvelopeTempo.getSignPayload(envelope)

      setResult({ txHash: null, status: 'signing', error: null })
      t.loading('Awaiting signature...')

      // 10. Sign the hash with secp256k1_sign
      const rawSignature = await provider.request({
        method: 'secp256k1_sign',
        params: [signPayload],
      })

      // 11. Parse signature into r, s, v components
      const signature = parseSignature(rawSignature)

      // 12. Serialize the signed transaction
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

      setResult({ txHash: null, status: 'broadcasting', error: null })
      t.loading('Broadcasting to Tempo...')

      // 13. Broadcast via eth_sendRawTransaction directly to Tempo RPC
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

      const txHash = rpcResult.result as string
      setResult({ txHash, status: 'success', error: null })
      t.success(txHash, 'Batch payment sent')

      return txHash
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Batch send error:', err)
      setResult({ txHash: null, status: 'error', error: errorMsg })
      t.error(errorMsg, 'Batch payment failed')
    }
  }

  const reset = () => {
    setResult({ txHash: null, status: 'idle', error: null })
  }

  return { sendBatch, result, reset }
}

// Parse secp256k1 signature from Privy format to r, s, yParity
function parseSignature(sig: Hex): { r: Hex; s: Hex; yParity: 0 | 1 } {
  // Remove 0x prefix
  const sigHex = sig.slice(2)

  // Standard signature format: r (32 bytes) + s (32 bytes) + v (1 byte)
  const r = `0x${sigHex.slice(0, 64)}` as Hex
  const s = `0x${sigHex.slice(64, 128)}` as Hex
  const v = parseInt(sigHex.slice(128, 130), 16)

  // v is typically 27 or 28, convert to yParity (0 or 1)
  const yParity = (v === 27 || v === 0 ? 0 : 1) as 0 | 1

  return { r, s, yParity }
}

async function resolveAddress(identifier: string): Promise<Address> {
  const res = await fetch('/api/find', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  })

  if (!res.ok) {
    throw new Error('Failed to find user')
  }

  const data = (await res.json()) as { address: Address }
  return data.address
}
