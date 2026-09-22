import { Navigate, Route, Routes } from 'react-router'
import { RequireAdmin, RequireAuth } from './auth/guards'
import { useAuth } from './auth/authContext'
import { AppShell } from './components/AppShell'
import { ActivityLogPage } from './pages/ActivityLogPage'
import { AssetDetailsPage } from './pages/assets/AssetDetailsPage'
import { AssetFormPage } from './pages/assets/AssetFormPage'
import { AssetListPage } from './pages/assets/AssetListPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForbiddenPage, NotFoundPage } from './pages/ErrorPages'
import { LoginPage } from './pages/LoginPage'
import { NewTicketPage } from './pages/tickets/NewTicketPage'
import { TicketDetailsPage } from './pages/tickets/TicketDetailsPage'
import { TicketsPage } from './pages/tickets/TicketsPage'
import { UsersPage } from './pages/users/UsersPage'

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
          <Route element={<TicketsPage />} path="tickets" />
          <Route element={<NewTicketPage />} path="tickets/new" />
          <Route element={<TicketDetailsPage />} path="tickets/:id" />
          <Route element={<RequireAdmin />}>
            <Route element={<AssetFormPage />} path="assets/new" />
            <Route element={<AssetFormPage key="edit" />} path="assets/:id/edit" />
            <Route element={<ActivityLogPage />} path="activity" />
            <Route element={<UsersPage />} path="users" />
          </Route>
          <Route element={<ForbiddenPage />} path="forbidden" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Route>
    </Routes>
  )
}
