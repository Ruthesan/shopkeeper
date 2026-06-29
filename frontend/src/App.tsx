import { useState } from 'react'
import { LayoutDashboard, Package, ShoppingCart, Bell, BarChart2, TrendingUp, LogOut, Store } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import RecordSale from './pages/RecordSale'
import AlertsPage from './pages/AlertsPage'
import Analytics from './pages/Analytics'
import StockoutPage from './pages/StockoutPage'
import AIChat from './components/AIChat'

type Page = 'dashboard' | 'products' | 'record-sale' | 'alerts' | 'analytics' | 'stockout'

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'products',     label: 'Products',     icon: Package },
  { id: 'record-sale',  label: 'Record Sale',  icon: ShoppingCart },
  { id: 'alerts',       label: 'Alerts',       icon: Bell },
  { id: 'analytics',    label: 'Analytics',    icon: BarChart2 },
  { id: 'stockout',     label: 'Stockout Risk',icon: TrendingUp },
] as const

function AppShell() {
  const { user, loading, logout } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  const pages: Record<Page, React.ReactNode> = {
    dashboard:     <Dashboard onNavigate={setPage} />,
    products:      <Products />,
    'record-sale': <RecordSale />,
    alerts:        <AlertsPage />,
    analytics:     <Analytics />,
    stockout:      <StockoutPage />,
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">🏪 </div>
          <span className="logo-text">ShopKeeper</span>
        </div>
        
        <nav style={{ flex: 1 }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id as Page)}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>

        {/* Shop info + logout at bottom */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Store size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                {user.shop_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => logout ('user')}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main">{pages[page]}</main>
      <AIChat />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
