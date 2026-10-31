import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'

type LinkState = { enabled: boolean; commandsEnabled?: boolean; linked: boolean; displayName?: string; candidate?: string | null }

/**
 * Liên kết tài khoản với Zalo để dùng lệnh /dangky /huy /diemdanh /no của bot.
 * Quản trị/thủ quỹ đã có luồng liên kết trong "Nhập liệu Zalo" khi bật nhập thu/chi nên thẻ này tự ẩn ở trường hợp đó.
 */
export function ZaloMemberLink() {
  const user = useAuthStore((s) => s.user)
  const staff = user?.role === 'CLUB_ADMIN' || user?.role === 'CLUB_TREASURER'
  const [state, setState] = useState<LinkState | null>(null)
  const [code, setCode] = useState<{ command: string; expiresAt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Không xử lý được liên kết Zalo. Vui lòng thử lại.')
  const load = async () => {
    try { setState((await api.get('/member/me/zalo/state')).data.data) } catch { setState(null) }
  }
  useEffect(() => { void load() }, [])
  const run = async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try { await fn() } catch (e) { fail(e) } finally { setBusy(false) }
  }
  if (!state || !state.commandsEnabled) return null
  if (staff && state.enabled) return null
  return (
    <section className="pf-glass rounded-2xl p-4 space-y-3" aria-label="Liên kết Zalo">
      <h3 className="font-bold">Liên kết Zalo</h3>
      <p className="text-sm">Sau khi liên kết, bạn nhắn bot trong nhóm hoặc chat riêng: /dangky, /huy, /diemdanh, /no. Gõ /help để xem đủ lệnh.</p>
      {state.linked ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Đã liên kết{state.displayName ? `: ${state.displayName}` : ''}</span>
          <Button variant="outline" disabled={busy} onClick={() => run(async () => { setState((await api.post('/member/me/zalo/unlink')).data.data); setCode(null) })}>Hủy liên kết</Button>
        </div>
      ) : state.candidate ? (
        <div className="space-y-2">
          <p className="text-sm">Zalo “{state.candidate}” vừa gửi mã. Đúng là bạn?</p>
          <Button disabled={busy} onClick={() => run(async () => { setState((await api.post('/member/me/zalo/confirm-link')).data.data); setCode(null); toast.success('Đã liên kết Zalo') })}>Xác nhận liên kết</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button disabled={busy} onClick={() => run(async () => { setCode((await api.post('/member/me/zalo/link-code')).data.data) })}>Tạo mã liên kết</Button>
          {code && <p className="text-sm">Nhắn <b>riêng</b> cho bot (không đăng trong nhóm): <code className="break-all">{code.command}</code> — hiệu lực 10 phút. Rồi bấm Làm mới.</p>}
          <Button variant="outline" disabled={busy} onClick={() => run(load)}>Làm mới</Button>
        </div>
      )}
    </section>
  )
}
