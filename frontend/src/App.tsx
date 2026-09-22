import { Navigate, Route, Routes } from 'react-router'
import { RequireAdmin, RequireAuth } from './auth/guards'
import { useAuth } from './auth/authContext'
import { AppShell } from './components/AppShell'
import { LoadingState } from './components/States'
import { ForbiddenPage, NotFoundPage } from './pages/ErrorPages'

// Temporary stand-in until each screen is ported.
function Pending() {
  return <LoadingState label="Screen coming soon…" />
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route element={user ? <Navigate replace to="/" /> : <Pending />} path="/login" />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route element={<Pending />} index />
          <Route element={<Pending />} path="assets" />
          <Route element={<Pending />} path="assets/:id" />
          <Route element={<Pending />} path="tickets" />
          <Route element={<Pending />} path="tickets/new" />
          <Route element={<Pending />} path="tickets/:id" />
          <Route element={<RequireAdmin />}>
            <Route element={<Pending />} path="assets/new" />
            <Route element={<Pending />} path="assets/:id/edit" />
            <Route element={<Pending />} path="activity" />
            <Route element={<Pending />} path="users" />
          </Route>
          <Route element={<ForbiddenPage />} path="forbidden" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Route>
    </Routes>
  )
}
