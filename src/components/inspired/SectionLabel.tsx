import { cn } from '@/lib/utils'

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2',
        'font-mono text-[11px] font-bold uppercase tracking-widest text-pkt-text-secondary',
        className,
      )}
    >
      <span className="inline-block h-[2px] w-3 bg-pkt-accent" />
      {children}
    </span>
  )
}
