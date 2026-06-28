import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register fields
  const [fullName, setFullName] = useState('')
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Enter your email and password.'); return }
    setLoading(true); setError('')
    try { await login(email, password) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    if (!email || !password || !fullName || !shopName || !ownerName) {
      setError('All required fields must be filled.'); return
    }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      await register({ email, password, full_name: fullName, shop_name: shopName, owner_name: ownerName, city, phone })
    }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const field = (label: string, value: string, set: (v: string) => void, type = 'text', required = true) => (
    <div className="form-field">
      <label>{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</label>
      <input type={type} value={value} onChange={e => set(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())} />
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, background: 'var(--accent)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 14px',
          }}>🏪</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>ShopKeeper</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
            Smart inventory management for Nigerian traders
          </p>
        </div>

        <div className="card">
          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'var(--surface-raised)', borderRadius: 8,
            padding: 4, marginBottom: 24, gap: 4,
          }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 6,
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <div className="gap-16">
              {field('Email address', email, setEmail, 'email')}
              {field('Password', password, setPassword, 'password')}
              {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                onClick={handleLogin} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          ) : (
            <div className="gap-16">
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div className="section-title" style={{ marginBottom: 12 }}>Your Account</div>
                <div className="gap-16">
                  {field('Full Name', fullName, setFullName)}
                  {field('Email Address', email, setEmail, 'email')}
                  {field('Password (min 6 characters)', password, setPassword, 'password')}
                  {field('Confirm Password', confirmPassword, setConfirmPassword, 'password')}
                </div>
              </div>
              <div>
                <div className="section-title" style={{ marginBottom: 12 }}>Your Shop</div>
                <div className="gap-16">
                  {field('Shop Name (e.g. Ade\'s Provisions)', shopName, setShopName)}
                  {field('Owner / Business Name', ownerName, setOwnerName)}
                  {field('City (e.g. Lagos, Abuja, Kano)', city, setCity, 'text', false)}
                  {field('Phone Number', phone, setPhone, 'tel', false)}
                </div>
              </div>
              {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                onClick={handleRegister} disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account & Shop'}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
          Your data is private. Each shop owner sees only their own inventory.
        </p>
      </div>
    </div>
  )
}
