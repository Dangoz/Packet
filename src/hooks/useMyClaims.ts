import { packetPoolAddress, pathUsd } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { resolveIdentities, truncateAddress } from '@/lib/resolve-identities'
import { useEffect, useState } from 'react'
import { createPublicClient, http, formatUnits, hexToString, type Address, type Hex } from 'viem'
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

export interface ClaimData {
  poolId: Hex
  amount: string
  claimIndex: number
  // Pool context
  poolMemo: string
  poolTotalAmount: string
  poolTotalShares: number
  poolClaimedShares: number
  creatorAddress: Address
  // Resolved creator identity
  creatorLabel: string
  // Tx metadata
  txHash?: Hex
  blockNumber?: bigint
  timestamp?: number
}

export function useMyClaims(address: string | undefined) {
  const [claims, setClaims] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) {
      setClaims([])
      return
    }

    let cancelled = false

    const fetchClaims = async () => {
      try {
        setError(null)

        // Query Claimed events filtered by claimer (indexed)
        // Tempo RPC limits getLogs to 100k blocks, so paginate
        const claimedEvent = {
          type: 'event' as const,
          name: 'Claimed' as const,
          inputs: [
            { name: 'poolId', type: 'bytes32', indexed: true },
            { name: 'claimer', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'claimIndex', type: 'uint8', indexed: false },
          ],
        } as const

        const latestBlock = await client.getBlockNumber()
        const CHUNK = 99_999n

        const getChunk = (from: bigint, to: bigint) =>
          client.getLogs({
            address: packetPoolAddress,
            event: claimedEvent,
            args: { claimer: address as Address },
            fromBlock: from,
            toBlock: to,
          })

        type ClaimLog = Awaited<ReturnType<typeof getChunk>>[number]
        const logs: ClaimLog[] = []

        for (let to = latestBlock; to >= 0n; to -= CHUNK) {
          const from = to > CHUNK ? to - CHUNK + 1n : 0n
          const chunk = await getChunk(from, to)
          logs.push(...chunk)
          if (from === 0n) break
        }

        if (cancelled) return

        if (logs.length === 0) {
          setClaims([])
          setLoading(false)
          return
        }

        // Deduplicate pool IDs for batch fetching
        const uniquePoolIds = [...new Set(logs.map((l) => l.args.poolId!))]

        // Fetch pool details + block timestamps in parallel
        const [poolMap, blockMap] = await Promise.all([
          fetchPoolDetails(uniquePoolIds),
          fetchBlockTimestamps(logs.map((l) => l.blockNumber)),
        ])

        if (cancelled) return

        // Collect unique creator addresses for identity resolution
        const creatorAddresses = [...new Set(Object.values(poolMap).map((p) => p.creator))]
        const identityMap = await resolveIdentities(creatorAddresses)

        if (cancelled) return

        const claimData: ClaimData[] = logs.map((log) => {
          const poolId = log.args.poolId!
          const pool = poolMap[poolId]
          const creatorLabel = pool
            ? identityMap[pool.creator.toLowerCase()] || truncateAddress(pool.creator)
            : 'Unknown'

          return {
            poolId,
            amount: formatUnits(log.args.amount!, 6),
            claimIndex: log.args.claimIndex!,
            poolMemo: pool?.memo || '',
            poolTotalAmount: pool ? formatUnits(pool.totalAmount, 6) : '0',
            poolTotalShares: pool?.totalShares || 0,
            poolClaimedShares: pool?.claimedShares || 0,
            creatorAddress: pool?.creator || ('0x0' as Address),
            creatorLabel,
            txHash: log.transactionHash ?? undefined,
            blockNumber: log.blockNumber ?? undefined,
            timestamp: log.blockNumber ? blockMap[log.blockNumber.toString()] : undefined,
          }
        })

        // Newest first
        claimData.reverse()
        setClaims(claimData)
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching claims:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch claims')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchClaims()
    const interval = setInterval(fetchClaims, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [address])

  return { claims, loading, error }
}

// ── Helpers ──

interface PoolInfo {
  creator: Address
  totalAmount: bigint
  totalShares: number
  claimedShares: number
  memo: string
}

async function fetchPoolDetails(poolIds: Hex[]): Promise<Record<Hex, PoolInfo>> {
  const results = await Promise.all(
    poolIds.map(async (poolId) => {
      const pool = await client.readContract({
        address: packetPoolAddress,
        abi: packetPoolAbi,
        functionName: 'getPool',
        args: [poolId],
      })
      return [
        poolId,
        {
          creator: pool.creator,
          totalAmount: pool.totalAmount,
          totalShares: pool.totalShares,
          claimedShares: pool.claimedShares,
          memo: parseMemo(pool.memo),
        },
      ] as const
    }),
  )
  return Object.fromEntries(results) as Record<Hex, PoolInfo>
}

async function fetchBlockTimestamps(blockNumbers: (bigint | null)[]): Promise<Record<string, number>> {
  const unique = [...new Set(blockNumbers.filter((b): b is bigint => b !== null).map((b) => b.toString()))]
  const results = await Promise.all(
    unique.map(async (blockNum) => {
      try {
        const block = await client.getBlock({ blockNumber: BigInt(blockNum) })
        return [blockNum, Number(block.timestamp)] as const
      } catch {
        return [blockNum, 0] as const
      }
    }),
  )
  return Object.fromEntries(results)
}

function parseMemo(memoBytes: Hex): string {
  try {
    const raw = hexToString(memoBytes)
    return raw.replace(/\0+$/, '')
  } catch {
    return ''
  }
}
