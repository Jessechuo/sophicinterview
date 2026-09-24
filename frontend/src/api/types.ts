// Mirrors the API's DTOs. Enum values are the backend names as sent over the wire.

export type Role = 'Admin' | 'User'
export type AssetCategory =
  | 'Laptop' | 'Desktop' | 'Monitor' | 'Phone' | 'Tablet' | 'Printer' | 'Network' | 'Peripheral' | 'Other'
export type AssetStatus = 'InService' | 'NeedsRepair' | 'UnderMaintenance' | 'Retired'
export type ActivityAction = 'Created' | 'Updated' | 'Deleted' | 'Assigned' | 'Unassigned'
export type TicketPriority = 'Low' | 'Medium' | 'High'
export type TicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed'

export const ASSET_CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Printer', 'Network', 'Peripheral', 'Other',
]
export const ASSET_STATUSES: AssetStatus[] = ['InService', 'NeedsRepair', 'UnderMaintenance', 'Retired']
export const ACTIVITY_ACTIONS: ActivityAction[] = ['Created', 'Updated', 'Deleted', 'Assigned', 'Unassigned']
export const TICKET_PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High']
export const TICKET_STATUSES: TicketStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed']

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export interface UserRef {
  id: number
  username: string
  fullName: string
  email: string
  department: string | null
}

export interface AssetRef {
  id: number
  assetTag: string
  name: string
  category: AssetCategory
}

export interface CurrentUser {
  id: number
  username: string
  fullName: string
  email: string
  role: Role
}

export interface LoginResponse {
  token: string
  expiresAt: string
  user: CurrentUser
}

export interface Asset {
  id: number
  assetTag: string
  name: string
  category: AssetCategory
  brand: string | null
  model: string | null
  serialNumber: string | null
  purchaseDate: string | null
  purchaseCost: number | null
  location: string | null
  status: AssetStatus
  assignedTo: UserRef | null
  assignedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  version: number
}

export interface AssetInput {
  assetTag: string
  name: string
  category: AssetCategory
  brand: string | null
  model: string | null
  serialNumber: string | null
  purchaseDate: string | null
  purchaseCost: number | null
  location: string | null
  status: AssetStatus
  notes: string | null
  version?: number
}

export interface AssetQuery {
  search?: string
  status?: AssetStatus
  category?: AssetCategory
  assigned?: boolean
  needsAttention?: boolean
  assignedToUserId?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface ActivityLog {
  id: number
  asset: AssetRef
  action: ActivityAction
  performedBy: UserRef
  targetUser: UserRef | null
  details: string | null
  timestamp: string
}

export interface ActivityQuery {
  assetId?: number
  action?: ActivityAction
  search?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface CountByKey {
  key: string
  count: number
}

export interface DashboardSummary {
  total: number
  assigned: number
  unassigned: number
  needsAttention: number
  addedLast30Days: number
  byStatus: CountByKey[]
  byCategory: CountByKey[]
}

export interface User {
  id: number
  username: string
  fullName: string
  email: string
  department: string | null
  role: Role
  assignedAssetCount: number
  createdAt: string
}

export interface UserCreateInput {
  username: string
  fullName: string
  email: string
  department: string | null
  role: Role
  password: string
}

export interface UserUpdateInput {
  fullName: string
  email: string
  department: string | null
  role: Role
  password?: string
}

export interface UserQuery {
  search?: string
  role?: Role
  hasAssets?: boolean
  page?: number
  pageSize?: number
}

export interface Ticket {
  id: number
  title: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  createdBy: UserRef
  relatedAsset: AssetRef | null
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface TicketInput {
  title: string
  description: string
  priority: TicketPriority
  relatedAssetId: number | null
}

export interface TicketQuery {
  search?: string
  status?: TicketStatus
  priority?: TicketPriority
  relatedAssetId?: number
  page?: number
  pageSize?: number
}

export interface TicketStats {
  all: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  avgResolutionHours: number | null
}

export interface ProblemDetails {
  title?: string
  status?: number
  detail?: string
  traceId?: string
  errors?: Record<string, string[]>
}
