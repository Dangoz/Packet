'use client'

import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('bg-white/10 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full transition-all duration-500 ease-out"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          background: 'linear-gradient(90deg, rgba(200,20,20,0.9), rgba(255,208,0,0.9))',
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
