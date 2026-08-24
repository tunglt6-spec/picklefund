import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { ActionButton } from '../shared'
import api from '../../lib/api'

// Đồng bộ với bộ lọc thông báo của member (catOf ở MemberNotifications) + pushCategory backend.
const CATEGORIES: { key: string; label: string; desc: string }[] = [
  { key: 'community', label: 'Cộng đồng', desc: 'Bài đăng · bình luận · @nhắc tên · tìm kèo' },
  { key: 'finance', label: 'Tài chính', desc: 'Nộp quỹ · xác nhận · nhắc đóng' },
  { key: 'activity', label: 'Hoạt động', desc: 'Nhắc buổi tập · đăng ký · thông báo khác' },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors"
      style={{ background: on ? 'var(--pf-primary)' : 'var(--pf-color-muted-soft)' }}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

/**
 * Cài đặt thông báo đẩy (push) THÔNG MINH theo LOẠI + GIỜ.
 * - Bật/tắt push theo từng nhóm (community/finance/activity) — trùng bộ lọc thông báo.
 * - "Không làm phiền ban đêm": khung giờ yên tĩnh (không buzz push, in-app vẫn nhận).
 */
export function NotificationSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [muted, setMuted] = useState<Set<string>>(new Set())
  const [quietOn, setQuietOn] = useState(true)
  const [quietStart, setQuietStart] = useState(23)
  const [quietEnd, setQuietEnd] = useState(7)

  const load = useCallback(() => {
    setLoading(true)
    api
      .get('/hermes/preferences')
      .then((r) => {
        const p = r.data?.data ?? r.data
        setMuted(new Set(p?.pushMutedCategories ?? []))
        const qs = p?.quietHoursStart ?? 23
        const qe = p?.quietHoursEnd ?? 7
        setQuietStart(qs)
        setQuietEnd(qe)
        setQuietOn(!(qs === 0 && qe === 0)) // start===end===0 → tắt giờ yên tĩnh
      })
      .catch(() => toast.error('Không tải được cài đặt'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const toggleCat = (key: string, receive: boolean) => {
    setMuted((prev) => {
      const next = new Set(prev)
      if (receive) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.patch('/hermes/preferences', {
        pushMutedCategories: [...muted],
        quietHoursStart: quietOn ? quietStart : 0,
        quietHoursEnd: quietOn ? quietEnd : 0,
      })
      toast.success('Đã lưu cài đặt thông báo')
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cài đặt thông báo"
      subtitle="Chọn nhóm muốn nhận & khung giờ yên tĩnh"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <ActionButton variant="ghost" className="min-h-11" onClick={onClose}>Đóng</ActionButton>
          <ActionButton variant="primary" className="min-h-11" onClick={save} disabled={saving || loading}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </ActionButton>
        </div>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-[13px] [color:var(--pf-color-muted)]">Đang tải…</div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">Nhận thông báo đẩy theo nhóm</p>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 rounded-xl border p-3 [border-color:var(--pf-border)]">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold [color:var(--pf-text)]">{c.label}</p>
                    <p className="text-[12px] [color:var(--pf-color-muted)]">{c.desc}</p>
                  </div>
                  <Toggle on={!muted.has(c.key)} onChange={(v) => toggleCat(c.key, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-3 [border-color:var(--pf-border)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold [color:var(--pf-text)]">Không làm phiền ban đêm</p>
                <p className="text-[12px] [color:var(--pf-color-muted)]">Không đẩy push trong khung giờ này (thông báo vẫn có trong app)</p>
              </div>
              <Toggle on={quietOn} onChange={setQuietOn} />
            </div>
            {quietOn && (
              <div className="mt-3 flex items-center gap-2 text-[13px] [color:var(--pf-text)]">
                <span className="[color:var(--pf-color-muted)]">Từ</span>
                <select value={quietStart} onChange={(e) => setQuietStart(Number(e.target.value))}
                  className="rounded-lg border px-2 py-1.5 [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]">
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
                <span className="[color:var(--pf-color-muted)]">đến</span>
                <select value={quietEnd} onChange={(e) => setQuietEnd(Number(e.target.value))}
                  className="rounded-lg border px-2 py-1.5 [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]">
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
