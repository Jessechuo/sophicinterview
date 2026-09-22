import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './authContext'

export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate replace state={{ from: location.pathname + location.search }} to="/login" />
  return <Outlet />
}

export function RequireAdmin() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <Navigate replace to="/forbidden" />
}
