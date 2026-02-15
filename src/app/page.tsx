'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LandingPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/app')
    }
  }, [ready, authenticated, router])

  if (!ready || authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white/50 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <h1
        className="text-5xl font-bold tracking-tight mb-3"
        style={{
          background: 'linear-gradient(135deg, #dc2626, #ea580c)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Packet
      </h1>
      <p className="text-white/50 text-sm mb-10 text-center max-w-xs">Instant P2P payments with Lucky Split</p>
      <button
        onClick={() => router.push('/login')}
        className="px-8 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #dc2626, #ea580c)',
        }}
      >
        Open App
      </button>
    </div>
  )
}
