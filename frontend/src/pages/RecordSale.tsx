import { useEffect, useState } from 'react'
import { getProducts, recordSale, getSales } from '../api'
import type { Product, Sale } from '../types'
import { ShoppingCart, CheckCircle } from 'lucide-react'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function RecordSale() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAll = () => {
    getProducts().then(setProducts)
    getSales().then(setSales)
  }
  useEffect(() => { loadAll() }, [])

  // Auto-fill selling price when product selected
  const handleProductChange = (id: string) => {
    setProductId(id)
    const p = products.find(x => String(x.id) === id)
    if (p) setSalePrice(String(p.unit_price))
  }

  const selected = products.find(p => String(p.id) === productId)

  const handleSubmit = async () => {
    if (!productId || !qty || !salePrice) { setError('All fields are required.'); return }
    if (selected && parseInt(qty) > selected.stock_qty) {
      setError(`Only ${selected.stock_qty} units in stock.`); return
    }
    setError('')
    setLoading(true)
    try {
      await recordSale({ product_id: parseInt(productId), qty_sold: parseInt(qty), sale_price: parseFloat(salePrice) })
      setSuccess(`Sale recorded! ${qty} × ${selected?.name}`)
      setProductId(''); setQty(''); setSalePrice('')
      loadAll()
      setTimeout(() => setSuccess(''), 3500)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="gap-24">
      <div className="page-header">
        <h1 className="page-title">Record Sale</h1>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Sale form */}
        <div className="card">
          <div className="section-title">New Sale</div>

          {success && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 13 }}>
              <CheckCircle size={15} /> {success}
            </div>
          )}

          <div className="gap-16">
            <div className="form-field">
              <label>Product</label>
              <select value={productId} onChange={e => handleProductChange(e.target.value)}>
                <option value="">Select a product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock_qty === 0}>
                    {p.name} — {p.stock_qty} in stock{p.stock_qty === 0 ? ' (out)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div style={{ background: 'var(--surface-raised)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Selling price</span>
                  <span style={{ color: 'var(--naira)', fontWeight: 600 }}>{fmt(selected.unit_price)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Stock available</span>
                  <span style={{ fontWeight: 600 }}>{selected.stock_qty} units</span>
                </div>
              </div>
            )}

            <div className="form-field">
              <label>Quantity Sold</label>
              <input type="number" min="1" value={qty}
                onChange={e => setQty(e.target.value)} placeholder="e.g. 3" />
            </div>

            <div className="form-field">
              <label>Sale Price per Unit (₦)</label>
              <input type="number" min="0" step="0.01" value={salePrice}
                onChange={e => setSalePrice(e.target.value)} placeholder="Auto-filled from product" />
            </div>

            {qty && salePrice && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total: </span>
                <strong style={{ color: 'var(--text)' }}>{fmt(parseFloat(salePrice) * parseInt(qty) || 0)}</strong>
              </div>
            )}

            {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}

            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !productId || !qty}>
              <ShoppingCart size={14} />
              {loading ? 'Recording…' : 'Record Sale'}
            </button>
          </div>
        </div>

        {/* Recent sales */}
        <div className="card">
          <div className="section-title">Recent Sales</div>
          {sales.length === 0 ? (
            <div className="empty-state"><p>No sales recorded yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {sales.slice(0, 20).map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text)' }}>{s.product?.name ?? `#${s.product_id}`}</td>
                      <td>{s.qty_sold}</td>
                      <td>{fmt(s.sale_price)}</td>
                      <td style={{ color: 'var(--naira)', fontWeight: 600 }}>{fmt(s.sale_price * s.qty_sold)}</td>
                      <td style={{ fontSize: 12 }}>
                        {new Date(s.sold_at).toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
