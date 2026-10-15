import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  // Timeout mặc định: một nhịp trễ/treo không "đứng" cả màn (màn nặng có thể override).
  timeout: 20_000,
})

/**
 * Gộp các GET GIỐNG HỆT đang chạy cùng lúc thành MỘT request (in-flight dedupe).
 * Nhiều component cùng mở một màn thường tự gọi lại cùng endpoint (vd /clubs/me, /ai/actions/summary, /maika/health-score
 * bị gọi 2 lần khi vào màn) → tốn băng thông + tải máy chủ + (với AI) hạn mức. Mỗi nơi gọi nhận BẢN SAO dữ liệu riêng
 * (không dùng chung tham chiếu). Kết quả được giữ thêm DEDUPE_TTL_MS (2s) để gộp cả các lần gọi NỐI TIẾP nhau rất sát
 * (vd 2 hook cùng nạp khi vào màn); mọi request GHI (POST/PUT/PATCH/DELETE) xoá sạch bộ nhớ này nên dữ liệu sau khi lưu luôn mới.
 * Không áp dụng cho: không phải GET, blob/stream, có AbortSignal, hoặc `dedupe: false`.
 */
const DEDUPE_TTL_MS = 2000
type DedupeConfig = AxiosRequestConfig & { dedupe?: boolean }
const defaultAdapter = axios.getAdapter(api.defaults.adapter as never)
const inflight = new Map<string, Promise<unknown>>()
const cloneData = <T,>(v: T): T => {
  try { return structuredClone(v) } catch { return v }
}
api.defaults.adapter = (config) => {
  const c = config as DedupeConfig
  const method = (c.method ?? 'get').toLowerCase()
  const rt = c.responseType
  if (method !== 'get') {
    inflight.clear() // có thay đổi dữ liệu → bỏ mọi kết quả GET đang giữ
    return defaultAdapter(config)
  }
  if (c.dedupe === false || c.signal || (rt && rt !== 'json' && rt !== 'text')) {
    return defaultAdapter(config)
  }
  const key = `${api.getUri(c)}|${String((c.headers as Record<string, unknown> | undefined)?.Authorization ?? '')}`
  const hit = inflight.get(key)
  if (hit) {
    return (hit as Promise<{ data: unknown }>).then((r) => ({ ...r, data: cloneData(r.data) })) as never
  }
  const p = defaultAdapter(config)
  // Lỗi → bỏ ngay (cho phép thử lại); thành công → giữ thêm TTL ngắn.
  p.then(
    () => { setTimeout(() => { if (inflight.get(key) === p) inflight.delete(key) }, DEDUPE_TTL_MS) },
    () => { if (inflight.get(key) === p) inflight.delete(key) },
  )
  inflight.set(key, p)
  return p.then((r) => ({ ...r, data: cloneData(r.data) })) as never
}

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
