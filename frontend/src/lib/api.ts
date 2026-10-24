import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuth } from '@/store/auth'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = useAuth.getState().access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const NO_REFRESH = ['/auth/login/', '/auth/register/', '/auth/refresh/']
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken() {
  const { refresh, setTokens, logout } = useAuth.getState()
  if (!refresh) return null
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh/`, { refresh })
    setTokens(data.access, data.refresh ?? refresh)
    return data.access as string
  } catch {
    logout()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const url = original?.url ?? ''
    if (error.response?.status === 401 && original && !original._retry && !NO_REFRESH.some((p) => url.includes(p))) {
      original._retry = true
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      })
      const token = await refreshing
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      useAuth.getState().openAuth('login')
    }
    return Promise.reject(error)
  },
)

/** Turn a DRF error payload into one readable sentence. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(err instanceof AxiosError)) return fallback
  const data = err.response?.data as unknown
  if (!data) return err.message || fallback
  if (typeof data === 'string') return fallback
  const first = (v: unknown): string | null => {
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.map(first).find(Boolean) ?? null
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>
      for (const key of ['detail', 'message', 'non_field_errors']) if (obj[key]) return first(obj[key])
      for (const [key, val] of Object.entries(obj)) {
        const msg = first(val)
        if (msg) return key === 'passengers' || /^\d+$/.test(key) ? msg : `${key.replace(/_/g, ' ')}: ${msg}`
      }
    }
    return null
  }
  return first(data) ?? fallback
}

export async function downloadTicket(reference: string) {
  const { data } = await api.get(`/bookings/${reference}/ticket/`, { responseType: 'blob' })
  const url = URL.createObjectURL(data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GoTravels-${reference}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
