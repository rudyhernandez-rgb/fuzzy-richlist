import { NextResponse } from 'next/server'

const COINGECKO_ID = 'fuzzybear'

let cache: { data: any, timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000

export async function GET() {
  try {
    const now = Date.now()
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cache.data)
    }

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_ID}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { 'Accept': 'application/json' } }
    )

    const data = await res.json()
    const token = data?.[COINGECKO_ID]

    const result = {
      currentPrice: token?.usd || 0,
      change24h: token?.usd_24h_change || 0,
    }

    cache = { data: result, timestamp: now }
    return NextResponse.json(result)

  } catch (error) {
    console.error('Price API error:', error)
    return NextResponse.json({ error: 'Failed to fetch price data' }, { status: 500 })
  }
}