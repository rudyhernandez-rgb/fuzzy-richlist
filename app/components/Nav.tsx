'use client'

import { useEffect, useState } from 'react'

interface NavProps {
  activePage: string
}

export default function Nav({ activePage }: NavProps) {
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/price?range=24h')
      .then(res => res.json())
      .then(data => {
        if (data?.currentPrice) {
          setPrice(data.currentPrice)
        }
        if (data?.candles?.length >= 2) {
          const candles = data.candles
          const first = candles[0][4]
          const last = candles[candles.length - 1][4]
          const pct = ((last - first) / first) * 100
          setChange(pct)
        }
      })
      .catch(() => {})
  }, [])

  const formatPrice = (p: number) => {
    if (p < 0.001) return '$' + p.toFixed(8)
    return '$' + p.toFixed(6)
  }

  const navTabs = [
    { label: 'Rich list', href: '/' },
    { label: 'Statistics', href: '/statistics' },
    { label: 'Whales', href: '/whales' },
    { label: 'Transactions', href: '/transactions' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #222', backgroundColor: '#111' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/logo.png" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'contain', background: '#000' }} />
        <div>
          <div style={{ fontSize: '33px', fontWeight: '700' }}>$FuzzyRichlist</div>
          <div style={{ fontSize: '11px', color: '#888' }}>On-chain $FUZZY analytics</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {navTabs.map(tab => (
          <a key={tab.label} href={tab.href} style={{ padding: '6px 14px', fontSize: '15px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer', background: tab.href === activePage ? '#222' : 'transparent', color: tab.href === activePage ? 'white' : '#888', textDecoration: 'none' }}>{tab.label}</a>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '10px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>FUZZY price</div>
          <div style={{ fontSize: '22px', fontWeight: '500', color: 'white' }}>
            {price ? formatPrice(price) : '...'}
          </div>
        </div>
        <div style={{ width: '1px', height: '32px', background: '#333' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>24h change</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: change !== null && change >= 0 ? '#639922' : '#F09595' }}>
            {change !== null ? (change >= 0 ? '▲' : '▼') + ' ' + Math.abs(change).toFixed(2) + '%' : '...'}
          </div>
        </div>
      </div>
    </div>
  )
}