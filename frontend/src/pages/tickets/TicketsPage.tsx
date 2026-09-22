import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router'
import { ticketsApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import { TICKET_PRIORITIES, type Ticket, type TicketPriority, type TicketQuery, type TicketStats, type TicketStatus } from '../../api/types'
import { useAuth } from '../../auth/authContext'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { Pagination } from '../../components/Pagination'
import { useHeaderCrumbs } from '../../components/shellContext'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { PriorityTag, TicketStatusTag } from '../../components/Tags'
import { useToast } from '../../components/toastContext'
import { formatDateTime, formatHours } from '../../lib/format'
import { categoryIcon, ticketStatusLabel } from '../../lib/labels'
import { useDebounced } from '../../lib/useDebounced'

const PAGE_SIZE = 10
const TABS: { value: TicketStatus | ''; label: string; count: (s: TicketStats) => number }[] = [
  { value: '', label: 'All', count: (s) => s.all },
  { value: 'Open', label: 'Open', count: (s) => s.open },
  { value: 'InProgress', label: 'In Progress', count: (s) => s.inProgress },
  { value: 'Resolved', label: 'Resolved', count: (s) => s.resolved },
  { value: 'Closed', label: 'Closed', count: (s) => s.closed },
]

export function TicketsPage() {
  useHeaderCrumbs([{ label: 'Workspace', to: '/' }, { label: 'Support Tickets' }])
  const [status, setStatus] = useState<TicketStatus | ''>('')
  const [priority, setPriority] = useState<TicketPriority | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search.trim())

  const query: TicketQuery = {
    status: status || undefined,
    priority: priority || undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  }
  const tickets = useQuery({ queryKey: ['tickets', query], queryFn: () => ticketsApi.list(query), placeholderData: keepPreviousData })
  const stats = useQuery({ queryKey: ['tickets', 'stats'], queryFn: ticketsApi.stats })

  const s = stats.data
  const done = s ? s.resolved + s.closed : 0
  const resolutionRate = s && s.all > 0 ? (done / s.all) * 100 : null

  function reset() {
    setStatus('')
    setPriority('')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-lg">
        <div>
          <div className="flex items-center gap-space-sm mb-1">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-primary-container/10 text-primary">
              <Icon name="confirmation_number" className="text-[18px]" />
            </span>
            <span className="font-tag-label text-tag-label uppercase tracking-wider text-secondary">Asset Operations Desk</span>
          </div>
          <h1 className="font-page-title text-page-title text-on-surface tracking-tight">IT Support Tickets</h1>
          <p className="font-body-default text-body-default text-secondary mt-0.5">Track hardware repair requests, battery issues, and maintenance tickets</p>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="bg-surface-container-lowest px-space-md py-space-sm rounded-xl shadow-sm flex items-center gap-space-md">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-secondary">Avg Resolution Time</span>
              <span className="font-card-title text-card-title text-on-surface">{s ? formatHours(s.avgResolutionHours) : '—'}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-tertiary">
              <Icon name="bolt" className="text-[20px]" />
            </div>
          </div>
          <div className="bg-surface-container-lowest px-space-md py-space-sm rounded-xl shadow-sm flex items-center gap-space-md">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-secondary">Resolution Rate</span>
              <span className="font-card-title text-card-title text-tertiary">{resolutionRate === null ? '—' : `${resolutionRate.toFixed(1)}%`}</span>
            </div>
            <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-surface-variant" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
              {resolutionRate !== null && resolutionRate > 0 && (
                <path
                  className="text-tertiary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${resolutionRate.toFixed(1)}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm mb-space-lg flex items-center justify-between gap-space-md flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl overflow-x-auto max-w-full" role="tablist">
          {TABS.map((tab) => {
            const active = status === tab.value
            return (
              <button
                key={tab.label}
                aria-selected={active}
                className={
                  active
                    ? 'flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-primary shadow-xs font-body-medium text-body-medium transition-all whitespace-nowrap'
                    : 'flex items-center gap-space-xs px-space-md py-1.5 rounded-lg text-secondary hover:text-on-surface font-body-medium text-body-medium transition-all whitespace-nowrap'
                }
                onClick={() => {
                  setStatus(tab.value)
                  setPage(1)
                }}
                role="tab"
                type="button"
              >
                <span>{tab.label}</span>
                <span
                  className={
                    active
                      ? 'bg-secondary-container text-primary px-1.5 py-0.5 rounded-full font-caption text-[11px] font-medium'
                      : 'bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded-full font-caption text-[11px]'
                  }
                >
                  {s ? tab.count(s) : '·'}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-space-sm flex-wrap ml-auto">
          <div className="relative flex items-center">
            <Icon name="search" className="absolute left-2.5 text-[18px] text-secondary" />
            <input
              aria-label="Search tickets"
              className="h-9 pl-8 pr-space-md bg-surface-container-low focus:bg-surface-container-lowest rounded-lg font-body-default text-body-default text-on-surface placeholder:text-outline focus:outline-none transition-colors w-48 lg:w-56"
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search ticket or asset..."
              type="text"
              value={search}
            />
          </div>
          <div className="relative">
            <select
              aria-label="Filter by priority"
              className="h-9 appearance-none pl-3 pr-8 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-body-medium text-body-medium focus:outline-none cursor-pointer transition-colors"
              onChange={(e) => {
                setPriority(e.target.value as TicketPriority | '')
                setPage(1)
              }}
              value={priority}
            >
              <option value="">Priority: All</option>
              {[...TICKET_PRIORITIES].reverse().map((p) => (
                <option key={p} value={p}>Priority: {p}</option>
              ))}
            </select>
            <Icon name="expand_more" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[18px] text-secondary" />
          </div>
          <button
            className="h-9 px-space-md flex items-center gap-space-xs bg-surface-container-low hover:bg-surface-container rounded-lg text-on-surface font-body-medium text-body-medium transition-colors"
            onClick={reset}
            type="button"
          >
            <Icon name="restart_alt" className="text-[18px] text-secondary" />
            <span>Reset</span>
          </button>
          <Link
            className="h-9 px-space-md flex items-center gap-space-xs bg-primary hover:bg-primary-container text-on-primary rounded-lg font-body-medium text-body-medium shadow-sm transition-all whitespace-nowrap"
            to="/tickets/new"
          >
            <Icon name="add" className="text-[18px]" />
            <span>New Ticket</span>
          </Link>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/70">
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface whitespace-nowrap">Ticket #</th>
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface">Title</th>
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface">Related Asset</th>
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface">Priority</th>
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface">Status</th>
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface">Created By</th>
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface">Created Date</th>
                <th className="py-3 px-space-md font-table-header text-table-header text-on-surface text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-default text-body-default text-on-surface">
              {tickets.isPending ? (
                <tr>
                  <td colSpan={8}>
                    <LoadingState label="Loading tickets…" />
                  </td>
                </tr>
              ) : tickets.isError ? (
                <tr>
                  <td colSpan={8}>
                    <ErrorState message={toAppError(tickets.error).message} onRetry={() => tickets.refetch()} />
                  </td>
                </tr>
              ) : tickets.data.items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon="confirmation_number" message="No tickets match these filters." />
                  </td>
                </tr>
              ) : (
                tickets.data.items.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
              )}
            </tbody>
          </table>
        </div>
        {tickets.data && (
          <Pagination noun="tickets" onChange={setPage} page={page} pageSize={PAGE_SIZE} total={tickets.data.totalCount} variant="plain" />
        )}
      </div>
    </div>
  )
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const snippet = ticket.description.length > 90 ? `${ticket.description.slice(0, 90).trimEnd()}…` : ticket.description
  return (
    <tr className="hover:bg-surface-container-low/50 transition-colors group">
      <td className="py-3.5 px-space-md font-body-medium text-body-medium">
        <Link className="text-primary hover:underline flex items-center gap-1" to={`/tickets/${ticket.id}`}>
          <span>#{ticket.id}</span>
          <Icon name="open_in_new" className="text-[14px] opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </td>
      <td className="py-3.5 px-space-md">
        <div className="flex flex-col">
          <span className="font-body-medium text-body-medium text-on-surface">{ticket.title}</span>
          <span className="font-caption text-caption text-secondary line-clamp-1">{snippet}</span>
        </div>
      </td>
      <td className="py-3.5 px-space-md">
        {ticket.relatedAsset ? (
          <Link
            className="inline-flex items-center gap-1 font-tag-label text-tag-label px-2 py-0.5 rounded-lg bg-surface-container text-secondary hover:text-primary transition-colors whitespace-nowrap"
            to={`/assets/${ticket.relatedAsset.id}`}
          >
            <Icon name={categoryIcon[ticket.relatedAsset.category]} className="text-[13px]" />
            <span>{ticket.relatedAsset.assetTag}</span>
          </Link>
        ) : (
          <span className="font-body-medium text-body-medium text-outline">—</span>
        )}
      </td>
      <td className="py-3.5 px-space-md">
        <PriorityTag priority={ticket.priority} />
      </td>
      <td className="py-3.5 px-space-md">
        <TicketStatusTag status={ticket.status} />
      </td>
      <td className="py-3.5 px-space-md">
        <div className="flex items-center gap-2">
          <Avatar id={ticket.createdBy.id} name={ticket.createdBy.fullName} size="sm" />
          <span className="font-body-medium text-body-medium text-on-surface whitespace-nowrap">{ticket.createdBy.fullName}</span>
        </div>
      </td>
      <td className="py-3.5 px-space-md whitespace-nowrap font-table-cell text-table-cell text-secondary">{formatDateTime(ticket.createdAt)}</td>
      <td className="py-3.5 px-space-md text-right">
        <RowMenu ticket={ticket} />
      </td>
    </tr>
  )
}

// The ⋮ menu: everyone can open the ticket; admins can also move it along without leaving the list.
function RowMenu({ ticket }: { ticket: Ticket }) {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const open = anchor !== null

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.type === 'mousedown' && menuRef.current?.contains(e.target as Node)) return
      setAnchor(null)
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

  const move = useMutation({
    mutationFn: (status: TicketStatus) => ticketsApi.updateStatus(ticket.id, status, ticket.resolutionNote),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(`Ticket #${updated.id} marked ${ticketStatusLabel[updated.status]}`)
    },
    onError: (error) => toast.error(toAppError(error).message),
  })

  const transitions: TicketStatus[] = isAdmin
    ? (['InProgress', 'Resolved', 'Closed', 'Open'] as TicketStatus[]).filter((s) => s !== ticket.status)
    : []

  return (
    <div className="relative inline-block">
      <button
        aria-expanded={open}
        aria-label={`Actions for ticket #${ticket.id}`}
        className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface ml-auto transition-colors"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => setAnchor(open ? null : e.currentTarget.getBoundingClientRect())}
        type="button"
      >
        <Icon name="more_vert" className="text-[18px]" />
      </button>
      {anchor &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed min-w-[180px] bg-surface-container-lowest rounded-lg shadow-xl py-1 z-50 flex flex-col text-left"
            role="menu"
            style={{ top: anchor.bottom + 4, left: anchor.right - 180 }}
          >
            <MenuItem icon="visibility" label="View details" onClick={() => navigate(`/tickets/${ticket.id}`)} />
            {transitions.map((s) => (
              <MenuItem
                key={s}
                icon={s === 'Resolved' ? 'task_alt' : s === 'Closed' ? 'archive' : s === 'Open' ? 'restart_alt' : 'build'}
                label={s === 'Open' ? 'Reopen' : `Mark ${ticketStatusLabel[s]}`}
                onClick={() => {
                  setAnchor(null)
                  move.mutate(s)
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      className="px-3 py-2 flex items-center gap-2 font-caption text-caption text-on-surface hover:bg-surface-container-low transition-colors"
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <Icon name={icon} className="text-[16px] text-secondary" />
      {label}
    </button>
  )
}
