/**
 * pwaInstallStore — trạng thái "Cài app (PWA) ra màn hình chính".
 * - Bắt sự kiện `beforeinstallprompt` (Chrome/Edge/Android) SỚM từ main.tsx để không lỡ sự kiện bắn trước khi React mount.
 * - Safari iOS không có API cài đặt → modal hướng dẫn thao tác Chia sẻ → Thêm vào MH chính.
 * - Một modal duy nhất điều khiển qua store (nút header desktop + menu avatar mobile).
 */
import { create } from 'zustand'

export type InstallPlatform = 'ios' | 'android' | 'desktop'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Nhận diện nền tảng từ userAgent (iPadOS 13+ giả Mac → dùng thêm số điểm chạm). */
export function detectInstallPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** Đang chạy như app đã cài (standalone) → không cần hiện nút cài. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

interface PwaInstallState {
  open: boolean
  installed: boolean
  canPrompt: boolean
  openInstall: () => void
  closeInstall: () => void
  /** Gọi hộp thoại cài đặt gốc của trình duyệt (nếu có). Trả true khi người dùng đồng ý. */
  promptInstall: () => Promise<boolean>
}

let deferred: BeforeInstallPromptEvent | null = null

export const usePwaInstallStore = create<PwaInstallState>((set) => ({
  open: false,
  installed: isStandalone(),
  canPrompt: false,
  openInstall: () => set({ open: true }),
  closeInstall: () => set({ open: false }),
  promptInstall: async () => {
    if (!deferred) return false
    const ev = deferred
    deferred = null
    set({ canPrompt: false })
    try {
      await ev.prompt()
      const choice = await ev.userChoice
      if (choice.outcome === 'accepted') {
        set({ installed: true, open: false })
        return true
      }
    } catch {
      /* trình duyệt từ chối prompt → modal vẫn hiện hướng dẫn thủ công */
    }
    return false
  },
}))

let initialized = false
/** Gọi 1 lần ở main.tsx, trước khi render. */
export function initPwaInstall(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    usePwaInstallStore.setState({ canPrompt: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    usePwaInstallStore.setState({ installed: true, canPrompt: false, open: false })
  })
}
