import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  // Timeout mặc định: một nhịp trễ/treo không "đứng" cả màn (màn nặng có thể override).
  timeout: 20_000,
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  // bypass localtunnel interstitial page for API calls on loca.lt tunnels
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.loca.lt')) {
    config.headers['bypass-tunnel-reminder'] = 'true'
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as AxiosRequestConfig & { _retry?: boolean; _retriedGet?: boolean }

    // Tự retry 1 lần cho GET khi lỗi TẠM THỜI (timeout/mất mạng/502/503/504) → chống "chập chờn"
    // trên mọi màn (Dashboard, Báo cáo, ...). Chỉ GET (idempotent) nên an toàn.
    const status = err.response?.status
    const transient = !err.response || status === 502 || status === 503 || status === 504
    const method = (original?.method ?? 'get').toLowerCase()
    if (original && method === 'get' && transient && !original._retriedGet) {
      original._retriedGet = true
      await new Promise((r) => setTimeout(r, 600))
      return api(original)
    }

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    const { accessToken, refreshToken, setTokens, logout } = useAuthStore.getState()
    if (isLocalToken(accessToken)) {
      return Promise.reject(err)
    }

    if (!refreshToken) {
      logout()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` }
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`,
        { refreshToken },
      )
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data
      setTokens(newAccess, newRefresh)
      processQueue(null, newAccess)
      original.headers = { ...original.headers, Authorization: `Bearer ${newAccess}` }
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      logout()
      window.location.href = '/login'
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
