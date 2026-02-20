import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'
import { type Hex } from 'viem'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getPoolData } from '@/lib/pool'
import { getBannerSrc } from '@/lib/banners'

export const runtime = 'nodejs'

const POOL_ID_RE = /^0x[a-fA-F0-9]{64}$/

/* ── Font loading (cached across requests) ─────────────────────────────── */

interface FontSet {
  geistRegular: Buffer
  geistBold: Buffer
  geistExtraBold: Buffer
  monoRegular: Buffer
  monoSemiBold: Buffer
  monoBold: Buffer
}

let fontCache: FontSet | null = null

async function loadFonts(): Promise<FontSet> {
  if (fontCache) return fontCache
  const dir = join(process.cwd(), 'public/fonts')
  const [geistRegular, geistBold, geistExtraBold, monoRegular, monoSemiBold, monoBold] = await Promise.all([
    readFile(join(dir, 'Geist-Regular.ttf')),
    readFile(join(dir, 'Geist-Bold.ttf')),
    readFile(join(dir, 'Geist-ExtraBold.ttf')),
    readFile(join(dir, 'GeistMono-Regular.ttf')),
    readFile(join(dir, 'GeistMono-SemiBold.ttf')),
    readFile(join(dir, 'GeistMono-Bold.ttf')),
  ])
  fontCache = { geistRegular, geistBold, geistExtraBold, monoRegular, monoSemiBold, monoBold }
  return fontCache
}

const FONT_OPTIONS = (f: FontSet) => [
  { name: 'Geist', data: f.geistRegular, weight: 400 as const, style: 'normal' as const },
  { name: 'Geist', data: f.geistBold, weight: 700 as const, style: 'normal' as const },
  { name: 'Geist', data: f.geistExtraBold, weight: 800 as const, style: 'normal' as const },
  { name: 'GeistMono', data: f.monoRegular, weight: 400 as const, style: 'normal' as const },
  { name: 'GeistMono', data: f.monoSemiBold, weight: 600 as const, style: 'normal' as const },
  { name: 'GeistMono', data: f.monoBold, weight: 700 as const, style: 'normal' as const },
]

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

/* ── Shared visual elements ─────────────────────────────────────────────── */

function GridOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 1200,
        height: 630,
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
  )
}

function CornerTicks() {
  const size = 20
  const offset = 24
  const color = 'rgba(255,208,0,0.5)'
  const border = `2px solid ${color}`
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: offset,
          left: offset,
          width: size,
          height: size,
          borderLeft: border,
          borderTop: border,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: offset,
          right: offset,
          width: size,
          height: size,
          borderRight: border,
          borderTop: border,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: offset,
          left: offset,
          width: size,
          height: size,
          borderLeft: border,
          borderBottom: border,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: offset,
          right: offset,
          width: size,
          height: size,
          borderRight: border,
          borderBottom: border,
        }}
      />
    </>
  )
}

function DiamondMark({ size = 20, color = '#ffd000' }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: color,
        transform: 'rotate(45deg)',
        flexShrink: 0,
      }}
    />
  )
}

/* ── Main route ─────────────────────────────────────────────────────────── */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  const { poolId: rawPoolId } = await params

  const fonts = await loadFonts()

  if (!POOL_ID_RE.test(rawPoolId)) {
    return fallbackImage('Invalid Link', fonts)
  }

  const pool = await getPoolData(rawPoolId as Hex)

  if (!pool) {
    return fallbackImage('Packet Not Found', fonts)
  }

  const amount = parseFloat(pool.totalAmount).toFixed(2)
  const sharesLeft = pool.totalShares - pool.claimedShares
  const memo = pool.memo || 'Lucky Split'
  const progress = pool.totalShares > 0 ? (pool.claimedShares / pool.totalShares) * 100 : 0
  const bannerDataUri = await loadBannerBase64(pool.bannerId)

  const isActive = !pool.isFullyClaimed && !pool.isExpired

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: '#050505',
        fontFamily: 'Geist, sans-serif',
      }}
    >
      <GridOverlay />
      <CornerTicks />

      {/* ── Content area ── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '56px 60px',
          gap: 48,
        }}
      >
        {/* ── Left panel: Mini envelope ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 280,
            height: 480,
            position: 'relative',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
            alignSelf: 'center',
            background: bannerDataUri
              ? '#111'
              : 'linear-gradient(160deg, rgba(200,20,20,0.9) 0%, rgba(180,140,0,0.9) 100%)',
          }}
        >
          {/* Banner image */}
          {bannerDataUri && (
            <img
              src={bannerDataUri}
              width={280}
              height={480}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 280,
                height: 480,
                objectFit: 'cover',
              }}
            />
          )}

          {/* Dark scrim */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 280,
              height: 480,
              background: 'rgba(0,0,0,0.45)',
            }}
          />

          {/* Hatching overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 280,
              height: 480,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8px)',
            }}
          />

          {/* Envelope content: circle seal + watermark */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              gap: 24,
            }}
          >
            {/* Circle seal */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                border: '2px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DiamondMark size={16} color="rgba(255,208,0,0.7)" />
            </div>

            {/* PACKET watermark */}
            <span
              style={{
                fontSize: 10,
                fontFamily: 'GeistMono',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.25em',
                textTransform: 'uppercase' as const,
              }}
            >
              Packet
            </span>
          </div>
        </div>

        {/* ── Right panel: Data ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          {/* Top row: branding + section marker */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Diamond + PACKET */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DiamondMark size={18} />
              <span
                style={{
                  fontSize: 18,
                  fontFamily: 'GeistMono',
                  fontWeight: 700,
                  color: '#ffd000',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                }}
              >
                Packet
              </span>
            </div>

            {/* Section marker */}
            <span
              style={{
                fontSize: 13,
                fontFamily: 'GeistMono',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.08em',
              }}
            >
              {'// lucky.split'}
            </span>
          </div>

          {/* Center: amount + memo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 76,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              ${amount}
            </span>
            <span
              style={{
                fontSize: 24,
                color: 'rgba(255,255,255,0.7)',
                maxWidth: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {memo}
            </span>
          </div>

          {/* Bottom: progress + status/CTA */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: '100%',
            }}
          >
            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                height: 5,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: pool.isExpired
                    ? 'rgba(255,255,255,0.25)'
                    : 'linear-gradient(90deg, #ffd000, rgba(255,208,0,0.7))',
                }}
              />
            </div>

            {/* Status row */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Status text */}
              <span
                style={{
                  fontSize: 14,
                  fontFamily: 'GeistMono',
                  fontWeight: 700,
                  color: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                }}
              >
                {pool.isFullyClaimed
                  ? 'All shares claimed'
                  : pool.isExpired
                    ? 'Expired'
                    : `${sharesLeft} of ${pool.totalShares} shares left`}
              </span>

              {/* CTA / badge */}
              {isActive ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: '2px solid rgba(255,208,0,0.6)',
                    padding: '8px 20px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: 'GeistMono',
                      fontWeight: 700,
                      color: '#ffd000',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    Open Packet
                  </span>
                  <span style={{ fontSize: 13, color: '#ffd000' }}>{'\u2192'}</span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '2px solid rgba(255,255,255,0.12)',
                    padding: '8px 20px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: 'GeistMono',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.25)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {pool.isFullyClaimed ? 'Claimed' : 'Ended'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: FONT_OPTIONS(fonts),
    },
  )
}

/* ── Fallback image ─────────────────────────────────────────────────────── */

function fallbackImage(message: string, fonts: FontSet) {
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
        fontFamily: 'Geist, sans-serif',
        position: 'relative',
      }}
    >
      <GridOverlay />
      <CornerTicks />

      <DiamondMark size={40} color="linear-gradient(135deg, #c81414 0%, #b48c00 100%)" />
      <span
        style={{
          fontSize: 28,
          fontFamily: 'GeistMono',
          fontWeight: 700,
          color: '#ffd000',
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          marginTop: 28,
        }}
      >
        Packet
      </span>
      <span
        style={{
          fontSize: 18,
          fontFamily: 'GeistMono',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          marginTop: 16,
          letterSpacing: '0.08em',
        }}
      >
        {message}
      </span>
    </div>,
    { width: 1200, height: 630, fonts: FONT_OPTIONS(fonts) },
  )
}
