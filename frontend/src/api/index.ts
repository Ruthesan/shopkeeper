import type {
  Product, Sale, Alert, DailyStat, TopSeller, StockoutForecast, Summary,
} from '../types'

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('sk_token')
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data: {
  email: string; password: string; full_name: string
  shop_name: string; owner_name: string; city?: string; phone?: string
}) => req<{ access_token: string; token_type: string; user: UserInfo }>('/auth/register', {
  method: 'POST', body: JSON.stringify(data),
})

export const login = (email: string, password: string) => {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)
  return fetch(`${BASE}/auth/login`, { method: 'POST', body: form })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Login failed')
      }
      return res.json() as Promise<{ access_token: string; token_type: string; user: UserInfo }>
    })
}

export const getMe = () => req<UserInfo & { shop_name: string; city: string }>('/auth/me')

export interface UserInfo {
  id: number; email: string; full_name: string; shop_id: number; shop_name: string
}

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = () => req<Product[]>('/products/')
export const createProduct = (data: Partial<Product>) =>
  req<Product>('/products/', { method: 'POST', body: JSON.stringify(data) })
export const updateProduct = (id: number, data: Partial<Product>) =>
  req<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteProduct = (id: number) =>
  req<void>(`/products/${id}`, { method: 'DELETE' })
export const restockProduct = (id: number, quantity: number) =>
  req(`/products/${id}/restock`, {
    method: 'POST', body: JSON.stringify({ product_id: id, quantity }),
  })

export const importCSV = async (file: File) => {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/products/import/csv`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Import failed')
  }
  return res.json()
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export const getSales = () => req<Sale[]>('/sales/')
export const recordSale = (data: { product_id: number; qty_sold: number; sale_price: number }) =>
  req('/sales/', { method: 'POST', body: JSON.stringify(data) })

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = () => req<Alert[]>('/alerts/')
export const resolveAlert = (id: number) =>
  req(`/alerts/${id}/resolve`, { method: 'PATCH' })

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getSummary = () => req<Summary>('/analytics/summary')
export const getRevenueChart = (days?: number) =>
  req<DailyStat[]>(`/analytics/revenue-chart${days ? `?days=${days}` : ''}`)
export const getTopSellers = () => req<TopSeller[]>('/analytics/top-sellers')
export const getStockoutForecast = () => req<StockoutForecast[]>('/analytics/stockout-forecast')

// ── AI Chat ───────────────────────────────────────────────────────────────────
export const askQuestion = (question: string) =>
  req<{ answer: string }>('/chat/', { method: 'POST', body: JSON.stringify({ question }) })
