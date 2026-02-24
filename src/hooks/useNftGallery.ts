import { useState, useEffect, useCallback } from 'react'
import { NFT_COLLECTIONS, toSlug, type NftCollection } from '@/lib/nft-collections'

export interface NftItem {
  tokenId: string
  name: string
  imageUrl: string
  thumbnailUrl: string
}

export interface NftCollectionWithImage extends NftCollection {
  slug: string
  coverImage?: string
}

export function useNftGallery(slug: string | null) {
  const [nfts, setNfts] = useState<NftItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [collectionImages, setCollectionImages] = useState<Record<string, string>>({})
  const [imagesLoading, setImagesLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch collection cover images on mount
  useEffect(() => {
    let cancelled = false

    fetch('/api/nft-gallery/collections')
      .then((res) => {
        if (!res.ok) return {}
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setCollectionImages(data || {})
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setImagesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const collections: NftCollectionWithImage[] = NFT_COLLECTIONS.map((c) => {
    const slug = toSlug(c.name)
    return { ...c, slug, coverImage: collectionImages[slug] }
  })

  // Reset when slug changes
  useEffect(() => {
    setNfts([])
    setNextCursor(null)
    setError(null)
    setSearchQuery('')

    if (!slug) return

    let cancelled = false
    setLoading(true)

    fetch(`/api/nft-gallery/${slug}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 503) throw new Error('NFT Gallery unavailable — ALCHEMY_API_KEY not configured')
          throw new Error('Failed to load NFTs')
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setNfts(data.nfts || [])
        setNextCursor(data.nextCursor || null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  const loadMore = useCallback(() => {
    if (!slug || !nextCursor || loading) return

    setLoading(true)

    fetch(`/api/nft-gallery/${slug}?startToken=${encodeURIComponent(nextCursor)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load more NFTs')
        return res.json()
      })
      .then((data) => {
        setNfts((prev) => [...prev, ...(data.nfts || [])])
        setNextCursor(data.nextCursor || null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug, nextCursor, loading])

  const searchByTokenId = useCallback(
    (tokenId: string) => {
      if (!slug || !tokenId.trim()) return

      setSearchQuery(tokenId.trim())
      setNfts([])
      setLoading(true)
      setError(null)

      fetch(`/api/nft-gallery/${slug}?tokenId=${encodeURIComponent(tokenId.trim())}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to search NFT')
          return res.json()
        })
        .then((data) => {
          setNfts(data.nfts || [])
          setNextCursor(null)
        })
        .catch((err) => {
          setError(err.message)
        })
        .finally(() => {
          setLoading(false)
        })
    },
    [slug],
  )

  const clearSearch = useCallback(() => {
    if (!slug) return

    setSearchQuery('')
    setNfts([])
    setLoading(true)
    setError(null)

    fetch(`/api/nft-gallery/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load NFTs')
        return res.json()
      })
      .then((data) => {
        setNfts(data.nfts || [])
        setNextCursor(data.nextCursor || null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug])

  return {
    collections,
    nfts,
    loading,
    imagesLoading,
    error,
    hasMore: !!nextCursor,
    loadMore,
    searchQuery,
    searchByTokenId,
    clearSearch,
  }
}
