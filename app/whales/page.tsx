'use client'

import { useEffect, useState } from 'react'
import Nav from '../components/Nav'

interface Holder {
  account: string
  rawBalance: number
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

const WHALE_THRESHOLD = 1_000_000_000

export default function Whales() {
  const [holders, setHolders] = useState<Holder[]>([])
  const [rawSupply, setRawSupply] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setRawSupply(parseFloat(data.supply)))

    fetch('/api/holders?limit=500&offset=0')
      .then(res => res.json())
      .then(data => {
        const lines = data?.result?.lines || []
        const filtered = lines
          .filter((l: any) => parseFloat(l.balance) < 0)
          .map((l: any) => ({
            account: l.account,
            rawBalance: Math.abs(parseFloat(l.balance))
          }))
          .filter((h: Holder) => h.rawBalance >= WHALE_THRESHOLD)
          .sort((a: Holder, b: Holder) => b.rawBalance - a.rawBalance)
        setHolders(filtered)
        setLoading(false)
      })
  }, [])

  const whaleSupply = holders.reduce((sum, h) => sum + h.rawBalance, 0)
  const whalePct = rawSupply > 0 ? ((whaleSupply / rawSupply) * 100).toFixed(2) : '...'
  const topBalance = holders.length > 0 ? holders[0].rawBalance : 1

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', color: 'white' }}>

      <Nav activePage="/whales" />

      <div style={{ padding: '24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '16px', border: '1px solid #222' }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>WHALE COUNT</div>
            <div style={{ fontSize: '22px', fontWeight: '500' }}>{loading ? '...' : holders.length}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>wallets holding &gt; 1B FUZZY</div>
          </div>
          <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '16px', border: '1px solid #222' }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>WHALE SUPPLY</div>
            <div style={{ fontSize: '22px', fontWeight: '500' }}>{loading ? '...' : formatAmount(whaleSupply)} FUZZY</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>combined holdings</div>
          </div>
          <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '16px', border: '1px solid #222' }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px', letterSpacing: '0.04em' }}>% OF SUPPLY</div>
            <div style={{ fontSize: '22px', fontWeight: '500' }}>{whalePct}%</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>controlled by whales</div>
          </div>
        </div>

        <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: '500' }}>🐋 Whale wallets</span>
            <span style={{ fontSize: '14px', color: '#888' }}>holding &gt; 1B FUZZY</span>
          </div>

          {loading ? (
            <p style={{ color: '#FAC775', padding: '20px' }}>Loading whales...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#666', fontWeight: '500', fontSize: '17px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#666', fontWeight: '500', fontSize: '17px' }}>WALLET</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666', fontWeight: '500', fontSize: '17px' }}>BALANCE</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666', fontWeight: '500', fontSize: '17px' }}>% SUPPLY</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', color: '#666', fontWeight: '500', fontSize: '17px' }}>SHARE</th>
                </tr>
              </thead>
              <tbody>
                {holders.map((holder, i) => {
                  const pct = rawSupply > 0 ? ((holder.rawBalance / rawSupply) * 100).toFixed(3) : '...'
                  const barWidth = Math.round((holder.rawBalance / topBalance) * 100)
                  return (
                    <tr key={holder.account} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 20px', color: '#666' }}>{i + 1}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontFamily: 'monospace', color: '#FAC775', fontSize: '19px' }}>{shortAddr(holder.account)}</div>
                        <div style={{ fontSize: '17px', color: '#666', marginTop: '2px', fontFamily: 'monospace' }}>{holder.account}</div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500', fontSize: '19px' }}>{formatAmount(holder.rawBalance)} FUZZY</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#888', fontSize: '16px' }}>{pct}%</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          <div style={{ width: '100px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${barWidth}%`, height: '100%', background: '#FAC775', borderRadius: '3px' }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}