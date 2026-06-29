import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Store, User, Mail, Lock, Phone, MapPin } from 'lucide-react'

type Mode = 'login' | 'register'

/* ── Logo SVG ─────────────────────────────────────────────────────────────── */
function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill="white" fillOpacity="0.95"
      />
      <circle cx="12" cy="11" r="2.2" fill="rgba(79,142,247,0.75)" />
    </svg>
  )
}

/* ── Input with optional icon + password toggle ───────────────────────────── */
interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  icon?: React.ReactNode
  autoFocus?: boolean
}

function Field({ label, value, onChange, type = 'text', placeholder, required = true, icon, autoFocus }: FieldProps) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (show ? 'text' : 'password') : type

  return (
    <div className="form-field">
      <label>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            paddingLeft:  icon ? 36 : undefined,
            paddingRight: isPassword ? 40 : undefined,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 2,
            }}
            tabIndex={-1}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Section divider inside the form card ─────────────────────────────────── */
function FormSection({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '16px 16px 18px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        marginBottom: 16,
        fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-display)',
        textTransform: 'uppercase', letterSpacing: '1.1px',
        color: 'var(--text-muted)',
      }}>
        {icon} {label}
      </div>
      <div className="gap-16">{children}</div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function AuthPage() {
  const { login, register, logoutReason } = useAuth()
  const [mode,  setMode]  = useState<Mode>('login')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  // shared
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  // register only
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName,        setFullName]        = useState('')
  const [shopName,        setShopName]        = useState('')
  const [ownerName,       setOwnerName]       = useState('')
  const [city,            setCity]            = useState('')
  const [phone,           setPhone]           = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setBusy(true); setError('')
    try   { await login(email, password) }
    catch (e: any) { setError(e.message) }
    finally { setBusy(false) }
  }

  const handleRegister = async () => {
    if (!email || !password || !fullName || !shopName || !ownerName) {
      setError('Please fill in all required fields.'); return
    }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setBusy(true); setError('')
    try {
      await register({ email, password, full_name: fullName, shop_name: shopName, owner_name: ownerName, city, phone })
    }
    catch (e: any) { setError(e.message) }
    finally { setBusy(false) }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      mode === 'login' ? handleLogin() : handleRegister()
    }
  }

  return (
    <div
      onKeyDown={onKey}
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        backgroundImage: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(79,142,247,0.1) 0%, transparent 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 452 }}>


        {/* ── Session expired notice ── */}
        {logoutReason === 'expired' && (
          <div style={{
            background: 'var(--warning-dim)',
            border: '1px solid rgba(245,166,35,0.35)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex', gap: 10,
            fontSize: 13, color: 'var(--warning)', lineHeight: 1.5,
          }}>
            <span style={{ fontSize: 16 }}>⏱</span>
            <div><strong>Your session expired due to inactivity.</strong><br />Sign in again to continue. Your data is safe.</div>
          </div>
        )}
        {/* ── Brand header ── */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 62, height: 62,
            background: 'linear-gradient(135deg, #4f8ef7 0%, #7b5ea7 100%)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 4px 28px rgba(79,142,247,0.38), 0 0 0 1px rgba(79,142,247,0.15)',
          }}>
            <LogoIcon />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30, fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.8px',
            lineHeight: 1,
            marginBottom: 10,
          }}>
            ShopKeeper
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 14,
            lineHeight: 1.55,
          }}>
            Smart inventory &amp; sales management<br />
            for Nigerian traders
          </p>
        </div>

        {/* ── Auth card ── */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius)',
          padding: '28px 28px 24px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        }}>

          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 4,
            marginBottom: 28,
            gap: 4,
          }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '9px 0',
                  border: 'none', borderRadius: 7,
                  fontFamily: 'var(--font-display)',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                  boxShadow: mode === m ? '0 1px 8px rgba(79,142,247,0.32)' : 'none',
                  letterSpacing: '-0.1px',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* ── Login ── */}
          {mode === 'login' && (
            <div className="gap-16">
              <Field
                label="Email Address"
                value={email} onChange={setEmail}
                type="email" placeholder="you@example.com"
                icon={<Mail size={14} />} autoFocus
              />
              <Field
                label="Password"
                value={password} onChange={setPassword}
                type="password" placeholder="••••••••"
                icon={<Lock size={14} />}
              />

              {error && <div className="alert-banner error">{error}</div>}

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 4 }}
                onClick={handleLogin}
                disabled={busy}
              >
                {busy
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />&nbsp;Signing in…</>
                  : 'Sign In'}
              </button>
            </div>
          )}

          {/* ── Register ── */}
          {mode === 'register' && (
            <div className="gap-16">
              <FormSection icon={<User size={11} />} label="Your Account">
                <Field label="Full Name" value={fullName} onChange={setFullName}
                  placeholder="Adebayo Okafor" icon={<User size={14} />} autoFocus />
                <Field label="Email Address" value={email} onChange={setEmail}
                  type="email" placeholder="you@example.com" icon={<Mail size={14} />} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Password" value={password} onChange={setPassword}
                    type="password" placeholder="Min 6 chars" icon={<Lock size={14} />} />
                  <Field label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword}
                    type="password" placeholder="Repeat" icon={<Lock size={14} />} />
                </div>
              </FormSection>

              <FormSection icon={<Store size={11} />} label="Your Shop">
                <Field label="Shop Name" value={shopName} onChange={setShopName}
                  placeholder="e.g. Ade's Provisions Store" icon={<Store size={14} />} />
                <Field label="Owner / Business Name" value={ownerName} onChange={setOwnerName}
                  placeholder="Legal or trading name" icon={<User size={14} />} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="City" value={city} onChange={setCity} required={false}
                    placeholder="Lagos, Abuja…" icon={<MapPin size={14} />} />
                  <Field label="Phone" value={phone} onChange={setPhone}
                    type="tel" required={false} placeholder="080…" icon={<Phone size={14} />} />
                </div>
              </FormSection>

              {error && <div className="alert-banner error">{error}</div>}

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 14 }}
                onClick={handleRegister}
                disabled={busy}
              >
                {busy
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />&nbsp;Creating account…</>
                  : 'Create Account & Shop'}
              </button>
            </div>
          )}
        </div>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
          marginTop: 22,
          lineHeight: 1.7,
        }}>
          Your data is fully private- Each shop owner sees only their own inventory.
        </p>
      </div>
    </div>
  )
}
