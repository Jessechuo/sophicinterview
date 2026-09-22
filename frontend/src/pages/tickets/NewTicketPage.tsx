import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { assetsApi, ticketsApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import { TICKET_PRIORITIES, type Asset, type TicketPriority } from '../../api/types'
import { useAuth } from '../../auth/authContext'
import { FieldError } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { useHeaderCrumbs } from '../../components/shellContext'
import { useToast } from '../../components/toastContext'
import { formatHours } from '../../lib/format'

const TITLE_MAX = 100
const DESCRIPTION_MAX = 4000

const PRIORITY: Record<TicketPriority, { dot: string; active: string; hint: string }> = {
  Low: { dot: 'bg-primary', active: 'text-primary', hint: 'Routine request or minor inconvenience' },
  Medium: { dot: 'bg-[#fa8c16]', active: 'text-[#fa8c16]', hint: 'Affects your work, but a workaround exists' },
  High: { dot: 'bg-error', active: 'text-error', hint: "You can't work — the device or service is completely down" },
}

const fieldShadow =
  'shadow-[inset_0_0_0_1px_rgba(114,119,134,0.25)] focus:shadow-[inset_0_0_0_1px_#0057c2,0_0_0_2px_rgba(0,87,194,0.18)]'
const errorShadow = 'shadow-[inset_0_0_0_1px_#ba1a1a] focus:shadow-[inset_0_0_0_1px_#ba1a1a,0_0_0_2px_rgba(186,26,26,0.18)]'

interface Errors {
  title?: string
  description?: string
  relatedAssetId?: string
}

export function NewTicketPage() {
  useHeaderCrumbs([{ label: 'Support', to: '/tickets' }, { label: 'New Ticket' }], 'chevron')
  const { user, isAdmin } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const preselected = Number(params.get('assetId')) || null

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('Medium')
  const [assetId, setAssetId] = useState<number | null>(preselected)
  const [errors, setErrors] = useState<Errors>({})

  // Staff pick from the hardware they hold; admins can raise tickets against any asset.
  const assets = useQuery({
    queryKey: ['assets', { assignedToUserId: isAdmin ? undefined : user?.id, pageSize: 100 }],
    queryFn: () => assetsApi.list({ assignedToUserId: isAdmin ? undefined : user?.id, pageSize: 100, sortBy: 'tag' }),
  })
  const preselectedAsset = useQuery({
    queryKey: ['asset', preselected],
    queryFn: () => assetsApi.get(preselected!),
    enabled: preselected !== null,
  })
  const stats = useQuery({ queryKey: ['tickets', 'stats'], queryFn: ticketsApi.stats })

  const options: Asset[] = [...(assets.data?.items ?? [])]
  if (preselectedAsset.data && !options.some((a) => a.id === preselectedAsset.data.id)) options.unshift(preselectedAsset.data)

  const submit = useMutation({
    mutationFn: () => ticketsApi.create({ title: title.trim(), description: description.trim(), priority, relatedAssetId: assetId }),
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(`Ticket #${ticket.id} submitted`)
      navigate(`/tickets/${ticket.id}`)
    },
    onError: (error) => {
      const appError = toAppError(error)
      const found: Errors = { ...(appError.fieldErrors as Errors) }
      if (appError.status === 400 && appError.message.includes('asset')) found.relatedAssetId = appError.message
      if (Object.keys(found).length === 0) toast.error(appError.message)
      setErrors(found)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found: Errors = {}
    if (!title.trim()) found.title = 'Please give the issue a short title.'
    if (!description.trim()) found.description = 'Please describe the issue.'
    setErrors(found)
    if (Object.keys(found).length === 0) submit.mutate()
  }

  const optionLabel = (a: Asset) =>
    `${a.assetTag} · ${a.name}${a.assignedTo?.id === user?.id ? ' (Assigned to you)' : a.location ? ` (${a.location})` : ''}`

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-space-lg max-w-4xl mx-auto w-full pb-space-xl">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs text-secondary font-caption text-caption">
            <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/tickets">
              <Icon name="confirmation_number" className="text-[16px]" />
              <span>Tickets</span>
            </Link>
            <Icon name="chevron_right" className="text-[14px] text-outline-variant" />
            <span className="text-on-surface font-body-medium text-body-medium">New Ticket</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs">
            <div>
              <h1 className="font-page-title text-page-title text-on-surface tracking-tight">Submit IT Support Ticket</h1>
              <p className="font-body-default text-body-default text-secondary mt-0.5">
                Report hardware malfunctions, request equipment repair, or log workplace IT issues
              </p>
            </div>
            {stats.data?.avgResolutionHours != null && (
              <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low rounded-xl self-start sm:self-auto text-secondary text-caption font-caption">
                <Icon name="verified_user" className="text-[16px] text-tertiary" />
                <span>Avg resolution: {formatHours(stats.data.avgResolutionHours)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg sm:p-space-xl relative overflow-hidden">
          <form className="flex flex-col gap-space-lg" noValidate onSubmit={onSubmit}>
            <div className="flex flex-col gap-space-xs">
              <label className="font-body-medium text-body-medium text-on-surface flex items-center justify-between" htmlFor="ticket-title">
                <span>
                  Issue Title <span className="text-error font-semibold">*</span>
                </span>
                <span className="font-caption text-caption text-secondary">
                  {title.length} / {TITLE_MAX}
                </span>
              </label>
              <input
                className={`w-full h-10 px-space-md rounded bg-surface-container-lowest text-on-surface font-body-default text-body-default placeholder:text-outline focus:outline-none transition-all ${errors.title ? errorShadow : fieldShadow}`}
                id="ticket-title"
                maxLength={TITLE_MAX}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setErrors((er) => ({ ...er, title: undefined }))
                }}
                placeholder="Brief summary of the issue (e.g. Monitor display blinking or battery not charging)"
                type="text"
                value={title}
              />
              {errors.title && <FieldError message={errors.title} />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              <div className="flex flex-col gap-space-xs">
                <label className="font-body-medium text-body-medium text-on-surface flex items-center gap-1.5" htmlFor="related-asset">
                  <span>Related Asset</span>
                  <span className="font-caption text-caption text-secondary font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <select
                    className={`w-full h-10 pl-space-md pr-10 rounded bg-surface-container-lowest text-on-surface font-body-default text-body-default appearance-none focus:outline-none transition-all cursor-pointer ${errors.relatedAssetId ? errorShadow : fieldShadow}`}
                    id="related-asset"
                    onChange={(e) => {
                      setAssetId(e.target.value ? Number(e.target.value) : null)
                      setErrors((er) => ({ ...er, relatedAssetId: undefined }))
                    }}
                    value={assetId ?? ''}
                  >
                    {options.map((a) => (
                      <option key={a.id} value={a.id}>{optionLabel(a)}</option>
                    ))}
                    <option value="">Device not listed / General workplace issue</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-secondary">
                    <Icon name="keyboard_arrow_down" className="text-[20px]" />
                  </div>
                </div>
                {errors.relatedAssetId ? (
                  <FieldError message={errors.relatedAssetId} />
                ) : (
                  <p className="font-caption text-caption text-secondary flex items-center gap-1 mt-0.5">
                    <Icon name="info" className="text-[14px] text-primary" />
                    {isAdmin ? 'Showing all company assets' : `Only showing hardware directly linked to ${user?.fullName}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="font-body-medium text-body-medium text-on-surface">
                  Priority Level <span className="text-error font-semibold">*</span>
                </span>
                <div className="grid grid-cols-3 gap-space-xs h-10 p-1 bg-surface-container rounded-lg items-center" role="radiogroup">
                  {TICKET_PRIORITIES.map((p) => {
                    const active = priority === p
                    return (
                      <button
                        key={p}
                        aria-checked={active}
                        className={
                          active
                            ? `h-8 rounded flex items-center justify-center gap-1 font-tag-label text-tag-label transition-all bg-surface-container-lowest ${PRIORITY[p].active} shadow-xs font-semibold`
                            : 'h-8 rounded flex items-center justify-center gap-1 font-tag-label text-tag-label transition-all text-secondary hover:text-on-surface'
                        }
                        onClick={() => setPriority(p)}
                        role="radio"
                        type="button"
                      >
                        <span className={`w-2 h-2 rounded-full ${PRIORITY[p].dot}`} />
                        <span>{p}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="font-caption text-caption text-secondary mt-0.5">{PRIORITY[priority].hint}</p>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label className="font-body-medium text-body-medium text-on-surface flex items-center justify-between" htmlFor="ticket-description">
                <span>
                  Description <span className="text-error font-semibold">*</span>
                </span>
                <span className="font-caption text-caption text-secondary">
                  {description.length} / {DESCRIPTION_MAX}
                </span>
              </label>
              <textarea
                className={`w-full p-space-md rounded bg-surface-container-lowest text-on-surface font-body-default text-body-default placeholder:text-outline focus:outline-none transition-all resize-y ${errors.description ? errorShadow : fieldShadow}`}
                id="ticket-description"
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setErrors((er) => ({ ...er, description: undefined }))
                }}
                placeholder="Provide specific details: when did the issue start, error messages displayed, and steps to reproduce..."
                rows={5}
                value={description}
              />
              {errors.description && <FieldError message={errors.description} />}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-space-sm pt-space-md border-t border-surface-container">
              <button
                className="w-full sm:w-auto h-9 px-space-lg rounded bg-surface-container-lowest text-on-surface font-body-medium text-body-medium hover:bg-surface-container transition-all shadow-[inset_0_0_0_1px_rgba(114,119,134,0.25)] flex items-center justify-center"
                onClick={() => navigate(-1)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="w-full sm:w-auto h-9 px-space-xl rounded bg-primary text-on-primary font-body-medium text-body-medium hover:bg-primary-container shadow-sm transition-all flex items-center justify-center gap-space-xs disabled:opacity-70 disabled:cursor-wait"
                disabled={submit.isPending}
                type="submit"
              >
                <Icon name={submit.isPending ? 'progress_activity' : 'send'} className={`text-[18px] ${submit.isPending ? 'animate-spin' : ''}`} />
                <span>{submit.isPending ? 'Submitting…' : 'Submit Ticket'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <HelpCard icon="headset_mic" iconClass="text-primary" title="Urgent Outages?">
            If a whole floor or a shared system is down, call the IT service desk as well as logging a ticket.
          </HelpCard>
          <HelpCard icon="quick_reference" iconClass="text-tertiary" title="Quick Troubleshooting">
            Restarting the device and checking cables and power fixes many issues — worth a try before filing.
          </HelpCard>
          <HelpCard icon="security_update_good" iconClass="text-secondary" title="Track Progress">
            Follow your ticket on the Tickets page; IT updates its status and adds a note when it is resolved.
          </HelpCard>
        </div>
      </div>
    </div>
  )
}

function HelpCard({ icon, iconClass, title, children }: { icon: string; iconClass: string; title: string; children: string }) {
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl flex items-start gap-space-sm shadow-sm">
      <Icon name={icon} className={`${iconClass} text-[20px] mt-0.5`} />
      <div>
        <h4 className="font-body-medium text-body-medium text-on-surface">{title}</h4>
        <p className="font-caption text-caption text-secondary mt-0.5">{children}</p>
      </div>
    </div>
  )
}
