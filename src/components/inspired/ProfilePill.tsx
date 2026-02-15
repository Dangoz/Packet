'use client'

import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'motion/react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { getDisplayInfo } from '@/lib/user'

export function ProfilePill() {
  const { user, logout } = usePrivy()
  const { label, initials, email, phone, name } = getDisplayInfo(user)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="fixed right-4 top-4 z-50"
    >
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2.5 border border-pkt-border bg-pkt-surface px-3 py-1.5 backdrop-blur-xl transition-colors hover:border-pkt-accent/40">
            {/* Avatar */}
            <div className="grid h-7 w-7 place-items-center bg-pkt-accent pkt-clip-sm">
              <span className="text-[10px] font-bold text-black">{initials}</span>
            </div>
            {/* Name */}
            <span className="max-w-[120px] truncate font-mono text-xs text-pkt-text-secondary">{label}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={8} className="w-56 rounded-none border-pkt-border bg-[#0a0a0a] p-0">
          {/* User info */}
          <div className="border-b border-pkt-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center bg-pkt-accent pkt-clip-sm">
                <span className="text-xs font-bold text-black">{initials}</span>
              </div>
              <div className="min-w-0">
                {name && <p className="truncate text-sm font-medium text-pkt-text">{name}</p>}
                {email && <p className="truncate font-mono text-[11px] text-pkt-text-secondary">{email}</p>}
                {phone && <p className="truncate font-mono text-[11px] text-pkt-text-secondary">{phone}</p>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1">
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs uppercase tracking-wider text-pkt-text-secondary transition-colors hover:bg-white/5 hover:text-pkt-accent"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Log out
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </motion.div>
  )
}
