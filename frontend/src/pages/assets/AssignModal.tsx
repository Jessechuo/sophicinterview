import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { assetsApi, usersApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import type { Asset, User } from '../../api/types'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import { todayIso } from '../../lib/format'
import { categoryIcon } from '../../lib/labels'
import { useDebounced } from '../../lib/useDebounced'

interface AssignModalProps {
  asset: Asset
  onClose: () => void
}

const userLabel = (u: Pick<User, 'fullName' | 'department'>) => (u.department ? `${u.fullName} (${u.department})` : u.fullName)

export function AssignModal({ asset, onClose }: AssignModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<User | null>(null)
  const [listOpen, setListOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')
  const debounced = useDebounced(search.trim())
  const searchRef = useRef<HTMLInputElement>(null)

  const users = useQuery({
    queryKey: ['users', { search: debounced, pageSize: 50 }],
    queryFn: () => usersApi.list({ search: debounced || undefined, pageSize: 50 }),
  })

  useEffect(() => {
    if (listOpen) searchRef.current?.focus()
  }, [listOpen])

  const assign = useMutation({
    mutationFn: () => assetsApi.assign(asset.id, selected!.id, note.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(['asset', asset.id], updated)
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${asset.assetTag} assigned to ${updated.assignedTo?.fullName}`)
      onClose()
    },
    onError: (error) => toast.error(toAppError(error).message),
  })

  const verb = asset.assignedTo ? 'Reassign' : 'Assign'

  return (
    <Modal
      footer={
        <>
          <button
            className="h-8 px-4 bg-surface-container-lowest text-on-surface font-body-medium text-body-medium rounded-md hover:bg-surface-container-high transition-colors shadow-xs"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-8 px-4 bg-primary text-on-primary font-body-medium text-body-medium font-medium rounded-md hover:bg-primary-container transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!selected || assign.isPending}
            onClick={() => assign.mutate()}
            type="button"
          >
            {assign.isPending ? 'Assigning…' : verb}
          </button>
        </>
      }
      onClose={onClose}
      title={`${verb} ${asset.assetTag}`}
    >
      <div className="flex items-center justify-between p-space-sm px-space-md bg-surface-container-low rounded-lg">
        <div className="flex items-center gap-2">
          <Icon name={categoryIcon[asset.category]} className="text-primary text-[20px]" />
          <span className="font-body-medium text-body-medium font-medium text-on-surface">{asset.name}</span>
        </div>
        <span className="font-mono text-caption font-semibold bg-surface-container-highest px-2 py-0.5 rounded text-on-surface-variant">{asset.assetTag}</span>
      </div>

      <div className="flex flex-col gap-1 relative">
        <label className="font-body-medium text-body-medium text-on-surface font-medium flex items-center gap-1" htmlFor="assignee-search">
          Assignee <span className="text-error">*</span>
        </label>
        <div className="relative">
          <button
            aria-expanded={listOpen}
            className="w-full h-9 px-3 bg-surface-container-lowest rounded-md flex items-center justify-between cursor-pointer shadow-xs hover:bg-surface-container-low/30 transition-colors border border-surface-variant"
            onClick={() => setListOpen((o) => !o)}
            type="button"
          >
            <span className={`font-body-default text-body-default ${selected ? 'text-on-surface' : 'text-outline'}`}>
              {selected ? userLabel(selected) : 'Select a user'}
            </span>
            <Icon name={listOpen ? 'expand_less' : 'expand_more'} className="text-secondary text-[20px]" />
          </button>
          {listOpen && (
            <div className="mt-1 bg-surface-container-lowest rounded-lg shadow-xl py-1 z-10 flex flex-col">
              <div className="px-3 pt-1 pb-2">
                <div className="relative">
                  <Icon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-outline" />
                  <input
                    ref={searchRef}
                    className="w-full h-8 pl-7 pr-2 rounded-md bg-surface-container-low font-caption text-caption text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
                    id="assignee-search"
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email or department"
                    type="text"
                    value={search}
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto" role="listbox">
                {users.isPending && <p className="px-3 py-2 font-caption text-caption text-secondary">Loading users…</p>}
                {users.isError && <p className="px-3 py-2 font-caption text-caption text-error">{toAppError(users.error).message}</p>}
                {users.data?.items.length === 0 && <p className="px-3 py-2 font-caption text-caption text-secondary">No users match your search.</p>}
                {users.data?.items.map((user) => {
                  const isCurrent = user.id === asset.assignedTo?.id
                  const isSelected = user.id === selected?.id
                  return (
                    <button
                      key={user.id}
                      aria-selected={isSelected}
                      className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${
                        isSelected ? 'bg-secondary-container/40' : 'hover:bg-surface-container-low'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      disabled={isCurrent}
                      onClick={() => {
                        setSelected(user)
                        setListOpen(false)
                      }}
                      role="option"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar id={user.id} name={user.fullName} />
                        <div className="flex flex-col">
                          <span className="font-body-medium text-caption font-medium text-on-surface">
                            {user.fullName}
                            {isCurrent && <span className="text-secondary font-normal"> · current holder</span>}
                          </span>
                          <span className="font-caption text-[11px] text-secondary">{user.email}</span>
                        </div>
                      </div>
                      {isSelected && <Icon name="check" className="text-[16px] text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <span className="font-caption text-caption text-secondary flex items-center gap-1 mt-1">
          <Icon name="info" className="text-[14px]" />
          Only active users are listed
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-body-medium text-body-medium text-on-surface font-medium" htmlFor="assign-date">
          Assignment Date
        </label>
        <input
          className="w-full h-9 px-3 bg-surface-container-low rounded-md font-body-default text-body-default text-on-surface-variant focus:outline-none shadow-xs cursor-not-allowed"
          disabled
          id="assign-date"
          type="date"
          value={todayIso()}
        />
        <span className="font-caption text-caption text-secondary">Recorded automatically when you assign.</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-body-medium text-body-medium text-on-surface font-medium" htmlFor="assign-note">
          Notes
        </label>
        <textarea
          className="w-full p-2.5 bg-surface-container-lowest rounded-md font-body-default text-body-default text-on-surface placeholder:text-outline focus:outline-none shadow-xs resize-none border border-surface-variant focus:border-primary"
          id="assign-note"
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Temporary loaner or permanent issue"
          rows={2}
          value={note}
        />
      </div>
    </Modal>
  )
}
