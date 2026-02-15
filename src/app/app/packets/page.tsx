'use client'

import Link from 'next/link'
import { PacketCard, PacketBadge, SectionLabel } from '@/components/inspired'

export default function PacketsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Your Packets</SectionLabel>
        <PacketBadge>0 active</PacketBadge>
      </div>
      <PacketCard>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-6 grid h-16 w-16 place-items-center border border-dashed border-pkt-border">
            <svg className="h-6 w-6 text-pkt-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-pkt-text-secondary">
            No packets created yet
          </p>
          <p className="mb-6 max-w-xs text-sm text-pkt-text-tertiary">
            Packets you create will appear here with their claim status and distribution details.
          </p>
          <Link
            href="/app/create"
            className="border border-pkt-accent bg-pkt-accent/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-pkt-accent transition-colors hover:bg-pkt-accent/20"
          >
            Create First Packet
          </Link>
        </div>
      </PacketCard>
    </div>
  )
}
