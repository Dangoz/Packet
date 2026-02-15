import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'
import { type Hex } from 'viem'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getPoolData } from '@/lib/pool'
import { getBannerSrc } from '@/lib/banners'

export const runtime = 'nodejs'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

async function loadBannerBase64(bannerId: number): Promise<string | null> {
  const src = getBannerSrc(bannerId)
  if (!src) return null
  try {
    // Use optimized JPEG copies (≤250 KB) instead of full-size PNGs (up to 10 MB)
    const ogFilename = src.slice(1).replace('.png', '-og.jpg')
    const buf = await readFile(join(process.cwd(), 'public', ogFilename))
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  const { poolId: rawPoolId } = await params

  if (!POOL_ID_RE.test(rawPoolId)) {
    return fallbackImage('Invalid Link')
  }

  const pool = await getPoolData(rawPoolId as Hex)

  if (!pool) {
    return fallbackImage('Packet Not Found')
  }

  const amount = parseFloat(pool.totalAmount).toFixed(2)
  const sharesLeft = pool.totalShares - pool.claimedShares
  const memo = pool.memo || 'Lucky Split'
  const progress = pool.totalShares > 0 ? (pool.claimedShares / pool.totalShares) * 100 : 0
  const bannerDataUri = await loadBannerBase64(pool.bannerId)

  const statusText = pool.isFullyClaimed
    ? 'All claimed'
    : pool.isExpired
      ? 'Expired'
      : `${sharesLeft} of ${pool.totalShares} shares left`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: '#050505',
        fontFamily: 'system-ui, sans-serif',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Centered envelope card */}
      <div
        style={{
          width: 960,
          height: 540,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          background: bannerDataUri
            ? '#111'
            : 'linear-gradient(160deg, rgba(200, 20, 20, 0.9) 0%, rgba(180, 140, 0, 0.9) 100%)',
        }}
      >
        {/* Banner image layer */}
        {bannerDataUri && (
          <img
            src={bannerDataUri}
            width={960}
            height={540}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 960,
              height: 540,
              objectFit: 'cover',
            }}
          />
        )}

        {/* Dark scrim over banner */}
        {bannerDataUri && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 960,
              height: 540,
              background: 'rgba(0,0,0,0.45)',
            }}
          />
        )}

        {/* Content container */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '40px 60px',
          }}
        >
          {/* Top: branding + circle seal */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: bannerDataUri
                    ? 'linear-gradient(135deg, rgba(255,208,0,0.9) 0%, rgba(255,180,0,0.7) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 100%)',
                  transform: 'rotate(45deg)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: bannerDataUri ? '#ffd000' : 'rgba(255,255,255,0.8)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                }}
              >
                Packet
              </span>
            </div>

            {/* Circle seal */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                border: '2px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.05)',
              }}
            />
          </div>

          {/* Center: amount + memo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 96,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1,
                textShadow: '0 2px 20px rgba(0,0,0,0.3)',
              }}
            >
              ${amount}
            </span>
            <span
              style={{
                fontSize: 28,
                color: 'rgba(255,255,255,0.7)',
                maxWidth: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
                textShadow: '0 1px 8px rgba(0,0,0,0.3)',
              }}
            >
              {memo}
            </span>
          </div>

          {/* Bottom: shares badge + progress */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              width: '100%',
            }}
          >
            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                maxWidth: 600,
                height: 6,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                overflow: 'hidden',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffd000, rgba(255,208,0,0.6))',
                  borderRadius: 3,
                }}
              />
            </div>

            {/* Status row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                }}
              >
                {statusText}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase' as const,
                }}
              >
                Lucky Split
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Corner ticks — top-left */}
      <div
        style={{
          position: 'absolute',
          top: 43,
          left: 118,
          width: 16,
          height: 16,
          borderLeft: '2px solid rgba(255,208,0,0.4)',
          borderTop: '2px solid rgba(255,208,0,0.4)',
        }}
      />
      {/* Corner ticks — top-right */}
      <div
        style={{
          position: 'absolute',
          top: 43,
          right: 118,
          width: 16,
          height: 16,
          borderRight: '2px solid rgba(255,208,0,0.4)',
          borderTop: '2px solid rgba(255,208,0,0.4)',
        }}
      />
      {/* Corner ticks — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: 43,
          left: 118,
          width: 16,
          height: 16,
          borderLeft: '2px solid rgba(255,208,0,0.4)',
          borderBottom: '2px solid rgba(255,208,0,0.4)',
        }}
      />
      {/* Corner ticks — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 43,
          right: 118,
          width: 16,
          height: 16,
          borderRight: '2px solid rgba(255,208,0,0.4)',
          borderBottom: '2px solid rgba(255,208,0,0.4)',
        }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
    },
  )
}

function fallbackImage(message: string) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          background: 'linear-gradient(135deg, #c81414 0%, #b48c00 100%)',
          transform: 'rotate(45deg)',
          marginBottom: 32,
        }}
      />
      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#ffd000',
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
        }}
      >
        Packet
      </span>
      <span
        style={{
          fontSize: 20,
          color: '#888888',
          marginTop: 16,
        }}
      >
        {message}
      </span>
    </div>,
    { width: 1200, height: 630 },
  )
}
