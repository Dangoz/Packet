import type { Metadata } from 'next'
import type { Hex } from 'viem'
import { getPoolData } from '@/lib/pool'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

export async function generateMetadata({ params }: { params: Promise<{ poolId: string }> }): Promise<Metadata> {
  const { poolId: rawPoolId } = await params

  if (!POOL_ID_RE.test(rawPoolId)) {
    return {
      title: 'Packet',
      description: 'Claim your Lucky Split on Packet',
    }
  }

  const pool = await getPoolData(rawPoolId as Hex)

  if (!pool) {
    return {
      title: 'Packet',
      description: 'Claim your Lucky Split on Packet',
    }
  }

  const amount = parseFloat(pool.totalAmount).toFixed(2)
  const memo = pool.memo || 'Lucky Split'
  const sharesLeft = pool.totalShares - pool.claimedShares
  const description = pool.isFullyClaimed
    ? `$${amount} · All ${pool.totalShares} shares claimed`
    : pool.isExpired
      ? `$${amount} · Expired`
      : `$${amount} · ${sharesLeft} of ${pool.totalShares} shares left · Claim your Lucky Split`

  const ogImageUrl = `/api/og/${rawPoolId}`

  return {
    title: `${memo} — Packet`,
    description,
    other: {
      'theme-color': '#ffd000',
    },
    openGraph: {
      url: `/claim/${rawPoolId}`,
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
