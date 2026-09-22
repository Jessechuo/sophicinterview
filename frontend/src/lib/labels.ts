// Display labels and design-system styles for every enum, taken from the Stitch screens.
import type { ActivityAction, AssetCategory, AssetStatus, Role, TicketPriority, TicketStatus } from '../api/types'

export const statusLabel: Record<AssetStatus, string> = {
  InService: 'In Service',
  NeedsRepair: 'Needs Repair',
  UnderMaintenance: 'Under Maintenance',
  Retired: 'Retired',
}

// Asset list tags (assets screen).
export const statusTagClass: Record<AssetStatus, string> = {
  InService: 'bg-tertiary-fixed/30 text-tertiary',
  NeedsRepair: 'bg-error-container text-on-error-container',
  UnderMaintenance: 'bg-amber-50 text-amber-700',
  Retired: 'bg-surface-container-high text-on-surface-variant',
}

// Dotted badges (asset details header and the status select on the asset form).
export const statusBadge: Record<AssetStatus, { box: string; dot: string }> = {
  InService: { box: 'bg-[#f6ffed] border-[#b7eb8f] text-[#52c41a]', dot: 'bg-[#52c41a]' },
  NeedsRepair: { box: 'bg-[#fff2f0] border-[#ffccc7] text-[#ff4d4f]', dot: 'bg-[#ff4d4f]' },
  UnderMaintenance: { box: 'bg-[#fffbe6] border-[#ffe58f] text-[#faad14]', dot: 'bg-[#faad14]' },
  Retired: { box: 'bg-[#f5f5f5] border-[#d9d9d9] text-[#8c8c8c]', dot: 'bg-[#8c8c8c]' },
}

// Status chips inside activity-log diffs ("Status: In Service → Needs Repair").
export const statusChipClass: Record<AssetStatus, string> = {
  InService: 'bg-[#f6ffed] text-[#52c41a]',
  NeedsRepair: 'bg-[#fffbe6] text-[#faad14]',
  UnderMaintenance: 'bg-[#fffbe6] text-[#faad14]',
  Retired: 'bg-surface-container text-on-surface-variant',
}

export const categoryLabel: Record<AssetCategory, string> = {
  Laptop: 'Laptop', Desktop: 'Desktop', Monitor: 'Monitor', Phone: 'Phone', Tablet: 'Tablet',
  Printer: 'Printer', Network: 'Network', Peripheral: 'Peripheral', Other: 'Other',
}

// Icons used in tables, chips and details (assets / tickets screens).
export const categoryIcon: Record<AssetCategory, string> = {
  Laptop: 'laptop_mac',
  Desktop: 'computer',
  Monitor: 'desktop_windows',
  Phone: 'smartphone',
  Tablet: 'tablet_mac',
  Printer: 'print',
  Network: 'hub',
  Peripheral: 'keyboard',
  Other: 'category',
}

// Dashboard "Assets by Category" rows.
export const categoryDashboard: Record<AssetCategory, { icon: string; iconClass: string; barClass: string }> = {
  Laptop: { icon: 'laptop_mac', iconClass: 'text-primary', barClass: 'bg-primary' },
  Desktop: { icon: 'desktop_windows', iconClass: 'text-primary', barClass: 'bg-surface-tint' },
  Monitor: { icon: 'monitor', iconClass: 'text-secondary', barClass: 'bg-secondary' },
  Phone: { icon: 'smartphone', iconClass: 'text-secondary-fixed-dim', barClass: 'bg-primary-container' },
  Tablet: { icon: 'tablet_mac', iconClass: 'text-on-surface-variant', barClass: 'bg-secondary-fixed-dim' },
  Printer: { icon: 'print', iconClass: 'text-error', barClass: 'bg-outline' },
  Network: { icon: 'router', iconClass: 'text-tertiary', barClass: 'bg-tertiary' },
  Peripheral: { icon: 'keyboard', iconClass: 'text-on-surface-variant', barClass: 'bg-outline-variant' },
  Other: { icon: 'category', iconClass: 'text-outline', barClass: 'bg-outline' },
}

export const priorityTag: Record<TicketPriority, { box: string; dot: string }> = {
  High: { box: 'bg-error-container text-error', dot: 'bg-error' },
  Medium: { box: 'bg-surface-container-high text-[#fa8c16]', dot: 'bg-[#fa8c16]' },
  Low: { box: 'bg-secondary-container text-primary', dot: 'bg-primary' },
}

export const ticketStatusLabel: Record<TicketStatus, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
}

export const ticketStatusTag: Record<TicketStatus, { box: string; dot: string }> = {
  Open: { box: 'bg-secondary-container text-primary', dot: 'bg-primary' },
  InProgress: { box: 'bg-[#fffbe6] text-[#faad14]', dot: 'bg-[#faad14]' },
  Resolved: { box: 'bg-[#f6ffed] text-[#52c41a]', dot: 'bg-[#52c41a]' },
  Closed: { box: 'bg-surface-container-high text-secondary', dot: 'bg-secondary' },
}

export const actionTagClass: Record<ActivityAction, string> = {
  Created: 'bg-[#e6f4ff] text-[#1677ff] border-[#91caff]',
  Updated: 'bg-[#fffbe6] text-[#faad14] border-[#ffe58f]',
  Deleted: 'bg-[#fff2f0] text-[#ff4d4f] border-[#ffccc7]',
  Assigned: 'bg-[#f6ffed] text-[#52c41a] border-[#b7eb8f]',
  Unassigned: 'bg-[#f5f5f5] text-[#8c8c8c] border-[#d9d9d9]',
}

// Timeline dot per action (asset details screen).
export const actionDotClass: Record<ActivityAction, string> = {
  Created: 'bg-secondary',
  Updated: 'bg-[#52c41a]',
  Deleted: 'bg-error',
  Assigned: 'bg-primary',
  Unassigned: 'bg-outline',
}

export const roleTagClass: Record<Role, string> = {
  Admin: 'bg-[#f9f0ff] border-[#d3adf7] text-[#722ed1]',
  User: 'bg-[#e6f4ff] border-[#91caff] text-[#1677ff]',
}

export function statusFromLabel(label: string): AssetStatus | undefined {
  return (Object.keys(statusLabel) as AssetStatus[]).find((key) => statusLabel[key] === label)
}
