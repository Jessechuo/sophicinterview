import type { ActivityAction, AssetStatus, Role, TicketPriority, TicketStatus } from '../api/types'
import {
  actionTagClass, priorityTag, roleTagClass, statusBadge, statusLabel, statusTagClass, ticketStatusLabel, ticketStatusTag,
} from '../lib/labels'

export function StatusTag({ status }: { status: AssetStatus }) {
  return (
    <span className={`inline-flex items-center font-tag-label text-tag-label ${statusTagClass[status]} px-space-sm py-0.5 rounded whitespace-nowrap`}>
      {statusLabel[status]}
    </span>
  )
}

export function StatusBadge({ status }: { status: AssetStatus }) {
  const style = statusBadge[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] font-medium border ${style.box} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {statusLabel[status]}
    </span>
  )
}

export function UnassignedTag() {
  return (
    <span className="inline-flex items-center font-tag-label text-tag-label bg-surface-container-high text-on-surface-variant px-space-sm py-0.5 rounded">
      Unassigned
    </span>
  )
}

export function PriorityTag({ priority }: { priority: TicketPriority }) {
  const style = priorityTag[priority]
  return (
    <span className={`inline-flex items-center gap-1 font-tag-label text-tag-label px-2 py-0.5 rounded ${style.box} font-medium whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {priority}
    </span>
  )
}

export function TicketStatusTag({ status }: { status: TicketStatus }) {
  const style = ticketStatusTag[status]
  return (
    <span className={`inline-flex items-center gap-1 font-tag-label text-tag-label px-2 py-0.5 rounded ${style.box} font-medium whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {ticketStatusLabel[status]}
    </span>
  )
}

export function ActionTag({ action }: { action: ActivityAction }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium leading-4 border ${actionTagClass[action]}`}>
      {action}
    </span>
  )
}

export function RoleTag({ role }: { role: Role }) {
  return (
    <span className={`border font-tag-label text-tag-label px-space-sm py-0.5 rounded ${roleTagClass[role]}`}>{role}</span>
  )
}
