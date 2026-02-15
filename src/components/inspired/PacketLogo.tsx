import { cn } from '@/lib/utils'

type PacketLogoProps = {
  size?: 'sm' | 'md'
  className?: string
}

/* ── Previous logo v5 (kept for reference) ─────────────────────────
 * Orbital scanner, no animation, no glow:
 * <svg viewBox="0 0 36 36" fill="none">
 *   <path d="M18 4 A14 14 0 0 0 4 18" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
 *   <path d="M18 32 A14 14 0 0 0 32 18" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
 *   <path d="M22 10 H28 V16" stroke="currentColor" strokeWidth="1" opacity="0.6" />
 *   <path d="M14 26 H8 V20" stroke="currentColor" strokeWidth="1" opacity="0.6" />
 *   <circle cx="18" cy="4" r="0.8" fill="currentColor" opacity="0.4" />
 *   <circle cx="4" cy="18" r="0.8" fill="currentColor" opacity="0.4" />
 *   <circle cx="32" cy="18" r="0.8" fill="currentColor" opacity="0.4" />
 *   <circle cx="18" cy="32" r="0.8" fill="currentColor" opacity="0.4" />
 * </svg>
 * ────────────────────────────────────────────────────────────── */

export function PacketLogo({ size = 'md', className }: PacketLogoProps) {
  const isSm = size === 'sm'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Mark — orbital scanner frame with red packet emoji */}
      <div className={cn('relative', isSm ? 'h-9 w-9' : 'h-10 w-10')}>
        {/* Geometric frame */}
        <svg viewBox="0 0 36 36" fill="none" className="absolute inset-0 h-full w-full text-pkt-accent">
          {/* Bracket glow — blurred thicker duplicate behind the crisp brackets */}
          <g style={{ filter: 'blur(2px)' }} opacity="0.3">
            <path d="M22 10 H28 V16" stroke="currentColor" strokeWidth="2" />
            <path d="M14 26 H8 V20" stroke="currentColor" strokeWidth="2" />
          </g>

          {/* Center glow — soft radial wash behind the emoji */}
          <circle cx="18" cy="18" r="6" fill="currentColor" opacity="0.06" style={{ filter: 'blur(4px)' }} />

          {/* Orbital arcs — slow continuous rotation */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="20s"
              repeatCount="indefinite"
            />
            <path d="M18 4 A14 14 0 0 0 4 18" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
            <path d="M18 32 A14 14 0 0 0 32 18" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
          </g>

          {/* Angular brackets — static, crisp */}
          <path d="M22 10 H28 V16" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <path d="M14 26 H8 V20" stroke="currentColor" strokeWidth="1" opacity="0.6" />

          {/* Node dots — staggered breathing pulse */}
          <circle cx="18" cy="4" r="0.8" fill="currentColor">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="4" cy="18" r="0.8" fill="currentColor">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" begin="0.75s" repeatCount="indefinite" />
          </circle>
          <circle cx="32" cy="18" r="0.8" fill="currentColor">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" begin="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="18" cy="32" r="0.8" fill="currentColor">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" begin="2.25s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* 🧧 Red packet emoji */}
        <div className="absolute inset-0 grid place-items-center">
          <span className={cn('select-none leading-none', isSm ? 'text-sm' : 'text-base')}>🧧</span>
        </div>
      </div>

      {/* Wordmark */}
      <span className={cn('font-mono font-bold uppercase tracking-[3px] text-pkt-text', isSm ? 'text-xs' : 'text-sm')}>
        Packet
      </span>
    </div>
  )
}
