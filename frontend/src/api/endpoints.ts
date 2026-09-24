import { fileNameFrom, saveBlob } from '../lib/download'
import { api } from './client'
import type {
  ActivityLog, ActivityQuery, Asset, AssetInput, AssetQuery, CurrentUser, DashboardSummary, LoginResponse,
  PagedResult, Ticket, TicketInput, TicketQuery, TicketStats, TicketStatus, User, UserCreateInput, UserQuery,
  UserUpdateInput,
} from './types'

// Drops empty filters so the API sees only the ones the user set.
function clean(params: object) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

async function download(url: string, params: object, fallbackName: string) {
  const response = await api.get<Blob>(url, { params: clean(params), responseType: 'blob' })
  saveBlob(response.data, fileNameFrom(response.headers['content-disposition'] as string | undefined, fallbackName))
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/api/auth/login', { username, password }).then((r) => r.data),
  me: () => api.get<CurrentUser>('/api/auth/me').then((r) => r.data),
}

export const assetsApi = {
  list: (query: AssetQuery) =>
    api.get<PagedResult<Asset>>('/api/assets', { params: clean(query) }).then((r) => r.data),
  get: (id: number) => api.get<Asset>(`/api/assets/${id}`).then((r) => r.data),
  create: (input: AssetInput) => api.post<Asset>('/api/assets', input).then((r) => r.data),
  update: (id: number, input: AssetInput) => api.put<Asset>(`/api/assets/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/assets/${id}`).then(() => undefined),
  assign: (id: number, userId: number, note?: string) =>
    api.post<Asset>(`/api/assets/${id}/assign`, { userId, note }).then((r) => r.data),
  unassign: (id: number, note?: string) =>
    api.post<Asset>(`/api/assets/${id}/unassign`, { note }).then((r) => r.data),
  export: (query: AssetQuery) => download('/api/assets/export', query, 'assets.xlsx'),
}

export const activityApi = {
  list: (query: ActivityQuery) =>
    api.get<PagedResult<ActivityLog>>('/api/activity-logs', { params: clean(query) }).then((r) => r.data),
  export: (query: ActivityQuery) => download('/api/activity-logs/export', query, 'activity_log.xlsx'),
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/api/dashboard/summary').then((r) => r.data),
}

export const usersApi = {
  list: (query: UserQuery) => api.get<PagedResult<User>>('/api/users', { params: clean(query) }).then((r) => r.data),
  get: (id: number) => api.get<User>(`/api/users/${id}`).then((r) => r.data),
  departments: () => api.get<string[]>('/api/users/departments').then((r) => r.data),
  create: (input: UserCreateInput) => api.post<User>('/api/users', input).then((r) => r.data),
  update: (id: number, input: UserUpdateInput) => api.put<User>(`/api/users/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/users/${id}`).then(() => undefined),
  export: (query: UserQuery) => download('/api/users/export', query, 'users.xlsx'),
}

export const ticketsApi = {
  list: (query: TicketQuery) =>
    api.get<PagedResult<Ticket>>('/api/tickets', { params: clean(query) }).then((r) => r.data),
  stats: () => api.get<TicketStats>('/api/tickets/stats').then((r) => r.data),
  get: (id: number) => api.get<Ticket>(`/api/tickets/${id}`).then((r) => r.data),
  create: (input: TicketInput) => api.post<Ticket>('/api/tickets', input).then((r) => r.data),
  updateStatus: (id: number, status: TicketStatus, resolutionNote: string | null) =>
    api.put<Ticket>(`/api/tickets/${id}/status`, { status, resolutionNote }).then((r) => r.data),
}
