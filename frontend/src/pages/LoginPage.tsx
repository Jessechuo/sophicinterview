import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { toAppError } from '../api/errors'
import { useAuth } from '../auth/authContext'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useToast } from '../components/toastContext'

interface Banner {
  tone: 'error' | 'info'
  message: string
}

const inputClass =
  'w-full h-10 pl-9 rounded-lg bg-surface-container-low text-on-surface font-body-default text-table-cell placeholder-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all duration-150'

export function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState<Banner | null>(
    params.get('expired') ? { tone: 'info', message: 'Your session has expired. Please sign in again.' } : null,
  )
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBanner(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password, remember)
      navigate(from, { replace: true })
    } catch (error) {
      setBanner({ tone: 'error', message: toAppError(error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#f5f7fa] min-h-screen flex items-center justify-center p-gutter-lg">
      <main className="w-full max-w-md">
        <div className="flex flex-col w-full items-center justify-center relative">
          <div className="absolute -top-32 -left-20 w-80 h-80 rounded-full bg-secondary-container opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-primary-fixed opacity-30 blur-3xl pointer-events-none" />
          <div className="relative w-full max-w-[420px] bg-surface-container-lowest rounded-xl p-space-xl shadow-xl flex flex-col">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center p-1.5 shadow-sm">
                <Logo className="w-full h-full rounded-lg" />
              </div>
              <h1 className="font-page-title text-page-title text-on-surface mt-space-md tracking-tight font-semibold">IT Asset Manager</h1>
              <p className="font-body-default text-caption text-secondary mt-space-xs">Sign in to manage company IT assets</p>
            </div>

            {banner && (
              <div
                className={`mt-space-lg flex items-center gap-space-sm p-space-sm rounded-lg shadow-sm transition-all duration-200 ${
                  banner.tone === 'error' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
                }`}
                role="alert"
              >
                <Icon name={banner.tone === 'error' ? 'error' : 'info'} className={`text-[18px] ${banner.tone === 'error' ? 'text-error' : 'text-primary'}`} />
                <span className="font-caption text-caption font-medium">{banner.message}</span>
                <button
                  aria-label="Dismiss"
                  className="ml-auto hover:opacity-75 focus:outline-none flex items-center"
                  onClick={() => setBanner(null)}
                  type="button"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </div>
            )}

            <form className="mt-space-md flex flex-col gap-space-md" onSubmit={onSubmit}>
              <div className="flex flex-col gap-space-xs">
                <label className="font-body-medium text-caption text-on-surface-variant flex items-center gap-1" htmlFor="username">
                  <span>Username</span>
                  <span className="text-error text-caption">*</span>
                </label>
                <div className="relative flex items-center">
                  <Icon name="person" className="absolute left-3 text-secondary text-[18px] pointer-events-none" />
                  <input
                    autoComplete="username"
                    autoFocus
                    className={`${inputClass} pr-3`}
                    id="username"
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    type="text"
                    value={username}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-body-medium text-caption text-on-surface-variant flex items-center gap-1" htmlFor="password">
                  <span>Password</span>
                  <span className="text-error text-caption">*</span>
                </label>
                <div className="relative flex items-center">
                  <Icon name="lock" className="absolute left-3 text-secondary text-[18px] pointer-events-none" />
                  <input
                    autoComplete="current-password"
                    className={`${inputClass} pr-10`}
                    id="password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 flex items-center justify-center text-secondary hover:text-on-surface focus:outline-none"
                    onClick={() => setShowPassword((s) => !s)}
                    type="button"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    checked={remember}
                    className="w-4 h-4 rounded text-primary bg-surface-container-low accent-primary cursor-pointer focus:ring-primary"
                    onChange={(e) => setRemember(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="font-body-default text-caption text-on-surface-variant">Remember me</span>
                </label>
                <button
                  className="font-body-medium text-caption text-primary hover:text-primary-container transition-colors"
                  onClick={() => toast.info('Password resets are handled by your IT administrator — please contact them.')}
                  type="button"
                >
                  Forgot password?
                </button>
              </div>
              <button
                className="w-full h-10 mt-space-xs rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-medium text-body-medium shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                disabled={submitting}
                type="submit"
              >
                <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
                <Icon name="arrow_forward" className="text-[18px]" />
              </button>
            </form>

            <div className="mt-space-lg p-space-sm rounded-lg bg-surface-container-low flex items-center justify-center text-center">
              <p className="font-body-default text-caption text-secondary">
                Demo accounts: <span className="font-body-medium text-on-surface font-semibold">admin</span> / Admin@123 ·{' '}
                <span className="font-body-medium text-on-surface font-semibold">user</span> / User@123
              </p>
            </div>
          </div>
          <div className="mt-space-lg text-center">
            <p className="font-body-default text-caption text-secondary">© 2026 Enterprise IT Systems. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
