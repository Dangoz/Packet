import { cn } from '@/lib/utils'

export function StatCard({ icon, label, className }: { icon: React.ReactNode; label: string; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-2',
        'border border-pkt-border bg-white/[0.03] p-3',
        className,
      )}
    >
      {/* Corner mark */}
      <div className="absolute left-0 top-0 h-[6px] w-[6px] border-l border-t border-pkt-text-tertiary" />
      <div className="grid h-6 w-6 place-items-center border border-white/10">{icon}</div>
      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-pkt-text-secondary">
        {label}
      </span>
    </div>
  )
}
