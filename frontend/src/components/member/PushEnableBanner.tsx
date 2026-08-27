import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { enablePush, pushSupported, pushPermission } from '../../lib/push'

const DISMISS_KEY = 'pf-push-banner-dismissed'

/**
 * Banner nhắc BẬT thông báo đẩy (Web Push) — hiện 1 lần cho tới khi bật hoặc tắt.
 * Web Push bắt buộc opt-in theo từng thiết bị: mỗi tài khoản (member + admin) phải tự
 * cho phép trên máy của mình. Hiện cho MỌI vai trò đã đăng nhập.
 */
export function PushEnableBanner() {
  const role = useAuthStore((s) => s.user?.role)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!role) return // chưa đăng nhập → không nhắc
    if (!pushSupported()) return
    if (pushPermission() !== 'default') return // đã bật hoặc đã chặn → không nhắc
    if (localStorage.getItem(DISMISS_KEY) === '1') return
    setShow(true)
  }, [role])

  if (!show) return null

  const onEnable = async () => {
    setBusy(true)
    try {
      const r = await enablePush()
      if (r === 'ok') {
        toast.success('Đã bật thông báo trên thiết bị này')
        setShow(false)
      } else if (r === 'denied') {
        toast.error('Bạn đã chặn quyền — hãy bật lại trong cài đặt trình duyệt')
        setShow(false)
      } else if (r === 'unsupported') {
        toast.error('Thiết bị/trình duyệt không hỗ trợ (iOS cần "Thêm vào Màn hình chính")')
      } else {
        toast.error('Chưa bật được — thử lại')
      }
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  return (
    <div
      className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-2.5 sm:px-6"
      style={{ background: 'var(--pf-primary-soft)', borderColor: 'var(--pf-border)' }}
    >
      <BellRing size={18} className="shrink-0 [color:var(--pf-primary)]" />
      <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug [color:var(--pf-text)]">
        Bật thông báo trên điện thoại để nhận tin CLB, nhắc nhở & cập nhật quan trọng ngay cả khi không mở app.
      </p>
      <button
        onClick={onEnable}
        disabled={busy}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-white disabled:opacity-60"
        style={{ background: 'var(--pf-primary)' }}
      >
        {busy ? 'Đang bật…' : 'Bật ngay'}
      </button>
      <button onClick={dismiss} aria-label="Để sau" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full [color:var(--pf-color-muted)] hover:[background:var(--pf-surface)]">
        <X size={16} />
      </button>
    </div>
  )
}
