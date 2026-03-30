'use client'

import { useEffect, useState } from 'react'
import Nav from '../components/Nav'

interface Transaction {
  addr: string
  amount: string
  type: string
  time: string
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        setTransactions(data)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'sans-serif', color: 'white' }}>

      <Nav activePage="/transactions" />

      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '4px' }}>Recent transactions</div>
          <div style={{ fontSize: '13px', color: '#888' }}>Latest FUZZY transfers on the XRP Ledger</div>
        </div>

        <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: '500' }}>💸 Latest transfers</span>
            <span style={{ fontSize: '11px', color: '#888' }}>live from XRPL</span>
          </div>

          {loading ? (
            <p style={{ color: '#888', padding: '22px' }}>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p style={{ color: '#888', padding: '20px' }}>No recent transactions found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', color: '#666', fontWeight: '500', fontSize: '19px' }}>TYPE</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#666', fontWeight: '500', fontSize: '19px' }}>WALLET</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: '#666', fontWeight: '500', fontSize: '19px' }}>AMOUNT</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', color: '#666', fontWeight: '500', fontSize: '19px' }}>TIME</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: tx.type === 'in' ? '#1a2e1a' : '#2e1a1a', color: tx.type === 'in' ? '#639922' : '#F09595' }}>
                        {tx.type === 'in' ? 'received' : 'sent'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', fontFamily: 'monospace', color: '#FAC775', fontSize: '12px' }}>{tx.addr}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: '500' }}>{tx.amount}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', color: '#888', fontSize: '14px' }}>{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: '16px', padding: '16px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #222', fontSize: '14px', color: '#666' }}>
          Showing the 15 most recent FUZZY transfers. Data sourced live from the XRP Ledger public node.
        </div>
      </div>
    </div>
  )
}