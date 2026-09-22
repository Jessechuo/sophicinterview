import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ticketsApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import { TICKET_STATUSES, type Ticket, type TicketStatus } from '../../api/types'
import { useAuth } from '../../auth/authContext'
import { Avatar } from '../../components/Avatar'
import { InputIcon } from '../../components/Field'
import { selectClass, textareaClass } from '../../components/fieldStyles'
import { Icon } from '../../components/Icon'
import { useHeaderCrumbs } from '../../components/shellContext'
import { ErrorState, LoadingState } from '../../components/States'
import { PriorityTag, TicketStatusTag } from '../../components/Tags'
import { useToast } from '../../components/toastContext'
import { formatDateTime } from '../../lib/format'
import { categoryIcon, ticketStatusLabel } from '../../lib/labels'

export function TicketDetailsPage() {
  const ticketId = Number(useParams().id)
  useHeaderCrumbs([{ label: 'Support', to: '/tickets' }, { label: `Ticket #${ticketId}` }], 'chevron')
  const ticket = useQuery({ queryKey: ['ticket', ticketId], queryFn: () => ticketsApi.get(ticketId) })

  if (ticket.isPending) return <LoadingState label="Loading ticket…" />
  if (ticket.isError) return <ErrorState message={toAppError(ticket.error).message} onRetry={() => ticket.refetch()} />

  const t = ticket.data
  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-space-sm mb-space-lg">
        <nav className="flex items-center gap-space-xs font-caption text-caption text-secondary">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/tickets">
            <Icon name="confirmation_number" className="text-[16px]" />
            Tickets
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="font-body-medium text-on-surface font-medium">#{t.id}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-space-sm">
          <h1 className="font-page-title text-page-title text-on-surface tracking-tight">{t.title}</h1>
          <span className="bg-surface-container-high text-on-surface-variant font-mono text-[12px] px-2 py-0.5 rounded font-medium">#{t.id}</span>
          <PriorityTag priority={t.priority} />
          <TicketStatusTag status={t.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-secondary-container/40 text-primary flex items-center justify-center">
              <Icon name="description" className="text-[20px]" />
            </div>
            <div>
              <h2 className="font-card-title text-card-title text-on-surface">Issue Details</h2>
              <p className="font-caption text-caption text-secondary">Reported {formatDateTime(t.createdAt)}</p>
            </div>
          </div>
          <p className="font-body-default text-body-default text-on-surface-variant bg-surface-container-low/70 p-space-md rounded-lg leading-relaxed whitespace-pre-line">
            {t.description}
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-xl gap-y-space-md">
            <Detail label="Reported By">
              <span className="flex items-center gap-space-sm">
                <Avatar id={t.createdBy.id} name={t.createdBy.fullName} size="sm" />
                <span className="flex flex-col">
                  <span>{t.createdBy.fullName}</span>
                  <span className="font-caption text-caption text-secondary">{t.createdBy.department ?? t.createdBy.email}</span>
                </span>
              </span>
            </Detail>
            <Detail label="Related Asset">
              {t.relatedAsset ? (
                <Link className="inline-flex items-center gap-1.5 text-primary hover:underline" to={`/assets/${t.relatedAsset.id}`}>
                  <Icon name={categoryIcon[t.relatedAsset.category]} className="text-[18px]" />
                  {t.relatedAsset.assetTag} · {t.relatedAsset.name}
                </Link>
              ) : (
                <span className="text-outline">General workplace issue</span>
              )}
            </Detail>
            <Detail label="Last Updated">{formatDateTime(t.updatedAt)}</Detail>
            <Detail label="Resolved">{t.resolvedAt ? formatDateTime(t.resolvedAt) : '—'}</Detail>
          </dl>
        </div>

        <div className="lg:col-span-4">
          <ManageCard key={`${t.id}-${t.updatedAt}`} ticket={t} />
        </div>
      </div>
    </div>
  )
}

function ManageCard({ ticket }: { ticket: Ticket }) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TicketStatus>(ticket.status)
  const [note, setNote] = useState(ticket.resolutionNote ?? '')

  const update = useMutation({
    mutationFn: () => ticketsApi.updateStatus(ticket.id, status, note.trim() || null),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticket.id], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(`Ticket #${updated.id} updated`)
    },
    onError: (error) => toast.error(toAppError(error).message),
  })

  const changed = status !== ticket.status || (note.trim() || null) !== ticket.resolutionNote

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h2 className="font-card-title text-card-title text-on-surface">{isAdmin ? 'Manage Ticket' : 'Ticket Status'}</h2>
        <TicketStatusTag status={ticket.status} />
      </div>
      {isAdmin ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="font-body-medium text-body-medium text-on-surface" htmlFor="ticket-status">Status</label>
            <div className="relative">
              <select className={selectClass()} id="ticket-status" onChange={(e) => setStatus(e.target.value as TicketStatus)} value={status}>
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>{ticketStatusLabel[s]}</option>
                ))}
              </select>
              <InputIcon name="expand_more" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-body-medium text-body-medium text-on-surface" htmlFor="ticket-note">Resolution Note</label>
            <textarea
              className={textareaClass()}
              id="ticket-note"
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was done, or what happens next"
              rows={4}
              value={note}
            />
          </div>
          <button
            className="w-full h-9 rounded-md bg-primary text-on-primary hover:bg-primary-container font-body-medium text-body-medium shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!changed || update.isPending}
            onClick={() => update.mutate()}
            type="button"
          >
            <Icon name="save" className="text-[18px]" />
            {update.isPending ? 'Updating…' : 'Update Ticket'}
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-space-sm">
          <p className="font-caption text-caption text-secondary">IT updates this ticket as work progresses.</p>
          <div className="font-body-default text-body-default text-on-surface-variant bg-surface-container-low/70 p-space-md rounded-lg whitespace-pre-line">
            {ticket.resolutionNote ?? 'No resolution note yet.'}
          </div>
        </div>
      )}
      {ticket.resolvedAt && (
        <div className="flex items-center gap-2 text-secondary font-caption text-caption">
          <Icon name="task_alt" className="text-[16px] text-[#52c41a]" />
          Resolved {formatDateTime(ticket.resolvedAt)}
        </div>
      )}
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
