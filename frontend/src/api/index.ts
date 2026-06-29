/**
 * API client with automatic token refresh and 401 handling.
 *
 * Token storage:
 *   - Access token  → sessionStorage (cleared when browser tab closes)
 *   - Refresh token → localStorage   (survives browser restart, expires in 30 days)
 *
 * This is intentional:
 *   - sessionStorage is not accessible by other tabs/windows (more isolated)
 *   - If the tab closes, access token is gone — re-entry requires the refresh token
 *   - localStorage refresh token is the "remember me" mechanism
 */

import type { Product, Sale, Alert, DailyStat, TopSeller, StockoutForecast, Summary } from '../types'

const BASE = '/api'

export interface UserInfo {
  id: number; email: string; full_name: string
  shop_id: number; shop_name: string; city?: string
}

// ── Token storage ─────────────────────────────────────────────────────────────
export const tokenStore = {
  getAccess:      ()         => sessionStorage.getItem('sk_access'),
  setAccess:      (t: string) => sessionStorage.setItem('sk_access', t),
  clearAccess:    ()         => sessionStorage.removeItem('sk_access'),

  getRefresh:     ()         => localStorage.getItem('sk_refresh'),
  setRefresh:     (t: string) => localStorage.setItem('sk_refresh', t),
  clearRefresh:   ()         => localStorage.removeItem('sk_refresh'),

  setTokens: (access: string, refresh: string) => {
    sessionStorage.setItem('sk_access',  access)
    localStorage.setItem('sk_refresh', refresh)
  },
  clearAll: () => {
    sessionStorage.removeItem('sk_access')
    localStorage.removeItem('sk_refresh')
  },
}

// ── Token refresh (called automatically on 401) ───────────────────────────────
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refresh = tokenStore.getRefresh()
    if (!refresh) throw new Error('No refresh token')

    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })

    if (!res.ok) {
      tokenStore.clearAll()
      // Dispatch event so AuthContext can react and show login screen
      window.dispatchEvent(new CustomEvent('sk:session-expired'))
      throw new Error('Session expired. Please log in again.')
    }

    const data = await res.json()
    tokenStore.setTokens(data.access_token, data.refresh_token)
    return data.access_token
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function req<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = tokenStore.getAccess()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    try {
      const newToken = await refreshAccessToken()
      return req<T>(path, options, false) // retry once with new token
    } catch {
      throw new Error('Your session has expired. Please log in again.')
    }
  }

  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data: {
  email: string; password: string; full_name: string
  shop_name: string; owner_name: string; city?: string; phone?: string
}) => req<{ access_token: string; refresh_token: string; expires_in: number; user: UserInfo }>(
  '/auth/register', { method: 'POST', body: JSON.stringify(data) }
)

export const login = async (email: string, password: string) => {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Login failed')
  }
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; user: UserInfo }>
}

export const logoutApi = () => {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return Promise.resolve()
  return req('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) })
    .catch(() => {}) // best-effort
}

export const getMe = () => req<UserInfo & { shop_name: string; city: string }>('/auth/me')

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts    = ()                     => req<Product[]>('/products/')
export const createProduct  = (d: Partial<Product>)  => req<Product>('/products/', { method: 'POST', body: JSON.stringify(d) })
export const updateProduct  = (id: number, d: Partial<Product>) => req<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(d) })
export const deleteProduct  = (id: number)           => req<void>(`/products/${id}`, { method: 'DELETE' })
export const restockProduct = (id: number, qty: number) => req(`/products/${id}/restock`, { method: 'POST', body: JSON.stringify({ product_id: id, quantity: qty }) })

export const importCSV = async (file: File) => {
  const token = tokenStore.getAccess()
  const form  = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/products/import/csv`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Import failed')
  }
  return res.json()
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export const getSales    = ()                                                                          => req<Sale[]>('/sales/')
export const recordSale  = (d: { product_id: number; qty_sold: number; sale_price: number })           => req('/sales/', { method: 'POST', body: JSON.stringify(d) })

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts    = () => req<Alert[]>('/alerts/')
export const resolveAlert = (id: number) => req(`/alerts/${id}/resolve`, { method: 'PATCH' })

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getSummary         = ()            => req<Summary>('/analytics/summary')
export const getRevenueChart    = (days = 30)   => req<DailyStat[]>(`/analytics/revenue-chart?days=${days}`)
export const getTopSellers      = ()            => req<TopSeller[]>('/analytics/top-sellers')
export const getStockoutForecast = ()           => req<StockoutForecast[]>('/analytics/stockout-forecast')

// ── AI Chat ───────────────────────────────────────────────────────────────────
export const askQuestion = (question: string)   => req<{ answer: string }>('/chat/', { method: 'POST', body: JSON.stringify({ question }) })
