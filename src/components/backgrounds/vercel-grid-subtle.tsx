import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type VercelGridSubtleProps = {
  children: ReactNode
  className?: string
}

export function VercelGridSubtleBackground({ children, className = '' }: VercelGridSubtleProps) {
  return (
    <div className={cn('min-h-screen w-full relative', className)}>
      {/* Vercel Grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
        `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Your Content/Components */}
      {children}
    </div>
  )
}
