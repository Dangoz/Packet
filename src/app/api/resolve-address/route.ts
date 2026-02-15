import { PrivyClient } from '@privy-io/node'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
})

const schema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = schema.parse(body)

    const user = await privy
      .users()
      .getByWalletAddress({ address })
      .catch(() => null)

    if (!user) {
      return NextResponse.json({ address, label: address.slice(0, 6) + '...' + address.slice(-4) })
    }

    // Extract identity from linked accounts (same pattern as /api/find)
    const emailAccount = user.linked_accounts?.find((a) => a.type === 'email') as
      | { type: 'email'; address: string }
      | undefined
    const phoneAccount = user.linked_accounts?.find((a) => a.type === 'phone') as
      | { type: 'phone'; number: string }
      | undefined

    const email = emailAccount?.address
    const phone = phoneAccount?.number
    const label = email || phone || address.slice(0, 6) + '...' + address.slice(-4)

    return NextResponse.json({ address, label, email, phone })
  } catch (error) {
    console.error('Error in /api/resolve-address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
