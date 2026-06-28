import { useEffect, useState } from 'react'
import { getSummary, getRevenueChart, getAlerts } from '../api'
import type { Summary, DailyStat, Alert } from '../types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { AlertTriangle, Package, TrendingUp, Banknote } from 'lucide-react'

interface Props {
  onNavigate: (page: any) => void
}

const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function Dashboard({ onNavigate }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [chart, setChart] = useState<DailyStat[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    getSummary().then(setSummary)
    getRevenueChart(14).then(setChart)
    getAlerts().then(setAlerts)
  }, [])

  return (
    <div className="gap-24">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Revenue Today</div>
          <div className="stat-value naira">{summary ? fmt(summary.revenue_today) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue This Month</div>
          <div className="stat-value naira">{summary ? fmt(summary.revenue_month) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{summary?.total_products ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Items</div>
          <div className={`stat-value ${summary && summary.low_stock_count > 0 ? 'warning' : ''}`}>
            {summary?.low_stock_count ?? '—'}
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card">
        <div className="section-title">14-Day Revenue</div>
        {chart.length === 0 ? (
          <div className="empty-state"><p>No sales data yet. Record a sale to see trends.</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2a3347" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid #2a3347', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [fmt(v), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Active alerts */}
      <div className="card">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Active Alerts</div>
          {alerts.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('alerts')}>View all</button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state">
            <Package size={28} style={{ color: 'var(--text-muted)' }} />
            <p>No active alerts — stock levels look healthy.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.slice(0, 5).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <AlertTriangle size={16} style={{ color: a.alert_type === 'out_of_stock' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13.5 }}>
                    {a.product?.name ?? `Product #${a.product_id}`}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {a.alert_type === 'out_of_stock' ? 'Out of stock' : 'Low stock'} · {a.product?.stock_qty ?? '?'} units remaining
                  </div>
                </div>
                <span className={`badge ${a.alert_type === 'out_of_stock' ? 'badge-out' : 'badge-low'}`} style={{ marginLeft: 'auto' }}>
                  {a.alert_type === 'out_of_stock' ? 'Out of stock' : 'Low stock'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
