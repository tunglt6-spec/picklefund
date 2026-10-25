export type SignalTone = 'success' | 'warning' | 'danger' | 'neutral'

/** Valid informational readings are green; missing readings never look healthy. */
export function readingSignal(value: unknown): SignalTone {
  if (typeof value === 'number') return Number.isFinite(value) ? value < 0 ? 'danger' : 'success' : 'neutral'
  if (typeof value !== 'string' || !/\d/.test(value) || /đang tải|đang cập nhật|chưa có|không tải/i.test(value)) return 'neutral'
  return /^\s*[−-]\s*\d/.test(value) ? 'danger' : 'success'
}

/** Bright signal marks paired with readable text; module/brand colors stay separate. */
export const SIGNAL_PALETTE = {
  success: { accent: '#22C55E', ink: '#15803D', soft: '#F0FDF4' },
  warning: { accent: '#FACC15', ink: '#A16207', soft: '#FEFCE8' },
  danger: { accent: '#F43F5E', ink: '#C81E3A', soft: '#FFF1F2' },
} as const

export function countSignal(value: unknown, intent: 'healthy' | 'pending' | 'failure'): SignalTone {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'neutral'
  if (intent === 'failure') return value > 0 ? 'danger' : 'success'
  if (intent === 'pending') return value > 0 ? 'warning' : 'success'
  return value > 0 ? 'success' : 'neutral'
}

/** Same interpretation boundaries as backend maika.service: good >=75, average >=50. */
export function clubHealthSignal(score: unknown): SignalTone {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) return 'neutral'
  return score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger'
}

export interface SyncSnapshot {
  now: number
  updatedAt?: number | null
  heartbeatAt?: number | null
  connected?: boolean
  online: boolean
  loading?: boolean
  error?: boolean
  mode?: 'push' | 'poll'
  maxAgeMs?: number
}

/** Data freshness, not an invented business score. Never call polling "Real-time". */
export function syncSignal(s: SyncSnapshot): { tone: SignalTone; label: string } {
  if (!s.online) return { tone: 'danger', label: 'Mất kết nối mạng' }
  const validTime = s.updatedAt != null && Number.isFinite(s.updatedAt) && s.updatedAt <= s.now + 60_000
  if (s.error) return validTime
    ? { tone: 'warning', label: 'Dữ liệu cũ · Chưa cập nhật được' }
    : { tone: 'danger', label: 'Không tải được dữ liệu' }
  if (!validTime) return s.loading
    ? { tone: 'warning', label: 'Đang tải dữ liệu' }
    : { tone: 'neutral', label: 'Chưa có dữ liệu' }
  if (s.now - s.updatedAt! > (s.maxAgeMs ?? 90_000)) return { tone: 'warning', label: 'Dữ liệu cần cập nhật' }
  if (s.loading) return { tone: 'warning', label: 'Đang cập nhật' }
  if (s.mode === 'push') {
    const heartbeatFresh = s.heartbeatAt != null && Number.isFinite(s.heartbeatAt) && s.heartbeatAt <= s.now + 60_000 && s.now - s.heartbeatAt <= 30_000
    return s.connected && heartbeatFresh
      ? { tone: 'success', label: 'Trực tiếp' }
      : { tone: 'warning', label: 'Đồng bộ định kỳ' }
  }
  return { tone: 'success', label: 'Cập nhật định kỳ' }
}
