import { NextResponse } from 'next/server'

const FUZZY_MD5 = 'b05f7c8e58b832c74267d988567dea33'

let cache: { data: any, timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'

    const now = Date.now()
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cache.data)
    }

    const intervals: Record<string, { interval: string; limit: number }> = {
      '24h': { interval: '1h', limit: 24 },
      '7d':  { interval: '4h', limit: 42 },
      '30d': { interval: '1d', limit: 30 },
    }
    const { interval, limit } = intervals[range] || intervals['7d']

    const [ohlcvRes, tokenRes] = await Promise.all([
      fetch(`https://api.xrpl.to/v1/ohlc/${FUZZY_MD5}?interval=${interval}&limit=${limit}`),
      fetch(`https://api.xrpl.to/v1/token/${FUZZY_MD5}`)
    ])

    const ohlcvData = await ohlcvRes.json()
    const tokenData = await tokenRes.json()

    const xrpUsdPrice = tokenData?.exch?.USD || tokenData?.H24?.exch?.USD || 0.33
    const candles = ohlcvData?.ohlc || ohlcvData?.data || ohlcvData?.ohlcv || []

    const last = Array.isArray(candles) && candles.length > 0 ? candles[candles.length - 1] : null
    const recent = Array.isArray(candles) ? candles.slice(-6) : []

    const result = {
      candles,
      xrpPrice: xrpUsdPrice,
      currentPrice: last ? (last[4] || 0) * xrpUsdPrice : 0,
      high24h: recent.length > 0 ? Math.max(...recent.map((c: any) => c[2] || 0)) * xrpUsdPrice : 0,
      low24h: recent.length > 0 ? Math.min(...recent.filter((c: any) => (c[3] || 0) > 0).map((c: any) => c[3])) * xrpUsdPrice : 0,
    }

    cache = { data: result, timestamp: now }
    return NextResponse.json(result)

  } catch (error) {
    console.error('Price API error:', error)
    return NextResponse.json({ error: 'Failed to fetch price data', details: String(error) }, { status: 500 })
  }
}