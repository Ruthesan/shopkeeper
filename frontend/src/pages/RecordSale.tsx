import { useEffect, useState, useCallback } from 'react'
import { getProducts, recordSale, getSales } from '../api'
import type { Product, Sale, OfflineSale } from '../types'
import { ShoppingCart, CheckCircle, TrendingUp, WifiOff, Wifi } from 'lucide-react'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

// ── Feature 3: WhatsApp receipt ───────────────────────────────────────────────
// Builds a well-formatted receipt string and opens wa.me
function sendWhatsAppReceipt(params: {
  shopName:      string
  productName:   string
  qty:           number
  unitPrice:     number
  total:         number
  paymentMethod: string
}) {
  const { shopName, productName, qty, unitPrice, total, paymentMethod } = params
  const now    = new Date()
  const dateStr = now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

  const receipt = [
    `🧾 *RECEIPT — ${shopName.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📅 Date: ${dateStr}`,
    `🕐 Time: ${timeStr}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🛍️ *Item Details*`,
    `Product : ${productName}`,
    `Qty     : ${qty} unit${qty > 1 ? 's' : ''}`,
    `Price   : ${fmt(unitPrice)} each`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Total Paid: ${fmt(total)}*`,
    `💳 Payment: ${paymentMethod}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `✅ Thank you for your purchase!`,
    `We appreciate your business. 🙏`,
    ``,
    `_Powered by ShopKeeper_`,
  ].join('\n')

  const encoded = encodeURIComponent(receipt)
  window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer')
}

// ── Feature 4: Offline queue helpers ─────────────────────────────────────────
const QUEUE_KEY = 'sk_offline_sales'

function getQueue(): OfflineSale[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(queue: OfflineSale[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function pushToQueue(sale: OfflineSale): void {
  saveQueue([...getQueue(), sale])
}

function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY)
}

// ── Payment methods ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS Card'] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

const PAYMENT_ICONS: Record<PaymentMethod, string> = {
  'Cash':          '💵',
  'Bank Transfer': '🏦',
  'POS Card':      '💳',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecordSale() {
  const [products,       setProducts]       = useState<Product[]>([])
  const [sales,          setSales]          = useState<Sale[]>([])
  const [productId,      setProductId]      = useState('')
  const [qty,            setQty]            = useState('')
  const [salePrice,      setSalePrice]      = useState('')
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>('Cash')   // Feature 1
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [success,        setSuccess]        = useState('')

  // Feature 3: last recorded sale details for WhatsApp receipt
  const [lastSale, setLastSale] = useState<{
    productName: string; qty: number; unitPrice: number; total: number; paymentMethod: string
  } | null>(null)

  // Feature 4: offline / sync state
  const [isOnline,       setIsOnline]       = useState(navigator.onLine)
  const [offlineQueued,  setOfflineQueued]  = useState(false)
  const [syncingCount,   setSyncingCount]   = useState(0)
  const [queueLength,    setQueueLength]    = useState(getQueue().length)

  // Reload fresh products + sales from server
  const loadAll = useCallback(() => {
    getProducts().then(setProducts)
    getSales().then(setSales)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Feature 4: network status listeners ──────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      setOfflineQueued(false)

      const queue = getQueue()
      if (queue.length === 0) return

      setSyncingCount(queue.length)

      // Send each queued sale one by one
      let synced = 0
      for (const offlineSale of queue) {
        try {
          await recordSale({
            product_id:     offlineSale.product_id,
            qty_sold:       offlineSale.qty_sold,
            sale_price:     offlineSale.sale_price,
            payment_method: offlineSale.payment_method,
          })
          synced++
        } catch {
          // If one fails (e.g. stock ran out server-side) skip it and continue
        }
      }

      clearQueue()
      setQueueLength(0)
      setSyncingCount(0)

      // Reload from server so UI reflects true state
      loadAll()
    }

    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadAll])

  // ── Derived state ──────────────────────────────────────────────────────────
  const selected = products.find(p => String(p.id) === productId)

  const handleProductChange = (id: string) => {
    setProductId(id)
    const p = products.find(x => String(x.id) === id)
    setSalePrice(p ? String(p.unit_price) : '')
  }

  const todayRevenue = sales
    .filter(s => new Date(s.sold_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.sale_price * s.qty_sold, 0)

  const total = parseFloat(salePrice) * parseInt(qty) || 0

  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setProductId('')
    setQty('')
    setSalePrice('')
    setPaymentMethod('Cash')
  }

  // ── Feature 4: offline submission path ────────────────────────────────────
  const handleOfflineSubmit = () => {
    if (!selected) return

    const offlineSale: OfflineSale = {
      product_id:     selected.id,
      qty_sold:       parseInt(qty),
      sale_price:     parseFloat(salePrice),
      payment_method: paymentMethod,
      queued_at:      new Date().toISOString(),
    }

    pushToQueue(offlineSale)
    const newLen = getQueue().length
    setQueueLength(newLen)

    // Optimistically decrement local stock so UI stays accurate
    setProducts(prev =>
      prev.map(p =>
        p.id === selected.id
          ? { ...p, stock_qty: Math.max(0, p.stock_qty - parseInt(qty)) }
          : p,
      ),
    )

    setOfflineQueued(true)
    setSuccess(`⚠️ Saved Offline — will sync when you're back online`)
    setLastSale(null)   // no WhatsApp receipt in offline mode
    resetForm()
    setTimeout(() => setSuccess(''), 6000)
  }

  // ── Main submit handler ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!productId || !qty || !salePrice) { setError('Please fill in all fields.'); return }
    if (selected && parseInt(qty) > selected.stock_qty) {
      setError(`Only ${selected.stock_qty} units in stock.`); return
    }
    setError('')

    // Feature 4: offline intercept
    if (!navigator.onLine) {
      handleOfflineSubmit()
      return
    }

    setLoading(true)
    try {
      await recordSale({
        product_id:     parseInt(productId),
        qty_sold:       parseInt(qty),
        sale_price:     parseFloat(salePrice),
        payment_method: paymentMethod,   // Feature 1
      })

      // Feature 3: store receipt details before clearing form
      setLastSale({
        productName:   selected!.name,
        qty:           parseInt(qty),
        unitPrice:     parseFloat(salePrice),
        total,
        paymentMethod,
      })

      setSuccess(`Recorded: ${qty} × ${selected?.name}`)
      resetForm()
      loadAll()
      setTimeout(() => setSuccess(''), 8000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="gap-24">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Record Sale</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>
              Today's revenue:&nbsp;
              <span style={{ color: 'var(--naira)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                {fmt(todayRevenue)}
              </span>
            </span>
            {/* Feature 4: network indicator */}
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: isOnline ? 'var(--success)' : 'var(--warning)',
              fontSize: 12, fontWeight: 500,
            }}>
              {isOnline
                ? <><Wifi size={12} /> Online</>
                : <><WifiOff size={12} /> Offline</>}
            </span>
            {/* Feature 4: syncing indicator */}
            {syncingCount > 0 && (
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />
                Syncing {syncingCount} offline sale{syncingCount > 1 ? 's' : ''}…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feature 4: offline queue banner */}
      {!isOnline && queueLength > 0 && (
        <div className="alert-banner warning" style={{ alignItems: 'center' }}>
          <WifiOff size={16} />
          <span>
            You are offline.{' '}
            <strong>{queueLength} sale{queueLength > 1 ? 's' : ''}</strong> saved locally and will sync automatically when you reconnect.
          </span>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* ── Sale form ── */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 20 }}>New Sale</div>

          {/* Success banner */}
          {success && (
            <div
              className={`alert-banner ${success.startsWith('⚠️') ? 'warning' : 'success'}`}
              style={{ marginBottom: 20 }}
            >
              {success.startsWith('⚠️') ? <WifiOff size={15} /> : <CheckCircle size={15} />}
              <strong>{success}</strong>
            </div>
          )}

          {/* Feature 3: WhatsApp receipt button — appears after a successful online sale */}
          {lastSale && (
            <div style={{
              background: 'rgba(37,211,102,0.08)',
              border: '1px solid rgba(37,211,102,0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text)' }}>Sale complete.</strong>
                <br />Send a receipt to your customer?
              </div>
              <button
                onClick={() => sendWhatsAppReceipt({ shopName: 'My Shop', ...lastSale })}
                style={{
                  background: '#25d366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                💬 Send Receipt via WhatsApp
              </button>
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
                  ['Selling price',   <span style={{ color: 'var(--naira)', fontFamily: 'var(--font-mono)' }}>{fmt(selected.unit_price)}</span>],
                  ['Stock available', <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selected.stock_qty} units</span>],
                  ...(selected.cost_price ? [['Cost price', <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{fmt(selected.cost_price)}</span>]] : []),
                  ...(selected.category  ? [['Category',   <span style={{ color: 'var(--text-dim)' }}>{selected.category}</span>]]              : []),
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
                <input
                  type="number" min="1" value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
              <div className="form-field">
                <label>Price / Unit (₦) <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span></label>
                <input
                  type="number" min="0" step="0.01" value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  placeholder="Auto-filled"
                />
              </div>
            </div>

            {/* Feature 1: Payment method selector */}
            <div className="form-field">
              <label>Payment Method</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      flex: 1,
                      padding: '8px 6px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${paymentMethod === method ? 'var(--accent)' : 'var(--border-bright)'}`,
                      background: paymentMethod === method ? 'var(--accent-dim)' : 'var(--surface-raised)',
                      color: paymentMethod === method ? 'var(--accent)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      fontWeight: paymentMethod === method ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{PAYMENT_ICONS[method]}</span>
                    <span style={{ lineHeight: 1.3, textAlign: 'center' }}>{method}</span>
                  </button>
                ))}
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
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Total for this sale</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {PAYMENT_ICONS[paymentMethod]} {paymentMethod}
                  </div>
                </div>
                <span style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--naira)' }}>
                  {fmt(total)}
                </span>
              </div>
            )}

            {/* Feature 4: offline notice inside form */}
            {!isOnline && (
              <div className="alert-banner warning" style={{ fontSize: 12 }}>
                <WifiOff size={13} />
                You are offline. This sale will be saved locally and synced automatically when you reconnect.
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
                : !isOnline
                  ? <><WifiOff size={15} /> Save Offline</>
                  : <><ShoppingCart size={15} /> Record Sale</>}
            </button>

          </div>
        </div>

        {/* ── Recent sales ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Recent Sales</div>
            {/* Feature 4: offline queue badge */}
            {queueLength > 0 && (
              <span style={{
                background: 'var(--warning-dim)',
                border: '1px solid rgba(245,166,35,0.3)',
                color: 'var(--warning)',
                borderRadius: 99,
                padding: '2px 9px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {queueLength} pending sync
              </span>
            )}
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
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Method</th>       {/* Feature 1 */}
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 25).map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                        {s.product?.name ?? `#${s.product_id}`}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {s.qty_sold}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--naira)', fontWeight: 600 }}>
                        {fmt(s.sale_price * s.qty_sold)}
                      </td>
                      {/* Feature 1: payment method badge */}
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: s.payment_method === 'Cash' ? 'var(--success)'
                               : s.payment_method === 'POS Card' ? 'var(--accent)'
                               : 'var(--warning)',
                        }}>
                          {PAYMENT_ICONS[s.payment_method as PaymentMethod] ?? '💰'} {s.payment_method}
                        </span>
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
