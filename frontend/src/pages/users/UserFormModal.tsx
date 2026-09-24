import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { usersApi } from '../../api/endpoints'
import { toAppError } from '../../api/errors'
import type { Role, User } from '../../api/types'
import { FieldError } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'

interface UserFormModalProps {
  user?: User
  onClose: () => void
}

interface FormState {
  fullName: string
  username: string
  email: string
  department: string
  role: Role
  password: string
}

type Errors = Partial<Record<keyof FormState, string>>

// Sentinel option that swaps the dropdown for a text box.
const ADD_NEW = '__add-new__'

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'Admin', label: 'Admin', hint: 'Full infrastructure access' },
  { value: 'User', label: 'User', hint: 'Standard device custodian' },
]

// Input style from the edit-user modal, with the 1px #d9d9d9 border the design system specifies.
const inputClass = (error?: string) =>
  `w-full pl-9 pr-3 h-9 bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-default font-body-default rounded border focus:outline-none focus:ring-2 ${
    error ? 'border-red-500 focus:ring-red-200' : 'border-[#d9d9d9] focus:border-primary focus:ring-primary/30'
  }`

function validate(form: FormState, isEdit: boolean): Errors {
  const errors: Errors = {}
  if (!form.fullName.trim()) errors.fullName = 'Full name is required.'
  if (!isEdit) {
    if (!form.username.trim()) errors.username = 'Username is required.'
    else if (!/^[A-Za-z0-9._-]{3,50}$/.test(form.username.trim())) errors.username = "Use 3–50 letters, digits, '.', '_' or '-'."
  }
  if (!form.email.trim()) errors.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!isEdit && form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (isEdit && form.password && form.password.length < 8) errors.password = 'New password must be at least 8 characters.'
  return errors
}

export function UserFormModal({ user, onClose }: UserFormModalProps) {
  const isEdit = user !== undefined
  const toast = useToast()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Errors>({})
  const [addingDepartment, setAddingDepartment] = useState(false)
  const departments = useQuery({ queryKey: ['departments'], queryFn: usersApi.departments })
  const [form, setForm] = useState<FormState>({
    fullName: user?.fullName ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    department: user?.department ?? '',
    role: user?.role ?? 'User',
    password: '',
  })

  // The current value must stay in the list, or editing a user would silently clear their department.
  const departmentOptions = [...new Set([...(departments.data ?? []), ...(form.department ? [form.department] : [])])].sort()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const save = useMutation({
    mutationFn: () => {
      const department = form.department.trim() || null
      return isEdit
        ? usersApi.update(user.id, {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            department,
            role: form.role,
            password: form.password || undefined,
          })
        : usersApi.create({
            username: form.username.trim(),
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            department,
            role: form.role,
            password: form.password,
          })
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success(isEdit ? `${saved.fullName} updated` : `${saved.fullName} added`)
      onClose()
    },
    onError: (error) => {
      const appError = toAppError(error)
      const found: Errors = { ...(appError.fieldErrors as Errors) }
      if (appError.status === 409 && appError.message.startsWith('Username')) found.username = appError.message
      else if (appError.status === 409 && appError.message.startsWith('Email')) found.email = appError.message
      else if (appError.status === 409 && appError.message.includes('admin role')) found.role = appError.message
      else if (Object.keys(found).length === 0) toast.error(appError.message)
      setErrors(found)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(form, isEdit)
    setErrors(found)
    if (Object.keys(found).length === 0) save.mutate()
  }

  return (
    <Modal
      footer={
        <>
          <button
            className="h-8 px-4 rounded bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-body-medium text-body-medium shadow-xs transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-8 px-4 rounded bg-[#1677ff] hover:bg-[#4096ff] text-on-primary font-body-medium text-body-medium shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-70"
            disabled={save.isPending}
            form="user-form"
            type="submit"
          >
            <Icon name="check" className="text-[16px]" />
            <span>{save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}</span>
          </button>
        </>
      }
      icon={isEdit ? 'manage_accounts' : 'person_add'}
      onClose={onClose}
      title={isEdit ? `Edit User — ${user.fullName}` : 'New User'}
      widthClass="w-[500px]"
    >
      <form className="space-y-4" id="user-form" noValidate onSubmit={onSubmit}>
        <UserField error={errors.fullName} icon="person" id="user-fullname" label="Full Name" required>
          <input className={inputClass(errors.fullName)} id="user-fullname" maxLength={100} onChange={(e) => set('fullName', e.target.value)} type="text" value={form.fullName} />
        </UserField>
        {!isEdit && (
          <UserField error={errors.username} icon="badge" id="user-username" label="Username" required>
            <input
              autoComplete="off"
              className={inputClass(errors.username)}
              id="user-username"
              maxLength={50}
              onChange={(e) => set('username', e.target.value)}
              placeholder="e.g. siti.aminah"
              type="text"
              value={form.username}
            />
          </UserField>
        )}
        <UserField error={errors.email} icon="mail" id="user-email" label="Email Address" required>
          <input className={inputClass(errors.email)} id="user-email" maxLength={150} onChange={(e) => set('email', e.target.value)} type="email" value={form.email} />
        </UserField>
        <UserField
          error={errors.department}
          hint={
            addingDepartment ? (
              <button
                className="font-caption text-caption text-primary mt-1.5 hover:underline"
                onClick={() => {
                  setAddingDepartment(false)
                  set('department', '')
                }}
                type="button"
              >
                Choose from the list instead
              </button>
            ) : undefined
          }
          icon="domain"
          id="user-department"
          label="Department"
        >
          {addingDepartment ? (
            <input
              autoFocus
              className={inputClass(errors.department)}
              id="user-department"
              maxLength={100}
              onChange={(e) => set('department', e.target.value)}
              placeholder="e.g. Finance Operations"
              type="text"
              value={form.department}
            />
          ) : (
            <>
              <select
                className={`${inputClass(errors.department)} pr-8 appearance-none cursor-pointer`}
                id="user-department"
                onChange={(e) => {
                  if (e.target.value === ADD_NEW) {
                    setAddingDepartment(true)
                    set('department', '')
                  } else set('department', e.target.value)
                }}
                value={form.department}
              >
                <option value="">No department</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value={ADD_NEW}>+ Add new department…</option>
              </select>
              <Icon
                name="expand_more"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none"
              />
            </>
          )}
        </UserField>
        <div>
          <span className="block font-body-medium text-body-medium text-on-surface mb-2">
            System Role <span className="text-error">*</span>
          </span>
          <div className="grid grid-cols-2 gap-space-sm" role="radiogroup">
            {ROLES.map((r) => {
              const checked = form.role === r.value
              return (
                <label
                  key={r.value}
                  className={`flex items-center gap-space-sm p-space-sm rounded-lg cursor-pointer transition-colors ${
                    checked ? 'bg-[#e6f4ff] shadow-xs' : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <input
                    checked={checked}
                    className="w-4 h-4 text-[#1677ff] focus:ring-primary/20 accent-[#1677ff]"
                    name="role"
                    onChange={() => set('role', r.value)}
                    type="radio"
                    value={r.value}
                  />
                  <div>
                    <span className={`font-body-medium text-body-medium block ${checked ? 'text-primary font-semibold' : 'text-on-surface'}`}>{r.label}</span>
                    <span className="font-caption text-caption text-on-surface-variant block">{r.hint}</span>
                  </div>
                </label>
              )
            })}
          </div>
          {errors.role && <FieldError message={errors.role} />}
        </div>
        <UserField
          error={errors.password}
          hint={
            isEdit ? (
              <p className="font-caption text-caption text-on-surface-variant mt-1.5 flex items-center gap-1">
                <Icon name="info" className="text-[14px]" />
                Leave blank to keep the current password
              </p>
            ) : undefined
          }
          icon={isEdit ? 'lock_reset' : 'lock'}
          id="user-password"
          label={isEdit ? 'New Password' : 'Password'}
          optional={isEdit}
          required={!isEdit}
        >
          <input
            autoComplete="new-password"
            className={inputClass(errors.password)}
            id="user-password"
            maxLength={100}
            onChange={(e) => set('password', e.target.value)}
            placeholder={isEdit ? 'Enter new password' : 'At least 8 characters'}
            type="password"
            value={form.password}
          />
        </UserField>
      </form>
    </Modal>
  )
}

interface UserFieldProps {
  id: string
  label: string
  icon: string
  required?: boolean
  optional?: boolean
  error?: string
  hint?: ReactNode
  children: ReactNode
}

function UserField({ id, label, icon, required, optional, error, hint, children }: UserFieldProps) {
  return (
    <div>
      <label className="block font-body-medium text-body-medium text-on-surface mb-1.5" htmlFor={id}>
        {label} {required && <span className="text-error">*</span>}
        {optional && <span className="font-caption text-caption text-on-surface-variant font-normal">(optional)</span>}
      </label>
      <div className="relative">
        <Icon name={icon} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none" />
        {children}
      </div>
      {error ? <FieldError message={error} /> : hint}
    </div>
  )
}
