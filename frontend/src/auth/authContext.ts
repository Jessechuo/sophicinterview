import { createContext, useContext } from 'react'
import type { CurrentUser } from '../api/types'

export interface AuthApi {
  user: CurrentUser | null
  isAdmin: boolean
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
