import axios from 'axios'

// Empty base URL = same origin, served by the Vite proxy in development or a Vercel rewrite.
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '' })

let unauthorizedHandler: (() => void) | null = null

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 on login just means wrong credentials; anywhere else the session has expired.
    if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.includes('/api/auth/login')) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)
