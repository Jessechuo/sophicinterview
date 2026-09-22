import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface FieldProps {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  hint?: ReactNode
  optional?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, required, error, hint, optional, children, className = '' }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="font-body-medium text-body-medium text-on-surface flex items-center gap-1" htmlFor={htmlFor}>
        {required && <span className="text-error font-medium">*</span>}
        <span>{label}</span>
        {optional && <span className="font-caption text-caption text-secondary">(Optional)</span>}
      </label>
      {children}
      {error ? <FieldError id={`${htmlFor}-error`} message={error} /> : hint}
    </div>
  )
}

export function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <div className="flex items-center gap-1.5 text-error font-caption text-caption mt-0.5" id={id}>
      <Icon name="error" className="text-[14px]" />
      <span>{message}</span>
    </div>
  )
}

// Right-aligned icon inside an input (select caret, calendar, building...).
export function InputIcon({ name, tone = 'text-outline' }: { name: string; tone?: string }) {
  return <Icon name={name} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${tone} pointer-events-none text-[18px]`} />
}
