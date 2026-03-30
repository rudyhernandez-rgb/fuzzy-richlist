import { NextResponse } from 'next/server'

const FUZZY_CURRENCY = '46555A5A59000000000000000000000000000000'
const FUZZY_ISSUER = 'rhCAT4hRdi2Y9puNdkpMzxrdKa5wkppR62'

let cache: { data: any, timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000

export async function GET() {
  try {
    const now = Date.now()

    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cache.data)
    }

    const res = await fetch(
      `https://bithomp.com/api/v2/token/${FUZZY_ISSUER}/${FUZZY_CURRENCY}`,
      {
        headers: {
          'x-bithomp-token': process.env.BITHOMP_API_KEY || ''
        }
      }
    )

    const data = await res.json()
    cache = { data, timestamp: now }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}