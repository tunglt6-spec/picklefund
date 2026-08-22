/**
 * Web Push (PWA mobile) — đăng ký nhận thông báo đẩy trên thiết bị.
 * Dùng service worker của vite-plugin-pwa (đã nạp handler push qua /push-sw.js).
 */
import api from './api'

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getPublicKey(): Promise<string | null> {
  try {
    const res = await api.get('/push/public-key')
    const data = res.data?.data ?? res.data
    return data?.publicKey ?? null
  } catch {
    return null
  }
}

async function getReg(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

/** Đăng ký nhận push. Trả trạng thái để UI hiển thị. */
export async function enablePush(): Promise<'ok' | 'denied' | 'unsupported' | 'no-key' | 'error'> {
  if (!pushSupported()) return 'unsupported'
  const publicKey = await getPublicKey()
  if (!publicKey) return 'no-key'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  const reg = await getReg()
  if (!reg) return 'error'
  try {
    // Ép đăng ký MỚI: hủy sub cũ (có thể tạo bằng VAPID key cũ/khác → server gửi 403 âm thầm)
    // rồi subscribe lại bằng public key hiện tại → key luôn khớp.
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await api.post('/push/unsubscribe', { endpoint: existing.endpoint }).catch(() => undefined)
      await existing.unsubscribe().catch(() => undefined)
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    await api.post('/push/subscribe', sub.toJSON())
    return 'ok'
  } catch {
    return 'error'
  }
}

/** Gửi push thử tới chính mình để kiểm tra end-to-end. Trả tóm tắt từ server. */
export async function sendTestPush(): Promise<{ devices: number; sent: number; errors: string[] } | null> {
  try {
    const res = await api.post('/push/test')
    return (res.data?.data ?? res.data) as { devices: number; sent: number; errors: string[] }
  } catch {
    return null
  }
}

/** Nếu ĐÃ được cấp quyền, âm thầm đồng bộ lại subscription lên server (giữ luôn nhận được). */
export async function syncPushIfGranted(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const publicKey = await getPublicKey()
  if (!publicKey) return
  const reg = await getReg()
  if (!reg) return
  try {
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    await api.post('/push/subscribe', sub.toJSON())
  } catch {
    /* im lặng */
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await getReg()
  if (!reg) return
  try {
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined)
      await sub.unsubscribe().catch(() => undefined)
    }
  } catch {
    /* im lặng */
  }
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}
