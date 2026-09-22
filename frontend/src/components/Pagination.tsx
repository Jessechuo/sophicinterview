import { Icon } from './Icon'

// Four footers appear in the designs: "soft" (assets), "plain" (tickets), "outlined" (activity log), "compact" (users).
type Variant = 'soft' | 'plain' | 'outlined' | 'compact'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  noun: string
  onChange: (page: number) => void
  variant?: Variant
  // When given, a "10 / page" selector is shown after the page buttons.
  onPageSizeChange?: (size: number) => void
}

const PAGE_SIZES = [10, 20, 50]

const STYLES: Record<Variant, {
  bar: string; text: string; strong: string; nav: string; icon: string
  step: string; stepDisabled: string; active: string; idle: string
}> = {
  soft: {
    bar: 'flex flex-col sm:flex-row items-center justify-between gap-space-sm px-space-md py-3 bg-surface-container-lowest',
    text: 'font-caption text-caption text-on-surface-variant',
    strong: 'font-medium text-on-surface',
    nav: 'flex items-center gap-1.5 select-none',
    icon: 'text-[16px]',
    step: 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-container text-on-surface transition-colors',
    stepDisabled: 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface text-outline opacity-50 cursor-not-allowed transition-colors',
    active: 'w-8 h-8 flex items-center justify-center rounded-lg bg-primary-container text-on-primary-container font-body-medium text-body-medium font-semibold shadow-xs',
    idle: 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-container text-on-surface font-body-medium text-body-medium transition-colors',
  },
  plain: {
    bar: 'py-space-md px-space-md bg-surface-container-lowest flex items-center justify-between flex-wrap gap-space-md',
    text: 'font-body-default text-body-default text-secondary',
    strong: 'font-body-medium text-on-surface',
    nav: 'flex items-center gap-1',
    icon: 'text-[18px]',
    step: 'w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors',
    stepDisabled: 'w-8 h-8 rounded-lg flex items-center justify-center text-outline opacity-40 cursor-not-allowed',
    active: 'w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-on-primary font-body-medium text-body-medium shadow-xs',
    idle: 'w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container-low font-body-medium text-body-medium transition-colors',
  },
  outlined: {
    bar: 'px-gutter-lg py-space-md border-t border-surface-variant bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-md select-none',
    text: 'font-body-default text-body-default text-on-surface-variant order-2 sm:order-1',
    strong: '',
    nav: 'flex items-center gap-1.5 order-1 sm:order-2',
    icon: 'text-[18px]',
    step: 'w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors',
    stepDisabled: 'w-8 h-8 flex items-center justify-center rounded border border-outline-variant/50 text-outline-variant cursor-not-allowed transition-colors',
    active: 'w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-body-medium text-body-medium font-semibold shadow-xs',
    idle: 'w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface font-body-default text-body-default hover:border-primary hover:text-primary transition-colors',
  },
  compact: {
    bar: 'px-space-md py-space-sm bg-[#fafafa] flex flex-col sm:flex-row items-center justify-between gap-space-sm',
    text: 'font-caption text-caption text-on-surface-variant',
    strong: 'font-medium text-on-surface',
    nav: 'flex items-center gap-1',
    icon: 'text-[16px]',
    step: 'w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface-variant hover:text-primary shadow-xs transition-colors',
    stepDisabled: 'w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface-variant/40 cursor-not-allowed shadow-xs',
    active: 'w-7 h-7 flex items-center justify-center rounded bg-primary text-on-primary font-caption text-caption font-semibold shadow-xs',
    idle: 'w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface font-caption text-caption hover:text-primary shadow-xs transition-colors',
  },
}

// 1 2 3 … 13 style window: first, last, and the neighbours of the current page.
function pageWindow(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  if (page <= 3) [2, 3, 4].forEach((p) => wanted.add(p))
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((p) => wanted.add(p))
  const sorted = [...wanted].sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('gap')
    result.push(p)
  })
  return result
}

export function Pagination({ page, pageSize, total, noun, onChange, variant = 'soft', onPageSizeChange }: PaginationProps) {
  const s = STYLES[variant]
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const range = total === 0 ? '0' : `${from}–${to}`

  return (
    <div className={s.bar}>
      <div className={s.text}>
        Showing <span className={s.strong}>{range}</span> of <span className={s.strong}>{total}</span> {noun}
      </div>
      <div className={s.nav}>
        <button
          aria-label="Previous page"
          className={page <= 1 ? s.stepDisabled : s.step}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          type="button"
        >
          <Icon name="chevron_left" className={s.icon} />
        </button>
        {pageWindow(page, pages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="w-6 text-center text-outline-variant font-mono">•••</span>
          ) : (
            <button
              key={p}
              aria-current={p === page ? 'page' : undefined}
              className={p === page ? s.active : s.idle}
              onClick={() => onChange(p)}
              type="button"
            >
              {p}
            </button>
          ),
        )}
        <button
          aria-label="Next page"
          className={page >= pages ? s.stepDisabled : s.step}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          type="button"
        >
          <Icon name="chevron_right" className={s.icon} />
        </button>
        {onPageSizeChange && (
          <div className="relative ml-space-sm">
            <select
              aria-label="Rows per page"
              className="appearance-none h-7 pl-2 pr-6 bg-surface-container-lowest text-on-surface font-caption text-caption rounded shadow-xs focus:outline-none cursor-pointer"
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              value={pageSize}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
            <Icon name="expand_more" className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[14px]" />
          </div>
        )}
      </div>
    </div>
  )
}
