'use client'

import { useEffect, useState, useRef } from 'react'

interface PriceData {
  candles: number[][]
  xrpPrice: number
  currentPrice: number
  high24h: number
  low24h: number
}

function formatPrice(p: number | undefined): string {
  if (!p || isNaN(p)) return '...'
  return p < 0.001 ? '$' + p.toFixed(8) : '$' + p.toFixed(6)
}

export default function Price() {
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d')
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)

  const fetchPrice = async (r: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/price?range=${r}`)
      const data = await res.json()
      setPriceData(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPrice(range)
  }, [range])

  useEffect(() => {
    if (!priceData?.candles?.length || !chartRef.current) return

    const Chart = (window as any).Chart
    if (!Chart) return

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const candles = priceData.candles
    const xrpPrice = priceData.xrpPrice || 0

    const labels = candles.map((c: number[]) => {
      const d = new Date(c[0] * 1000)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.getHours() + ':00'
    })

    const prices = candles.map((c: number[]) => {
      const close = c[4] || 0
      return parseFloat((close * xrpPrice).toFixed(10))
    })

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'FUZZY/USD',
          data: prices,
          borderColor: '#FAC775',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#FAC775',
          fill: true,
          backgroundColor: 'rgba(250, 199, 117, 0.08)',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a',
            borderColor: '#444',
            borderWidth: 1,
            titleColor: '#888',
            bodyColor: '#FAC775',
            callbacks: {
              label: (ctx: any) => '$' + ctx.parsed.y.toFixed(8)
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#1a1a1a' },
            ticks: { color: '#666', maxTicksLimit: 8, font: { size: 11 } }
          },
          y: {
            grid: { color: '#1a1a1a' },
            ticks: {
              color: '#666',
              font: { size: 11 },
              callback: (v: any) => '$' + parseFloat(v).toFixed(8)
            }
          }
        }
      }
    })
  }, [priceData])

  const navTabs = [
    { label: 'Rich list', href: '/' },
    { label: 'Statistics', href: '/statistics' },
    { label: 'Whales', href: '/whales' },
    { label: 'Transactions', href: '/transactions' },
    { label: 'Price', href: '/price' },
  ]

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #222', backgroundColor: '#111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'contain', background: '#000' }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700' }}>FuzzyRichlist</div>
            <div style={{ fontSize: '11px', color: '#888' }}>On-chain $FUZZY analytics</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {navTabs.map(tab => (
            <a key={tab.label} href={tab.href} style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer', background: tab.href === '/price' ? '#222' : 'transparent', color: tab.href === '/price' ? 'white' : '#888', textDecoration: 'none' }}>{tab.label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '10px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>FUZZY price</div>
            <div style={{ fontSize: '22px', fontWeight: '500', color: 'white' }}>{formatPrice(priceData?.currentPrice)}</div>
          </div>
          <div style={{ width: '1px', height: '32px', background: '#333' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>XRP price</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#FAC775' }}>{priceData?.xrpPrice ? '$' + priceData.xrpPrice.toFixed(4) : '...'}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '4px' }}>Price chart</div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>FUZZY/USD price analysis and trends</div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', letterSpacing: '0.04em' }}>CURRENT PRICE</div>
            <div style={{ fontSize: '22px', fontWeight: '500', color: '#FAC775' }}>{formatPrice(priceData?.currentPrice)}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', letterSpacing: '0.04em' }}>24H HIGH</div>
            <div style={{ fontSize: '22px', fontWeight: '500' }}>{formatPrice(priceData?.high24h)}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', letterSpacing: '0.04em' }}>24H LOW</div>
            <div style={{ fontSize: '22px', fontWeight: '500' }}>{formatPrice(priceData?.low24h)}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', letterSpacing: '0.04em' }}>XRP PRICE</div>
            <div style={{ fontSize: '22px', fontWeight: '500' }}>{priceData?.xrpPrice ? '$' + priceData.xrpPrice.toFixed(4) : '...'}</div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#639922' }}></div>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>FUZZY/USD</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['24h', '7d', '30d'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{ padding: '4px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #333', cursor: 'pointer', background: range === r ? '#FAC775' : 'transparent', color: range === r ? '#412402' : '#888' }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading chart data...</div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '340px' }}>
              <canvas ref={chartRef}></canvas>
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', padding: '14px 16px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
          Price data sourced from XRPL DEX. FUZZY/XRP rate converted to USD using live XRP price. Data refreshes every 5 minutes.
        </div>

      </div>

      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
    </div>
  )
}