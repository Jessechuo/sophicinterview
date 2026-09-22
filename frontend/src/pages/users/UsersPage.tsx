import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { dashboardApi, usersApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import type { Role, User, UserQuery } from '../../api/types'
import { useAuth } from '../../auth/authContext'
import { ConfirmPopover } from '../../components/ConfirmPopover'
import { Icon } from '../../components/Icon'
import { Pagination } from '../../components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { useToast } from '../../components/toastContext'
import { formatLongDate, initials } from '../../lib/format'
import { useDebounced } from '../../lib/useDebounced'
import { UserFormModal } from './UserFormModal'

type Editing = { mode: 'create' } | { mode: 'edit'; user: User } | null

const selectClass =
  'appearance-none h-8 pl-space-sm pr-8 py-1 bg-surface-container-lowest text-on-surface text-body-default rounded cursor-pointer border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all'

export function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [holding, setHolding] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState<Editing>(null)
  const [exporting, setExporting] = useState(false)
  const debouncedSearch = useDebounced(search.trim())

  const filters: UserQuery = {
    search: debouncedSearch || undefined,
    role: role || undefined,
    hasAssets: holding === '' ? undefined : holding === 'true',
  }
  const query: UserQuery = { ...filters, page, pageSize }
  const users = useQuery({ queryKey: ['users', query], queryFn: () => usersApi.list(query), placeholderData: keepPreviousData })
  // Whole-directory figures for the stat cards (the organisation is small; 100 covers it).
  const everyone = useQuery({ queryKey: ['users', 'all'], queryFn: () => usersApi.list({ pageSize: 100 }) })
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary })

  const remove = useMutation({
    mutationFn: (user: User) => usersApi.remove(user.id),
    onSuccess: (_, user) => {
      toast.success(`${user.fullName} removed`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(toAppError(error).message),
  })

  async function exportExcel() {
    setExporting(true)
    try {
      await usersApi.export(filters)
      toast.success('User list exported to Excel')
    } catch (error) {
      toast.error(toAppError(error).message)
    } finally {
      setExporting(false)
    }
  }

  const all = everyone.data?.items ?? []
  const admins = all.filter((u) => u.role === 'Admin').length
  const holders = all.filter((u) => u.assignedAssetCount > 0).length
  const departments = new Set(all.map((u) => u.department).filter(Boolean)).size
  const refreshedAt = users.dataUpdatedAt ? new Date(users.dataUpdatedAt) : null

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-lg">
        <div>
          <div className="flex items-center gap-space-xs mb-space-xs text-on-surface-variant font-caption text-caption">
            <span>Administration</span>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="text-primary font-medium">Users Management</span>
          </div>
          <h1 className="font-page-title text-page-title text-on-surface tracking-tight">Users Management</h1>
          <p className="font-body-default text-body-default text-on-surface-variant mt-0.5">
            Manage staff accounts, assign roles, and track allocated devices across departments.
          </p>
        </div>
        {refreshedAt && (
          <div className="flex items-center gap-space-sm self-start sm:self-auto">
            <div className="hidden lg:flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container text-on-surface-variant font-caption text-caption">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              <span>
                Directory refreshed: {String(refreshedAt.getHours()).padStart(2, '0')}:{String(refreshedAt.getMinutes()).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
        <UserStat icon="group" iconClass="bg-secondary-container text-primary" label="Total Accounts" value={everyone.data?.totalCount}>
          <span className="font-tag-label text-tag-label text-tertiary inline-flex items-center gap-0.5 mt-0.5">
            <Icon name="trending_up" className="text-[14px]" /> All accounts active
          </span>
        </UserStat>
        <UserStat icon="laptop_mac" iconClass="bg-primary-fixed text-primary" label="Assigned Assets" value={summary.data?.assigned}>
          <span className="font-tag-label text-tag-label text-on-surface-variant inline-flex items-center gap-0.5 mt-0.5">
            Held by {holders} {holders === 1 ? 'person' : 'people'}
          </span>
        </UserStat>
        <UserStat icon="verified_user" iconClass="bg-[#f9f0ff] text-[#722ed1]" label="Privileged Admins" value={everyone.data ? admins : undefined} valueClass="text-[#722ed1]">
          <span className="font-tag-label text-tag-label text-on-surface-variant inline-flex items-center gap-0.5 mt-0.5">Full System Access</span>
        </UserStat>
        <UserStat icon="domain" iconClass="bg-[#f6ffed] text-tertiary" label="Departments" value={everyone.data ? departments : undefined} valueClass="text-tertiary">
          <span className="font-tag-label text-tag-label text-tertiary inline-flex items-center gap-0.5 mt-0.5">
            <Icon name="apartment" className="text-[14px]" /> Across the organisation
          </span>
        </UserStat>
      </div>

      <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm mb-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          <div className="relative w-full sm:w-80">
            <Icon name="search" className="absolute left-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
            <input
              aria-label="Search users"
              className="w-full pl-9 pr-space-sm py-1.5 h-8 bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-default font-body-default rounded border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search name, username or email"
              type="text"
              value={search}
            />
          </div>
          <div className="relative inline-flex">
            <select
              aria-label="Filter by role"
              className={`${selectClass} font-body-medium`}
              onChange={(e) => {
                setRole(e.target.value as Role | '')
                setPage(1)
              }}
              value={role}
            >
              <option value="">Role: All</option>
              <option value="Admin">Role: Admin</option>
              <option value="User">Role: User</option>
            </select>
            <Icon name="expand_more" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]" />
          </div>
          <div className="relative inline-flex">
            <select
              aria-label="Filter by assigned assets"
              className={`${selectClass} font-body-default text-on-surface-variant`}
              onChange={(e) => {
                setHolding(e.target.value as '' | 'true' | 'false')
                setPage(1)
              }}
              value={holding}
            >
              <option value="">Assigned Status: All</option>
              <option value="true">With Assets (&gt;0)</option>
              <option value="false">No Assets (0)</option>
            </select>
            <Icon name="expand_more" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]" />
          </div>
        </div>
        <div className="flex items-center gap-space-sm self-end md:self-auto">
          <button
            className="inline-flex items-center gap-space-xs h-8 px-space-sm bg-surface-container-lowest text-on-surface hover:text-primary rounded font-body-medium text-body-medium border border-[#d9d9d9] hover:bg-surface-container-low transition-colors whitespace-nowrap disabled:opacity-70"
            disabled={exporting}
            onClick={exportExcel}
            type="button"
          >
            <Icon name="table_chart" className="text-[18px] text-tertiary" />
            <span>{exporting ? 'Exporting…' : 'Export to Excel'}</span>
          </button>
          <button
            className="inline-flex items-center gap-space-xs h-8 px-space-md bg-[#1677ff] hover:bg-[#4096ff] text-on-primary rounded font-body-medium text-body-medium shadow-sm transition-colors whitespace-nowrap"
            onClick={() => setEditing({ mode: 'create' })}
            type="button"
          >
            <Icon name="person_add" className="text-[18px]" />
            <span>New User</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-default text-body-default">
            <thead>
              <tr className="bg-[#fafafa] text-on-surface font-table-header text-table-header h-11">
                <th className="px-space-md py-space-sm">Full Name</th>
                <th className="px-space-md py-space-sm">Username</th>
                <th className="px-space-md py-space-sm">Email</th>
                <th className="px-space-md py-space-sm">Role</th>
                <th className="px-space-md py-space-sm">Assigned Assets</th>
                <th className="px-space-md py-space-sm">Created Date</th>
                <th className="px-space-md py-space-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {users.isPending ? (
                <tr>
                  <td colSpan={7}>
                    <LoadingState label="Loading users…" />
                  </td>
                </tr>
              ) : users.isError ? (
                <tr>
                  <td colSpan={7}>
                    <ErrorState message={toAppError(users.error).message} onRetry={() => users.refetch()} />
                  </td>
                </tr>
              ) : users.data.items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon="person_search" message="No users match your filters." />
                  </td>
                </tr>
              ) : (
                users.data.items.map((u) => (
                  <UserRow
                    key={u.id}
                    editing={editing?.mode === 'edit' && editing.user.id === u.id}
                    isSelf={u.id === me?.id}
                    onDelete={() => remove.mutate(u)}
                    onEdit={() => setEditing({ mode: 'edit', user: u })}
                    user={u}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {users.data && (
          <Pagination
            noun="users"
            onChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            page={page}
            pageSize={pageSize}
            total={users.data.totalCount}
            variant="compact"
          />
        )}
      </div>

      {editing && (
        <UserFormModal onClose={() => setEditing(null)} user={editing.mode === 'edit' ? editing.user : undefined} />
      )}
    </div>
  )
}

interface UserStatProps {
  label: string
  value: number | undefined
  icon: string
  iconClass: string
  valueClass?: string
  children: ReactNode
}

function UserStat({ label, value, icon, iconClass, valueClass = 'text-on-surface', children }: UserStatProps) {
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex items-center justify-between">
      <div>
        <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{label}</p>
        <p className={`font-stat-number text-stat-number ${valueClass} mt-1 tabular-nums`}>{value ?? '—'}</p>
        {children}
      </div>
      <div className={`w-10 h-10 rounded-full ${iconClass} flex items-center justify-center`}>
        <Icon name={icon} className="text-[22px]" />
      </div>
    </div>
  )
}

interface UserRowProps {
  user: User
  editing: boolean
  isSelf: boolean
  onEdit: () => void
  onDelete: () => void
}

function UserRow({ user, editing, isSelf, onEdit, onDelete }: UserRowProps) {
  const admin = user.role === 'Admin'
  return (
    <tr className={editing ? 'bg-[#e6f4ff]/30 hover:bg-[#e6f4ff]/60 transition-colors group' : 'hover:bg-[#f5f7fa] transition-colors group'}>
      <td className="px-space-md py-space-sm">
        <div className="flex items-center gap-space-sm">
          <div
            aria-hidden="true"
            className={`w-8 h-8 rounded-full ${admin ? 'bg-[#f9f0ff] text-[#722ed1]' : 'bg-[#e6f4ff] text-primary'} flex items-center justify-center font-body-medium text-body-medium font-semibold shadow-xs shrink-0`}
          >
            {initials(user.fullName)}
          </div>
          <div>
            <span className={`font-body-medium text-body-medium text-on-surface block leading-tight ${editing ? 'font-semibold' : ''}`}>
              {user.fullName}
              {isSelf && <span className="font-caption text-caption text-on-surface-variant font-normal"> (you)</span>}
            </span>
            {editing ? (
              <span className="font-caption text-caption text-primary font-medium">Currently Editing</span>
            ) : (
              <span className="font-caption text-caption text-on-surface-variant">{user.department ?? 'No department'}</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-space-md py-space-sm font-caption text-caption text-on-surface-variant">{user.username}</td>
      <td className="px-space-md py-space-sm text-on-surface">{user.email}</td>
      <td className="px-space-md py-space-sm">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded font-tag-label text-tag-label ${admin ? 'bg-[#f9f0ff] text-[#722ed1]' : 'bg-[#e6f4ff] text-[#1677ff]'}`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-space-md py-space-sm">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-tag-label text-tag-label bg-surface-container text-on-surface whitespace-nowrap">
          <Icon name="devices" className="text-[14px] text-primary" />
          {user.assignedAssetCount} {user.assignedAssetCount === 1 ? 'asset' : 'assets'}
        </span>
      </td>
      <td className="px-space-md py-space-sm font-caption text-caption text-on-surface-variant whitespace-nowrap">{formatLongDate(user.createdAt)}</td>
      <td className="px-space-md py-space-sm text-right">
        <div className="inline-flex items-center gap-1">
          <button
            aria-label={`Edit ${user.fullName}`}
            className={
              editing
                ? 'p-1 rounded text-primary bg-surface-container transition-colors'
                : 'p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors'
            }
            onClick={onEdit}
            title="Edit User"
            type="button"
          >
            <Icon name="edit" className="text-[18px]" />
          </button>
          {!isSelf && (
            <ConfirmPopover confirmLabel="Remove" message={`Remove ${user.fullName}? They will no longer be able to sign in.`} onConfirm={onDelete}>
              {({ open, toggle }) => (
                <button
                  aria-label={`Delete ${user.fullName}`}
                  className={
                    open
                      ? 'p-1 rounded text-error bg-error-container/30 transition-colors'
                      : 'p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors'
                  }
                  onClick={toggle}
                  title="Delete User"
                  type="button"
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              )}
            </ConfirmPopover>
          )}
        </div>
      </td>
    </tr>
  )
}
