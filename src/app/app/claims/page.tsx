'use client'

import { PacketCard, PacketBadge, SectionLabel } from '@/components/inspired'

export default function ClaimsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Your Claims</SectionLabel>
        <PacketBadge>0 claimed</PacketBadge>
      </div>
      <PacketCard>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-6 grid h-16 w-16 place-items-center border border-dashed border-pkt-border">
            <svg className="h-6 w-6 text-pkt-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </div>
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-pkt-text-secondary">
            No claims yet
          </p>
          <p className="max-w-xs text-sm text-pkt-text-tertiary">
            When you claim shares from Lucky Split packets, your winnings will appear here.
          </p>
        </div>
      </PacketCard>
    </div>
  )
}
