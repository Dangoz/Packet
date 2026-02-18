import { cn } from '@/lib/utils'

export function GridBackground({
  children,
  className,
  glow = false,
}: {
  children: React.ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <div className={cn('relative flex min-h-screen flex-col bg-pkt-bg', className)}>
      {/* Grid lines */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(var(--pkt-grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--pkt-grid-color) 1px, transparent 1px)`,
          backgroundSize: 'var(--pkt-grid-size) var(--pkt-grid-size)',
        }}
      />
      {/* Optional accent glow */}
      {glow && (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 208, 0, 0.06) 0%, transparent 60%)',
          }}
        />
      )}
      {/* Content */}
      <div className="relative z-[1] flex flex-1 flex-col">{children}</div>
    </div>
  )
}
