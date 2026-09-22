import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { assetsApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import { ASSET_CATEGORIES, ASSET_STATUSES, type Asset, type AssetCategory, type AssetInput, type AssetStatus } from '../../api/types'
import { Field, InputIcon } from '../../components/Field'
import { inputClass, selectClass, textareaClass } from '../../components/fieldStyles'
import { Icon } from '../../components/Icon'
import { ErrorState, LoadingState } from '../../components/States'
import { StatusBadge } from '../../components/Tags'
import { useToast } from '../../components/toastContext'
import { todayIso } from '../../lib/format'
import { categoryLabel, statusLabel } from '../../lib/labels'

interface FormState {
  assetTag: string
  name: string
  category: AssetCategory
  brand: string
  model: string
  serialNumber: string
  purchaseDate: string
  purchaseCost: string
  location: string
  status: AssetStatus
  notes: string
}

type Errors = Partial<Record<keyof FormState, string>>

const EMPTY: FormState = {
  assetTag: '', name: '', category: 'Laptop', brand: '', model: '', serialNumber: '',
  purchaseDate: '', purchaseCost: '', location: '', status: 'InService', notes: '',
}
const DRAFT_KEY = 'itam.newAssetDraft'

function fromAsset(a: Asset): FormState {
  return {
    assetTag: a.assetTag, name: a.name, category: a.category, brand: a.brand ?? '', model: a.model ?? '',
    serialNumber: a.serialNumber ?? '', purchaseDate: a.purchaseDate ?? '',
    purchaseCost: a.purchaseCost === null ? '' : formatCost(a.purchaseCost), location: a.location ?? '',
    status: a.status, notes: a.notes ?? '',
  }
}

const parseCost = (text: string) => (text.trim() === '' ? null : Number(text.replace(/,/g, '')))
const formatCost = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const blankToNull = (text: string) => (text.trim() === '' ? null : text.trim())

function readDraft(): FormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<FormState>) } : null
  } catch {
    return null
  }
}

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.assetTag.trim()) errors.assetTag = 'Asset tag is required.'
  else if (form.assetTag.trim().length > 20) errors.assetTag = 'Asset tag must be 20 characters or fewer.'
  if (!form.name.trim()) errors.name = 'Name is required.'
  else if (form.name.trim().length > 100) errors.name = 'Name must be 100 characters or fewer.'
  const cost = parseCost(form.purchaseCost)
  if (cost !== null && (Number.isNaN(cost) || cost < 0)) errors.purchaseCost = 'Enter a valid amount of 0 or more.'
  if (form.purchaseDate && form.purchaseDate > todayIso()) errors.purchaseDate = 'Purchase date cannot be in the future.'
  return errors
}

export function AssetFormPage() {
  const { id } = useParams()
  const isEdit = id !== undefined
  const assetId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const existing = useQuery({ queryKey: ['asset', assetId], queryFn: () => assetsApi.get(assetId), enabled: isEdit })
  const [form, setForm] = useState<FormState>(() => (isEdit ? EMPTY : readDraft() ?? EMPTY))
  const [hasDraft, setHasDraft] = useState(() => !isEdit && readDraft() !== null)
  const [errors, setErrors] = useState<Errors>({})
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null)

  // Fill the form once the asset being edited arrives, and again after a conflict reload brings a newer version.
  if (existing.data && existing.data.version !== loadedVersion) {
    setForm(fromAsset(existing.data))
    setLoadedVersion(existing.data.version)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (!isEdit) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
          setHasDraft(true)
        } catch {
          // Draft saving is a convenience only.
        }
      }
      return next
    })
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const save = useMutation({
    mutationFn: (input: AssetInput) => (isEdit ? assetsApi.update(assetId, input) : assetsApi.create(input)),
    onSuccess: (asset) => {
      if (!isEdit) localStorage.removeItem(DRAFT_KEY)
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.setQueryData(['asset', asset.id], asset)
      toast.success(isEdit ? 'Asset updated successfully' : 'Asset created successfully')
      navigate(`/assets/${asset.id}`)
    },
    onError: (error) => {
      const appError = toAppError(error)
      const serverErrors: Errors = { ...(appError.fieldErrors as Errors) }
      if (appError.status === 409 && appError.message.startsWith('Asset tag')) serverErrors.assetTag = appError.message
      else if (appError.status === 409 && appError.message.startsWith('Serial number')) serverErrors.serialNumber = appError.message
      else if (appError.status === 409 && isEdit && appError.message.includes('changed by someone else')) {
        toast.error('Someone else changed this asset. The latest version has been loaded — review and save again.')
        existing.refetch()
      } else if (Object.keys(serverErrors).length === 0) toast.error(appError.message)
      setErrors(serverErrors)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    save.mutate({
      assetTag: form.assetTag.trim(),
      name: form.name.trim(),
      category: form.category,
      brand: blankToNull(form.brand),
      model: blankToNull(form.model),
      serialNumber: blankToNull(form.serialNumber),
      purchaseDate: form.purchaseDate || null,
      purchaseCost: parseCost(form.purchaseCost),
      location: blankToNull(form.location),
      status: form.status,
      notes: blankToNull(form.notes),
      version: isEdit ? loadedVersion ?? undefined : undefined,
    })
  }

  if (isEdit && existing.isPending) return <LoadingState label="Loading asset…" />
  if (isEdit && existing.isError) return <ErrorState message={toAppError(existing.error).message} onRetry={() => existing.refetch()} />

  const title = isEdit ? `Edit ${existing.data?.assetTag ?? 'Asset'}` : 'Create New Asset'

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-1 mb-6">
        <nav className="flex items-center gap-1 text-on-surface-variant font-caption text-caption mb-1">
          <Link className="hover:text-primary transition-colors" to="/assets">Assets</Link>
          <span className="text-outline">/</span>
          {isEdit && existing.data && (
            <>
              <Link className="hover:text-primary transition-colors" to={`/assets/${assetId}`}>{existing.data.assetTag}</Link>
              <span className="text-outline">/</span>
            </>
          )}
          <span className="text-on-surface font-medium">{isEdit ? 'Edit' : 'New Asset'}</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-semibold tracking-tight">{title}</h1>
            <p className="font-body-default text-body-default text-on-surface-variant mt-0.5">
              {isEdit ? 'Update the hardware details recorded for this asset' : 'Register a new hardware or network asset in the inventory system'}
            </p>
          </div>
          {!isEdit && hasDraft && (
            <div className="flex items-center gap-2">
              <span className="font-tag-label text-tag-label px-2.5 py-1 bg-surface-container-high text-on-surface-variant rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1677ff]" />
                Form Draft Auto-Saved
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl w-full bg-surface-container-lowest rounded-lg border border-slate-200 p-8 shadow-sm mb-12">
        <form className="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex flex-col gap-5">
              <Field error={errors.assetTag} htmlFor="asset-tag" label="Asset Tag" required>
                <div className="relative">
                  <input
                    aria-describedby={errors.assetTag ? 'asset-tag-error' : undefined}
                    aria-invalid={Boolean(errors.assetTag)}
                    className={inputClass(errors.assetTag)}
                    id="asset-tag"
                    maxLength={20}
                    onChange={(e) => set('assetTag', e.target.value)}
                    placeholder="e.g. AST-0031"
                    type="text"
                    value={form.assetTag}
                  />
                  {errors.assetTag && <InputIcon name="error" tone="text-error" />}
                </div>
              </Field>
              <Field error={errors.category} htmlFor="asset-category" label="Category" required>
                <div className="relative">
                  <select className={selectClass(errors.category)} id="asset-category" onChange={(e) => set('category', e.target.value as AssetCategory)} value={form.category}>
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{categoryLabel[c]}</option>
                    ))}
                  </select>
                  <InputIcon name="expand_more" />
                </div>
              </Field>
              <Field error={errors.brand} htmlFor="asset-brand" label="Brand">
                <input className={inputClass(errors.brand)} id="asset-brand" maxLength={50} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Dell, Apple, Lenovo" type="text" value={form.brand} />
              </Field>
              <Field error={errors.serialNumber} htmlFor="asset-serial" label="Serial Number">
                <input className={inputClass(errors.serialNumber)} id="asset-serial" maxLength={100} onChange={(e) => set('serialNumber', e.target.value)} placeholder="e.g. SN-8829104" type="text" value={form.serialNumber} />
              </Field>
              <Field error={errors.purchaseDate} htmlFor="asset-purchase-date" label="Purchase Date">
                <div className="relative">
                  <input
                    className={`${inputClass(errors.purchaseDate)} pl-3 pr-8`}
                    id="asset-purchase-date"
                    max={todayIso()}
                    onChange={(e) => set('purchaseDate', e.target.value)}
                    type="date"
                    value={form.purchaseDate}
                  />
                  <InputIcon name="calendar_today" />
                </div>
              </Field>
            </div>

            <div className="flex flex-col gap-5">
              <Field error={errors.name} htmlFor="asset-name" label="Name" required>
                <input className={inputClass(errors.name)} id="asset-name" maxLength={100} onChange={(e) => set('name', e.target.value)} placeholder='e.g. MacBook Pro 16", Dell XPS 15' type="text" value={form.name} />
              </Field>
              <Field error={errors.status} htmlFor="asset-status" label="Status" required>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center pointer-events-none z-10">
                    <StatusBadge status={form.status} />
                  </div>
                  <select
                    className={`${selectClass(errors.status)} text-transparent [&>option]:text-on-surface`}
                    id="asset-status"
                    onChange={(e) => set('status', e.target.value as AssetStatus)}
                    value={form.status}
                  >
                    {ASSET_STATUSES.map((s) => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                  <InputIcon name="expand_more" />
                </div>
              </Field>
              <Field error={errors.model} htmlFor="asset-model" label="Model">
                <input className={inputClass(errors.model)} id="asset-model" maxLength={50} onChange={(e) => set('model', e.target.value)} placeholder="e.g. Latitude 5540" type="text" value={form.model} />
              </Field>
              <Field error={errors.location} htmlFor="asset-location" label="Location">
                <div className="relative">
                  <input className={inputClass(errors.location)} id="asset-location" maxLength={100} onChange={(e) => set('location', e.target.value)} placeholder="e.g. HQ - Level 2, Server Room B" type="text" value={form.location} />
                  <InputIcon name="business" />
                </div>
              </Field>
              <Field error={errors.purchaseCost} htmlFor="asset-cost" label="Purchase Cost">
                <div
                  className={`flex rounded border transition-all overflow-hidden h-9 ${
                    errors.purchaseCost ? 'border-red-500' : 'border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
                  }`}
                >
                  <span className="inline-flex items-center px-3 bg-surface-container-high text-on-surface-variant font-body-medium text-body-medium border-r border-slate-300 select-none">
                    RM
                  </span>
                  <input
                    className="w-full px-3 text-body-default font-body-default bg-surface-container-lowest text-on-surface focus:outline-none placeholder:text-outline"
                    id="asset-cost"
                    inputMode="decimal"
                    onBlur={() => {
                      const cost = parseCost(form.purchaseCost)
                      if (cost !== null && !Number.isNaN(cost) && cost >= 0) set('purchaseCost', formatCost(cost))
                    }}
                    onChange={(e) => set('purchaseCost', e.target.value)}
                    placeholder="0.00"
                    type="text"
                    value={form.purchaseCost}
                  />
                </div>
              </Field>
            </div>
          </div>

          <Field className="mt-2" error={errors.notes} htmlFor="asset-notes" label="Notes">
            <textarea
              className={textareaClass(errors.notes)}
              id="asset-notes"
              maxLength={1000}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Enter any warranty details, vendor information, or specific hardware configurations..."
              rows={3}
              value={form.notes}
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-200">
            <button
              className="px-5 py-2 rounded-md bg-white border border-slate-300 text-slate-700 font-body-medium text-body-medium hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              onClick={() => navigate(isEdit ? `/assets/${assetId}` : '/assets')}
              type="button"
            >
              Cancel
            </button>
            <button
              className="px-6 py-2 rounded-md bg-[#1677ff] text-white font-body-medium text-body-medium font-medium hover:bg-blue-600 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
              disabled={save.isPending}
              type="submit"
            >
              <Icon name="save" className="text-[18px]" />
              <span>{save.isPending ? 'Saving…' : 'Save Asset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
