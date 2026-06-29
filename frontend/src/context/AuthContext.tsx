import {
  createContext, useContext, useState, useEffect, useRef,
  useCallback, ReactNode,
} from 'react'
import {
  getMe, login as apiLogin, register as apiRegister,
  logoutApi, tokenStore, type UserInfo,
} from '../api'

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000
const TOKEN_REFRESH_MS      = 50 * 60 * 1000
const INACTIVITY_WARNING_MS = 55 * 60 * 1000

interface AuthContextType {
  user:           UserInfo | null
  loading:        boolean
  sessionWarning: boolean
  logoutReason:   'user' | 'expired' | null
  login:          (email: string, password: string) => Promise<void>
  register:       (data: RegisterData) => Promise<void>
  logout:         (reason?: 'user' | 'expired') => Promise<void>
  resetActivity:  () => void
}

interface RegisterData {
  email: string; password: string; full_name: string
  shop_name: string; owner_name: string; city?: string; phone?: string
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,           setUser]           = useState<UserInfo | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [sessionWarning, setSessionWarning] = useState(false)
  const [logoutReason,   setLogoutReason]   = useState<'user' | 'expired' | null>(null)

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTimer    = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (warningTimer.current)    clearTimeout(warningTimer.current)
    if (refreshTimer.current)    clearInterval(refreshTimer.current)
  }, [])

  const logout = useCallback(async (reason: 'user' | 'expired' = 'user') => {
    clearTimers()
    setSessionWarning(false)
    setLogoutReason(reason)
    await logoutApi()
    tokenStore.clearAll()
    setUser(null)
  }, [clearTimers])

  const startRefreshTimer = useCallback(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current)
    refreshTimer.current = setInterval(async () => {
      const refresh = tokenStore.getRefresh()
      if (!refresh) return
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        })
        if (res.ok) {
          const data = await res.json()
          tokenStore.setTokens(data.access_token, data.refresh_token)
        } else {
          logout('expired')
        }
      } catch { /* offline — don't force logout */ }
    }, TOKEN_REFRESH_MS)
  }, [logout])

  const resetActivity = useCallback(() => {
    if (!tokenStore.getRefresh()) return
    setSessionWarning(false)

    if (warningTimer.current) clearTimeout(warningTimer.current)
    warningTimer.current = setTimeout(() => setSessionWarning(true), INACTIVITY_WARNING_MS)

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(() => logout('expired'), INACTIVITY_TIMEOUT_MS)
  }, [logout])

  useEffect(() => {
    if (!user) return
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    const handler = () => resetActivity()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetActivity()
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [user, resetActivity])

  useEffect(() => {
    const handler = () => logout('expired')
    window.addEventListener('sk:session-expired', handler)
    return () => window.removeEventListener('sk:session-expired', handler)
  }, [logout])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'sk_refresh' && e.newValue === null && user) {
        clearTimers(); setUser(null)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [user, clearTimers])

  useEffect(() => {
    const refresh = tokenStore.getRefresh()
    if (!refresh) { setLoading(false); return }
    fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
      .then(async res => {
        if (!res.ok) throw new Error()
        const data = await res.json()
        tokenStore.setTokens(data.access_token, data.refresh_token)
        return getMe()
      })
      .then(me => { setUser(me); startRefreshTimer() })
      .catch(() => tokenStore.clearAll())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    tokenStore.setTokens(res.access_token, res.refresh_token)
    setUser(res.user)
    setLogoutReason(null)
    startRefreshTimer()
  }

  const register = async (data: RegisterData) => {
    const res = await apiRegister(data)
    tokenStore.setTokens(res.access_token, res.refresh_token)
    setUser(res.user)
    setLogoutReason(null)
    startRefreshTimer()
  }

  return (
    <AuthContext.Provider value={{
      user, loading, sessionWarning, logoutReason,
      login, register,
      logout: (r) => logout(r),
      resetActivity,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
