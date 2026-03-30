'use client'

import { useEffect, useState } from 'react'
import Nav from '../components/Nav'

interface Stats {
  holders: number
  trustlines: number
  supply: string
  rawSupply: number
}

interface Holder {
  account: string
  rawBalance: number
}

function formatFuzzy(val: number): string {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B'
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M'
  if (val >= 1_000) return (val / 1_000).toFixed(2) + 'K'
  return val.toFixed(2)
}

export default function Statistics() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [holders, setHolders] = useState<Holder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats({
          holders: data.holders,
          trustlines: data.trustlines,
          supply: (parseFloat(data.supply) / 1_000_000_000).toFixed(1) + 'B',
          rawSupply: parseFloat(data.supply)
        })
      })

    const fetchAll = async () => {
      let all: Holder[] = []
      let offset = 0
      const limit = 500
      while (true) {
        const res = await fetch(`/api/holders?limit=${limit}&offset=${offset}`)
        const data = await res.json()
        const lines = data?.result?.lines || []
        const mapped = lines
          .filter((l: any) => parseFloat(l.balance) < 0)
          .map((l: any) => ({
            account: l.account,
            rawBalance: Math.abs(parseFloat(l.balance))
          }))
        all = all.concat(mapped)
        if (!data.hasMore) break
        offset += limit
      }
      all.sort((a, b) => b.rawBalance - a.rawBalance)
      setHolders(all)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const top10Supply = holders.slice(0, 10).reduce((sum, h) => sum + h.rawBalance, 0)
  const top50Supply = holders.slice(0, 50).reduce((sum, h) => sum + h.rawBalance, 0)
  const top10Pct = stats ? ((top10Supply / stats.rawSupply) * 100).toFixed(2) : '...'
  const top50Pct = stats ? ((top50Supply / stats.rawSupply) * 100).toFixed(2) : '...'
  const restPct = stats ? (100 - parseFloat(top50Pct as string)).toFixed(2) : '...'

  const balanceRanges = [
    { label: '1B+', min: 1_000_000_000, max: Infinity },
    { label: '500M – 1B', min: 500_000_000, max: 1_000_000_000 },
    { label: '100M – 500M', min: 100_000_000, max: 500_000_000 },
    { label: '50M – 100M', min: 50_000_000, max: 100_000_000 },
    { label: '10M – 50M', min: 10_000_000, max: 50_000_000 },
    { label: '5M – 10M', min: 5_000_000, max: 10_000_000 },
    { label: '1M – 5M', min: 1_000_000, max: 5_000_000 },
    { label: '500K – 1M', min: 500_000, max: 1_000_000 },
    { label: '100K – 500K', min: 100_000, max: 500_000 },
    { label: '50K – 100K', min: 50_000, max: 100_000 },
    { label: '10K – 50K', min: 10_000, max: 50_000 },
    { label: '1K – 10K', min: 1_000, max: 10_000 },
    { label: '0 – 1K', min: 0, max: 1_000 },
  ]

  const rangeData = balanceRanges.map(r => {
    const accounts = holders.filter(h => h.rawBalance >= r.min && h.rawBalance < r.max)
    const count = accounts.length
    const sum = accounts.reduce((s, h) => s + h.rawBalance, 0)
    const pctOfHolders = holders.length > 0 ? ((count / holders.length) * 100).toFixed(1) : '0'
    const pctOfSupply = stats && stats.rawSupply > 0 ? ((sum / stats.rawSupply) * 100).toFixed(2) : '0'
    return { label: r.label, count, pctOfHolders, pctOfSupply }
  })

  const percentiles = [0.01, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 10]
  const percentileData = percentiles.map(p => {
    const count = Math.max(1, Math.ceil((p / 100) * holders.length))
    const idx = Math.max(0, count - 1)
    const holder = holders[idx]
    return {
      pct: p < 1 ? p.toFixed(2) + '%' : p + '%',
      count: count.toLocaleString(),
      balance: holder ? formatFuzzy(holder.rawBalance) + ' FUZZY' : '...'
    }
  })

  const outerBorder = '1px solid #333'
  const innerBorder = '1px solid #1a1a1a'
  const headerBg = '#1a1a1a'
  const subHeaderBg = '#111'
  const rowEven = '#0d0d0d'
  const rowOdd = '#111'

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', color: 'white' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      <Nav activePage="/statistics" />

      <div style={{ padding: '32px 48px' }}>

        <div style={{ fontSize: '22px', fontWeight: '500', marginBottom: '28px' }}>Balance distribution</div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FAC775', animation: 'pulse 1.2s ease-in-out infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FAC775', animation: 'pulse 1.2s ease-in-out 0.2s infinite' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FAC775', animation: 'pulse 1.2s ease-in-out 0.4s infinite' }}></div>
            </div>
            <span style={{ fontSize: '15px', color: '#888' }}>Fetching distribution data from XRPL...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>

            <div style={{ border: outerBorder, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: headerBg, padding: '12px 18px', textAlign: 'center', borderBottom: outerBorder }}>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>Number of $FUZZY accounts and sum of balance range</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: subHeaderBg }}>
                    <th style={{ padding: '10px 18px', fontSize: '19px', color: 'white', fontWeight: '500', borderBottom: outerBorder, borderRight: innerBorder, textAlign: 'left' }}># Accounts</th>
                    <th style={{ padding: '10px 18px', fontSize: '19px', color: 'white', fontWeight: '500', borderBottom: outerBorder, borderRight: innerBorder, textAlign: 'left' }}>Balance Range</th>
                    <th style={{ padding: '10px 18px', fontSize: '19px', color: 'white', fontWeight: '500', borderBottom: outerBorder, borderRight: innerBorder, textAlign: 'right' }}>% Holders</th>
                    <th style={{ padding: '10px 18px', fontSize: '19px', color: 'white', fontWeight: '500', borderBottom: outerBorder, textAlign: 'right' }}>% Supply</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeData.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? rowEven : rowOdd }}>
                      <td style={{ padding: '10px 18px', fontSize: '16px', borderBottom: innerBorder, borderRight: innerBorder, fontWeight: '500' }}>{row.count.toLocaleString()}</td>
                      <td style={{ padding: '10px 18px', fontSize: '16px', borderBottom: innerBorder, borderRight: innerBorder, color: '#FAC775' }}>{row.label}</td>
                      <td style={{ padding: '10px 18px', fontSize: '16px', borderBottom: innerBorder, borderRight: innerBorder, textAlign: 'right', color: '#888' }}>{row.pctOfHolders}%</td>
                      <td style={{ padding: '10px 18px', fontSize: '16px', borderBottom: innerBorder, textAlign: 'right', color: '#888' }}>{row.pctOfSupply}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ border: outerBorder, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: headerBg, padding: '12px 18px', textAlign: 'center', borderBottom: outerBorder }}>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>Percentage # $FUZZY Accounts — Balance equals (or greater than)</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: subHeaderBg }}>
                    <th style={{ padding: '10px 18px', fontSize: '19px', color: 'white', fontWeight: '500', borderBottom: outerBorder, borderRight: innerBorder, textAlign: 'left' }}>Percentile</th>
                    <th style={{ padding: '10px 18px', fontSize: '19px', color: 'white', fontWeight: '500', borderBottom: outerBorder, borderRight: innerBorder, textAlign: 'right' }}># Accounts</th>
                    <th style={{ padding: '10px 18px', fontSize: '19px', color: 'white', fontWeight: '500', borderBottom: outerBorder, textAlign: 'right' }}>Balance (or greater)</th>
                  </tr>
                </thead>
                <tbody>
                  {percentileData.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? rowEven : rowOdd }}>
                      <td style={{ padding: '10px 18px', fontSize: '16px', borderBottom: innerBorder, borderRight: innerBorder, color: '#FAC775' }}>Top {row.pct}</td>
                      <td style={{ padding: '10px 18px', fontSize: '16px', borderBottom: innerBorder, borderRight: innerBorder, textAlign: 'right', fontWeight: '500' }}>{row.count}</td>
                      <td style={{ padding: '10px 18px', fontSize: '16px', borderBottom: innerBorder, textAlign: 'right', color: '#888' }}>{row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {[
            { label: 'TOTAL HOLDERS', value: stats ? stats.holders.toLocaleString() : '...' },
            { label: 'TRUSTLINES', value: stats ? stats.trustlines.toLocaleString() : '...' },
            { label: 'TOP 10 CONCENTRATION', value: top10Pct + '%' },
            { label: 'TOP 50 CONCENTRATION', value: top50Pct + '%' },
          ].map(card => (
            <div key={card.label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '16px', border: '1px solid #222' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>{card.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '500' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '20px', border: '1px solid #222' }}>
            <div style={{ fontSize: '19px', fontWeight: '500', marginBottom: '20px' }}>Holder distribution</div>
            {balanceRanges.map((r, i) => {
              const count = holders.filter(h => h.rawBalance >= r.min && h.rawBalance < r.max).length
              const maxCount = Math.max(...balanceRanges.map(r2 =>
                holders.filter(h => h.rawBalance >= r2.min && h.rawBalance < r2.max).length
              ), 1)
              return (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <span style={{ color: '#888', fontSize: '14px' }}>{r.label}</span>
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{count.toLocaleString()} wallets</span>
                  </div>
                  <div style={{ height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((count / maxCount) * 100)}%`, height: '100%', background: '#FAC775', borderRadius: '4px' }}></div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '20px', border: '1px solid #222' }}>
            <div style={{ fontSize: '19px', fontWeight: '500', marginBottom: '20px' }}>Supply concentration</div>
            {[
              { label: 'Top 10 wallets', pct: parseFloat(top10Pct as string), color: '#FAC775' },
              { label: 'Top 50 wallets', pct: parseFloat(top50Pct as string), color: '#EF9F27' },
              { label: 'Rest of holders', pct: parseFloat(restPct as string), color: '#444' },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>{row.label}</span>
                  <span style={{ fontWeight: '500', fontSize: '14px' }}>{isNaN(row.pct) ? '...' : row.pct.toFixed(2) + '%'}</span>
                </div>
                <div style={{ height: '10px', background: '#222', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${isNaN(row.pct) ? 0 : row.pct}%`, height: '100%', background: row.color, borderRadius: '5px' }}></div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #222' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>KEY METRICS</div>
              {[
                { label: 'Circulating supply', value: stats ? stats.supply : '...' },
                { label: 'Total supply', value: '321B' },
                { label: 'LP burned', value: '100%' },
                { label: 'Holders / Trustlines', value: stats ? `${stats.holders.toLocaleString()} / ${stats.trustlines.toLocaleString()}` : '...' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                  <span style={{ color: '#888' }}>{row.label}</span>
                  <span style={{ fontWeight: '500' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}