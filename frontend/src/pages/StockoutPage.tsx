import { useEffect, useState } from 'react'
import { getStockoutForecast } from '../api'
import type { StockoutForecast } from '../types'
import { TrendingDown, PackageOpen, BarChart2 } from 'lucide-react'

function UrgencyBadge({ days }: { days: number | null }) {
  if (days === null)  return <span className="badge badge-info">No sales data</span>
  if (days === 0)     return <span className="badge badge-out">Out of stock</span>
  if (days <= 3)      return <span className="badge badge-out">⚠ {days}d left</span>
  if (days <= 7)      return <span className="badge badge-low">{days}d left</span>
  if (days <= 14)     return <span className="badge badge-info">{days}d left</span>
  return <span className="badge badge-ok">{days}d left</span>
}

function ProgressBar({ days }: { days: number | null }) {
  if (days === null) return <div style={{ height: 4, background: 'var(--surface-raised)', borderRadius: 99 }} />
  const pct = days === 0 ? 100 : Math.min((30 - Math.min(days, 30)) / 30 * 100, 100)
  const color = days === 0 ? 'var(--danger)' : days <= 3 ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : days <= 14 ? '#4f8ef7' : 'var(--success)'
  return (
    <div style={{ height: 4, background: 'var(--surface-raised)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

export default function StockoutPage() {
  const [data, setData] = useState<StockoutForecast[]>([])

  useEffect(() => { getStockoutForecast().then(setData) }, [])

  const critical = data.filter(d => d.days_until_stockout !== null && d.days_until_stockout <= 7)
  const caution  = data.filter(d => d.days_until_stockout !== null && d.days_until_stockout > 7 && d.days_until_stockout <= 14)

  return (
    <div className="gap-24">

      <div className="page-header">
        <div>
          <h1 className="page-title">Stockout Risk</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Forecast based on 30-day average daily sales velocity
          </div>
        </div>
      </div>

      {/* Summary pills */}
      {data.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Critical (≤7 days)',  count: critical.length,                         color: 'var(--danger)',  dim: 'var(--danger-dim)' },
            { label: 'Caution (8–14 days)', count: caution.length,                          color: 'var(--warning)', dim: 'var(--warning-dim)' },
            { label: 'Total products',      count: data.length,                              color: 'var(--accent)',  dim: 'var(--accent-dim)' },
          ].map(({ label, count, color, dim }) => (
            <div key={label} style={{
              background: dim, border: `1px solid ${color}30`,
              borderRadius: 'var(--radius-sm)', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
                {count}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Critical banner */}
      {critical.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(240,82,82,0.3)', borderLeftWidth: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <TrendingDown size={16} style={{ color: 'var(--danger)' }} />
            <div className="section-title" style={{ marginBottom: 0, color: 'var(--danger)' }}>
              Needs Restock Now — {critical.length} {critical.length === 1 ? 'item' : 'items'}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Stock Left</th>
                  <th style={{ textAlign: 'right' }}>Avg / Day</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {critical.map(r => (
                  <tr key={r.product_id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: r.stock_qty === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                      {r.stock_qty}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {r.avg_daily_sales}
                    </td>
                    <td><UrgencyBadge days={r.days_until_stockout} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All products */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>All Products — Forecast</div>
        </div>

        {data.length === 0 ? (
          <div className="empty-state">
            <PackageOpen size={30} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p>No products yet. Add products and record sales to see stockout forecasts.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Avg Sales / Day</th>
                  <th style={{ minWidth: 140 }}>Days Until Stockout</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.product_id}>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: r.stock_qty === 0 ? 'var(--danger)' : r.stock_qty <= 10 ? 'var(--warning)' : 'var(--text)' }}>
                      {r.stock_qty}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {r.avg_daily_sales > 0 ? r.avg_daily_sales : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <UrgencyBadge days={r.days_until_stockout} />
                      <ProgressBar days={r.days_until_stockout} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
