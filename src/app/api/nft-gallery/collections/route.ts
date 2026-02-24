import { NextResponse } from 'next/server'
import { NFT_COLLECTIONS, toSlug } from '@/lib/nft-collections'

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

export async function GET() {
  const apiKey = process.env.ALCHEMY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'NFT Gallery unavailable' }, { status: 503 })
  }

  const cached = getCached('collection-images')
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const results = await Promise.all(
      NFT_COLLECTIONS.map(async (c) => {
        try {
          const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getContractMetadata?contractAddress=${c.contract}`
          const res = await fetch(url, { headers: { accept: 'application/json' } })
          if (!res.ok) return { slug: toSlug(c.name), imageUrl: null }
          const data = await res.json()
          const imageUrl = data.openSeaMetadata?.imageUrl || null
          return { slug: toSlug(c.name), imageUrl }
        } catch {
          return { slug: toSlug(c.name), imageUrl: null }
        }
      }),
    )

    const images: Record<string, string> = {}
    for (const r of results) {
      if (r.imageUrl) images[r.slug] = r.imageUrl
    }

    setCache('collection-images', images)

    return NextResponse.json(images)
  } catch (err) {
    console.error('Collection images fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
