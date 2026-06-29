import { useEffect, useState } from 'react'
import { getAlerts, resolveAlert } from '../api'
import type { Alert } from '../types'
import { AlertTriangle, CheckCheck, ShieldCheck, Clock } from 'lucide-react'

export default function AlertsPage() {
  const [alerts,       setAlerts]       = useState<Alert[]>([])
  const [showResolved, setShowResolved] = useState(false)
  const [resolving,    setResolving]    = useState<number | null>(null)

  const load = () =>
    getAlerts().then(all => setAlerts(all.filter(a => a.resolved === showResolved)))

  useEffect(() => { load() }, [showResolved])

  const handleResolve = async (id: number) => {
    setResolving(id)
    await resolveAlert(id)
    load()
    setResolving(null)
  }

  const outCount = alerts.filter(a => a.alert_type === 'out_of_stock').length
  const lowCount = alerts.filter(a => a.alert_type === 'low_stock').length

  return (
    <div className="gap-24">

      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Alerts</h1>
          {!showResolved && alerts.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {outCount > 0 && <span style={{ color: 'var(--danger)' }}>{outCount} out of stock</span>}
              {outCount > 0 && lowCount > 0 && <span style={{ color: 'var(--text-disabled)' }}> · </span>}
              {lowCount > 0 && <span style={{ color: 'var(--warning)' }}>{lowCount} running low</span>}
            </div>
          )}
        </div>
        <button
          className={`btn ${showResolved ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowResolved(r => !r)}
        >
          <Clock size={13} />
          {showResolved ? 'View Active' : 'View Resolved'}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            {showResolved
              ? <><Clock size={30} style={{ opacity: 0.3, marginBottom: 10 }} /><p>No resolved alerts yet.</p></>
              : <><ShieldCheck size={30} style={{ color: 'var(--success)', opacity: 1, marginBottom: 10 }} /><p>No active alerts — all stock levels are healthy!</p></>
            }
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Stock Left</th>
                  <th>Triggered</th>
                  {!showResolved && <th></th>}
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>
                        {a.product?.name ?? `Product #${a.product_id}`}
                      </div>
                      {a.product?.category && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {a.product.category}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${a.alert_type === 'out_of_stock' ? 'badge-out' : 'badge-low'}`}>
                        <AlertTriangle size={10} />
                        {a.alert_type === 'out_of_stock' ? 'Out of stock' : 'Low stock'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: a.alert_type === 'out_of_stock' ? 'var(--danger)' : 'var(--warning)' }}>
                      {a.product?.stock_qty ?? '?'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(a.created_at).toLocaleString('en-NG', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    {!showResolved && (
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleResolve(a.id)}
                          disabled={resolving === a.id}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {resolving === a.id
                            ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                            : <><CheckCheck size={12} /> Resolve</>}
                        </button>
                      </td>
                    )}
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
