import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { assetsApi, dashboardApi } from '../api/endpoints'
import { toAppError } from '../api/errors'
import { ASSET_CATEGORIES, type AssetCategory, type AssetStatus, type DashboardSummary } from '../api/types'
import { Icon } from '../components/Icon'
import { ErrorState, LoadingState } from '../components/States'
import { useToast } from '../components/toastContext'
import { formatPercent } from '../lib/format'
import { categoryDashboard, categoryLabel } from '../lib/labels'

const CIRCUMFERENCE = 2 * Math.PI * 70

const STATUS_BARS: { status: AssetStatus; label: string; legend: string; bar: string; text: string }[] = [
  { status: 'InService', label: 'In Service', legend: 'Healthy', bar: 'bg-tertiary', text: 'text-tertiary' },
  { status: 'NeedsRepair', label: 'Needs Repair', legend: 'Critical', bar: 'bg-error', text: 'text-error' },
  { status: 'UnderMaintenance', label: 'Maintenance', legend: 'Servicing', bar: 'bg-secondary', text: 'text-secondary' },
  { status: 'Retired', label: 'Retired', legend: 'Archived', bar: 'bg-surface-dim', text: 'text-outline' },
]

const countOf = (list: DashboardSummary['byStatus'], key: string) => list.find((c) => c.key === key)?.count ?? 0

export function DashboardPage() {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const [hideEmpty, setHideEmpty] = useState(false)
  const [sortByCount, setSortByCount] = useState(false)
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary })

  async function exportReport() {
    setExporting(true)
    try {
      await assetsApi.export({})
      toast.success('Asset report downloaded')
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setExporting(false)
    }
  }

  if (isPending) return <LoadingState label="Loading dashboard…" />
  if (isError) return <ErrorState message={toAppError(error).message} onRetry={() => refetch()} />

  const { total, assigned, unassigned, needsAttention, addedLast30Days, byStatus, byCategory } = data
  const repairs = countOf(byStatus, 'NeedsRepair')
  const servicing = countOf(byStatus, 'UnderMaintenance')
  const retired = countOf(byStatus, 'Retired')
  const available = Math.max(0, unassigned - retired)
  const assignedShare = total === 0 ? 0 : assigned / total

  let categories = ASSET_CATEGORIES.map((category) => ({ category, count: countOf(byCategory, category) }))
  if (hideEmpty) categories = categories.filter((c) => c.count > 0)
  if (sortByCount) categories = [...categories].sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div className="flex flex-col">
          <h1 className="font-page-title text-page-title text-on-surface tracking-tight">Dashboard</h1>
          <p className="font-body-default text-body-default text-on-surface-variant">Overview of organization hardware, assignments, and health status</p>
        </div>
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <span
            className="bg-surface-container-lowest text-on-surface-variant px-gutter py-1.5 rounded-lg shadow-sm flex items-center gap-space-xs font-body-medium text-body-medium"
            title="The “added” figure covers the past 30 days; all other figures are live totals."
          >
            <Icon name="calendar_today" className="text-[18px]" />
            <span>Past 30 Days</span>
          </span>
          <button
            className="bg-primary text-on-primary hover:bg-surface-tint transition-colors px-gutter py-1.5 rounded-lg shadow-sm flex items-center gap-space-xs font-body-medium text-body-medium disabled:opacity-70"
            disabled={exporting}
            onClick={exportReport}
            type="button"
          >
            <Icon name="file_download" className="text-[18px]" />
            <span>{exporting ? 'Exporting…' : 'Export Report'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-lg">
        <StatCard icon="devices" iconClass="bg-secondary-container text-primary" label="Total Assets" to="/assets" value={total}>
          <div className="mt-space-md pt-space-sm bg-surface-container-low/50 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl flex items-center gap-space-xs">
            <Icon name="trending_up" className="text-[16px] text-tertiary" />
            <span className="font-caption text-caption text-tertiary font-medium">+{addedLast30Days} added</span>
            <span className="font-caption text-caption text-on-surface-variant">in the last 30 days</span>
          </div>
        </StatCard>
        <StatCard icon="how_to_reg" iconClass="bg-tertiary-fixed-dim/20 text-tertiary" label="Assigned" to="/assets?assigned=true" value={assigned}>
          <div className="mt-space-md pt-space-sm bg-surface-container-low/50 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl flex items-center justify-between">
            <span className="font-caption text-caption text-on-surface-variant">Utilization Rate</span>
            <span className="font-tag-label text-tag-label text-tertiary bg-surface-container-lowest px-space-xs py-0.5 rounded shadow-xs font-semibold">
              {formatPercent(assigned, total)}
            </span>
          </div>
        </StatCard>
        <StatCard icon="inventory_2" iconClass="bg-surface-container-high text-on-surface-variant" label="Unassigned" to="/assets?assigned=false" value={unassigned}>
          <div className="mt-space-md pt-space-sm bg-surface-container-low/50 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="font-caption text-caption text-on-surface-variant">
              {available} ready to deploy{retired > 0 ? ` • ${retired} retired` : ''}
            </span>
          </div>
        </StatCard>
        <StatCard danger icon="warning" iconClass="bg-error-container/60 text-error" label="Needs Attention" to="/assets?needsAttention=true" value={needsAttention}>
          <div className="mt-space-md pt-space-sm bg-error-container/20 -mx-space-md -mb-space-md px-space-md py-space-sm rounded-b-xl flex items-center justify-between">
            <span className="font-caption text-caption text-on-error-container font-medium">{repairs} repairs</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="font-caption text-caption text-on-error-container font-medium">{servicing} in maintenance</span>
          </div>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex flex-col">
              <h2 className="font-card-title text-card-title text-on-surface">Assigned vs Unassigned</h2>
              <span className="font-caption text-caption text-on-surface-variant">Hardware deployment distribution</span>
            </div>
            <Link
              aria-label="Open the asset list"
              className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded hover:bg-surface-container"
              title="Open the asset list"
              to="/assets"
            >
              <Icon name="more_vert" className="text-[18px]" />
            </Link>
          </div>
          <div className="relative flex items-center justify-center my-space-md">
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
              <circle className="text-surface-container" cx="100" cy="100" fill="transparent" r="70" stroke="currentColor" strokeWidth="26" />
              {assigned > 0 && (
                <circle
                  className="text-primary transition-all duration-1000 ease-out"
                  cx="100"
                  cy="100"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeDasharray={CIRCUMFERENCE.toFixed(2)}
                  strokeDashoffset={(CIRCUMFERENCE * (1 - assignedShare)).toFixed(2)}
                  strokeLinecap="round"
                  strokeWidth="26"
                />
              )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="font-caption text-caption uppercase tracking-wider text-on-surface-variant font-medium">Total Estate</span>
              <span className="font-stat-number text-stat-number text-on-surface font-semibold leading-none my-0.5">{total}</span>
              <span className="font-tag-label text-tag-label text-on-surface-variant">Assets</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-space-md pt-space-md bg-surface-container-low/60 rounded-lg p-space-md">
            <DonutLegend count={assigned} dot="bg-primary" label="Assigned" total={total} />
            <DonutLegend count={unassigned} dot="bg-surface-variant" label="Unassigned" total={total} />
          </div>
        </div>

        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex flex-col">
              <h2 className="font-card-title text-card-title text-on-surface">Assets by Status</h2>
              <span className="font-caption text-caption text-on-surface-variant">Operational readiness across all registered equipment</span>
            </div>
            <span className="font-tag-label text-tag-label bg-surface-container text-on-surface-variant px-space-sm py-1 rounded">Live Audit</span>
          </div>
          <div className="relative w-full h-56 flex flex-col justify-end pt-space-lg">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              {[0, 1, 2, 3].map((line) => (
                <div key={line} className="w-full h-px bg-outline-variant/40" />
              ))}
            </div>
            <div className="relative z-10 grid grid-cols-4 gap-gutter h-full items-end pb-2">
              {STATUS_BARS.map((bar) => {
                const count = countOf(byStatus, bar.status)
                return (
                  <Link
                    key={bar.status}
                    className="flex flex-col items-center gap-space-xs h-full justify-end group cursor-pointer"
                    title={`${bar.label}: ${count}`}
                    to={`/assets?status=${bar.status}`}
                  >
                    <span className={`font-tag-label text-tag-label font-semibold ${bar.text} opacity-0 group-hover:opacity-100 transition-opacity`}>{count}</span>
                    <div
                      className={`w-12 sm:w-16 ${bar.bar} rounded-t-lg transition-all duration-500 ease-out group-hover:brightness-110`}
                      style={{ height: `${total === 0 ? 0 : Math.round((count / total) * 100)}%` }}
                    />
                    <span className="font-caption text-caption text-on-surface-variant font-medium text-center truncate w-full mt-1">{bar.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-md mt-space-sm bg-surface-container-low/40 px-space-md py-space-sm rounded-lg">
            {STATUS_BARS.map((bar) => (
              <div key={bar.status} className="flex items-center gap-space-xs">
                <span className={`w-2 h-2 rounded-full ${bar.bar}`} />
                <span className="font-caption text-caption text-on-surface font-medium">
                  {bar.legend}: {countOf(byStatus, bar.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <h2 className="font-card-title text-card-title text-on-surface">Assets by Category</h2>
            <span className="bg-secondary-container text-on-secondary-fixed font-tag-label text-tag-label px-space-sm py-0.5 rounded-full font-medium">
              All {total} items
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              aria-pressed={hideEmpty}
              className={`p-1 rounded hover:text-primary hover:bg-surface-container transition-colors ${hideEmpty ? 'text-primary bg-surface-container' : 'text-on-surface-variant'}`}
              onClick={() => setHideEmpty((v) => !v)}
              title={hideEmpty ? 'Show all categories' : 'Hide empty categories'}
              type="button"
            >
              <Icon name="filter_list" className="text-[18px]" />
            </button>
            <button
              aria-pressed={sortByCount}
              className={`p-1 rounded hover:text-primary hover:bg-surface-container transition-colors ${sortByCount ? 'text-primary bg-surface-container' : 'text-on-surface-variant'}`}
              onClick={() => setSortByCount((v) => !v)}
              title={sortByCount ? 'Default order' : 'Sort by number of assets'}
              type="button"
            >
              <Icon name="sort" className="text-[18px]" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-space-xl gap-y-space-md pt-space-xs">
          {categories.map(({ category, count }, i) => (
            <CategoryRow
              key={category}
              category={category}
              count={count}
              fullWidth={i === categories.length - 1 && categories.length % 2 === 1}
              total={total}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: string
  iconClass: string
  danger?: boolean
  /** Where the card leads: the asset list, already filtered to what the number counts. */
  to?: string
  children: ReactNode
}

function StatCard({ label, value, icon, iconClass, danger, to, children }: StatCardProps) {
  const card = 'bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between group transition-shadow hover:shadow-md'
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-space-xs">
          <span className="font-caption text-caption uppercase tracking-wider text-on-surface-variant font-medium">{label}</span>
          <span className={`font-stat-number text-stat-number ${danger ? 'text-error' : 'text-on-surface'} font-semibold tracking-tight tabular-nums`}>{value}</span>
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconClass} flex items-center justify-center group-hover:scale-105 transition-transform`}>
          <Icon name={icon} className="text-[22px]" />
        </div>
      </div>
      {children}
    </>
  )
  // With a destination the whole card is one link into the asset list.
  return to ? (
    <Link
      className={`${card} cursor-pointer hover:ring-2 hover:ring-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
      title={`Show ${label.toLowerCase()} in the asset list`}
      to={to}
    >
      {inner}
    </Link>
  ) : (
    <div className={card}>{inner}</div>
  )
}

function DonutLegend({ label, count, total, dot }: { label: string; count: number; total: number; dot: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-space-xs">
        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className="font-body-medium text-body-medium text-on-surface">{label}</span>
      </div>
      <div className="flex items-baseline gap-space-xs pl-space-md">
        <span className="font-page-title text-page-title font-semibold text-on-surface tabular-nums">{count}</span>
        <span className="font-caption text-caption text-on-surface-variant">({formatPercent(count, total)})</span>
      </div>
    </div>
  )
}

function CategoryRow({ category, count, total, fullWidth }: { category: AssetCategory; count: number; total: number; fullWidth: boolean }) {
  const style = categoryDashboard[category]
  const pct = total === 0 ? 0 : (count / total) * 100
  return (
    <Link
      className={`flex items-center gap-space-md p-space-sm rounded-lg hover:bg-surface-container-low/60 transition-colors ${fullWidth ? 'md:col-span-2' : ''}`}
      to={`/assets?category=${category}`}
    >
      <div className={`w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center ${style.iconClass} shrink-0`}>
        <Icon name={style.icon} className="text-[20px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-body-medium text-body-medium text-on-surface">{categoryLabel[category]}</span>
          <span className="font-caption text-caption text-on-surface-variant font-medium">
            {count} {count === 1 ? 'unit' : 'units'} • {pct === 0 ? '0%' : `${pct.toFixed(1)}%`}
          </span>
        </div>
        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
          <div className={`${count === 0 ? 'bg-transparent' : style.barClass} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  )
}
