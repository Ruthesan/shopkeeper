import { useEffect, useState } from 'react'
import { getStockoutForecast } from '../api'
import type { StockoutForecast } from '../types'
import { TrendingDown } from 'lucide-react'

function urgencyBadge(days: number | null) {
  if (days === null) return <span className="badge badge-ok">No sales data</span>
  if (days === 0) return <span className="badge badge-out">Out of stock</span>
  if (days <= 3) return <span className="badge badge-out">Critical — {days}d</span>
  if (days <= 7) return <span className="badge badge-low">Urgent — {days}d</span>
  if (days <= 14) return <span className="badge badge-info">Soon — {days}d</span>
  return <span className="badge badge-ok">{days}d left</span>
}

export default function StockoutPage() {
  const [data, setData] = useState<StockoutForecast[]>([])

  useEffect(() => { getStockoutForecast().then(setData) }, [])

  const critical = data.filter(d => d.days_until_stockout !== null && d.days_until_stockout <= 7)
  const ok = data.filter(d => d.days_until_stockout === null || d.days_until_stockout > 7)

  return (
    <div className="gap-24">
      <div className="page-header">
        <h1 className="page-title">Stockout Risk</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Based on 30-day average daily sales</span>
      </div>

      {critical.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingDown size={16} style={{ color: 'var(--danger)' }} />
            <div className="section-title" style={{ marginBottom: 0, color: 'var(--danger)' }}>
              Needs Restock Soon ({critical.length})
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Stock Left</th><th>Avg Daily Sales</th><th>Estimated Stockout</th></tr>
              </thead>
              <tbody>
                {critical.map(r => (
                  <tr key={r.product_id}>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ fontWeight: 600 }}>{r.stock_qty} units</td>
                    <td>{r.avg_daily_sales} / day</td>
                    <td>{urgencyBadge(r.days_until_stockout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">All Products</div>
        {data.length === 0 ? (
          <div className="empty-state"><p>No products found. Add products and record sales to see forecasts.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Stock Left</th><th>Avg Daily Sales</th><th>Days Until Stockout</th></tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.product_id}>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ fontWeight: 600 }}>{r.stock_qty} units</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {r.avg_daily_sales > 0 ? `${r.avg_daily_sales} / day` : 'No sales'}
                    </td>
                    <td>{urgencyBadge(r.days_until_stockout)}</td>
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
