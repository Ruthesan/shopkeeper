import { useEffect, useState } from 'react'
import { getAlerts, resolveAlert } from '../api'
import type { Alert } from '../types'
import { AlertTriangle, CheckCheck } from 'lucide-react'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showResolved, setShowResolved] = useState(false)

  const load = (resolved = false) =>
    getAlerts().then(all => setAlerts(all.filter(a => a.resolved === resolved)))

  useEffect(() => { load(showResolved) }, [showResolved])

  const handleResolve = async (id: number) => {
    await resolveAlert(id)
    load(showResolved)
  }

  return (
    <div className="gap-24">
      <div className="page-header">
        <h1 className="page-title">Alerts</h1>
        <button
          className={`btn ${showResolved ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowResolved(r => !r)}
        >
          {showResolved ? 'Show Active' : 'Show Resolved'}
        </button>
      </div>

      <div className="card">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <CheckCheck size={28} style={{ color: 'var(--success)' }} />
            <p>{showResolved ? 'No resolved alerts.' : 'No active alerts — stock levels look healthy!'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Alert Type</th><th>Stock Left</th><th>Triggered</th>
                  {!showResolved && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                      {a.product?.name ?? `Product #${a.product_id}`}
                    </td>
                    <td>
                      <span className={`badge ${a.alert_type === 'out_of_stock' ? 'badge-out' : 'badge-low'}`}>
                        <AlertTriangle size={11} style={{ marginRight: 4 }} />
                        {a.alert_type === 'out_of_stock' ? 'Out of stock' : 'Low stock'}
                      </span>
                    </td>
                    <td>{a.product?.stock_qty ?? '?'} units</td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(a.created_at).toLocaleString('en-NG', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    {!showResolved && (
                      <td>
                        <button className="btn btn-success btn-sm" onClick={() => handleResolve(a.id)}>
                          Mark resolved
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
