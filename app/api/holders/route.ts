import { NextResponse } from 'next/server'

const FUZZY_ISSUER = 'rhCAT4hRdi2Y9puNdkpMzxrdKa5wkppR62'
const FUZZY_CURRENCY = '46555A5A59000000000000000000000000000000'

let cache: { data: any[], timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000

async function fetchAllLines() {
  let allLines: any[] = []
  let marker: any = undefined
  let page = 0

  while (page < 50) {
    const body: any = {
      method: 'account_lines',
      params: [{
        account: FUZZY_ISSUER,
        ledger_index: 'validated',
        limit: 400
      }]
    }

    if (marker) {
      body.params[0].marker = marker
    }

    const res = await fetch('https://s1.ripple.com:51234/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    const lines = (data?.result?.lines || []).filter((l: any) =>
      l.currency === FUZZY_CURRENCY && parseFloat(l.balance) < 0
    )
    allLines = allLines.concat(lines)

    if (data?.result?.marker) {
      marker = data.result.marker
      page++
    } else {
      break
    }
  }

  return allLines
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '500')
    const offset = parseInt(searchParams.get('offset') || '0')

    const now = Date.now()

    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      const paginated = cache.data.slice(offset, offset + limit)
      return NextResponse.json({
        result: { lines: paginated },
        total: cache.data.length,
        hasMore: offset + limit < cache.data.length
      })
    }

    const lines = await fetchAllLines()
    const sorted = lines.sort((a: any, b: any) =>
      Math.abs(parseFloat(b.balance)) - Math.abs(parseFloat(a.balance))
    )
    cache = { data: sorted, timestamp: now }

    const paginated = sorted.slice(offset, offset + limit)
    return NextResponse.json({
      result: { lines: paginated },
      total: sorted.length,
      hasMore: offset + limit < sorted.length
    })

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch holders' }, { status: 500 })
  }
}