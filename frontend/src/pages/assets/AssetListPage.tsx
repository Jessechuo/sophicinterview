import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { assetsApi, dashboardApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import { ASSET_CATEGORIES, ASSET_STATUSES, type Asset, type AssetCategory, type AssetQuery, type AssetStatus } from '../../api/types'
import { useAuth } from '../../auth/authContext'
import { Avatar } from '../../components/Avatar'
import { ConfirmPopover } from '../../components/ConfirmPopover'
import { FilterDropdown } from '../../components/FilterDropdown'
import { Icon } from '../../components/Icon'
import { Pagination } from '../../components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { StatusTag, UnassignedTag } from '../../components/Tags'
import { useToast } from '../../components/toastContext'
import { formatDate } from '../../lib/format'
import { categoryIcon, categoryLabel, statusLabel } from '../../lib/labels'
import { useDebounced } from '../../lib/useDebounced'

const PAGE_SIZE = 10
const SORTABLE = [
  { key: 'tag', label: 'Asset Tag' },
  { key: 'name', label: 'Name' },
] as const

export function AssetListPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '')
  const debouncedSearch = useDebounced(searchInput.trim())
  const [exporting, setExporting] = useState(false)

  const status = (params.get('status') ?? '') as AssetStatus | ''
  const category = (params.get('category') ?? '') as AssetCategory | ''
  const assignment = (params.get('assigned') ?? '') as 'true' | 'false' | ''
  const sortBy = params.get('sortBy') ?? ''
  const sortDir = params.get('sortDir') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number(params.get('page')) || 1)

  // Changing any filter returns to the first page; empty values are removed from the URL.
  function update(changes: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (debouncedSearch !== (params.get('search') ?? '')) update({ search: debouncedSearch || null })
    // Only react to the debounced text; `update` reads the latest params itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const filters: AssetQuery = {
    search: params.get('search') ?? undefined,
    status: status || undefined,
    category: category || undefined,
    assigned: assignment === '' ? undefined : assignment === 'true',
    sortBy: sortBy || undefined,
    sortDir: sortBy ? sortDir : undefined,
  }
  const query: AssetQuery = { ...filters, page, pageSize: PAGE_SIZE }

  const assets = useQuery({ queryKey: ['assets', query], queryFn: () => assetsApi.list(query), placeholderData: keepPreviousData })
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary })

  const remove = useMutation({
    mutationFn: (asset: Asset) => assetsApi.remove(asset.id),
    onSuccess: (_, asset) => {
      toast.success(`${asset.assetTag} deleted`)
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(toAppError(error).message),
  })

  async function exportExcel() {
    setExporting(true)
    try {
      await assetsApi.export(filters)
      toast.success('Asset list exported to Excel')
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setExporting(false)
    }
  }

  function toggleSort(key: string) {
    if (sortBy !== key) update({ sortBy: key, sortDir: 'asc' }, false)
    else update({ sortBy: key, sortDir: sortDir === 'asc' ? 'desc' : 'asc' }, false)
  }

  const total = summary.data?.total
  const retired = summary.data?.byStatus.find((s) => s.key === 'Retired')?.count ?? 0
  const operational = total ? (((total - retired) / total) * 100).toFixed(1) : null

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-space-md">
        <div className="flex items-center gap-space-sm">
          <h1 className="font-page-title text-page-title text-on-surface">Assets</h1>
          {total !== undefined && (
            <span className="font-tag-label text-tag-label bg-secondary-container text-on-secondary-fixed font-medium px-space-sm py-0.5 rounded-full shadow-xs">
              {total} total
            </span>
          )}
        </div>
        {operational && (
          <div className="hidden md:flex items-center gap-space-xs text-on-surface-variant font-caption text-caption">
            <span>Lifecycle Estate</span>
            <span>•</span>
            <span className="text-tertiary font-medium">{operational}% Operational Status</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container-lowest shadow-sm mb-space-md">
        <div className="flex flex-wrap items-center gap-space-sm w-full lg:w-auto">
          <div className="relative w-full sm:w-80 lg:w-60 2xl:w-80">
            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline" />
            <input
              aria-label="Search assets"
              className="w-full h-8 pl-8 pr-3 text-caption font-body-default bg-surface text-on-surface rounded-lg placeholder-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by tag, name, brand, serial or assignee"
              type="text"
              value={searchInput}
            />
          </div>
          <FilterDropdown
            label="Status"
            onChange={(v) => update({ status: v })}
            options={ASSET_STATUSES.map((s) => ({ value: s, label: statusLabel[s] }))}
            value={status}
          />
          <FilterDropdown
            label="Category"
            onChange={(v) => update({ category: v })}
            options={ASSET_CATEGORIES.map((c) => ({ value: c, label: categoryLabel[c] }))}
            value={category}
          />
          <FilterDropdown
            label="Assignment"
            onChange={(v) => update({ assigned: v })}
            options={[
              { value: 'true', label: 'Assigned' },
              { value: 'false', label: 'Unassigned' },
            ]}
            value={assignment}
          />
        </div>
        <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end shrink-0">
          <button
            className="h-8 px-space-sm rounded-lg bg-surface hover:bg-surface-container text-on-surface font-body-medium text-body-medium flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap shrink-0 disabled:opacity-70"
            disabled={exporting}
            onClick={exportExcel}
            type="button"
          >
            <Icon name="table_chart" className="text-[18px] text-tertiary" />
            <span>{exporting ? 'Exporting…' : 'Export to Excel'}</span>
          </button>
          {isAdmin && (
            <Link
              className="h-8 px-space-md rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-body-medium text-body-medium flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
              to="/assets/new"
            >
              <Icon name="add" className="text-[18px]" />
              <span>New Asset</span>
            </Link>
          )}
        </div>
      </div>

      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low h-11 text-on-surface font-table-header text-table-header">
                {SORTABLE.map((col) => (
                  <th
                    key={col.key}
                    aria-sort={sortBy === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`py-space-sm px-space-md font-medium tracking-tight ${col.key === 'name' ? 'min-w-[200px]' : ''}`}
                    scope="col"
                  >
                    <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => toggleSort(col.key)} type="button">
                      <span>{col.label}</span>
                      <Icon
                        name={sortBy === col.key ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        className={`text-[15px] ${sortBy === col.key ? 'text-primary' : 'text-outline'}`}
                      />
                    </button>
                  </th>
                ))}
                <th className="py-space-sm px-space-md font-medium tracking-tight" scope="col">Category</th>
                <th className="py-space-sm px-space-md font-medium tracking-tight" scope="col">Status</th>
                <th className="py-space-sm px-space-md font-medium tracking-tight" scope="col">Assigned To</th>
                <th className="py-space-sm px-space-md font-medium tracking-tight" scope="col">Location</th>
                <th className="py-space-sm px-space-md font-medium tracking-tight" scope="col">Purchase Date</th>
                <th className="py-space-sm px-space-md font-medium tracking-tight text-right pr-6" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-table-cell text-table-cell text-on-surface">
              {assets.isPending ? (
                <tr>
                  <td colSpan={8}>
                    <LoadingState label="Loading assets…" />
                  </td>
                </tr>
              ) : assets.isError ? (
                <tr>
                  <td colSpan={8}>
                    <ErrorState message={toAppError(assets.error).message} onRetry={() => assets.refetch()} />
                  </td>
                </tr>
              ) : assets.data.items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon="search_off" message="No assets match your filters." />
                  </td>
                </tr>
              ) : (
                assets.data.items.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    canEdit={isAdmin}
                    onDelete={() => remove.mutate(asset)}
                    onEdit={() => navigate(`/assets/${asset.id}/edit`)}
                    onView={() => navigate(`/assets/${asset.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {assets.data && (
          <Pagination
            noun="assets"
            onChange={(p) => update({ page: p > 1 ? String(p) : null }, false)}
            page={page}
            pageSize={PAGE_SIZE}
            total={assets.data.totalCount}
          />
        )}
      </div>
    </div>
  )
}

interface AssetRowProps {
  asset: Asset
  canEdit: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function AssetRow({ asset, canEdit, onView, onEdit, onDelete }: AssetRowProps) {
  const [confirming, setConfirming] = useState(false)
  const subtitle = [asset.brand, asset.model].filter(Boolean).join(' • ')

  return (
    <tr className={confirming ? 'bg-surface-container/40 hover:bg-surface-container/70 transition-colors' : 'hover:bg-surface transition-colors'}>
      <td className="py-space-sm px-space-md">
        <Link className="font-medium text-primary hover:text-primary-container transition-colors whitespace-nowrap" to={`/assets/${asset.id}`}>
          {asset.assetTag}
        </Link>
      </td>
      <td className="py-space-sm px-space-md">
        <div className="flex flex-col">
          <span className="font-medium text-on-surface">{asset.name}</span>
          {subtitle && <span className="font-caption text-caption text-on-surface-variant">{subtitle}</span>}
        </div>
      </td>
      <td className="py-space-sm px-space-md">
        <div className="flex items-center gap-1.5 text-on-surface-variant whitespace-nowrap">
          <Icon name={categoryIcon[asset.category]} className="text-[16px]" />
          <span>{categoryLabel[asset.category]}</span>
        </div>
      </td>
      <td className="py-space-sm px-space-md">
        <StatusTag status={asset.status} />
      </td>
      <td className="py-space-sm px-space-md">
        {asset.assignedTo ? (
          <div className="flex items-center gap-space-xs">
            <Avatar id={asset.assignedTo.id} name={asset.assignedTo.fullName} />
            <span className="font-body-medium text-on-surface">{asset.assignedTo.fullName}</span>
          </div>
        ) : (
          <UnassignedTag />
        )}
      </td>
      <td className="py-space-sm px-space-md text-on-surface-variant">{asset.location ?? '—'}</td>
      <td className="py-space-sm px-space-md font-caption text-caption text-on-surface-variant whitespace-nowrap">{formatDate(asset.purchaseDate)}</td>
      <td className="py-space-sm px-space-md text-right pr-6">
        <div className="flex items-center justify-end gap-space-xs text-outline">
          <button aria-label={`View ${asset.assetTag}`} className="hover:text-primary p-1 rounded transition-colors" onClick={onView} title="View details" type="button">
            <Icon name="visibility" className="text-[18px]" />
          </button>
          {canEdit && (
            <>
              <button aria-label={`Edit ${asset.assetTag}`} className="hover:text-primary p-1 rounded transition-colors" onClick={onEdit} title="Edit asset" type="button">
                <Icon name="edit" className="text-[18px]" />
              </button>
              <ConfirmPopover message={`Delete ${asset.assetTag}? This cannot be undone.`} onConfirm={onDelete} onOpenChange={setConfirming}>
                {({ open, toggle }) => (
                  <button
                    aria-label={`Delete ${asset.assetTag}`}
                    className={open ? 'text-error bg-error-container/40 p-1 rounded transition-colors' : 'hover:text-error p-1 rounded transition-colors'}
                    onClick={toggle}
                    title="Delete asset"
                    type="button"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                )}
              </ConfirmPopover>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
