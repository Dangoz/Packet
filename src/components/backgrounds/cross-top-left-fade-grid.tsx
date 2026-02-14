import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CrossTopLeftFadeGridBackgroundProps = {
  children: ReactNode
  className?: string
}

export function CrossTopLeftFadeGridBackground({ children, className = '' }: CrossTopLeftFadeGridBackgroundProps) {
  return (
    <div className={cn('min-h-screen w-full relative', className)}>
      {/*  Diagonal Cross Top Left Fade Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
        linear-gradient(45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%),
        linear-gradient(-45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%)
      `,
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)',
          maskImage: 'radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)',
        }}
      />
      {/* Your Content/Components */}
      {children}
    </div>
  )
}
