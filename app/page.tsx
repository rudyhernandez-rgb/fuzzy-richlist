'use client'

import { useEffect, useState } from 'react'
import Nav from './components/Nav'

interface Holder {
  account: string
  balance: string
  rawBalance: number
}

interface Stats {
  holders: number
  trustlines: number
  supply: string
  rawSupply: number
}

interface Move {
  addr: string
  amount: string
  type: string
  time: string
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function formatAmount(val: number): string {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B'
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M'
  if (val >= 1_000) return (val / 1_000).toFixed(2) + 'K'
  return val.toFixed(2)
}

const WHALE_THRESHOLD = 500_000_000

function getTag(account: string) {
  if (account.startsWith('rHCAT4')) return { label: 'AMM pool', color: '#F09595', text: '#791F1F' }
  if (account.startsWith('rFirst') || account.startsWith('rDex99')) return { label: 'exchange', color: '#85B7EB', text: '#0C447C' }
  return null
}

function calcDistribution(holders: Holder[]) {
  const brackets = [
    { label: '> 1B FUZZY', min: 1_000_000_000, max: Infinity },
    { label: '100M–1B', min: 100_000_000, max: 1_000_000_000 },
    { label: '10M–100M', min: 10_000_000, max: 100_000_000 },
    { label: '1M–10M', min: 1_000_000, max: 10_000_000 },
    { label: '< 1M', min: 0, max: 1_000_000 },
  ]
  const counts = brackets.map(b => ({
    label: b.label,
    count: holders.filter(h => h.rawBalance >= b.min && h.rawBalance < b.max).length
  }))
  const max = Math.max(...counts.map(c => c.count), 1)
  return counts.map(c => ({ ...c, pct: Math.round((c.count / max) * 100) }))
}

export default function Home() {
  const [holders, setHolders] = useState<Holder[]>([])
  const [allHolders, setAllHolders] = useState<Holder[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<'all' | 'whales'>('all')
  const LIMIT = 100

  const fetchHolders = (currentOffset: number, append: boolean) => {
    if (currentOffset === 0) setLoading(true)
    else setLoadingMore(true)

    fetch(`/api/holders?limit=${LIMIT}&offset=${currentOffset}`)
      .then(res => res.json())
      .then(data => {
        const lines = data?.result?.lines || []
        const mapped = lines.map((l: any) => ({
          account: l.account,
          rawBalance: Math.abs(parseFloat(l.balance)),
          balance: Math.abs(parseFloat(l.balance)).toLocaleString()
        }))
        if (append) {
          setHolders(prev => [...prev, ...mapped])
        } else {
          setHolders(mapped)
        }
        setHasMore(data.hasMore)
        setOffset(currentOffset + LIMIT)
        setLoading(false)
        setLoadingMore(false)
      })
  }

  const fetchAllHolders = async () => {
    let all: Holder[] = []
    let offset = 0
    const limit = 500
    while (true) {
      const res = await fetch(`/api/holders?limit=${limit}&offset=${offset}`)
      const data = await res.json()
      const lines = data?.result?.lines || []
      const mapped = lines.map((l: any) => ({
        account: l.account,
        rawBalance: Math.abs(parseFloat(l.balance)),
        balance: Math.abs(parseFloat(l.balance)).toLocaleString()
      }))
      all = all.concat(mapped)
      if (!data.hasMore) break
      offset += limit
    }
    all.sort((a, b) => b.rawBalance - a.rawBalance)
    setAllHolders(all)
  }

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

    fetchHolders(0, false)
    fetchAllHolders()

    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => setMoves(data))
  }, [])

  const filteredHolders = holders.filter(h => {
    if (filter === 'whales') return h.rawBalance >= WHALE_THRESHOLD
    return true
  })

  const topBalance = holders.length > 0 ? holders[0].rawBalance : 1
  const sidebarHolders = allHolders.length > 0 ? allHolders : holders
  const distribution = calcDistribution(sidebarHolders)

  const percentiles = [0.01, 0.1, 0.5, 1, 2, 5, 10]
  const percentileData = percentiles.map(p => {
    const count = Math.max(1, Math.ceil((p / 100) * sidebarHolders.length))
    const idx = Math.max(0, count - 1)
    const holder = sidebarHolders[idx]
    return {
      pct: p < 1 ? p.toFixed(2) + '%' : p + '%',
      balance: holder ? formatAmount(holder.rawBalance) : '...'
    }
  })

  const rawSupply = stats?.rawSupply || 321_000_000_000
  const top100Supply = sidebarHolders.slice(0, 100).reduce((sum, h) => sum + h.rawBalance, 0)
  const top100Pct = rawSupply > 0 ? ((top100Supply / rawSupply) * 100).toFixed(1) + '%' : '...'
  const communityPct = rawSupply > 0 ? (100 - (top100Supply / rawSupply) * 100).toFixed(1) + '%' : '...'

  const filterTabs = [
    { label: 'All', key: 'all' as const },
    { label: 'Whales', key: 'whales' as const },
  ]

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', color: 'white' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      <Nav activePage="/" />

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #222', backgroundColor: '#111' }}>
        {[
          { label: 'TOTAL HOLDERS', value: stats ? stats.holders.toLocaleString() : '...', sub: 'active wallets' },
          { label: 'CIRCULATING SUPPLY', value: stats ? stats.supply : '...', sub: 'of 321B total' },
          { label: 'TRUSTLINES', value: stats ? stats.trustlines.toLocaleString() : '...', sub: 'trust relationships' },
          { label: 'LP BURNED', value: '100%', sub: '🔒 permanently locked' },
        ].map(card => (
          <div key={card.label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '14px', border: '1px solid #222' }}>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>{card.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '500' }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: '600px' }}>

        {/* Table */}
        <div style={{ padding: '20px 24px', borderRight: '1px solid #222', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '19px', fontWeight: '500' }}>
              Top holders
              <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                {filter !== 'all' ? `(${filteredHolders.length} shown)` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {filterTabs.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '20px', border: '1px solid #333', cursor: 'pointer', background: filter === f.key ? '#FAC775' : 'transparent', color: filter === f.key ? '#412402' : '#888' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FAC775', animation: 'pulse 1.2s ease-in-out infinite' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FAC775', animation: 'pulse 1.2s ease-in-out 0.2s infinite' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FAC775', animation: 'pulse 1.2s ease-in-out 0.4s infinite' }}></div>
              </div>
              <span style={{ fontSize: '15px', color: '#888' }}>Fetching holders from XRPL...</span>
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '90px' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#666', fontWeight: '500', fontSize: '19px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#666', fontWeight: '500', fontSize: '19px' }}>WALLET</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#666', fontWeight: '500', fontSize: '19px' }}>BALANCE</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#666', fontWeight: '500', fontSize: '19px' }}>% SUPPLY</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#666', fontWeight: '500', fontSize: '19px' }}>SHARE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHolders.map((holder, i) => {
                    const tag = getTag(holder.account)
                    const pct = stats && stats.rawSupply > 0 ? ((holder.rawBalance / stats.rawSupply) * 100).toFixed(3) : '...'
                    const barWidth = Math.round((holder.rawBalance / topBalance) * 100)
                    return (
                      <tr key={holder.account} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '10px 8px', color: '#666', fontSize: '14px' }}>{i + 1}</td>
                        <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'monospace', color: '#FAC775', fontSize: '15px' }}>{shortAddr(holder.account)}</span>
                          {tag && (
                            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: tag.color, color: tag.text, marginLeft: '8px', display: 'inline-block' }}>{tag.label}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '19px' }}>{formatAmount(holder.rawBalance)} FUZZY</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontSize: '14px' }}>{pct}%</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <div style={{ width: '70px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${barWidth}%`, height: '100%', background: '#FAC775', borderRadius: '3px' }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filter === 'all' && hasMore && (
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                  <button
                    onClick={() => fetchHolders(offset, true)}
                    disabled={loadingMore}
                    style={{ padding: '10px 28px', fontSize: '13px', borderRadius: '8px', border: '1px solid #333', cursor: loadingMore ? 'not-allowed' : 'pointer', background: 'transparent', color: loadingMore ? '#666' : 'white' }}
                  >
                    {loadingMore ? 'Loading...' : 'Load more holders'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ padding: '24px' }}>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '14px' }}>HOLDER DISTRIBUTION</div>
            {distribution.map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '12px' }}>
                <div style={{ width: '90px', color: '#888', flexShrink: 0 }}>{row.label}</div>
                <div style={{ flex: 1, height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: '#FAC775', borderRadius: '4px' }}></div>
                </div>
                <div style={{ fontSize: '11px', color: '#666', width: '30px', textAlign: 'right' }}>{row.count}</div>
              </div>
            ))}
          </div>

          <div style={{ height: '1px', background: '#222', margin: '16px 0' }}></div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '14px' }}>SUPPLY BREAKDOWN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <svg width="72" height="72" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#222" strokeWidth="14"/>
                <circle cx="40" cy="40" r="32" fill="none" stroke="#FAC775" strokeWidth="14"
                  strokeDasharray={`${(top100Supply / rawSupply) * 201} 201`}
                  strokeDashoffset="0" transform="rotate(-90 40 40)"/>
                <circle cx="40" cy="40" r="32" fill="none" stroke="#444" strokeWidth="14"
                  strokeDasharray={`${((rawSupply - top100Supply) / rawSupply) * 201} 201`}
                  strokeDashoffset={`-${(top100Supply / rawSupply) * 201}`}
                  transform="rotate(-90 40 40)"/>
                <text x="40" y="44" textAnchor="middle" fontSize="11" fontWeight="500" fill="white">321B</text>
              </svg>
              <div style={{ flex: 1 }}>
                {[
                  { label: 'Top 100', color: '#FAC775', val: top100Pct },
                  { label: 'Community', color: '#444', val: communityPct },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: row.color, flexShrink: 0 }}></div>
                    <div style={{ color: '#888', flex: 1 }}>{row.label}</div>
                    <div style={{ fontWeight: '500' }}>{row.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: '#222', margin: '16px 0' }}></div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '12px' }}>PERCENTILE DISTRIBUTION</div>
            <div style={{ border: '1px solid #333', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#161616' }}>
                    <th style={{ padding: '7px 10px', fontSize: '13px', color: '#666', fontWeight: '550', textAlign: 'left', borderBottom: '1px solid #333' }}>Top %</th>
                    <th style={{ padding: '7px 10px', fontSize: '13px', color: '#666', fontWeight: '550', textAlign: 'right', borderBottom: '1px solid #333' }}>Min balance</th>
                  </tr>
                </thead>
                <tbody>
                  {percentileData.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#0f0f0f' : '#111', borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '6px 10px', fontSize: '14px', color: '#FAC775' }}>{row.pct}</td>
                      <td style={{ padding: '6px 10px', fontSize: '14px', color: '#888', textAlign: 'right' }}>{row.balance} FUZZY</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ height: '1px', background: '#222', margin: '16px 0' }}></div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '14px' }}>RECENT LARGE MOVES</div>
            {moves.length === 0 ? (
              <p style={{ color: '#666', fontSize: '12px' }}>Loading transactions...</p>
            ) : (
              moves.slice(0, 4).map((tx, i) => (
                <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#FAC775', fontSize: '11px' }}>{tx.addr}</span>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: tx.type === 'in' ? '#1a2e1a' : '#2e1a1a', color: tx.type === 'in' ? '#639922' : '#F09595' }}>{tx.type === 'in' ? 'received' : 'sent'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '11px' }}>
                    <span style={{ color: '#666' }}>{tx.time}</span>
                    <span style={{ fontWeight: '500' }}>{tx.amount}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ height: '1px', background: '#222', margin: '16px 0' }}></div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '14px' }}>FUZZY KNOWS</div>
            <video
              src="/promo.mp4"
              autoPlay
              muted
              loop
              playsInline
              style={{ width: '100%', borderRadius: '8px', border: '1px solid #222' }}
            />
          </div>

          <div style={{ height: '1px', background: '#222', margin: '16px 0' }}></div>

          <a href="https://x.com/Rune_XRPL" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', background: '#1a1a1a', border: '1px solid #FAC775', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FAC775', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#412402"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#FAC775' }}>Built by @Rune_XRPL</div>
              <div style={{ fontSize: '11px', color: '#888' }}>Follow on X</div>
            </div>
          </a>

        </div>
      </div>
    </div>
  )
}