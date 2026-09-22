import axios from 'axios'
import type { ProblemDetails } from './types'

export interface AppError {
  status: number
  message: string
  // Keyed by the API's camelCase field names, first message per field.
  fieldErrors: Record<string, string>
}

export function toAppError(error: unknown): AppError {
  if (!axios.isAxiosError(error)) return { status: 0, message: 'Something went wrong. Please try again.', fieldErrors: {} }
  if (!error.response) {
    return { status: 0, message: 'Cannot reach the server. Check your connection and try again.', fieldErrors: {} }
  }

  const { status } = error.response
  const data = (error.response.data instanceof Blob ? undefined : error.response.data) as ProblemDetails | undefined
  const fieldErrors: Record<string, string> = {}
  for (const [key, messages] of Object.entries(data?.errors ?? {})) {
    const field = key.replace(/^\$\./, '')
    if (field && messages.length > 0) fieldErrors[field] = messages[0]
  }

  let message = data?.detail
  if (!message && Object.keys(fieldErrors).length > 0) message = 'Please fix the highlighted fields.'
  if (!message && status === 403) message = "You don't have permission to do that."
  if (!message && status === 404) message = 'The requested record was not found.'
  if (!message) message = data?.title ?? `Request failed (${status}).`
  if (status >= 500 && data?.traceId) message += ` Reference: ${data.traceId}`

  return { status, message, fieldErrors }
}
