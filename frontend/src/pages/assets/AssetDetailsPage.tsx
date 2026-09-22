import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { activityApi, assetsApi, ticketsApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import type { ActivityLog, Asset, PagedResult, Ticket } from '../../api/types'
import { useAuth } from '../../auth/authContext'
import { Avatar } from '../../components/Avatar'
import { ConfirmPopover } from '../../components/ConfirmPopover'
import { Icon } from '../../components/Icon'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { PriorityTag, TicketStatusTag } from '../../components/Tags'
import { useToast } from '../../components/toastContext'
import { formatDate, formatDateTime, formatLongDate, formatMoney } from '../../lib/format'
import { actionDotClass, categoryIcon, categoryLabel, statusBadge, statusLabel } from '../../lib/labels'
import { AssignModal } from './AssignModal'

type Tab = 'activity' | 'tickets'

export function AssetDetailsPage() {
  const assetId = Number(useParams().id)
  const { isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>(isAdmin ? 'activity' : 'tickets')
  const [assigning, setAssigning] = useState(false)

  const asset = useQuery({ queryKey: ['asset', assetId], queryFn: () => assetsApi.get(assetId) })
  const activity = useQuery({
    queryKey: ['activity', { assetId }],
    queryFn: () => activityApi.list({ assetId, pageSize: 50 }),
    enabled: isAdmin,
  })
  const tickets = useQuery({
    queryKey: ['tickets', { relatedAssetId: assetId }],
    queryFn: () => ticketsApi.list({ relatedAssetId: assetId, pageSize: 50 }),
  })

  function refreshAfterChange(updated?: Asset) {
    if (updated) queryClient.setQueryData(['asset', assetId], updated)
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const unassign = useMutation({
    mutationFn: () => assetsApi.unassign(assetId),
    onSuccess: (updated) => {
      refreshAfterChange(updated)
      toast.success(`${updated.assetTag} unassigned`)
    },
    onError: (error) => toast.error(toAppError(error).message),
  })

  const remove = useMutation({
    mutationFn: () => assetsApi.remove(assetId),
    onSuccess: () => {
      toast.success(`${asset.data?.assetTag} deleted`)
      navigate('/assets')
      refreshAfterChange()
    },
    onError: (error) => toast.error(toAppError(error).message),
  })

  function copySerial(serial: string) {
    navigator.clipboard
      .writeText(serial)
      .then(() => toast.success('Serial number copied'))
      .catch(() => toast.error('Could not copy to the clipboard'))
  }

  if (asset.isPending) return <LoadingState label="Loading asset…" />
  if (asset.isError) return <ErrorState message={toAppError(asset.error).message} onRetry={() => asset.refetch()} />

  const a = asset.data
  const badge = statusBadge[a.status]
  const openTickets = tickets.data?.items.filter((t) => t.status === 'Open' || t.status === 'InProgress').length

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-space-sm mb-space-lg">
        <nav className="flex items-center gap-space-xs font-caption text-caption text-secondary">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/assets">
            <Icon name="laptop_mac" className="text-[16px]" />
            Assets
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="font-body-medium text-on-surface font-medium">{a.assetTag}</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-wrap items-center gap-space-sm">
            <h1 className="font-page-title text-page-title text-on-surface tracking-tight">{a.name}</h1>
            <span className="bg-surface-container-high text-on-surface-variant font-mono text-[12px] px-2 py-0.5 rounded font-medium">{a.assetTag}</span>
            <span className={`${badge.box} font-tag-label text-tag-label px-space-sm py-0.5 rounded flex items-center gap-1 shadow-xs`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {statusLabel[a.status]}
            </span>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            {isAdmin ? (
              <>
                <Link
                  className="h-[34px] px-space-md bg-surface-container-lowest text-on-surface font-body-medium text-body-medium rounded hover:bg-surface-container-low transition-colors flex items-center gap-1.5 shadow-sm"
                  to={`/assets/${a.id}/edit`}
                >
                  <Icon name="edit" className="text-[18px] text-secondary" />
                  Edit
                </Link>
                <button
                  className="h-[34px] px-space-md bg-primary text-on-primary font-body-medium text-body-medium rounded hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={a.status === 'Retired'}
                  onClick={() => setAssigning(true)}
                  title={a.status === 'Retired' ? 'Retired assets cannot be assigned' : undefined}
                  type="button"
                >
                  <Icon name="person_add" className="text-[18px]" />
                  Assign / Reassign
                </button>
                <ConfirmPopover message={`Delete ${a.assetTag}? This cannot be undone.`} onConfirm={() => remove.mutate()}>
                  {({ toggle }) => (
                    <button
                      className="h-[34px] px-space-md bg-surface-container-lowest text-error font-body-medium text-body-medium rounded hover:bg-error-container/20 transition-colors flex items-center gap-1.5 shadow-sm"
                      onClick={toggle}
                      type="button"
                    >
                      <Icon name="delete" className="text-[18px] text-error" />
                      Delete
                    </button>
                  )}
                </ConfirmPopover>
              </>
            ) : (
              <Link
                className="h-[34px] px-space-md bg-primary text-on-primary font-body-medium text-body-medium rounded hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm"
                to={`/tickets/new?assetId=${a.id}`}
              >
                <Icon name="support_agent" className="text-[18px]" />
                Report Issue
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-space-md mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-secondary-container/40 text-primary flex items-center justify-center">
                  <Icon name="devices" className="text-[20px]" />
                </div>
                <div>
                  <h2 className="font-card-title text-card-title text-on-surface">Asset Information</h2>
                  <p className="font-caption text-caption text-secondary">Hardware details and registry profile</p>
                </div>
              </div>
              <span className="font-caption text-caption text-secondary flex items-center gap-1 bg-surface-container px-2 py-1 rounded">
                <Icon name="update" className="text-[14px]" /> Updated {formatDateTime(a.updatedAt)}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-xl gap-y-space-md">
              <Detail label="Category">
                <span className="flex items-center gap-1.5">
                  <Icon name={categoryIcon[a.category]} className="text-[18px] text-primary" />
                  {categoryLabel[a.category]}
                </span>
              </Detail>
              <Detail label="Brand">
                <span className="font-medium">{a.brand ?? '—'}</span>
              </Detail>
              <Detail label="Model">{a.model ?? '—'}</Detail>
              <Detail label="Serial Number">
                <span className="font-mono flex items-center gap-2">
                  {a.serialNumber ?? '—'}
                  {a.serialNumber && (
                    <button
                      aria-label="Copy serial number"
                      className="text-secondary hover:text-primary transition-colors flex items-center"
                      onClick={() => copySerial(a.serialNumber!)}
                      title="Copy Serial Number"
                      type="button"
                    >
                      <Icon name="content_copy" className="text-[16px]" />
                    </button>
                  )}
                </span>
              </Detail>
              <Detail label="Purchase Date">{formatDate(a.purchaseDate)}</Detail>
              <Detail label="Purchase Cost">
                <span className="font-mono font-medium">{formatMoney(a.purchaseCost)}</span>
              </Detail>
              <Detail label="Location">
                <span className="flex items-center gap-1.5">
                  <Icon name="location_on" className="text-[18px] text-secondary" />
                  {a.location ?? '—'}
                </span>
              </Detail>
              <Detail label="Registered">{formatLongDate(a.createdAt)}</Detail>
              <div className="sm:col-span-2 flex flex-col py-1">
                <dt className="font-caption text-caption text-secondary mb-0.5">Hardware Notes</dt>
                <dd className="font-body-default text-body-default text-on-surface-variant bg-surface-container-low/70 p-3 rounded leading-relaxed whitespace-pre-line">
                  {a.notes ?? 'No notes recorded for this asset.'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-space-md mb-space-md">
                <h2 className="font-card-title text-card-title text-on-surface">Current Assignment</h2>
                {a.assignedTo ? (
                  <span className="bg-secondary-container/60 text-primary font-tag-label text-tag-label px-2 py-0.5 rounded font-medium">Assigned</span>
                ) : (
                  <span className="bg-surface-container-high text-on-surface-variant font-tag-label text-tag-label px-2 py-0.5 rounded font-medium">Unassigned</span>
                )}
              </div>
              {a.assignedTo ? (
                <>
                  <div className="flex items-start gap-space-md p-space-md bg-surface-container-low rounded-lg mb-space-md">
                    <Avatar className="shadow-sm" id={a.assignedTo.id} name={a.assignedTo.fullName} size="lg" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-medium text-[16px] text-on-surface font-semibold truncate leading-tight">{a.assignedTo.fullName}</span>
                      <span className="font-caption text-caption text-secondary truncate mt-0.5">{a.assignedTo.email}</span>
                      {a.assignedTo.department && (
                        <span className="font-tag-label text-tag-label text-on-surface-variant mt-2 inline-flex items-center gap-1">
                          <Icon name="domain" className="text-[14px] text-secondary" />
                          {a.assignedTo.department}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.assignedAt && (
                    <div className="flex items-center gap-2 text-secondary font-caption text-caption px-1 mb-space-lg">
                      <Icon name="calendar_today" className="text-[16px]" />
                      <span>
                        Assigned since <strong className="text-on-surface font-medium">{formatLongDate(a.assignedAt)}</strong>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center text-center gap-space-xs p-space-md bg-surface-container-low rounded-lg mb-space-lg">
                  <Icon name="person_off" className="text-[28px] text-outline" />
                  <span className="font-body-medium text-body-medium text-on-surface">Not assigned to anyone</span>
                  <span className="font-caption text-caption text-secondary">
                    {a.status === 'Retired' ? 'Retired assets cannot be assigned.' : 'Available to hand out from IT inventory.'}
                  </span>
                </div>
              )}
            </div>
            {isAdmin && a.assignedTo && (
              <ConfirmPopover confirmLabel="Unassign" message={`Unassign ${a.assetTag} from ${a.assignedTo.fullName}?`} onConfirm={() => unassign.mutate()}>
                {({ toggle }) => (
                  <button
                    className="w-full py-2 px-space-md bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-medium text-body-medium rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5 border border-surface-variant"
                    disabled={unassign.isPending}
                    onClick={toggle}
                    type="button"
                  >
                    <Icon name="person_remove" className="text-[18px] text-secondary" />
                    {unassign.isPending ? 'Unassigning…' : 'Unassign'}
                  </button>
                )}
              </ConfirmPopover>
            )}
            {isAdmin && !a.assignedTo && a.status !== 'Retired' && (
              <button
                className="w-full py-2 px-space-md bg-primary text-on-primary hover:bg-primary-container font-body-medium text-body-medium rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5"
                onClick={() => setAssigning(true)}
                type="button"
              >
                <Icon name="person_add" className="text-[18px]" />
                Assign
              </button>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
            <h3 className="font-card-title text-[14px] font-semibold text-on-surface">Service Summary</h3>
            <SummaryRow label="Open Tickets">
              {openTickets === undefined ? (
                '…'
              ) : openTickets > 0 ? (
                <span className="text-[#faad14] font-medium flex items-center gap-1">
                  <Icon name="confirmation_number" className="text-[16px]" /> {openTickets} open
                </span>
              ) : (
                <span className="text-[#52c41a] font-medium flex items-center gap-1">
                  <Icon name="check_circle" className="text-[16px]" /> None open
                </span>
              )}
            </SummaryRow>
            <SummaryRow label="Operational Status">
              <span className="text-on-surface font-medium flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} /> {statusLabel[a.status]}
              </span>
            </SummaryRow>
            <SummaryRow label="Last Updated">
              <span className="text-secondary font-mono">{formatDateTime(a.updatedAt)}</span>
            </SummaryRow>
          </div>
        </div>
      </div>

      <div className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
        <div className="flex items-center gap-space-lg pb-space-sm mb-space-lg" role="tablist">
          {isAdmin && (
            <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>
              Activity History
            </TabButton>
          )}
          <TabButton active={tab === 'tickets'} onClick={() => setTab('tickets')}>
            Related Tickets
            <span className="bg-secondary-container text-primary font-tag-label text-tag-label px-2 py-0.5 rounded-full font-medium">
              {tickets.data?.totalCount ?? 0}
            </span>
          </TabButton>
        </div>
        {tab === 'activity' && isAdmin ? <ActivityTimeline query={activity} /> : <RelatedTickets query={tickets} />}
      </div>

      {assigning && <AssignModal asset={a} onClose={() => setAssigning(false)} />}
    </div>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col py-1">
      <dt className="font-caption text-caption text-secondary mb-0.5">{label}</dt>
      <dd className="font-body-medium text-body-medium text-on-surface">{children}</dd>
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-caption font-caption py-1">
      <span className="text-secondary">{label}</span>
      {children}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-selected={active}
      className={
        active
          ? 'font-body-medium text-body-medium font-semibold text-primary pb-space-sm -mb-space-sm flex items-center gap-2 relative'
          : 'font-body-medium text-body-medium text-secondary hover:text-on-surface pb-space-sm -mb-space-sm flex items-center gap-2 transition-colors'
      }
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
    </button>
  )
}

// Splits "Assigned to Siti Aminah. Note: Loaner" into a headline and an optional note.
function describe(log: ActivityLog): { title: string; body: string | null } {
  const [text, note] = (log.details ?? '').split('. Note: ')
  switch (log.action) {
    case 'Created':
      return { title: 'Asset Created', body: text || null }
    case 'Deleted':
      return { title: 'Asset Deleted', body: text || null }
    case 'Updated': {
      const changes = text.split('; ').filter(Boolean)
      return changes.length === 1 ? { title: changes[0], body: null } : { title: 'Asset Updated', body: changes.join(' · ') }
    }
    default:
      return { title: text || log.action, body: note ?? null }
  }
}

function ActivityTimeline({ query }: { query: UseQueryResult<PagedResult<ActivityLog>> }) {
  if (query.isPending) return <LoadingState label="Loading history…" />
  if (query.isError) return <ErrorState message={toAppError(query.error).message} onRetry={() => query.refetch()} />
  if (query.data.items.length === 0) return <EmptyState icon="history" message="No activity recorded yet." />

  return (
    <div className="relative pl-6 space-y-space-lg before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
      {query.data.items.map((log) => {
        const { title, body } = describe(log)
        return (
          <div key={log.id} className="relative flex items-start gap-space-md">
            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${actionDotClass[log.action]}`} />
            </span>
            <div className="flex flex-col gap-1 w-full bg-surface-container-low/40 p-space-md rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body-medium text-body-medium font-semibold text-on-surface">{title}</span>
                  <span className="text-outline-variant">•</span>
                  <span className="font-caption text-caption text-secondary">
                    Performed by <strong className="text-on-surface font-medium">{log.performedBy.fullName}</strong>
                  </span>
                </div>
                <span className="font-caption text-caption font-mono text-secondary">{formatDateTime(log.timestamp)}</span>
              </div>
              {body && <p className="font-body-default text-body-default text-on-surface-variant mt-1">{body}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RelatedTickets({ query }: { query: UseQueryResult<PagedResult<Ticket>> }) {
  if (query.isPending) return <LoadingState label="Loading tickets…" />
  if (query.isError) return <ErrorState message={toAppError(query.error).message} onRetry={() => query.refetch()} />
  if (query.data.items.length === 0) return <EmptyState icon="confirmation_number" message="No tickets have been raised for this asset." />

  return (
    <div className="flex flex-col gap-space-sm">
      {query.data.items.map((ticket) => (
        <Link
          key={ticket.id}
          className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low/40 hover:bg-surface-container-low p-space-md rounded-lg transition-colors"
          to={`/tickets/${ticket.id}`}
        >
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="font-body-medium text-body-medium text-primary">#{ticket.id}</span>
            <span className="font-body-medium text-body-medium text-on-surface truncate">{ticket.title}</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <PriorityTag priority={ticket.priority} />
            <TicketStatusTag status={ticket.status} />
            <span className="font-caption text-caption font-mono text-secondary">{formatDateTime(ticket.createdAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
