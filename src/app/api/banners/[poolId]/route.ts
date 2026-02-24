import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/db'
import { customBanners } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params

    const row = await db.select().from(customBanners).where(eq(customBanners.poolId, poolId)).get()

    if (!row) {
      return NextResponse.json(
        { error: 'Not found' },
        {
          status: 404,
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
        },
      )
    }

    return NextResponse.json(
      { imageUrl: row.imageUrl },
      {
        headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
      },
    )
  } catch (err) {
    console.error('GET /api/banners/[poolId] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
