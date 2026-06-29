import { useEffect, useState } from 'react'
import { getSummary, getRevenueChart, getAlerts } from '../api'
import type { Summary, DailyStat, Alert } from '../types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Props { onNavigate: (page: any) => void }

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

const CHART_STYLE = {
  contentStyle: {
    background: '#181e2e',
    border: '1px solid #2d3f5c',
    borderRadius: 10,
    fontSize: 12,
    fontFamily: "'Inter', sans-serif",
  },
  labelStyle:   { color: '#8fa3c0', fontSize: 12 },
  itemStyle:    { color: '#e8edf5' },
}

export default function Dashboard({ onNavigate }: Props) {
  const { user } = useAuth()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [chart,   setChart]   = useState<DailyStat[]>([])
  const [alerts,  setAlerts]  = useState<Alert[]>([])

  useEffect(() => {
    getSummary().then(setSummary)
    getRevenueChart(14).then(setChart)
    getAlerts().then(setAlerts)
  }, [])

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="gap-24">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Welcome back, <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{user?.full_name?.split(' ')[0]}</span>
            &nbsp;· {today}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {[
          { label: 'Revenue Today',      value: summary ? fmt(summary.revenue_today)  : '—', cls: 'naira' },
          { label: 'Revenue This Month', value: summary ? fmt(summary.revenue_month)  : '—', cls: 'naira' },
          { label: 'Total Products',     value: summary?.total_products ?? '—',                cls: '' },
          {
            label: 'Low Stock Items',
            value: summary?.low_stock_count ?? '—',
            cls: summary && summary.low_stock_count > 0 ? 'warning' : '',
          },
        ].map(({ label, value, cls }) => (
          <div className="stat-card" key={label}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card">
        <div className="section-title">14-Day Revenue Trend</div>
        {chart.length === 0 ? (
          <div className="empty-state">
            <p>No sales recorded yet. Record your first sale to see the trend here.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e2a3d" strokeDasharray="4 4" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#4d6280', fontSize: 11, fontFamily: 'Inter' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: '#4d6280', fontSize: 11, fontFamily: 'Inter' }}
                tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                {...CHART_STYLE}
                formatter={(v: number) => [fmt(v), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4f8ef7"
                fill="url(#revGrad)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#4f8ef7', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Active alerts */}
      <div className="card">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Active Stock Alerts</div>
          {alerts.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('alerts')}>
              View all
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 24px' }}>
            <ShieldCheck size={30} style={{ color: 'var(--success)', opacity: 1, marginBottom: 10 }} />
            <p>All stock levels look healthy — no alerts right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.slice(0, 5).map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 0',
                  borderBottom: i < Math.min(alerts.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: a.alert_type === 'out_of_stock' ? 'var(--danger-dim)' : 'var(--warning-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle
                    size={15}
                    style={{ color: a.alert_type === 'out_of_stock' ? 'var(--danger)' : 'var(--warning)' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5, lineHeight: 1.3 }}>
                    {a.product?.name ?? `Product #${a.product_id}`}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {a.alert_type === 'out_of_stock' ? 'Completely out of stock' : 'Running low'}
                    {a.product && ` · ${a.product.stock_qty} units remaining`}
                  </div>
                </div>
                <span className={`badge ${a.alert_type === 'out_of_stock' ? 'badge-out' : 'badge-low'}`}>
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
