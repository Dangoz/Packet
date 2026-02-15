import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export function PacketCard({
  children,
  className,
  header,
}: {
  children: React.ReactNode
  className?: string
  header?: string
}) {
  return (
    <div
      className={cn('relative border border-pkt-border bg-pkt-surface backdrop-blur-xl', 'pkt-corner-ticks', className)}
    >
      {header && (
        <div className="border-b border-pkt-border bg-white/[0.03] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pkt-text">
            <ChevronRight className="h-3.5 w-3.5 text-pkt-accent" />
            {header}
          </h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
