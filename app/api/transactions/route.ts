import { NextResponse } from 'next/server'

const FUZZY_CURRENCY = '46555A5A59000000000000000000000000000000'
const FUZZY_ISSUER = 'rhCAT4hRdi2Y9puNdkpMzxrdKa5wkppR62'

function formatAmount(val: number): string | null {
  if (!isFinite(val) || isNaN(val) || val > 321_000_000_000) return null
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B'
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M'
  if (val >= 1_000) return (val / 1_000).toFixed(2) + 'K'
  return val.toFixed(2)
}

export async function GET() {
  try {
    const res = await fetch('https://s1.ripple.com:51234/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_tx',
        params: [{
          account: FUZZY_ISSUER,
          ledger_index_min: -1,
          ledger_index_max: -1,
          limit: 400,
          forward: false
        }]
      })
    })

    const data = await res.json()
    const txList = data?.result?.transactions || []

    const moves = txList
      .filter((t: any) => {
        const tx = t.tx || t.tx_json
        return tx?.TransactionType === 'Payment' &&
          tx?.Amount?.currency === FUZZY_CURRENCY
      })
      .map((t: any) => {
        const tx = t.tx || t.tx_json
        const amount = parseFloat(tx?.Amount?.value || '0')
        const formatted = formatAmount(amount)
        if (!formatted) return null
        const isIncoming = tx?.Destination === FUZZY_ISSUER
        const addr = isIncoming ? tx?.Account : tx?.Destination
        const date = new Date((tx?.date + 946684800) * 1000)
        const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000)
        return {
          addr: addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : 'unknown',
          amount: formatted + ' FUZZY',
          type: isIncoming ? 'in' : 'out',
          time: minutesAgo < 60
            ? `${minutesAgo} min ago`
            : minutesAgo < 1440
            ? `${Math.floor(minutesAgo / 60)}h ago`
            : `${Math.floor(minutesAgo / 1440)}d ago`
        }
      })
      .filter(Boolean)
      .slice(0, 15)

    return NextResponse.json(moves)

  } catch (error) {
    return NextResponse.json([], { status: 500 })
  }
}