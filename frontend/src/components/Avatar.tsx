import { initials } from '../lib/format'

// Colour pairs used for initials avatars across the Stitch screens; picked deterministically per user.
const PALETTE = [
  'bg-primary-fixed text-on-primary-fixed',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-surface-variant text-on-surface',
  'bg-secondary-container text-primary',
  'bg-primary-fixed-dim text-on-primary-fixed',
]

const SIZES = {
  xs: 'w-6 h-6 font-caption text-caption',
  sm: 'w-7 h-7 font-tag-label text-tag-label',
  md: 'w-8 h-8 font-caption text-caption',
  lg: 'w-12 h-12 font-body-medium text-body-medium',
}

interface AvatarProps {
  id: number
  name: string
  size?: keyof typeof SIZES
  className?: string
}

export function Avatar({ id, name, size = 'xs', className = '' }: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={`${SIZES[size]} ${PALETTE[id % PALETTE.length]} rounded-full flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      {initials(name)}
    </div>
  )
}
