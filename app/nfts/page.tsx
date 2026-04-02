'use client'

import { useEffect, useState } from 'react'
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

interface NFTStats {
  floorXrp: number | null
  totalNfts: number
  totalOwners: number
  totalVolume: number | null
  listed: number | null
  sales: Sale[]
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

export default function NFTs() {
  const [stats, setStats] = useState<NFTStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [xrpUsdPrice, setXrpUsdPrice] = useState<number>(0.52)

  useEffect(() => {
    fetch('/api/nfts')
      .then(res => res.json())
      .then(data => {
        setStats(data)
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

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', color: 'white' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .nft-img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; background: #222; border: 1px solid #333; }
        .nft-img-placeholder { width: 56px; height: 56px; border-radius: 8px; background: #222; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
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
            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

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
              <div style={{ marginTop: '12px', borderTop: '1px solid #222', paddingTop: '12px' }}>
                <a href="https://xrp.cafe/collection/fuzzybears" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#FAC775', textDecoration: 'none' }}>
                  View on XRP Cafe →
                </a>
              </div>
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#888', letterSpacing: '0.05em', marginBottom: '12px' }}>FLOOR PRICE</div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: '#FAC775' }}>
                {stats?.floorXrp ? stats.floorXrp.toLocaleString() + ' XRP' : '...'}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                {stats?.floorXrp ? toUsd(stats.floorXrp) + ' USD' : ''}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}