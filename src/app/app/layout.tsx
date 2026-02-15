'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import NumberFlow, { continuous } from '@number-flow/react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Plus, Inbox, Gift, Fingerprint } from 'lucide-react'
import { GridBackground, PacketLogo } from '@/components/inspired'
import { useBalance } from '@/hooks/useBalance'
import { getDisplayInfo } from '@/lib/user'
import { cn } from '@/lib/utils'

const TAB_ICONS = { plus: Plus, inbox: Inbox, gift: Gift } as const

const TABS = [
  { key: 'create', href: '/app/create', label: 'Create', icon: 'plus' },
  { key: 'packets', href: '/app/packets', label: 'Packets', icon: 'inbox' },
  { key: 'claims', href: '/app/claims', label: 'Claims', icon: 'gift' },
] as const

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy()
  const { wallets } = useWallets()
  const router = useRouter()
  const pathname = usePathname()

  const wallet = wallets[0]
  const { rawBalance, loading: balanceLoading } = useBalance(wallet?.address)
  const { label, initials, email, phone, name } = getDisplayInfo(user)

  const activeTab = TABS.find((t) => pathname.startsWith(t.href))?.key ?? 'create'

  // Track if we've ever been authenticated to avoid unmounting children
  // on transient Privy state flickers (e.g. after wallet.switchChain or signing)
  const wasAuthenticated = useRef(false)
  if (ready && authenticated) wasAuthenticated.current = true

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  // Only show loading before the first authentication — not on transient flickers.
  // Also wait for wallets to be populated so child hooks receive a valid address
  // on their first render (prevents flash of "no data" on direct URL navigation).
  if (!wasAuthenticated.current && (!ready || !authenticated || wallets.length === 0)) {
    return (
      <GridBackground>
        <div className="flex min-h-screen items-center justify-center">
          <span className="font-mono text-xs uppercase tracking-wider text-pkt-text-tertiary">{'> initializing_'}</span>
        </div>
      </GridBackground>
    )
  }

  return (
    <GridBackground glow>
      {/* ═══ Header — floating, no border ═══ */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          {/* Logo */}
          <Link href="/app/create">
            <PacketLogo />
          </Link>

          {/* Profile */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="group relative flex items-center gap-3 px-3 py-2 transition-colors">
                {/* Corner ticks on hover */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-pkt-accent/60" />
                  <div className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-pkt-accent/60" />
                </div>

                {/* Diamond avatar */}
                <div className="relative grid h-7 w-7 place-items-center">
                  <div className="absolute inset-0 rotate-45 border border-pkt-accent/50 bg-pkt-accent/10 transition-colors group-hover:border-pkt-accent group-hover:bg-pkt-accent/20" />
                  <span className="relative z-[1] text-[10px] font-bold text-pkt-accent">{initials}</span>
                </div>

                {/* Label */}
                <div className="hidden items-baseline gap-2 md:flex">
                  <span className="max-w-[100px] truncate font-mono text-[11px] text-pkt-text-secondary transition-colors group-hover:text-pkt-text">
                    {label}
                  </span>
                </div>

                {/* Status dot */}
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              sideOffset={12}
              className="w-64 rounded-none border-pkt-border bg-[#0a0a0a]/95 p-0 backdrop-blur-xl"
            >
              {/* Top gold accent line */}
              <div className="h-px bg-gradient-to-r from-pkt-accent/60 via-pkt-accent/20 to-transparent" />

              {/* Corner ticks */}
              <div className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-pkt-accent/50" />
              <div className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-pkt-accent/50" />

              {/* Identity */}
              <div className="border-b border-pkt-border px-4 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <Fingerprint className="inline h-3 w-3 text-pkt-accent/60" />
                  <span className="font-mono text-[9px] text-pkt-accent/60">identity</span>
                  <div className="h-px flex-1 bg-pkt-border" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative grid h-10 w-10 shrink-0 place-items-center">
                    <div className="absolute inset-0 rotate-45 border border-pkt-accent/40 bg-pkt-accent/10" />
                    <span className="relative z-[1] text-xs font-bold text-pkt-accent">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    {name && <p className="truncate font-mono text-sm font-medium text-pkt-text">{name}</p>}
                    {email && <p className="truncate font-mono text-[11px] text-pkt-text-secondary">{email}</p>}
                    {phone && <p className="truncate font-mono text-[11px] text-pkt-text-secondary">{phone}</p>}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="border-b border-pkt-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-pkt-text-tertiary">
                    {'[ status ]'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    <span className="font-mono text-[10px] text-emerald-400/80">connected</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-1.5">
                <button
                  onClick={logout}
                  className="group/btn flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider text-pkt-text-tertiary transition-colors hover:bg-white/[0.04] hover:text-pkt-accent"
                >
                  <svg
                    className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Disconnect
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* ═══ Content ═══ */}
      <main className="px-4 pt-10 pb-6 md:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Balance strip */}
          <div className="flex items-center justify-between border-b border-pkt-border px-1 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-pkt-text">
                <NumberFlow
                  value={rawBalance}
                  format={{
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }}
                  transformTiming={{ duration: 300, easing: 'ease-out' }}
                  spinTiming={{ duration: 1400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                  trend={1}
                  plugins={[continuous]}
                  willChange
                />
              </span>
              <span className="font-mono text-[9px] tracking-widest text-pkt-text-tertiary">PathUSD</span>
            </div>
            <span className="hidden items-center gap-1.5 sm:flex text-[10px] uppercase tracking-[0.2em]">
              <span className="font-mono text-pkt-accent/70">{'{'}</span>
              <span className="font-sans font-semibold text-pkt-accent">Tempo Moderato</span>
              <span className="font-mono text-pkt-accent/70">{'}'}</span>
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-0">
            {TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.icon]
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors',
                    activeTab === tab.key
                      ? 'border-b-2 border-pkt-accent font-bold text-pkt-accent'
                      : 'border-b-2 border-transparent text-pkt-text-tertiary hover:text-pkt-text-secondary',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3 w-3',
                      activeTab === tab.key ? 'text-pkt-accent/70' : 'text-pkt-text-tertiary/60',
                    )}
                  />
                  {tab.label}
                </Link>
              )
            })}
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </GridBackground>
  )
}
