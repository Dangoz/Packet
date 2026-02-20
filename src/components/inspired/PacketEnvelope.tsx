'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { getBannerSrc } from '@/lib/banners'
import { Progress } from '@/components/ui/progress'

const SIZE_CONFIG = {
  sm: {
    container: 'aspect-[240/340] w-full',
    clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
    seal: 'mt-4 h-8 w-8',
    amountFont: 'text-xl',
    memoFont: 'text-[9px]',
    centerGap: 'gap-1 px-3',
    bottomSpacing: 'mb-3 px-4',
    bottomTextSizes: { claimed: 'text-[8px]', label: 'text-[7px] tracking-[2px]' },
    progressHeight: 'h-1.5',
  },
  md: {
    container: 'h-[340px] w-[240px]',
    clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
    seal: 'mt-8 h-14 w-14',
    amountFont: 'text-3xl',
    memoFont: 'text-[11px]',
    centerGap: 'gap-2 px-4',
    bottomSpacing: 'mb-4 px-6',
    bottomTextSizes: { claimed: 'text-[9px]', label: 'text-[8px] tracking-[2px]' },
    progressHeight: 'h-1.5',
  },
  lg: {
    container: 'h-[420px] w-[300px]',
    clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
    seal: 'mt-10 h-16 w-16',
    amountFont: 'text-4xl',
    memoFont: 'text-sm',
    centerGap: 'gap-3 px-6',
    bottomSpacing: 'mb-4 px-6',
    bottomTextSizes: { claimed: 'text-[9px]', label: 'text-[8px] tracking-[2px]' },
    progressHeight: 'h-1.5',
  },
} as const

export interface PacketEnvelopeProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  shadow?: string
  hoverable?: boolean
  dimmed?: boolean

  bannerId?: number
  bannerSrc?: string | null

  seal?: 'circle' | ReactNode

  children?: ReactNode
  amount?: string
  memo?: string

  bottom?: 'progress' | ReactNode
  claimedShares?: number
  totalShares?: number

  statusOverlay?: string | null
  topRight?: ReactNode
}

export function PacketEnvelope({
  size = 'md',
  className,
  shadow,
  hoverable,
  dimmed,
  bannerId,
  bannerSrc: bannerSrcProp,
  seal = 'circle',
  children,
  amount,
  memo,
  bottom,
  claimedShares = 0,
  totalShares = 0,
  statusOverlay,
  topRight,
}: PacketEnvelopeProps) {
  const cfg = SIZE_CONFIG[size]
  const resolvedBanner = bannerSrcProp ?? (bannerId != null ? getBannerSrc(bannerId) : null)

  const background = resolvedBanner
    ? '#111'
    : dimmed
      ? 'linear-gradient(160deg, rgba(200, 20, 20, 0.4) 0%, rgba(180, 140, 0, 0.4) 100%)'
      : 'linear-gradient(160deg, rgba(200, 20, 20, 0.85) 0%, rgba(180, 140, 0, 0.85) 100%)'

  const progress = totalShares > 0 ? (claimedShares / totalShares) * 100 : 0

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-between overflow-hidden border border-white/20',
        cfg.container,
        hoverable && 'transition-all duration-200 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]',
        className,
      )}
      style={{
        background,
        clipPath: cfg.clipPath,
        ...(shadow ? { boxShadow: shadow } : {}),
      }}
    >
      {/* Banner background */}
      {resolvedBanner && (
        <>
          <img
            src={resolvedBanner}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/40" />
        </>
      )}

      {/* Hatching overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
        }}
      />

      {/* Top-right slot */}
      {topRight}

      {/* Seal */}
      {seal === 'circle' ? <div className={cn('shrink-0 rounded-full border border-white/40', cfg.seal)} /> : seal}

      {/* Center content */}
      <div className={cn('relative z-[1] flex flex-1 flex-col items-center justify-center', cfg.centerGap)}>
        {children ?? (
          <>
            {amount != null && <span className={cn('font-mono font-bold text-white', cfg.amountFont)}>{amount}</span>}
            {memo != null && (
              <span
                className={cn('w-full text-center font-mono leading-snug text-white/70 line-clamp-2', cfg.memoFont)}
              >
                {memo}
              </span>
            )}
          </>
        )}
      </div>

      {/* Bottom section */}
      {bottom === 'progress' ? (
        <div className={cn('relative z-[1] flex w-full flex-col items-center gap-1.5', cfg.bottomSpacing)}>
          <Progress value={progress} className={cfg.progressHeight} />
          <div className="flex w-full items-center justify-between">
            <span className={cn('font-mono uppercase tracking-wider text-white/50', cfg.bottomTextSizes.claimed)}>
              {claimedShares}/{totalShares} claimed
            </span>
            <span className={cn('font-mono uppercase text-white/40', cfg.bottomTextSizes.label)}>Packet</span>
          </div>
        </div>
      ) : bottom != null ? (
        <div className={cn('relative z-[1] flex w-full flex-col items-center', cfg.bottomSpacing)}>{bottom}</div>
      ) : null}

      {/* Status overlay */}
      {statusOverlay && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/30">
          <span className="border border-white/20 bg-black/50 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-white/70">
            {statusOverlay}
          </span>
        </div>
      )}
    </div>
  )
}
