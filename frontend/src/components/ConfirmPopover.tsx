import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface ConfirmPopoverProps {
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  // Renders the trigger; `open` lets it show its pressed state like the design's highlighted delete button.
  children: (props: { open: boolean; toggle: (event: MouseEvent<HTMLElement>) => void }) => ReactNode
}

const WIDTH = 256

// Ant-style popconfirm from the assets screen, rendered in a portal so table overflow never clips it.
export function ConfirmPopover({ message, confirmLabel = 'Delete', onConfirm, children }: ConfirmPopoverProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const open = rect !== null

  const toggle = (event: MouseEvent<HTMLElement>) => setRect(open ? null : event.currentTarget.getBoundingClientRect())

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.type === 'mousedown' && (popRef.current?.contains(e.target as Node) || anchorRef.current?.contains(e.target as Node))) return
      setRect(null)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const below = rect !== null && rect.top < 140
  const style = rect && {
    left: Math.max(8, rect.right - WIDTH),
    top: below ? rect.bottom + 8 : rect.top - 8,
    transform: below ? undefined : 'translateY(-100%)',
    width: WIDTH,
  }

  return (
    <span ref={anchorRef} className="relative inline-block">
      {children({ open, toggle })}
      {style &&
        createPortal(
          <div ref={popRef} className="fixed p-3 bg-surface-container-lowest rounded-lg shadow-xl text-left z-50" role="alertdialog" style={style}>
            <div className="flex items-start gap-2 mb-2.5">
              <Icon name="warning" className="text-amber-500 text-[18px] shrink-0 mt-0.5" />
              <p className="font-caption text-caption font-medium text-on-surface leading-tight">{message}</p>
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                className="h-6 px-2.5 rounded bg-surface-container hover:bg-surface-variant text-on-surface font-caption text-caption font-medium transition-colors"
                onClick={() => setRect(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-6 px-2.5 rounded bg-error hover:opacity-90 text-on-error font-caption text-caption font-medium transition-opacity shadow-xs"
                onClick={() => {
                  setRect(null)
                  onConfirm()
                }}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>
            <div className={`absolute ${below ? '-top-1' : '-bottom-1'} right-3 w-2.5 h-2.5 bg-surface-container-lowest rotate-45`} />
          </div>,
          document.body,
        )}
    </span>
  )
}
