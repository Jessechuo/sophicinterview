import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

interface Option<T extends string> {
  value: T
  label: string
}

interface FilterDropdownProps<T extends string> {
  label: string
  value: T | ''
  options: Option<T>[]
  onChange: (value: T | '') => void
  allLabel?: string
}

// "Status: All ▾" pill from the assets filter bar, with an options panel like the assign dropdown.
export function FilterDropdown<T extends string>({ label, value, options, onChange, allLabel = 'All' }: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const current = options.find((o) => o.value === value)?.label ?? allLabel
  const all: Option<T | ''>[] = [{ value: '', label: allLabel }, ...options]

  return (
    <div ref={ref} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-8 px-space-sm rounded-lg bg-surface hover:bg-surface-container text-on-surface font-caption text-caption flex items-center gap-space-xs transition-colors"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="text-on-surface-variant font-medium">{label}:</span>
        <span className="font-body-medium">{current}</span>
        <Icon name="expand_more" className="text-[16px] text-outline" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-[180px] bg-surface-container-lowest rounded-lg shadow-xl py-1 z-30 flex flex-col" role="listbox">
          {all.map((o) => (
            <button
              key={o.value || 'all'}
              aria-selected={o.value === value}
              className={`px-3 py-2 flex items-center justify-between gap-4 text-left font-caption text-caption transition-colors ${
                o.value === value ? 'bg-secondary-container/40 text-on-surface font-medium' : 'text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              role="option"
              type="button"
            >
              <span>{o.label}</span>
              {o.value === value && <Icon name="check" className="text-[16px] text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
