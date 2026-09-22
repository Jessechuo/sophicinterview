import { Icon } from './Icon'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-space-sm py-space-xl text-on-surface-variant font-body-default text-body-default" role="status">
      <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-center" role="alert">
      <span className="w-10 h-10 rounded-xl bg-error-container/60 text-error flex items-center justify-center">
        <Icon name="error" className="text-[22px]" />
      </span>
      <p className="font-body-medium text-body-medium text-on-surface">{message}</p>
      {onRetry && (
        <button
          className="h-8 px-space-md rounded-lg bg-surface hover:bg-surface-container text-on-surface font-body-medium text-body-medium flex items-center gap-1.5 transition-colors"
          onClick={onRetry}
          type="button"
        >
          <Icon name="refresh" className="text-[18px]" />
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = 'inbox', message }: { icon?: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-center text-on-surface-variant">
      <span className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
        <Icon name={icon} className="text-[22px]" />
      </span>
      <p className="font-body-default text-body-default">{message}</p>
    </div>
  )
}
