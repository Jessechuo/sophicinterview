import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { activityApi } from '../api/endpoints'
import { toAppError } from '../api/errors'
import { ACTIVITY_ACTIONS, type ActivityAction, type ActivityLog, type ActivityQuery } from '../api/types'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { useHeaderCrumbs } from '../components/shellContext'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { ActionTag } from '../components/Tags'
import { useToast } from '../components/toastContext'
import { formatDateTime, todayIso } from '../lib/format'
import { statusChipClass, statusFromLabel } from '../lib/labels'
import { useDebounced } from '../lib/useDebounced'

const PAGE_SIZE = 12
const control =
  'h-8 bg-surface-container-lowest text-on-surface font-table-cell text-table-cell rounded border border-outline-variant hover:border-primary focus:border-primary focus:outline-none transition-colors'

export function ActivityLogPage() {
  useHeaderCrumbs([{ label: 'Workspace', to: '/' }, { label: 'Governance' }, { label: 'Activity Log' }], 'chevron')
  const toast = useToast()
  const [action, setAction] = useState<ActivityAction | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const debouncedSearch = useDebounced(search.trim())

  const filters: ActivityQuery = {
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
  }
  const query: ActivityQuery = { ...filters, page, pageSize: PAGE_SIZE }
  const logs = useQuery({ queryKey: ['activity', query], queryFn: () => activityApi.list(query), placeholderData: keepPreviousData })
  const overall = useQuery({ queryKey: ['activity', { page: 1, pageSize: 1 }], queryFn: () => activityApi.list({ page: 1, pageSize: 1 }) })

  function change(apply: () => void) {
    apply()
    setPage(1)
  }

  function reset() {
    setAction('')
    setFrom('')
    setTo('')
    setSearch('')
    setPage(1)
  }

  async function exportLog() {
    setExporting(true)
    try {
      await activityApi.export(filters)
      toast.success('Audit log exported to Excel')
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setExporting(false)
    }
  }

  const latest = overall.data?.items[0]

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <div className="flex items-center gap-space-sm">
            <h1 className="font-page-title text-page-title text-on-surface tracking-tight">Activity Log</h1>
            <span className="px-space-sm py-0.5 rounded bg-surface-container-high text-on-surface-variant font-tag-label text-tag-label uppercase tracking-wider">
              Admins Only
            </span>
          </div>
          <p className="font-body-default text-body-default text-on-surface-variant mt-0.5">
            Audit trail of all asset modifications, lifecycle status changes, and assignments
          </p>
        </div>
        <div className="flex items-center gap-space-md bg-surface-container-lowest px-gutter py-space-sm rounded shadow-sm border border-surface-variant">
          <div className="flex items-center gap-space-xs pr-space-md border-r border-surface-variant">
            <Icon name="verified_user" className="text-primary text-[20px]" />
            <div>
              <div className="font-caption text-caption text-on-surface-variant leading-none">Recorded</div>
              <div className="font-tag-label text-tag-label text-tertiary font-semibold">{overall.data ? `${overall.data.totalCount} entries` : '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <Icon name="history_toggle_off" className="text-secondary text-[20px]" />
            <div>
              <div className="font-caption text-caption text-on-surface-variant leading-none">Latest</div>
              <div className="font-tag-label text-tag-label text-on-surface font-semibold">{latest ? formatDateTime(latest.timestamp) : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm border border-surface-variant mb-space-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          <div className="relative min-w-[170px]">
            <label className="sr-only" htmlFor="action-filter">Filter by action</label>
            <select
              className={`w-full pl-space-sm pr-space-lg appearance-none cursor-pointer ${control}`}
              id="action-filter"
              onChange={(e) => change(() => setAction(e.target.value as ActivityAction | ''))}
              value={action}
            >
              <option value="">Action: All Actions</option>
              {ACTIVITY_ACTIONS.map((a) => (
                <option key={a} value={a}>Action: {a}</option>
              ))}
            </select>
            <Icon name="expand_more" className="absolute right-2 top-1.5 pointer-events-none text-outline text-[18px]" />
          </div>
          <div className={`relative flex items-center gap-1 min-w-[220px] pl-8 pr-space-sm ${control}`}>
            <Icon name="calendar_month" className="absolute left-2.5 text-outline text-[18px] pointer-events-none" />
            <input
              aria-label="From date"
              className="bg-transparent focus:outline-none text-on-surface font-table-cell text-table-cell w-[112px]"
              max={to || todayIso()}
              onChange={(e) => change(() => setFrom(e.target.value))}
              type="date"
              value={from}
            />
            <span className="text-outline">~</span>
            <input
              aria-label="To date"
              className="bg-transparent focus:outline-none text-on-surface font-table-cell text-table-cell w-[112px]"
              max={todayIso()}
              min={from || undefined}
              onChange={(e) => change(() => setTo(e.target.value))}
              type="date"
              value={to}
            />
          </div>
          <div className="relative w-full sm:w-[200px] 2xl:w-[240px]">
            <Icon name="search" className="absolute left-2.5 top-1.5 text-outline text-[18px] pointer-events-none" />
            <input
              aria-label="Filter by asset tag"
              className={`w-full pl-8 pr-space-sm placeholder:text-on-surface-variant/60 ${control}`}
              onChange={(e) => change(() => setSearch(e.target.value))}
              placeholder="Filter by Asset Tag (e.g. AST-0001)"
              type="text"
              value={search}
            />
          </div>
          <button
            className="h-8 px-space-sm flex items-center gap-space-xs text-on-surface-variant hover:text-primary transition-colors text-table-cell font-table-cell"
            onClick={reset}
            type="button"
          >
            <Icon name="restart_alt" className="text-[16px]" />
            <span>Reset</span>
          </button>
        </div>
        <div className="flex items-center gap-space-sm self-end lg:self-auto">
          <button
            className="h-8 px-space-md rounded border border-outline-variant bg-surface-container-lowest hover:border-primary hover:text-primary text-on-surface font-table-header text-table-header flex items-center gap-space-xs shadow-sm transition-colors whitespace-nowrap disabled:opacity-70"
            disabled={exporting}
            onClick={exportLog}
            type="button"
          >
            <Icon name="download" className="text-[18px]" />
            <span>{exporting ? 'Exporting…' : 'Export Audit Log'}</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-surface-variant shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-surface-container-low/70 border-b border-surface-variant h-11">
                <th className="px-space-md py-space-sm font-table-header text-table-header text-on-surface whitespace-nowrap w-[170px]">Timestamp</th>
                <th className="px-space-md py-space-sm font-table-header text-table-header text-on-surface whitespace-nowrap min-w-[220px]">Asset</th>
                <th className="px-space-md py-space-sm font-table-header text-table-header text-on-surface whitespace-nowrap w-[120px]">Action</th>
                <th className="px-space-md py-space-sm font-table-header text-table-header text-on-surface whitespace-nowrap w-[180px]">Performed By</th>
                <th className="px-space-md py-space-sm font-table-header text-table-header text-on-surface whitespace-nowrap w-[160px]">Target User</th>
                <th className="px-space-md py-space-sm font-table-header text-table-header text-on-surface min-w-[240px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant font-table-cell text-table-cell text-on-surface">
              {logs.isPending ? (
                <tr>
                  <td colSpan={6}>
                    <LoadingState label="Loading activity…" />
                  </td>
                </tr>
              ) : logs.isError ? (
                <tr>
                  <td colSpan={6}>
                    <ErrorState message={toAppError(logs.error).message} onRetry={() => logs.refetch()} />
                  </td>
                </tr>
              ) : logs.data.items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon="history" message="No activity matches these filters." />
                  </td>
                </tr>
              ) : (
                logs.data.items.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>
        {logs.data && (
          <Pagination noun="entries" onChange={setPage} page={page} pageSize={PAGE_SIZE} total={logs.data.totalCount} variant="outlined" />
        )}
      </div>
    </div>
  )
}

function LogRow({ log }: { log: ActivityLog }) {
  return (
    <tr className="hover:bg-surface-container-low/50 transition-colors group">
      <td className="px-space-md py-3 text-on-surface-variant whitespace-nowrap font-mono text-caption">{formatDateTime(log.timestamp)}</td>
      <td className="px-space-md py-3">
        <Link className="text-primary hover:underline font-body-medium transition-colors inline-flex flex-wrap items-center gap-x-1.5" to={`/assets/${log.asset.id}`}>
          <span className="whitespace-nowrap">{log.asset.assetTag}</span>
          <span className="text-outline-variant font-light">·</span>
          <span>{log.asset.name}</span>
        </Link>
      </td>
      <td className="px-space-md py-3 whitespace-nowrap">
        <ActionTag action={log.action} />
      </td>
      <td className="px-space-md py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Avatar id={log.performedBy.id} name={log.performedBy.fullName} />
          <span className="text-on-surface font-body-medium">{log.performedBy.fullName}</span>
        </div>
      </td>
      <td className="px-space-md py-3 text-on-surface-variant whitespace-nowrap">{log.targetUser?.fullName ?? '—'}</td>
      <td className="px-space-md py-3 text-on-surface">
        <Details text={log.details} />
      </td>
    </tr>
  )
}

// A single "Status: A → B" change renders as coloured chips, as in the design; anything else is plain text.
function Details({ text }: { text: string | null }) {
  const match = text?.match(/^Status: (.+) → (.+)$/)
  const before = match && statusFromLabel(match[1])
  const after = match && statusFromLabel(match[2])
  if (!before || !after) return <span>{text ?? '—'}</span>

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-on-surface-variant">Status:</span>
      <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${statusChipClass[before]}`}>{match![1]}</span>
      <Icon name="arrow_forward" className="text-[14px] text-outline" />
      <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium ${statusChipClass[after]}`}>{match![2]}</span>
    </div>
  )
}
