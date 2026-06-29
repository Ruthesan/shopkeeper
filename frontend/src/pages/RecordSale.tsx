import { useEffect, useState } from 'react'
import { getProducts, recordSale, getSales } from '../api'
import type { Product, Sale } from '../types'
import { ShoppingCart, CheckCircle, TrendingUp } from 'lucide-react'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

export default function RecordSale() {
  const [products,   setProducts]   = useState<Product[]>([])
  const [sales,      setSales]      = useState<Sale[]>([])
  const [productId,  setProductId]  = useState('')
  const [qty,        setQty]        = useState('')
  const [salePrice,  setSalePrice]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  const loadAll = () => {
    getProducts().then(setProducts)
    getSales().then(setSales)
  }
  useEffect(() => { loadAll() }, [])

  const handleProductChange = (id: string) => {
    setProductId(id)
    const p = products.find(x => String(x.id) === id)
    if (p) setSalePrice(String(p.unit_price))
    else setSalePrice('')
  }

  const selected = products.find(p => String(p.id) === productId)

  const todayRevenue = sales
    .filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.sale_price * s.qty_sold, 0)

  const handleSubmit = async () => {
    if (!productId || !qty || !salePrice) { setError('Please fill in all fields.'); return }
    if (selected && parseInt(qty) > selected.stock_qty) {
      setError(`Only ${selected.stock_qty} units in stock.`); return
    }
    setError('')
    setLoading(true)
    try {
      await recordSale({ product_id: parseInt(productId), qty_sold: parseInt(qty), sale_price: parseFloat(salePrice) })
      setSuccess(`Recorded: ${qty} × ${selected?.name}`)
      setProductId(''); setQty(''); setSalePrice('')
      loadAll()
      setTimeout(() => setSuccess(''), 4000)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const total = parseFloat(salePrice) * parseInt(qty) || 0

  return (
    <div className="gap-24">
      <div className="page-header">
        <div>
          <h1 className="page-title">Record Sale</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Today's revenue:&nbsp;
            <span style={{ color: 'var(--naira)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {fmt(todayRevenue)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* ── Sale form ── */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 20 }}>New Sale</div>

          {success && (
            <div className="alert-banner success" style={{ marginBottom: 20 }}>
              <CheckCircle size={15} />
              <strong>{success}</strong>
            </div>
          )}

          <div className="gap-16">

            {/* Product selector */}
            <div className="form-field">
              <label>Product <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span></label>
              <select value={productId} onChange={e => handleProductChange(e.target.value)}>
                <option value="">Select a product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock_qty === 0}>
                    {p.name}{p.stock_qty === 0 ? ' — OUT OF STOCK' : ` — ${p.stock_qty} left`}
                  </option>
                ))}
              </select>
            </div>

            {/* Product info strip */}
            {selected && (
              <div style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px 0',
              }}>
                {[
                  ['Selling price', <span style={{ color: 'var(--naira)', fontFamily: 'var(--font-mono)' }}>{fmt(selected.unit_price)}</span>],
                  ['Stock available', <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selected.stock_qty} units</span>],
                  ...(selected.cost_price ? [['Cost price', <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{fmt(selected.cost_price)}</span>]] : []),
                  ...(selected.category ? [['Category', <span style={{ color: 'var(--text-dim)' }}>{selected.category}</span>]] : []),
                ].map(([label, val], i) => (
                  <div key={i} style={{ display: 'contents' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 13, textAlign: 'right' }}>{val as React.ReactNode}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Qty + Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <label>Qty Sold <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span></label>
                <input type="number" min="1" value={qty}
                  onChange={e => setQty(e.target.value)} placeholder="e.g. 3" />
              </div>
              <div className="form-field">
                <label>Price / Unit (₦) <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span></label>
                <input type="number" min="0" step="0.01" value={salePrice}
                  onChange={e => setSalePrice(e.target.value)} placeholder="Auto-filled" />
              </div>
            </div>

            {/* Total preview */}
            {qty && salePrice && total > 0 && (
              <div style={{
                background: 'var(--accent-dim)',
                border: '1px solid rgba(79,142,247,0.18)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Total for this sale</span>
                <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--naira)' }}>
                  {fmt(total)}
                </span>
              </div>
            )}

            {error && <div className="alert-banner error" style={{ fontSize: 13 }}>{error}</div>}

            <button
              className="btn btn-primary"
              style={{ padding: '11px', fontSize: 14 }}
              onClick={handleSubmit}
              disabled={loading || !productId || !qty || !salePrice}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Recording…</>
                : <><ShoppingCart size={15} /> Record Sale</>}
            </button>
          </div>
        </div>

        {/* ── Recent sales ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Recent Sales</div>
          </div>

          {sales.length === 0 ? (
            <div className="empty-state">
              <TrendingUp size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p>No sales recorded yet. Record your first sale above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 25).map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                        {s.product?.name ?? `#${s.product_id}`}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.qty_sold}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {fmt(s.sale_price)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--naira)', fontWeight: 600 }}>
                        {fmt(s.sale_price * s.qty_sold)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(s.sold_at).toLocaleString('en-NG', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
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
