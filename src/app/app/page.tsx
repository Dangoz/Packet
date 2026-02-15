'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ProfilePill } from '@/components/inspired'

export default function AppPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pkt-bg">
        <span className="font-mono text-xs uppercase tracking-wider text-pkt-text-tertiary">Loading...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pkt-bg">
      <ProfilePill />
      <div className="flex min-h-screen items-center justify-center">
        <span className="font-mono text-sm text-pkt-text-secondary">Welcome to Packet</span>
      </div>
    </div>
  )
}
