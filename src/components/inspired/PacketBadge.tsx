import { cn } from '@/lib/utils'

export function PacketBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2',
        'border border-pkt-border border-l-[3px] border-l-pkt-accent',
        'bg-black/60 px-3 py-1',
        'font-mono text-[11px] font-normal uppercase tracking-wider text-pkt-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  )
}
