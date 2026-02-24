import { useState, useEffect } from 'react'
import { getBannerSrc, CUSTOM_BANNER_ID } from '@/lib/banners'

/* ── Module-level cache ─────────────────────────────────────────────────── */

const urlCache = new Map<string, string>()
const inflightRequests = new Map<string, Promise<string | null>>()

function fetchCustomBannerUrl(poolId: string): Promise<string | null> {
  const cached = urlCache.get(poolId)
  if (cached) return Promise.resolve(cached)

  const inflight = inflightRequests.get(poolId)
  if (inflight) return inflight

  const request = fetch(`/api/banners/${poolId}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const url = data?.imageUrl ?? null
      if (url) urlCache.set(poolId, url)
      return url
    })
    .catch(() => null)
    .finally(() => {
      inflightRequests.delete(poolId)
    })

  inflightRequests.set(poolId, request)
  return request
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

/**
 * Unified banner resolution hook.
 * - 0 or undefined → null (no banner)
 * - 1–65534 → static lookup via getBannerSrc
 * - 65535 → fetch custom URL from /api/banners/:poolId (module-level cached)
 */
export function useBannerSrc(bannerId: number | undefined, poolId?: string): string | null {
  const isCustom = bannerId === CUSTOM_BANNER_ID
  const staticSrc = !isCustom && bannerId ? getBannerSrc(bannerId) : null

  // Initialize from cache for instant remounts
  const [customUrl, setCustomUrl] = useState<string | null>(isCustom && poolId ? (urlCache.get(poolId) ?? null) : null)

  useEffect(() => {
    if (!isCustom || !poolId) return

    let cancelled = false
    fetchCustomBannerUrl(poolId).then((url) => {
      if (!cancelled && url) setCustomUrl(url)
    })

    return () => {
      cancelled = true
    }
  }, [isCustom, poolId])

  if (!bannerId || bannerId === 0) return null
  if (isCustom) return customUrl
  return staticSrc
}
