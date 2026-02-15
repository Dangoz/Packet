import type { Address, Hex } from 'viem'

const RPC_URL = 'https://rpc.moderato.tempo.xyz'

/**
 * Estimate gas for a Tempo batch transaction (type 0x76) via raw RPC.
 *
 * Viem's `estimateGas` doesn't support batch `calls` for JSON-RPC accounts,
 * so we call `eth_estimateGas` directly with the full batch payload.
 * Returns the estimate with a 20% buffer to account for minor state changes.
 */
export async function estimateBatchGas(from: Address, calls: { to: Address; data: Hex }[]): Promise<bigint> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_estimateGas',
      params: [
        {
          from,
          type: '0x76',
          calls: calls.map((c) => ({
            to: c.to,
            data: c.data,
            value: '0x0',
          })),
          feePayer: true,
        },
      ],
      id: 1,
    }),
  })

  const result = await response.json()

  if (result.error) {
    console.warn('Batch gas estimation failed, using fallback:', result.error.message)
    return 2_000_000n
  }

  const estimate = BigInt(result.result as string)
  // Add 20% buffer
  return (estimate * 120n) / 100n
}
