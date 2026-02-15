'use client'

import { PacketCard } from '@/components/inspired'

export default function CreatePage() {
  return (
    <PacketCard header="Create Packet">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6 grid h-16 w-16 place-items-center border border-dashed border-pkt-border">
          <span className="text-2xl font-bold text-pkt-text-tertiary">+</span>
        </div>
        <p className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-pkt-text-secondary">Coming soon</p>
        <p className="max-w-xs text-sm text-pkt-text-tertiary">
          Create a Lucky Split packet with a custom amount, number of shares, and greeting memo.
        </p>
      </div>
    </PacketCard>
  )
}
