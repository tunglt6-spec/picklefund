import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

/**
 * useAidoSocket — WebSocket real-time cho AIDO.
 *
 * Kết nối tới gateway backend (path '/ws', khớp nginx). Auth JWT trong handshake. Khi
 * backend đẩy event 'aido:update' (AI Action đổi trạng thái) → gọi onUpdate() để refetch
 * tức thời. Trả về `connected` để UI hiển thị real-time/polling. Token hết hạn → reconnect
 * dùng token mới nhất từ store; nếu mất kết nối, polling (ở component) vẫn là fallback.
 */
export interface AidoUpdatePayload {
  type?: 'ai-action' | 'agent-activity' | 'presence'
  agent?: string
  status?: string
  task?: string
  actionId?: string
  at?: number
}

export function useAidoSocket(
  onUpdate: (payload?: AidoUpdatePayload) => void,
): { connected: boolean } {
  const cbRef = useRef(onUpdate)
  cbRef.current = onUpdate
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const token = useAuthStore.getState().accessToken
    if (!token) return

    const host = window.location.hostname
    const wsUrl =
      (import.meta.env.VITE_WS_URL as string | undefined) ??
      (host.endsWith('picklefund.uk')
        ? 'https://api.picklefund.uk'
        : `${window.location.protocol}//${host}:3000`)

    const socket: Socket = io(wsUrl, {
      path: '/ws',
      transports: ['websocket'],
      auth: { token },
      withCredentials: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
    })

    // Reconnect với token mới nhất (sau khi REST refresh access token).
    socket.io.on('reconnect_attempt', () => {
      socket.auth = { token: useAuthStore.getState().accessToken }
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))
    socket.on('aido:update', (payload: AidoUpdatePayload) => cbRef.current(payload))
    // Nhịp presence nền (Văn phòng AI đang sống) — chỉ báo "còn sống", KHÔNG refetch.
    socket.on('aido:presence', (payload: { at?: number }) =>
      cbRef.current({ type: 'presence', at: payload?.at }),
    )

    return () => {
      socket.disconnect()
    }
  }, [])

  return { connected }
}
