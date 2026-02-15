import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export function PacketInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <Input
      className={cn(
        'rounded-none border border-pkt-border border-l-[3px] border-l-pkt-accent',
        'bg-white/[0.03] font-mono text-pkt-text',
        'placeholder:text-pkt-text-tertiary placeholder:uppercase placeholder:text-xs',
        'focus:bg-pkt-accent-dim focus:border-pkt-accent focus:ring-0',
        'transition-all duration-200',
        className,
      )}
      {...props}
    />
  )
}
