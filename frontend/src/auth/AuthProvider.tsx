import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { onUnauthorized, setAuthToken } from '../api/client'
import { authApi } from '../api/endpoints'
import type { CurrentUser } from '../api/types'
import { AuthContext, type AuthApi } from './authContext'

const STORAGE_KEY = 'itam.session'
// setTimeout overflows above ~24.8 days; tokens live 8 hours so this only guards bad data.
const MAX_TIMEOUT = 2_147_000_000

interface Session {
  token: string
  expiresAt: string
  user: CurrentUser
}

const storages = () => [localStorage, sessionStorage]

function readSession(): Session | null {
  for (const storage of storages()) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) continue
      const session = JSON.parse(raw) as Session
      if (new Date(session.expiresAt).getTime() > Date.now()) return session
      storage.removeItem(STORAGE_KEY)
    } catch {
      // Unreadable or blocked storage: behave as signed out.
    }
  }
  return null
}

function clearSession() {
  for (const storage of storages()) {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clear.
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(() => {
    const restored = readSession()
    setAuthToken(restored?.token ?? null)
    return restored
  })

  const endSession = useCallback(
    (expired: boolean) => {
      clearSession()
      setAuthToken(null)
      setSession(null)
      queryClient.clear()
      navigate(expired ? '/login?expired=1' : '/login', { replace: true })
    },
    [navigate, queryClient],
  )

  useEffect(() => {
    onUnauthorized(() => endSession(true))
    return () => onUnauthorized(null)
  }, [endSession])

  // Sign out when the token lifetime ends, even if no request has failed yet.
  useEffect(() => {
    if (!session) return
    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    const timer = setTimeout(() => endSession(true), Math.max(0, Math.min(remaining, MAX_TIMEOUT)))
    return () => clearTimeout(timer)
  }, [session, endSession])

  const login = useCallback(
    async (username: string, password: string, remember: boolean) => {
      const response = await authApi.login(username, password)
      const next: Session = { token: response.token, expiresAt: response.expiresAt, user: response.user }
      clearSession()
      try {
        // "Remember me" keeps the session across browser restarts; otherwise it ends with the tab.
        ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage unavailable: the session still works for this page load.
      }
      setAuthToken(next.token)
      queryClient.clear()
      setSession(next)
    },
    [queryClient],
  )

  const value = useMemo<AuthApi>(
    () => ({
      user: session?.user ?? null,
      isAdmin: session?.user.role === 'Admin',
      login,
      logout: () => endSession(false),
    }),
    [session, login, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
