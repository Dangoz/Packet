import { NextRequest, NextResponse } from 'next/server'
import { getCollectionBySlug } from '@/lib/nft-collections'
import { resolveIpfsUrl } from '@/lib/ipfs'

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const apiKey = process.env.ALCHEMY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'NFT Gallery unavailable' }, { status: 503 })
  }

  const collection = getCollectionBySlug(slug)
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const startToken = request.nextUrl.searchParams.get('startToken') || undefined
  const tokenId = request.nextUrl.searchParams.get('tokenId') || undefined

  // Single token lookup by ID
  if (tokenId !== undefined) {
    const cacheKey = `${slug}:token:${tokenId}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    try {
      const url = new URL(`https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadata`)
      url.searchParams.set('contractAddress', collection.contract)
      url.searchParams.set('tokenId', tokenId)

      const res = await fetch(url.toString(), {
        headers: { accept: 'application/json' },
      })

      if (!res.ok) {
        const result = { nfts: [], nextCursor: null }
        setCache(cacheKey, result)
        return NextResponse.json(result)
      }

      const nft = await res.json()
      const image = nft.image as Record<string, string> | undefined
      const rawUrl = image?.cachedUrl || image?.thumbnailUrl || image?.originalUrl || image?.pngUrl
      const imageUrl = resolveIpfsUrl(rawUrl)
      const thumbnailUrl = resolveIpfsUrl(image?.thumbnailUrl) || imageUrl

      const result = imageUrl
        ? {
            nfts: [
              {
                tokenId: (nft.tokenId as string) || tokenId,
                name: (nft.name as string) || `#${tokenId}`,
                imageUrl,
                thumbnailUrl,
              },
            ],
            nextCursor: null,
          }
        : { nfts: [], nextCursor: null }

      setCache(cacheKey, result)
      return NextResponse.json(result)
    } catch (err) {
      console.error('NFT metadata fetch error:', err)
      return NextResponse.json({ nfts: [], nextCursor: null })
    }
  }

  const cacheKey = `${slug}:${startToken || 'start'}`

  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const url = new URL(`https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForContract`)
    url.searchParams.set('contractAddress', collection.contract)
    url.searchParams.set('withMetadata', 'true')
    url.searchParams.set('limit', '50')
    if (startToken) {
      url.searchParams.set('startToken', startToken)
    }

    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Alchemy API error:', res.status, text)
      return NextResponse.json({ error: 'Failed to fetch NFTs' }, { status: 502 })
    }

    const data = await res.json()

    const nfts = (data.nfts || [])
      .map((nft: Record<string, unknown>) => {
        const image = nft.image as Record<string, string> | undefined
        const rawUrl = image?.cachedUrl || image?.thumbnailUrl || image?.originalUrl || image?.pngUrl
        const imageUrl = resolveIpfsUrl(rawUrl)
        const thumbnailUrl = resolveIpfsUrl(image?.thumbnailUrl) || imageUrl
        if (!imageUrl) return null
        return {
          tokenId: (nft.tokenId as string) || '',
          name: (nft.name as string) || `#${nft.tokenId}`,
          imageUrl,
          thumbnailUrl,
        }
      })
      .filter(Boolean)

    const result = {
      nfts,
      nextCursor: data.pageKey || null,
    }

    setCache(cacheKey, result)

    return NextResponse.json(result)
  } catch (err) {
    console.error('NFT gallery fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
