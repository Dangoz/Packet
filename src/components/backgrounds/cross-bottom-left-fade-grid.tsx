import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CrossBottomLeftFadeGridBackgroundProps = {
  children: ReactNode
  className?: string
}

export function CrossBottomLeftFadeGridBackground({
  children,
  className = '',
}: CrossBottomLeftFadeGridBackgroundProps) {
  return (
    <div className={cn('min-h-screen w-full relative', className)}>
      {/*  Diagonal Cross Bottom Left Fade Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
        linear-gradient(45deg, transparent 49%, #3f3f46 49%, #3f3f46 51%, transparent 51%),
        linear-gradient(-45deg, transparent 49%, #3f3f46 49%, #3f3f46 51%, transparent 51%)
      `,
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 100% 100%, #000 50%, transparent 90%)',
          maskImage: 'radial-gradient(ellipse 80% 80% at 100% 100%, #000 50%, transparent 90%)',
        }}
      />
      {/* Your Content/Components */}
      {children}
    </div>
  )
}
