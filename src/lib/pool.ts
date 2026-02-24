import { createPublicClient, http, formatUnits, type Hex, type Address } from 'viem'
import { Chain } from 'tempo.ts/viem'
import { packetPoolAddress, pathUsd } from '@/constants'
import { packetPoolAbi } from '@/abi/PacketPool'
import { parseMemo, parseBannerId } from '@/lib/memo'
import { CUSTOM_BANNER_ID } from '@/lib/banners'
import { db } from '@/db'
import { customBanners } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
  customBannerUrl: string | null
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

    // Enhancement: compute real claimed count (tolerates failure)
    let realClaimedShares = rawPool.claimedShares
    try {
      const [claimers] = (await client.readContract({
        address: packetPoolAddress,
        abi: packetPoolAbi,
        functionName: 'getPoolClaims',
        args: [poolId],
      })) as [Address[], bigint[]]
      realClaimedShares = claimers.filter((c) => c !== '0x0000000000000000000000000000000000000000').length
    } catch {
      // Fall back to raw contract claimedShares
    }

    const now = Math.floor(Date.now() / 1000)
    const bannerId = parseBannerId(rawPool.memo)

    let customBannerUrl: string | null = null
    if (bannerId === CUSTOM_BANNER_ID) {
      try {
        const row = await db.select().from(customBanners).where(eq(customBanners.poolId, poolId)).get()
        customBannerUrl = row?.imageUrl ?? null
      } catch {
        // DB unavailable — fall back to null
      }
    }

    return {
      exists: true,
      creator: rawPool.creator,
      memo: parseMemo(rawPool.memo),
      bannerId,
      customBannerUrl,
      totalAmount: formatUnits(rawPool.totalAmount, 6),
      remainingAmount: formatUnits(rawPool.remainingAmount, 6),
      totalShares: rawPool.totalShares,
      claimedShares: realClaimedShares,
      expiresAt: Number(rawPool.expiresAt),
      isFullyClaimed: realClaimedShares >= rawPool.totalShares,
      isExpired: now >= Number(rawPool.expiresAt),
    }
  } catch {
    return null
  }
}
