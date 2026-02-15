'use client'

import { cn } from '@/lib/utils'
import { Button, type buttonVariants } from '@/components/ui/button'
import type { VariantProps } from 'class-variance-authority'

type PacketButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function PacketButton({ className, children, ...props }: PacketButtonProps) {
  return (
    <Button
      className={cn(
        'relative bg-pkt-accent text-black font-extrabold uppercase tracking-wider',
        'border-none rounded-none',
        'pkt-clip-md',
        'hover:brightness-110 active:scale-[0.98]',
        'transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}
