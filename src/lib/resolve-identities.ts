import type { Address } from 'viem'

export function truncateAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export async function resolveIdentities(addresses: Address[]): Promise<Record<string, string>> {
  const results = await Promise.all(
    addresses.map(async (addr) => {
      try {
        const res = await fetch('/api/resolve-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr }),
        })
        if (!res.ok) return [addr.toLowerCase(), truncateAddress(addr)] as const
        const data = await res.json()
        return [addr.toLowerCase(), data.label as string] as const
      } catch {
        return [addr.toLowerCase(), truncateAddress(addr)] as const
      }
    }),
  )
  return Object.fromEntries(results)
}
