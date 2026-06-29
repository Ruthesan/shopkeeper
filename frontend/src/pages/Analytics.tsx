import { useEffect, useState } from 'react'
import { getRevenueChart, getTopSellers } from '../api'
import type { DailyStat, TopSeller } from '../types'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

const CHART_STYLE = {
  contentStyle: {
    background: '#181e2e',
    border: '1px solid #2d3f5c',
    borderRadius: 10,
    fontSize: 12,
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#8fa3c0', fontWeight: 600 },
  itemStyle:  { color: '#e8edf5' },
}

export default function Analytics() {
  const [chart,      setChart]      = useState<DailyStat[]>([])
  const [topSellers, setTopSellers] = useState<TopSeller[]>([])
  const [days,       setDays]       = useState(30)

  useEffect(() => {
    getRevenueChart(days).then(setChart)
    getTopSellers().then(setTopSellers)
  }, [days])

  const totalRevenue  = chart.reduce((s, d) => s + d.revenue, 0)
  const totalUnits    = chart.reduce((s, d) => s + d.units, 0)
  const avgDaily      = totalRevenue / (chart.length || 1)
  const bestDay       = chart.reduce((best, d) => d.revenue > best.revenue ? d : best, chart[0] ?? { revenue: 0, day: '' })

  return (
    <div className="gap-24">

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              className={`btn btn-sm ${days === d ? 'btn-primary' : ''}`}
              style={days !== d ? { background: 'transparent', border: 'none', color: 'var(--text-muted)' } : {}}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat row */}
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
          <div className="stat-value naira">{fmt(avgDaily)}</div>
        </div>
        {bestDay.day && (
          <div className="stat-card">
            <div className="stat-label">Best Day</div>
            <div className="stat-value naira" style={{ fontSize: 20 }}>{fmt(bestDay.revenue)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{bestDay.day}</div>
          </div>
        )}
      </div>

      {/* Revenue area chart */}
      <div className="card">
        <div className="section-title">Daily Revenue — Last {days} Days</div>
        {chart.length === 0 ? (
          <div className="empty-state"><p>No sales data for this period.</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e2a3d" strokeDasharray="4 4" />
              <XAxis dataKey="day" tick={{ fill: '#4d6280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#4d6280', fontSize: 11 }}
                tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                {...CHART_STYLE}
                formatter={(v: number) => [fmt(v), 'Revenue']}
              />
              <Area
                type="monotone" dataKey="revenue"
                stroke="#4f8ef7" fill="url(#revGrad2)"
                strokeWidth={2.5} dot={false}
                activeDot={{ r: 5, fill: '#4f8ef7', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid-2">

        {/* Units bar chart */}
        <div className="card">
          <div className="section-title">Units Sold Per Day</div>
          {chart.length === 0 ? (
            <div className="empty-state"><p>No data yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e2a3d" strokeDasharray="4 4" />
                <XAxis dataKey="day" tick={{ fill: '#4d6280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4d6280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(v: number) => [v, 'Units']}
                />
                <Bar dataKey="units" fill="#34d97b" radius={[4, 4, 0, 0]} maxBarSize={32} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {topSellers.map((s, i) => {
                const maxUnits = topSellers[0].total_units
                const pct = (s.total_units / maxUnits) * 100
                const rankColor = i === 0 ? '#f5a623' : i === 1 ? '#8fa3c0' : i === 2 ? '#cd7f32' : 'var(--text-disabled)'
                return (
                  <div key={s.product_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)',
                          color: rankColor, width: 18, flexShrink: 0,
                        }}>
                          #{i + 1}
                        </span>
                        <span style={{
                          fontSize: 13, color: 'var(--text)', fontWeight: 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {s.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--naira)', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                        {fmt(s.total_revenue)}
                      </span>
                    </div>
                    <div style={{ background: 'var(--surface-raised)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                      <div style={{
                        background: `linear-gradient(90deg, ${i === 0 ? '#4f8ef7' : '#34d97b'}, ${i === 0 ? '#7b5ea7' : '#4f8ef7'})`,
                        borderRadius: 99, height: '100%',
                        width: `${pct}%`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {s.total_units.toLocaleString()} units sold
                    </div>
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
