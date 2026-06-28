import { useEffect, useState } from 'react'
import { getRevenueChart, getTopSellers } from '../api'
import type { DailyStat, TopSeller } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function Analytics() {
  const [chart, setChart] = useState<DailyStat[]>([])
  const [topSellers, setTopSellers] = useState<TopSeller[]>([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    getRevenueChart(days).then(setChart)
    getTopSellers().then(setTopSellers)
  }, [days])

  const totalRevenue = chart.reduce((sum, d) => sum + d.revenue, 0)
  const totalUnits = chart.reduce((sum, d) => sum + d.units, 0)

  return (
    <div className="gap-24">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 14, 30].map(d => (
            <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Revenue ({days}d)</div>
          <div className="stat-value naira">{fmt(totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Units Sold ({days}d)</div>
          <div className="stat-value">{totalUnits.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Daily Revenue</div>
          <div className="stat-value naira">{fmt(totalRevenue / (chart.length || 1))}</div>
        </div>
      </div>

      {/* Revenue Area Chart */}
      <div className="card">
        <div className="section-title">Daily Revenue ({days} days)</div>
        {chart.length === 0 ? (
          <div className="empty-state"><p>No sales data for this period.</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2a3347" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid #2a3347', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [fmt(v), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid-2">
        {/* Units Bar Chart */}
        <div className="card">
          <div className="section-title">Units Sold Per Day</div>
          {chart.length === 0 ? (
            <div className="empty-state"><p>No data yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#2a3347" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#161b27', border: '1px solid #2a3347', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="units" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top sellers */}
        <div className="card">
          <div className="section-title">Top 5 Sellers (30d)</div>
          {topSellers.length === 0 ? (
            <div className="empty-state"><p>No sales data yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topSellers.map((s, i) => {
                const maxUnits = topSellers[0].total_units
                const pct = (s.total_units / maxUnits) * 100
                return (
                  <div key={s.product_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>#{i + 1}</span>
                        {s.name}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--naira)', fontWeight: 600 }}>
                        {fmt(s.total_revenue)}
                      </span>
                    </div>
                    <div style={{ background: 'var(--surface-raised)', borderRadius: 4, height: 6 }}>
                      <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.total_units} units sold</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
