import { packetPoolAddress, pathUsd } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { parseMemo } from '@/lib/memo'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPublicClient, http, formatUnits, type Address, type Hex } from 'viem'
import { tempoActions, Chain } from 'tempo.ts/viem'

const tempoModerato = Chain.define({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'pathUSD', symbol: 'pathUSD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  feeToken: pathUsd,
})()

export interface PoolData {
  poolId: Hex
  creator: Address
  token: Address
  totalAmount: string
  remainingAmount: string
  totalShares: number
  claimedShares: number
  realClaimedShares: number
  memo: string
  memoRaw: Hex
  expiresAt: number
  isFullyClaimed: boolean
  isExpired: boolean
  isRefunded: boolean
  txHash?: Hex
  blockNumber?: bigint
}

const client = createPublicClient({
  chain: tempoModerato,
  transport: http('https://rpc.moderato.tempo.xyz'),
}).extend(tempoActions())

export function useMyPools(address: string | undefined) {
  const [pools, setPools] = useState<PoolData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const fetchPools = useCallback(async () => {
    if (!address) {
      setPools([])
      return
    }

    try {
      setError(null)

      // Query PoolCreated events filtered by creator (indexed param at topic[2])
      // Tempo RPC limits getLogs to 100k blocks, so paginate
      const poolCreatedEvent = {
        type: 'event' as const,
        name: 'PoolCreated' as const,
        inputs: [
          { name: 'poolId', type: 'bytes32', indexed: true },
          { name: 'creator', type: 'address', indexed: true },
          { name: 'token', type: 'address', indexed: false },
          { name: 'amount', type: 'uint256', indexed: false },
          { name: 'shares', type: 'uint8', indexed: false },
          { name: 'memo', type: 'bytes32', indexed: false },
          { name: 'expiresAt', type: 'uint256', indexed: false },
        ],
      } as const

      const latestBlock = await client.getBlockNumber()
      const CHUNK = 99_999n

      const getChunk = (from: bigint, to: bigint) =>
        client.getLogs({
          address: packetPoolAddress,
          event: poolCreatedEvent,
          args: { creator: address as Address },
          fromBlock: from,
          toBlock: to,
        })

      type PoolLog = Awaited<ReturnType<typeof getChunk>>[number]
      const logs: PoolLog[] = []

      for (let to = latestBlock; to >= 0n; to -= CHUNK) {
        const from = to > CHUNK ? to - CHUNK + 1n : 0n
        const chunk = await getChunk(from, to)
        logs.push(...chunk)
        if (from === 0n) break
      }

      if (cancelledRef.current) return

      if (logs.length === 0) {
        setPools([])
        setLoading(false)
        return
      }

      // For each pool, read current on-chain state + claims
      const poolData = await Promise.all(
        logs.map(async (log) => {
          const poolId = log.args.poolId!
          const [pool, claimsResult] = await Promise.all([
            client.readContract({
              address: packetPoolAddress,
              abi: packetPoolAbi,
              functionName: 'getPool',
              args: [poolId],
            }),
            client.readContract({
              address: packetPoolAddress,
              abi: packetPoolAbi,
              functionName: 'getPoolClaims',
              args: [poolId],
            }),
          ])

          const [claimers] = claimsResult as [Address[], bigint[]]
          const realClaimedShares = claimers.filter((c) => c !== '0x0000000000000000000000000000000000000000').length

          const now = Math.floor(Date.now() / 1000)
          const isExpired = now >= Number(pool.expiresAt)
          const isRefunded = isExpired && pool.remainingAmount === 0n && realClaimedShares < pool.totalShares

          return {
            poolId,
            creator: pool.creator,
            token: pool.token,
            totalAmount: formatUnits(pool.totalAmount, 6),
            remainingAmount: formatUnits(pool.remainingAmount, 6),
            totalShares: pool.totalShares,
            claimedShares: pool.claimedShares,
            realClaimedShares,
            memo: parseMemo(pool.memo),
            memoRaw: pool.memo,
            expiresAt: Number(pool.expiresAt),
            isFullyClaimed: realClaimedShares >= pool.totalShares,
            isExpired,
            isRefunded,
            txHash: log.transactionHash ?? undefined,
            blockNumber: log.blockNumber ?? undefined,
          } satisfies PoolData
        }),
      )

      if (cancelledRef.current) return

      // Show newest first
      poolData.reverse()
      setPools(poolData)
    } catch (err) {
      if (cancelledRef.current) return
      console.error('Error fetching pools:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pools')
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (!address) {
      setPools([])
      return
    }

    cancelledRef.current = false
    fetchPools()

    // Refresh every 15s to pick up new claims
    const interval = setInterval(fetchPools, 15000)

    return () => {
      cancelledRef.current = true
      clearInterval(interval)
    }
  }, [address, fetchPools])

  return { pools, loading, error, refetch: fetchPools }
}
