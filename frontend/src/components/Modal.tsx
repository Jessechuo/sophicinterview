import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface ModalProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  icon?: string
  widthClass?: string
}

// Backdrop + dialog ported from the assign / edit-user modals.
export function Modal({ title, onClose, children, footer, icon, widthClass = 'w-[480px]' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-opacity"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        aria-modal="true"
        className={`${widthClass} max-w-[92vw] max-h-[92vh] bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col`}
        role="dialog"
      >
        <div className="flex items-center justify-between px-space-lg py-space-md bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            {icon && (
              <span className="w-7 h-7 rounded-full bg-secondary-container text-primary flex items-center justify-center">
                <Icon name={icon} className="text-[18px]" />
              </span>
            )}
            <h3 className="font-card-title text-card-title text-on-surface font-semibold">{title}</h3>
          </div>
          <button
            aria-label="Close"
            className="text-secondary hover:text-on-surface transition-colors w-7 h-7 flex items-center justify-center rounded"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>
        <div className="p-space-lg flex flex-col gap-space-md overflow-y-auto">{children}</div>
        <div className="bg-surface-container-low/60 px-space-lg py-space-sm flex justify-end items-center gap-space-sm">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  )
}
