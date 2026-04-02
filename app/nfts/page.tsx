'use client'

import { useEffect, useState, useRef } from 'react'
import Nav from '../components/Nav'

interface Sale {
  nftokenID: string
  name: string
  image: string
  amountXrp: number | null
  seller: string
  buyer: string
  soldAt: string
  marketplace: string
}

interface TraitItem {
  name: string
  count: number
}

interface NFTStats {
  floorXrp: number | null
  totalNfts: number
  totalOwners: number
  totalVolume: number | null
  listed: number | null
  sales: Sale[]
  vol24h: number | null
  sales24h: number | null
  totalSales: number | null
  marketcap: number | null
  topOffer: number | null
  floor1dPercent: number | null
  floor7dPercent: number | null
  floor30dPercent: number | null
  floor24hAgo: number | null
  floor7dAgo: number | null
  floor30dAgo: number | null
  attrs: { title: string, items: Record<string, { count: number }> }[]
}

function shortAddr(addr: string) {
  if (!addr) return '...'
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return diff + 's ago'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}

function pctColor(val: number | null) {
  if (val === null) return '#888'
  return val >= 0 ? '#639922' : '#F09595'
}

function pctLabel(val: number | null) {
  if (val === null) return '...'
  return (val >= 0 ? '▲ ' : '▼ ') + Math.abs(val).toFixed(1) + '%'
}

export default function NFTs() {
  const [stats, setStats] = useState<NFTStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [xrpUsdPrice, setXrpUsdPrice] = useState<number>(0.52)
  const [selectedTrait, setSelectedTrait] = useState<string>('')
  const chartRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch('/api/nfts')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        if (data?.attrs?.length > 0) {
          setSelectedTrait(data.attrs[0].title)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd')
      .then(res => res.json())
      .then(data => {
        if (data?.ripple?.usd) setXrpUsdPrice(data.ripple.usd)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!stats?.floorXrp || !canvasRef.current) return

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    script.onload = () => {
      if (!canvasRef.current) return
      if (chartRef.current) chartRef.current.destroy()

      const labels = ['30d ago', '7d ago', '24h ago', 'Now']
      const values = [
        stats.floor30dAgo || 0,
        stats.floor7dAgo || 0,
        stats.floor24hAgo || 0,
        stats.floorXrp || 0,
      ]

      const Chart = (window as any).Chart
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: values,
            borderColor: '#FAC775',
            backgroundColor: 'rgba(250,199,117,0.08)',
            borderWidth: 2,
            pointBackgroundColor: '#FAC775',
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.3,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ctx.parsed.y + ' XRP'
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#666', font: { size: 11 } },
              grid: { color: '#1a1a1a' }
            },
            y: {
              ticks: {
                color: '#666',
                font: { size: 11 },
                callback: (v: any) => v + ' XRP'
              },
              grid: { color: '#222' }
            }
          }
        }
      })
    }
    document.head.appendChild(script)
  }, [stats])

  const toUsd = (xrp: number | null) => {
    if (!xrp || !xrpUsdPrice) return '...'
    return '$' + (xrp * xrpUsdPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const statCards = [
    { label: 'FLOOR PRICE', value: stats?.floorXrp ? stats.floorXrp.toLocaleString() + ' XRP' : '...', sub: stats?.floorXrp ? toUsd(stats.floorXrp) + ' USD' : '' },
    { label: 'TOTAL ITEMS', value: stats ? stats.totalNfts.toLocaleString() : '...', sub: 'NFTs minted' },
    { label: 'UNIQUE HOLDERS', value: stats ? stats.totalOwners.toLocaleString() : '...', sub: 'wallet owners' },
    { label: 'TOTAL VOLUME', value: stats?.totalVolume ? (stats.totalVolume / 1_000_000).toFixed(1) + 'M XRP' : '...', sub: 'all-time traded' },
    { label: 'LISTED', value: stats?.listed ? stats.listed.toFixed(1) + '%' : '...', sub: 'currently for sale' },
  ]

  const sideRow = (label: string, value: string, valueColor?: string) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: '500', color: valueColor || 'white' }}>{value}</span>
    </div>
  )

  const selectedAttr = stats?.attrs?.find(a => a.title === selectedTrait)
  const traitItems: TraitItem[] = selectedAttr
    ? Object.entries(selectedAttr.items)
        .map(([name, val]) => ({ name, count: val.count }))
        .sort((a, b) => b.count - a.count)
    : []
  const maxTraitCount = traitItems.length > 0 ? traitItems[0].count : 1

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', color: 'white' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .nft-img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; background: #222; border: 1px solid #333; }
        .nft-img-placeholder { width: 56px; height: 56px; border-radius: 8px; background: #222; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
        .trait-select { width: 100%; background: #111; color: white; border: 1px solid #333; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; margin-bottom: 12px; }
      `}</style>

      <Nav activePage="/nfts" />

      <div style={{ padding: '20px 24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {statCards.map(card => (
            <div key={card.label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '14px', border: '1px solid #222' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>{card.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '500', color: card.label === 'FLOOR PRICE' ? '#FAC775' : 'white' }}>{card.value}</div>
              {card.sub && <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{card.sub}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>

          <div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '14px' }}>RECENT SALES</div>
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #222', fontSize: '16px', fontWeight: '500' }}>
                🐻 Latest Fuzzybear sales
              </div>

              {loading ? (
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FAC775', animation: 'pulse 1.2s ease-in-out infinite' }}></div>
                  <span style={{ color: '#888', fontSize: '14px' }}>Loading sales...</span>
                </div>
              ) : stats?.sales?.length === 0 ? (
                <div style={{ padding: '24px', color: '#666', fontSize: '14px' }}>No recent sales found.</div>
              ) : (
                stats?.sales?.map((sale, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderBottom: '1px solid #1a1a1a' }}>
                    {sale.image ? (
                      <img
                        src={sale.image}
                        alt={sale.name}
                        className="nft-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="nft-img-placeholder">🐻</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#FAC775' }}>{sale.name}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontFamily: 'monospace' }}>
                        {shortAddr(sale.seller)} → {shortAddr(sale.buyer)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: '500' }}>
                        {sale.amountXrp ? sale.amountXrp.toLocaleString() + ' XRP' : '...'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{timeAgo(sale.soldAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Floor price chart */}
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.05em', marginBottom: '4px' }}>FLOOR PRICE TREND</div>
                  <div style={{ fontSize: '26px', fontWeight: '500', color: '#FAC775' }}>
                    {stats?.floorXrp ? stats.floorXrp.toLocaleString() + ' XRP' : '...'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {stats?.floorXrp ? toUsd(stats.floorXrp) + ' USD' : ''}
                  </div>
                </div>
                <img
                  src="/fuzzybears.png"
                  alt="Fuzzybears"
                  style={{ width: '60px', height: '60px', borderRadius: '10px', border: '1px solid #333', objectFit: 'cover' }}
                />
              </div>

              <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                <canvas ref={canvasRef}></canvas>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
                <div style={{ background: '#111', borderRadius: '8px', padding: '12px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>24H CHANGE</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: pctColor(stats?.floor1dPercent ?? null) }}>
                    {pctLabel(stats?.floor1dPercent ?? null)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {stats?.floor24hAgo && stats?.floorXrp ? stats.floor24hAgo + ' → ' + stats.floorXrp + ' XRP' : ''}
                  </div>
                </div>
                <div style={{ background: '#111', borderRadius: '8px', padding: '12px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>7D CHANGE</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: pctColor(stats?.floor7dPercent ?? null) }}>
                    {pctLabel(stats?.floor7dPercent ?? null)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {stats?.floor7dAgo && stats?.floorXrp ? stats.floor7dAgo + ' → ' + stats.floorXrp + ' XRP' : ''}
                  </div>
                </div>
                <div style={{ background: '#111', borderRadius: '8px', padding: '12px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>30D CHANGE</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: pctColor(stats?.floor30dPercent ?? null) }}>
                    {pctLabel(stats?.floor30dPercent ?? null)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {stats?.floor30dAgo && stats?.floorXrp ? stats.floor30dAgo + ' → ' + stats.floorXrp + ' XRP' : ''}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '10px', fontSize: '10px', color: '#444', textAlign: 'right' }}>
                fuzzyrichlist.com
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Floor price card */}
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '12px' }}>FLOOR PRICE</div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#FAC775' }}>
                {stats?.floorXrp ? stats.floorXrp.toLocaleString() + ' XRP' : '...'}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginBottom: '12px' }}>
                {stats?.floorXrp ? toUsd(stats.floorXrp) + ' USD' : ''}
              </div>
              <div style={{ height: '1px', background: '#222', margin: '10px 0' }}></div>
              {sideRow('24h change', pctLabel(stats?.floor1dPercent ?? null), pctColor(stats?.floor1dPercent ?? null))}
              {sideRow('7d change', pctLabel(stats?.floor7dPercent ?? null), pctColor(stats?.floor7dPercent ?? null))}
              {sideRow('30d change', pctLabel(stats?.floor30dPercent ?? null), pctColor(stats?.floor30dPercent ?? null))}
            </div>

            {/* Buy Fuzzybear NFTs card */}
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', padding: '16px 16px 12px 16px' }}>BUY FUZZYBEAR NFTs</div>
              <img
                src="/sidebar-fuzzy.png"
                alt="Fuzzybears"
                style={{ width: '100%', display: 'block' }}
              />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href="https://xrp.cafe/collection/fuzzybears" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#FAC775', textDecoration: 'none' }}>
                  View on XRP Cafe →
                </a>
                <a href="https://xrpl.to/nfts/fuzzybears" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#FAC775', textDecoration: 'none' }}>
                  View on XRPL.to →
                </a>
                <a href="https://bidds.com/collection/fuzzybears" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#FAC775', textDecoration: 'none' }}>
                  View on Bidds →
                </a>
              </div>
            </div>

            {/* Trait rarity card */}
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '12px' }}>TRAIT RARITY</div>
              {stats?.attrs && stats.attrs.length > 0 && (
                <select
                  className="trait-select"
                  value={selectedTrait}
                  onChange={e => setSelectedTrait(e.target.value)}
                >
                  {stats.attrs.map(a => (
                    <option key={a.title} value={a.title}>{a.title}</option>
                  ))}
                </select>
              )}
              {traitItems.map(item => (
                <div key={item.name} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                    <span style={{ color: '#ccc' }}>{item.name}</span>
                    <span style={{ color: '#888' }}>{((item.count / (stats?.totalNfts || 3211)) * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((item.count / maxTraitCount) * 100)}%`, height: '100%', background: '#FAC775', borderRadius: '3px' }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Market stats card */}
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '12px' }}>MARKET STATS</div>
              {sideRow('24h volume', stats?.vol24h ? stats.vol24h.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' XRP' : '...')}
              {sideRow('24h sales', stats?.sales24h ? stats.sales24h.toString() : '...')}
              {sideRow('All-time sales', stats?.totalSales ? stats.totalSales.toLocaleString() : '...')}
              {sideRow('Market cap', stats?.marketcap ? (stats.marketcap / 1_000_000).toFixed(2) + 'M XRP' : '...')}
              {sideRow('Top offer', stats?.topOffer ? stats.topOffer.toLocaleString() + ' XRP' : '...')}
            </div>

            {/* Collection info card */}
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '12px' }}>COLLECTION INFO</div>
              {[
                { label: 'Collection', value: 'Fuzzybears' },
                { label: 'Network', value: 'XRP Ledger' },
                { label: 'Total supply', value: stats ? stats.totalNfts.toLocaleString() : '...' },
                { label: 'Unique holders', value: stats ? stats.totalOwners.toLocaleString() : '...' },
                { label: 'Holder ratio', value: stats ? ((stats.totalOwners / stats.totalNfts) * 100).toFixed(1) + '%' : '...' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
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