import { NextResponse } from 'next/server'
import { db } from '@/db'
import { customBanners } from '@/db/schema'
import { isValidBannerUrl } from '@/lib/url-validation'

export async function POST(req: Request) {
  try {
    const { poolId, imageUrl } = await req.json()

    if (!poolId || typeof poolId !== 'string') {
      return NextResponse.json({ error: 'Missing poolId' }, { status: 400 })
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }
    if (!isValidBannerUrl(imageUrl)) {
      return NextResponse.json(
        { error: 'Invalid banner URL: must be HTTPS and not a private address' },
        { status: 400 },
      )
    }

    await db.insert(customBanners).values({ poolId, imageUrl }).onConflictDoUpdate({
      target: customBanners.poolId,
      set: { imageUrl },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/banners error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
