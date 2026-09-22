import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { ToastContext, type ToastApi } from './toastContext'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

// Styled after the new-asset screen's "Asset created successfully" toast.
const STYLE: Record<ToastKind, { box: string; icon: string; iconClass: string; text: string }> = {
  success: { box: 'bg-[#f6ffed] border-[#b7eb8f]', icon: 'check_circle', iconClass: 'text-[#52c41a]', text: 'text-[#389e0d]' },
  error: { box: 'bg-[#fff2f0] border-[#ffccc7]', icon: 'error', iconClass: 'text-[#ff4d4f]', text: 'text-[#cf1322]' },
  info: { box: 'bg-[#e6f4ff] border-[#91caff]', icon: 'info', iconClass: 'text-[#1677ff]', text: 'text-[#0958d9]' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((all) => [...all.slice(-2), { id, kind, message }])
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => {
          const s = STYLE[t.kind]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-md border shadow-md transition-all duration-300 ${s.box}`}
              role={t.kind === 'error' ? 'alert' : 'status'}
            >
              <Icon name={s.icon} filled className={`text-[18px] ${s.iconClass}`} />
              <span className={`font-body-medium text-body-medium font-medium ${s.text}`}>{t.message}</span>
              <button
                aria-label="Dismiss"
                className="ml-2 text-[#8c8c8c] hover:text-[#262626] transition-colors"
                onClick={() => dismiss(t.id)}
                type="button"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
