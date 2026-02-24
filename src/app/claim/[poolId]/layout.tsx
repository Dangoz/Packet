import type { Metadata } from 'next'
import type { Hex } from 'viem'
import { getPoolData } from '@/lib/pool'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function generateMetadata({ params }: { params: Promise<{ poolId: string }> }): Promise<Metadata> {
  const { poolId: rawPoolId } = await params
  const baseUrl = getBaseUrl()
  const poolIdPath = encodeURIComponent(rawPoolId)
  const claimUrl = new URL(`/claim/${poolIdPath}`, baseUrl).toString()
  const ogImageUrl = new URL(`/api/og/${poolIdPath}`, baseUrl).toString()
  const fallbackDescription =
    'Packet - Wechat inspired red envelopes with random split outcomes. Onboard to crypto in one click, coming to Tempo'

  const baseMeta: Pick<Metadata, 'other' | 'openGraph' | 'twitter'> = {
    other: {
      'theme-color': '#ffd000',
    },
    openGraph: {
      url: claimUrl,
      title: 'Packet',
      description: fallbackDescription,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'Packet Lucky Split' }],
      type: 'website',
      siteName: 'Packet',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Packet',
      description: fallbackDescription,
      images: [ogImageUrl],
    },
  }

  if (!POOL_ID_RE.test(rawPoolId)) {
    return {
      title: 'Packet',
      description: fallbackDescription,
      ...baseMeta,
    }
  }

  const pool = await getPoolData(rawPoolId as Hex)

  if (!pool) {
    return {
      title: 'Packet',
      description: fallbackDescription,
      ...baseMeta,
    }
  }

  const memo = pool.memo || 'Lucky Split'
  const description = fallbackDescription

  return {
    title: `${memo} — Packet`,
    description,
    other: baseMeta.other,
    openGraph: {
      url: claimUrl,
      title: `${memo} — Packet`,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `Packet: ${memo}` }],
      type: 'website',
      siteName: 'Packet',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${memo} — Packet`,
      description,
      images: [ogImageUrl],
    },
  }
}

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return children
}
