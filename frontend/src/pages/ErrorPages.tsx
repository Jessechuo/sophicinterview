import { Link } from 'react-router'
import { Icon } from '../components/Icon'

function ErrorPage({ code, icon, title, message }: { code: string; icon: string; title: string; message: string }) {
  return (
    <div className="flex items-center justify-center py-space-xl">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col items-center text-center gap-space-sm">
        <span className="w-12 h-12 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center">
          <Icon name={icon} className="text-[26px]" />
        </span>
        <span className="font-caption text-caption uppercase tracking-wider text-on-surface-variant font-medium">Error {code}</span>
        <h1 className="font-page-title text-page-title text-on-surface tracking-tight">{title}</h1>
        <p className="font-body-default text-body-default text-on-surface-variant">{message}</p>
        <Link
          className="mt-space-sm h-9 px-space-md rounded-lg bg-primary text-on-primary hover:bg-primary-container font-body-medium text-body-medium flex items-center gap-1.5 shadow-sm transition-colors"
          to="/"
        >
          <Icon name="dashboard" className="text-[18px]" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      icon="lock"
      message="This area is only available to administrators. Ask an IT admin if you need access."
      title="You don't have access"
    />
  )
}

export function NotFoundPage() {
  return <ErrorPage code="404" icon="search_off" message="The page you're looking for doesn't exist or has moved." title="Page not found" />
}
