/**
 * SessionRegistration (14) — Đăng ký buổi chơi (RSVP). Chọn buổi sắp tới, toggle thành
 * viên đăng ký, lưu. Dùng endpoint mới GET/PUT /attendance/:id/registrations.
 * RSVP TÁCH BIỆT điểm danh thực tế (không ảnh hưởng tính quỹ). V2.2 Clean Modern SaaS.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check, Users, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import {
  PageShell, PageHeader, EmptyState, LoadingState, ErrorState, ActionButton,
} from '../../components/shared'

interface RegRow {
  memberId: string
  memberName: string
  registered: boolean
}

function fmtSession(dateIso: string, courtName?: string, startTime?: string): string {
  const d = new Date(`${dateIso}T00:00:00`)
  const label = isNaN(d.getTime()) ? dateIso : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return [label, startTime, courtName].filter(Boolean).join(' · ')
}

export function SessionRegistration() {
  const user = useAuthStore((s) => s.user)
  const clubId = user?.clubId ?? ''
  const isMember = user?.role === 'MEMBER_VIEW'
  const myMemberId = user?.memberId
  const { sessions } = useClubDataStore((s) => s.getClubData(clubId))

  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sessions
      .filter((s) => new Date(`${s.sessionDate}T00:00:00`) >= today)
      .sort((a, b) => (a.sessionDate < b.sessionDate ? -1 : 1))
  }, [sessions])

  const [sessionId, setSessionId] = useState<string>('')
  const [rows, setRows] = useState<RegRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  // Chọn buổi đầu tiên khi có danh sách
  useEffect(() => {
    if (!sessionId && upcoming.length > 0) setSessionId(upcoming[0].id)
  }, [upcoming, sessionId])

  const loadRegs = useCallback(async (sid: string) => {
    if (!sid) return
    setLoading(true)
    setError(false)
    try {
      const res = await api.get(`/attendance/${sid}/registrations`)
      const data = (res.data?.data ?? []) as RegRow[]
      setRows(data)
      setSelected(new Set(data.filter((r) => r.registered).map((r) => r.memberId)))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRegs(sessionId)
  }, [sessionId, loadRegs])

  const toggle = (memberId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })

  const allSelected = rows.length > 0 && selected.size === rows.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.memberId)))

  // Member self-scope: chỉ toggle CHÍNH mình, lưu ngay qua PUT /member/me/sessions/:id/registration.
  const memberToggleSelf = async () => {
    if (!sessionId || !myMemberId || saving) return
    const register = !selected.has(myMemberId)
    setSaving(true)
    try {
      await api.put(`/member/me/sessions/${sessionId}/registration`, { register })
      toggle(myMemberId)
      setRows((rs) => rs.map((r) => (r.memberId === myMemberId ? { ...r, registered: register } : r)))
      toast.success(register ? 'Đã đăng ký buổi chơi' : 'Đã hủy đăng ký')
    } catch {
      toast.error('Cập nhật đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!sessionId) return
    setSaving(true)
    try {
      await api.put(`/attendance/${sessionId}/registrations`, {
        memberIds: [...selected],
      })
      toast.success('Đã lưu danh sách đăng ký')
      setRows((rs) => rs.map((r) => ({ ...r, registered: selected.has(r.memberId) })))
    } catch {
      toast.error('Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Đăng ký buổi chơi"
        subtitle="Chọn buổi sắp tới và đánh dấu thành viên tham gia"
        actions={
          !isMember && sessionId && rows.length > 0 ? (
            <ActionButton icon={<Save size={16} />} onClick={save} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu đăng ký'}
            </ActionButton>
          ) : undefined
        }
      />

      {upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus size={24} />}
          title="Chưa có buổi chơi sắp tới"
          description="Tạo buổi chơi ở mục Điểm Danh để mở đăng ký tham gia."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Chọn buổi — gom vào 1 box gọn (label + vùng cuộn) */}
          <section
            className="rounded-2xl border p-3.5 sm:p-4"
            style={{ borderColor: 'var(--pf-border)', background: 'var(--pf-surface)', boxShadow: 'var(--pf-shadow)' }}
          >
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--pf-color-muted)' }}>
              <CalendarPlus size={14} /> Chọn buổi sắp tới · {upcoming.length}
            </div>
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
              {upcoming.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSessionId(s.id)}
                  className="rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors"
                  style={
                    sessionId === s.id
                      ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on)', borderColor: 'var(--pf-primary)' }
                      : { color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)', background: 'var(--pf-surface)' }
                  }
                >
                  {fmtSession(s.sessionDate, s.courtName, s.startTime)}
                </button>
              ))}
            </div>
          </section>

          {loading ? (
            <LoadingState rows={5} />
          ) : error ? (
            <ErrorState onRetry={() => void loadRegs(sessionId)} />
          ) : rows.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="Chưa có thành viên hoạt động" />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm [color:var(--pf-color-muted)]">
                  <Users size={15} />
                  <span>
                    <span className="font-bold" style={{ color: 'var(--pf-primary)' }}>{selected.size}</span> / {rows.length} đã đăng ký
                  </span>
                </div>
                {!isMember && (
                  <button type="button" onClick={toggleAll}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] transition-colors">
                    <Check size={13} />{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((r) => {
                  const on = selected.has(r.memberId)
                  const isSelf = r.memberId === myMemberId
                  const disabled = isMember && !isSelf
                  return (
                    <button
                      key={r.memberId}
                      onClick={() => (isMember ? (isSelf ? void memberToggleSelf() : undefined) : toggle(r.memberId))}
                      aria-pressed={on}
                      disabled={disabled}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                      style={{
                        background: on ? 'var(--pf-primary-soft)' : 'var(--pf-surface)',
                        borderColor: on ? 'var(--pf-primary)' : 'var(--pf-border)',
                      }}
                    >
                      <span className="truncate text-sm font-medium [color:var(--pf-text)]">{r.memberName}</span>
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                        style={
                          on
                            ? { background: 'var(--pf-primary)', color: '#fff', borderColor: 'var(--pf-primary)' }
                            : { borderColor: 'var(--pf-border)', color: 'transparent' }
                        }
                      >
                        <Check size={14} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
