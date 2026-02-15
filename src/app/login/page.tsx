'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function LoginPage() {
  const { ready, authenticated, login } = usePrivy()
  const router = useRouter()
  const loginTriggered = useRef(false)

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/app')
    }
  }, [ready, authenticated, router])

  useEffect(() => {
    if (ready && !authenticated && !loginTriggered.current) {
      loginTriggered.current = true
      login()
    }
  }, [ready, authenticated, login])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <span className="text-white/50 text-sm">Signing you in...</span>
    </div>
  )
}
