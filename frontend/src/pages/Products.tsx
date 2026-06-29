import { useEffect, useRef, useState } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct, restockProduct, importCSV } from '../api'
import type { Product } from '../types'
import { Plus, Pencil, Trash2, PackagePlus, Upload, Download, CheckCircle, AlertCircle, Search } from 'lucide-react'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

function StockBadge({ p }: { p: Product }) {
  if (p.stock_qty === 0)                   return <span className="badge badge-out">Out of stock</span>
  if (p.stock_qty <= p.reorder_threshold)  return <span className="badge badge-low">Low stock</span>
  return <span className="badge badge-ok">In stock</span>
}

const EMPTY = {
  name: '', sku: '', unit_price: '', cost_price: '',
  stock_qty: '', reorder_threshold: '10', category: '',
}

const CSV_TEMPLATE = [
  'name,sku,category,unit_price,cost_price,stock_qty,reorder_threshold',
  'Indomie Chicken 70g,IND-CHK-70,Noodles,150,90,200,30',
  'Peak Milk Powder 400g,PKM-400,Dairy,2800,2000,50,10',
  'Milo 200g Tin,MIL-200,Beverages,1200,900,80,15',
  'Sprite 60cl,SPR-60,Drinks,400,280,120,20',
].join('\n')

function FormField({
  label, fieldKey, form, setForm, type = 'text', placeholder = '', required = false,
}: {
  label: string; fieldKey: keyof typeof EMPTY; form: typeof EMPTY
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY>>
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div className="form-field">
      <label>{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}</label>
      <input
        type={type}
        value={form[fieldKey]}
        placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [fieldKey]: e.target.value }))}
      />
    </div>
  )
}

export default function Products() {
  const [products,     setProducts]     = useState<Product[]>([])
  const [modal,        setModal]        = useState<'add' | 'edit' | 'restock' | 'import' | null>(null)
  const [selected,     setSelected]     = useState<Product | null>(null)
  const [form,         setForm]         = useState(EMPTY)
  const [restockQty,   setRestockQty]   = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [importResult, setImportResult] = useState<{ created: number; skipped: any[] } | null>(null)
  const [csvFile,      setCsvFile]      = useState<File | null>(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [search,       setSearch]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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
    setError('')
    setModal('edit')
  }
  const openRestock = (p: Product) => { setSelected(p); setRestockQty(''); setError(''); setModal('restock') }

  const handleSave = async () => {
    if (!form.name || !form.unit_price) { setError('Product name and selling price are required.'); return }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        unit_price: parseFloat(form.unit_price),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
        stock_qty: parseInt(form.stock_qty) || 0,
        reorder_threshold: parseInt(form.reorder_threshold) || 10,
        category: form.category || undefined,
      }
      if (modal === 'add') await createProduct(payload)
      else if (modal === 'edit' && selected) await updateProduct(selected.id, payload)
      await load()
      setModal(null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    await deleteProduct(id)
    load()
  }

  const handleRestock = async () => {
    if (!selected || !restockQty) return
    setLoading(true)
    try {
      await restockProduct(selected.id, parseInt(restockQty))
      await load()
      setModal(null)
    } catch (e: any) { setError(e.message) }
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
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'shopkeeper_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Summary counts ── */
  const outCount  = products.filter(p => p.stock_qty === 0).length
  const lowCount  = products.filter(p => p.stock_qty > 0 && p.stock_qty <= p.reorder_threshold).length

  return (
    <div className="gap-24">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {products.length} total
            {outCount > 0 && <span style={{ color: 'var(--danger)', marginLeft: 10 }}>· {outCount} out of stock</span>}
            {lowCount > 0 && <span style={{ color: 'var(--warning)', marginLeft: 10 }}>· {lowCount} low</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setImportResult(null); setError(''); setModal('import') }}>
            <Upload size={14} /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Search bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13.5, width: '100%',
              fontFamily: 'var(--font-body)',
            }}
            placeholder="Search by name, category or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              ✕
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>
              {products.length === 0
                ? 'No products yet. Add your first product or import a CSV file.'
                : 'No products match your search.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Sell Price</th>
                  <th style={{ textAlign: 'right' }}>Cost Price</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Reorder At</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600, maxWidth: 200 }}>{p.name}</td>
                    <td>{p.category ?? <span style={{ color: 'var(--text-disabled)' }}>—</span>}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {p.sku ?? <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--naira)', fontWeight: 500 }}>
                      {fmt(p.unit_price)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {p.cost_price ? fmt(p.cost_price) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: p.stock_qty === 0 ? 'var(--danger)' : p.stock_qty <= p.reorder_threshold ? 'var(--warning)' : 'var(--text)',
                    }}>
                      {p.stock_qty}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {p.reorder_threshold}
                    </td>
                    <td><StockBadge p={p} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openRestock(p)} title="Restock">
                          <PackagePlus size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? 'Add New Product' : `Edit — ${selected?.name}`}</div>

            <div className="form-grid" style={{ marginBottom: 20 }}>
              <FormField label="Product Name" fieldKey="name" form={form} setForm={setForm}
                placeholder="e.g. Indomie Chicken 70g" required />
              <FormField label="Category" fieldKey="category" form={form} setForm={setForm}
                placeholder="e.g. Noodles, Dairy" />
              <FormField label="SKU (optional)" fieldKey="sku" form={form} setForm={setForm}
                placeholder="e.g. IND-CHK-70" />
              <FormField label="Selling Price (₦)" fieldKey="unit_price" form={form} setForm={setForm}
                type="number" placeholder="0" required />
              <FormField label="Cost Price (₦)" fieldKey="cost_price" form={form} setForm={setForm}
                type="number" placeholder="0" />
              <FormField label="Current Stock (units)" fieldKey="stock_qty" form={form} setForm={setForm}
                type="number" placeholder="0" />
              <FormField label="Reorder Alert Threshold" fieldKey="reorder_threshold" form={form} setForm={setForm}
                type="number" placeholder="10" />
            </div>

            {error && <div className="alert-banner error" style={{ marginBottom: 16, fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Restock Modal ── */}
      {modal === 'restock' && selected && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-title">Restock Product</div>

            <div style={{
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                {selected.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current stock</span>
                <span style={{
                  fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: selected.stock_qty === 0 ? 'var(--danger)' : selected.stock_qty <= selected.reorder_threshold ? 'var(--warning)' : 'var(--text)',
                }}>
                  {selected.stock_qty} units
                </span>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 20 }}>
              <label>Units to add <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span></label>
              <input
                type="number" min="1"
                value={restockQty}
                onChange={e => setRestockQty(e.target.value)}
                placeholder="e.g. 50"
                autoFocus
              />
              {restockQty && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  New total will be{' '}
                  <span style={{ color: 'var(--success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {selected.stock_qty + (parseInt(restockQty) || 0)} units
                  </span>
                </div>
              )}
            </div>

            {error && <div className="alert-banner error" style={{ marginBottom: 16, fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleRestock} disabled={loading || !restockQty}>
                {loading ? 'Saving…' : 'Confirm Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ── */}
      {modal === 'import' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Import Products from CSV</div>

            {/* Instructions */}
            <div style={{
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20,
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.6 }}>
                Upload a <code>.csv</code> file with your products.{' '}
                <strong style={{ color: 'var(--text)' }}>name</strong> and{' '}
                <strong style={{ color: 'var(--text)' }}>unit_price</strong> are required.
                All other columns are optional.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                <Download size={13} /> Download template CSV
              </button>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) setCsvFile(f)
              }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : csvFile ? 'var(--success)' : 'var(--border-bright)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '32px 20px',
                textAlign: 'center',
                marginBottom: 20,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                background: dragOver ? 'var(--accent-dim)' : csvFile ? 'var(--success-dim)' : 'var(--surface-raised)',
              }}
            >
              <Upload size={26} style={{
                color: csvFile ? 'var(--success)' : 'var(--text-muted)',
                marginBottom: 10,
              }} />
              <p style={{ fontSize: 13, color: csvFile ? 'var(--success)' : 'var(--text-muted)', fontWeight: csvFile ? 600 : 400 }}>
                {csvFile ? `✓  ${csvFile.name}` : 'Click to choose a file, or drag & drop here'}
              </p>
              {!csvFile && (
                <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>Accepts .csv files only</p>
              )}
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* Result */}
            {importResult && (
              <div style={{ marginBottom: 18 }}>
                <div className="alert-banner success" style={{ marginBottom: importResult.skipped.length > 0 ? 10 : 0 }}>
                  <CheckCircle size={15} />
                  <strong>{importResult.created} products imported successfully</strong>
                </div>
                {importResult.skipped.length > 0 && (
                  <div className="alert-banner warning" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <AlertCircle size={14} /> {importResult.skipped.length} rows skipped
                    </div>
                    {importResult.skipped.map((s: any, i: number) => (
                      <div key={i} style={{ fontSize: 12, opacity: 0.85 }}>Row {s.row}: {s.reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <div className="alert-banner error" style={{ marginBottom: 16, fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                {importResult ? 'Done' : 'Cancel'}
              </button>
              {!importResult && (
                <button className="btn btn-primary" onClick={handleImport} disabled={loading || !csvFile}>
                  {loading
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Importing…</>
                    : 'Import Products'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
