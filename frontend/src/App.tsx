import { Navigate, Route, Routes } from 'react-router'
import { RequireAdmin, RequireAuth } from './auth/guards'
import { useAuth } from './auth/authContext'
import { AppShell } from './components/AppShell'
import { LoadingState } from './components/States'
import { AssetDetailsPage } from './pages/assets/AssetDetailsPage'
import { AssetFormPage } from './pages/assets/AssetFormPage'
import { AssetListPage } from './pages/assets/AssetListPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForbiddenPage, NotFoundPage } from './pages/ErrorPages'
import { LoginPage } from './pages/LoginPage'
import { UsersPage } from './pages/users/UsersPage'

// Temporary stand-in until each screen is ported.
function Pending() {
  return <LoadingState label="Screen coming soon…" />
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route element={user ? <Navigate replace to="/" /> : <LoginPage />} path="/login" />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route element={<DashboardPage />} index />
          <Route element={<AssetListPage />} path="assets" />
          <Route element={<AssetDetailsPage />} path="assets/:id" />
          <Route element={<Pending />} path="tickets" />
          <Route element={<Pending />} path="tickets/new" />
          <Route element={<Pending />} path="tickets/:id" />
          <Route element={<RequireAdmin />}>
            <Route element={<AssetFormPage />} path="assets/new" />
            <Route element={<AssetFormPage key="edit" />} path="assets/:id/edit" />
            <Route element={<Pending />} path="activity" />
            <Route element={<UsersPage />} path="users" />
          </Route>
          <Route element={<ForbiddenPage />} path="forbidden" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Route>
    </Routes>
  )
}
