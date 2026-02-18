import { packetPoolAddress, pathUsd } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { parseMemo } from '@/lib/memo'
import { useEffect, useState, useCallback } from 'react'
import { createPublicClient, http, type Address, type Hex } from 'viem'
import { tempoActions, Chain } from 'tempo.ts/viem'

const tempoModerato = Chain.define({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'pathUSD', symbol: 'pathUSD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  feeToken: pathUsd,
})()

const client = createPublicClient({
  chain: tempoModerato,
  transport: http('https://rpc.moderato.tempo.xyz'),
}).extend(tempoActions())

export interface PoolInfo {
  creator: Address
  token: Address
  totalAmount: bigint
  remainingAmount: bigint
  totalShares: number
  claimedShares: number
  realClaimedShares: number
  expiresAt: number
  memo: string
  memoRaw: Hex
  exists: boolean
  isFullyClaimed: boolean
  isExpired: boolean
  isRefunded: boolean
}

export interface ClaimEntry {
  claimer: Address
  amount: bigint
  index: number
}

export function usePool(poolId: Hex | undefined, userAddress?: Address) {
  const [pool, setPool] = useState<PoolInfo | null>(null)
  const [claims, setClaims] = useState<ClaimEntry[]>([])
  const [userHasClaimed, setUserHasClaimed] = useState<boolean | null>(null)
  const [userClaimAmount, setUserClaimAmount] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPool = useCallback(async () => {
    if (!poolId) {
      setPool(null)
      setLoading(false)
      return
    }

    try {
      setError(null)

      const calls: [
        ReturnType<typeof client.readContract>,
        ReturnType<typeof client.readContract>,
        ...ReturnType<typeof client.readContract>[],
      ] = [
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
      ]

      if (userAddress) {
        calls.push(
          client.readContract({
            address: packetPoolAddress,
            abi: packetPoolAbi,
            functionName: 'hasClaimed',
            args: [poolId, userAddress],
          }),
        )
      }

      const results = await Promise.all(calls)

      const rawPool = results[0] as {
        creator: Address
        token: Address
        totalAmount: bigint
        remainingAmount: bigint
        totalShares: number
        claimedShares: number
        commitBlock: bigint
        expiresAt: bigint
        memo: Hex
        exists: boolean
      }

      const [claimers, amounts] = results[1] as [Address[], bigint[]]
      const claimed = userAddress ? (results[2] as boolean) : null

      const now = Math.floor(Date.now() / 1000)

      const poolInfo: PoolInfo = {
        creator: rawPool.creator,
        token: rawPool.token,
        totalAmount: rawPool.totalAmount,
        remainingAmount: rawPool.remainingAmount,
        totalShares: rawPool.totalShares,
        claimedShares: rawPool.claimedShares,
        expiresAt: Number(rawPool.expiresAt),
        memo: parseMemo(rawPool.memo),
        memoRaw: rawPool.memo,
        exists: rawPool.exists,
        isFullyClaimed: rawPool.claimedShares >= rawPool.totalShares,
        isExpired: now >= Number(rawPool.expiresAt),
        realClaimedShares: rawPool.claimedShares,
        isRefunded: false,
      }

      const claimEntries: ClaimEntry[] = claimers
        .map((claimer, i) => ({ claimer, amount: amounts[i], index: i }))
        .filter((e) => e.claimer !== '0x0000000000000000000000000000000000000000')

      const realClaimedShares = claimEntries.length
      poolInfo.realClaimedShares = realClaimedShares
      poolInfo.isRefunded =
        poolInfo.isExpired && poolInfo.remainingAmount === 0n && realClaimedShares < poolInfo.totalShares
      poolInfo.isFullyClaimed = realClaimedShares >= poolInfo.totalShares

      setPool(poolInfo)
      setClaims(claimEntries)
      setUserHasClaimed(claimed)

      // Find user's claim amount if they claimed
      if (claimed && userAddress) {
        const idx = claimers.findIndex((c) => c.toLowerCase() === userAddress.toLowerCase())
        if (idx >= 0) setUserClaimAmount(amounts[idx])
      } else if (!userAddress) {
        setUserClaimAmount(null)
      }
    } catch (err) {
      console.error('Error fetching pool:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pool')
    } finally {
      setLoading(false)
    }
  }, [poolId, userAddress])

  useEffect(() => {
    let cancelled = false

    const fetch = async () => {
      if (cancelled) return
      await fetchPool()
    }

    fetch()

    const interval = setInterval(fetch, 10000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [fetchPool])

  return { pool, claims, userHasClaimed, userClaimAmount, loading, error, refetch: fetchPool }
}
