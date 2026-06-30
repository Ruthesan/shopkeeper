import { useState } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, Bell,
  BarChart2, TrendingUp, LogOut, Clock,
} from 'lucide-react'
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
  { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'products',    label: 'Products',     icon: Package },
  { id: 'record-sale', label: 'Record Sale',  icon: ShoppingCart },
  { id: 'alerts',      label: 'Alerts',       icon: Bell },
  { id: 'analytics',   label: 'Analytics',    icon: BarChart2 },
  { id: 'stockout',    label: 'Stockout Risk',icon: TrendingUp },
] as const

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill="white" fillOpacity="0.95"/>
      <circle cx="12" cy="11" r="2" fill="rgba(79,142,247,0.7)"/>
    </svg>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
      <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #4f8ef7, #7b5ea7)',
        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 16px rgba(79,142,247,0.35)' }}>
        <LogoIcon />
      </div>
      <div className="spinner" />
    </div>
  )
}

/* ── Inactivity warning banner ──────────────────────────────────────────── */
function InactivityWarning() {
  const { logout, resetActivity } = useAuth()
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      background: 'var(--warning)',
      color: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: '10px 20px',
      fontSize: 13.5, fontWeight: 500,
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    }}>
      <Clock size={16} />
      <span>Your session will expire in 5 minutes due to inactivity.</span>
      <button
        onClick={resetActivity}
        style={{
          background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.2)',
          borderRadius: 6, padding: '4px 14px', fontSize: 12.5, fontWeight: 700,
          cursor: 'pointer', color: '#000',
        }}
      >
        Stay logged in
      </button>
      <button
        onClick={() => logout('user')}
        style={{
          background: 'transparent', border: 'none',
          fontSize: 12.5, color: 'rgba(0,0,0,0.6)', cursor: 'pointer', fontWeight: 500,
        }}
      >
        Log out now
      </button>
    </div>
  )
}

function AppShell() {
  const { user, loading, logout, sessionWarning } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')

  if (loading)  return <LoadingScreen />
  if (!user)    return <AuthPage />

  const pages: Record<Page, React.ReactNode> = {
    dashboard:     <Dashboard onNavigate={setPage} />,
    products:      <Products />,
    'record-sale': <RecordSale />,
    alerts:        <AlertsPage />,
    analytics:     <Analytics />,
    stockout:      <StockoutPage />,
  }

  const initials = user.shop_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  return (
    <>
      {sessionWarning && <InactivityWarning />}

      <div className="layout" style={{ paddingTop: sessionWarning ? 44 : 0 }}>

        <aside className="sidebar">
          <div className="logo">
            <div className="logo-mark"><LogoIcon /></div>
            <div>
              <div className="logo-text">ShopKeeper</div>
              <div className="logo-sub">INVENTORY &amp; SALES</div>
            </div>
          </div>

          <nav style={{ flex: 1 }}>
            <div className="nav-section-label">Menu</div>
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id}
                className={`nav-item ${page === id ? 'active' : ''}`}
                onClick={() => setPage(id as Page)}>
                <Icon size={15} strokeWidth={page === id ? 2.2 : 1.8} />
                {label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="shop-card">
              <div className="shop-avatar" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="shop-name">{user.shop_name}</div>
                <div className="shop-email">{user.email}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => logout('user')}>
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </aside>

        <main className="main">{pages[page]}</main>
        <AIChat />
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShellWithExpiredMessage />
    </AuthProvider>
  )
}

/* Wrapper that shows session-expired notice on the login page */
function AppShellWithExpiredMessage() {
  return <AppShell />
}
