import { useEffect, useRef, useState } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct, restockProduct, importCSV } from '../api'
import type { Product } from '../types'
import { Plus, Pencil, Trash2, PackagePlus, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

function stockBadge(p: Product) {
  if (p.stock_qty === 0) return <span className="badge badge-out">Out of stock</span>
  if (p.stock_qty <= p.reorder_threshold) return <span className="badge badge-low">Low stock</span>
  return <span className="badge badge-ok">OK</span>
}

const EMPTY = { name: '', sku: '', unit_price: '', cost_price: '', stock_qty: '', reorder_threshold: '10', category: '' }

const CSV_TEMPLATE = `name,sku,category,unit_price,cost_price,stock_qty,reorder_threshold
Indomie Chicken 70g,IND-CHK-70,Noodles,150,90,200,30
Peak Milk Powder 400g,PKM-400,Dairy,2800,2000,50,10
Milo 200g,MIL-200,Beverages,1200,900,80,15
Sprite 60cl,SPR-60,Drinks,400,280,120,20`

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'restock' | 'import' | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [restockQty, setRestockQty] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<{ created: number; skipped: any[] } | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')

  const load = () => getProducts().then(setProducts)
  useEffect(() => { load() }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setForm(EMPTY); setError(''); setModal('add') }
  const openEdit = (p: Product) => {
    setSelected(p)
    setForm({
      name: p.name, sku: p.sku ?? '', unit_price: String(p.unit_price),
      cost_price: String(p.cost_price ?? ''), stock_qty: String(p.stock_qty),
      reorder_threshold: String(p.reorder_threshold), category: p.category ?? '',
    })
    setError(''); setModal('edit')
  }
  const openRestock = (p: Product) => { setSelected(p); setRestockQty(''); setModal('restock') }

  const handleSave = async () => {
    if (!form.name || !form.unit_price) { setError('Name and unit price are required.'); return }
    setLoading(true)
    try {
      const payload = {
        name: form.name, sku: form.sku || undefined,
        unit_price: parseFloat(form.unit_price),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
        stock_qty: parseInt(form.stock_qty) || 0,
        reorder_threshold: parseInt(form.reorder_threshold) || 10,
        category: form.category || undefined,
      }
      if (modal === 'add') await createProduct(payload)
      else if (modal === 'edit' && selected) await updateProduct(selected.id, payload)
      await load(); setModal(null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return
    await deleteProduct(id); load()
  }

  const handleRestock = async () => {
    if (!selected || !restockQty) return
    setLoading(true)
    try { await restockProduct(selected.id, parseInt(restockQty)); await load(); setModal(null) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleImport = async () => {
    if (!csvFile) return
    setLoading(true); setError(''); setImportResult(null)
    try {
      const result = await importCSV(csvFile)
      setImportResult(result)
      await load()
      setCsvFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'shopkeeper_products_template.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div className="form-field">
      <label>{label}</label>
      <input type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  )

  return (
    <div className="gap-24">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setImportResult(null); setError(''); setModal('import') }}>
            <Upload size={14} /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Product</button>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <input
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', width: '100%', maxWidth: 320, fontFamily: 'var(--font-body)', fontSize: 13 }}
            placeholder="Search by name, category or SKU…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>{products.length === 0 ? 'No products yet. Add your first product or import a CSV.' : 'No products match your search.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>SKU</th><th>Category</th>
                  <th>Sell Price</th><th>Cost Price</th>
                  <th>Stock</th><th>Reorder At</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{p.name}</td>
                    <td>{p.sku ?? '—'}</td>
                    <td>{p.category ?? '—'}</td>
                    <td style={{ color: 'var(--naira)' }}>{fmt(p.unit_price)}</td>
                    <td>{p.cost_price ? fmt(p.cost_price) : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{p.stock_qty}</td>
                    <td>{p.reorder_threshold}</td>
                    <td>{stockBadge(p)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openRestock(p)} title="Restock"><PackagePlus size={13} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit"><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? 'Add Product' : 'Edit Product'}</div>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              {field('name', 'Product Name')}
              {field('sku', 'SKU (optional)')}
              {field('category', 'Category')}
              {field('unit_price', 'Selling Price (₦)', 'number')}
              {field('cost_price', 'Cost Price (₦)', 'number')}
              {field('stock_qty', 'Current Stock (units)', 'number')}
              {field('reorder_threshold', 'Reorder Alert Threshold', 'number')}
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {modal === 'restock' && selected && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Restock — {selected.name}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Current stock: <strong style={{ color: 'var(--text)' }}>{selected.stock_qty} units</strong>
            </p>
            <div className="form-field" style={{ marginBottom: 20 }}>
              <label>Units to add</label>
              <input type="number" min="1" value={restockQty}
                onChange={e => setRestockQty(e.target.value)} placeholder="e.g. 50" />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleRestock} disabled={loading || !restockQty}>
                {loading ? 'Saving…' : 'Confirm Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {modal === 'import' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Import Products from CSV</div>

            <div style={{ background: 'var(--surface-raised)', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13 }}>
              <p style={{ color: 'var(--text-dim)', marginBottom: 10 }}>
                Upload a <code style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>.csv</code> file
                with your product list. Required columns: <strong>name</strong>, <strong>unit_price</strong>.
                Optional: sku, category, cost_price, stock_qty, reorder_threshold.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                <Download size={13} /> Download template
              </button>
            </div>

            <div
              style={{
                border: '2px dashed var(--border)', borderRadius: 8, padding: '28px 20px',
                textAlign: 'center', marginBottom: 20, cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setCsvFile(f) }}
            >
              <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
              <p style={{ color: csvFile ? 'var(--text)' : 'var(--text-muted)', fontSize: 13 }}>
                {csvFile ? `📄 ${csvFile.name}` : 'Click to choose a file or drag & drop here'}
              </p>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
            </div>

            {importResult && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 13, marginBottom: 8 }}>
                  <CheckCircle size={15} />
                  <strong>{importResult.created} products imported successfully</strong>
                </div>
                {importResult.skipped.length > 0 && (
                  <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning)', fontSize: 12, marginBottom: 6 }}>
                      <AlertCircle size={13} /> {importResult.skipped.length} rows skipped
                    </div>
                    {importResult.skipped.map((s: any, i: number) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>Row {s.row}: {s.reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button className="btn btn-primary" onClick={handleImport} disabled={loading || !csvFile}>
                  {loading ? 'Importing…' : 'Import Products'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
