import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getMe, login as apiLogin, register as apiRegister, type UserInfo } from '../api'

interface AuthContextType {
  user: UserInfo | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

interface RegisterData {
  email: string; password: string; full_name: string
  shop_name: string; owner_name: string; city?: string; phone?: string
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('sk_token')
    if (!token) { setLoading(false); return }
    getMe()
      .then(me => setUser(me))
      .catch(() => localStorage.removeItem('sk_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    localStorage.setItem('sk_token', res.access_token)
    setUser(res.user)
  }

  const register = async (data: RegisterData) => {
    const res = await apiRegister(data)
    localStorage.setItem('sk_token', res.access_token)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem('sk_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
