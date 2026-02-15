import { createPublicClient, http, formatUnits, type Hex, type Address } from 'viem'
import { Chain } from 'tempo.ts/viem'
import { packetPoolAddress, pathUsd } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { parseMemo, parseBannerId } from '@/lib/memo'

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
})

export interface ServerPoolData {
  exists: boolean
  creator: Address
  memo: string
  bannerId: number
  totalAmount: string
  remainingAmount: string
  totalShares: number
  claimedShares: number
  expiresAt: number
  isFullyClaimed: boolean
  isExpired: boolean
}

export async function getPoolData(poolId: Hex): Promise<ServerPoolData | null> {
  try {
    const rawPool = (await client.readContract({
      address: packetPoolAddress,
      abi: packetPoolAbi,
      functionName: 'getPool',
      args: [poolId],
    })) as {
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

    if (!rawPool.exists) return null

    const now = Math.floor(Date.now() / 1000)

    return {
      exists: true,
      creator: rawPool.creator,
      memo: parseMemo(rawPool.memo),
      bannerId: parseBannerId(rawPool.memo),
      totalAmount: formatUnits(rawPool.totalAmount, 6),
      remainingAmount: formatUnits(rawPool.remainingAmount, 6),
      totalShares: rawPool.totalShares,
      claimedShares: rawPool.claimedShares,
      expiresAt: Number(rawPool.expiresAt),
      isFullyClaimed: rawPool.claimedShares >= rawPool.totalShares,
      isExpired: now >= Number(rawPool.expiresAt),
    }
  } catch {
    return null
  }
}
