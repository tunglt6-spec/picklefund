/**
 * CheckIn (15) — Check-in nhanh một chạm. Chọn buổi (gần hôm nay), tick PRESENT, lưu.
 * Tái dụng endpoint CÓ SẴN: GET /attendance/:id/attendance, GET /attendance/:id/registrations,
 * PUT /attendance/:id/attendance. KHÔNG đổi backend. Ưu tiên hiển thị member đã đăng ký (RSVP).
 * V2.2 Clean Modern SaaS, có loading/error/empty state.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserCheck, Users, Save, ClipboardCheck, Check, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import {
  PageShell, PageHeader, MetricCard, EmptyState, LoadingState, ErrorState, ActionButton,
} from '../../components/shared'

interface Row {
  memberId: string
  memberName: string
  status: 'PRESENT' | 'ABSENT'
  registered: boolean
}

function fmtSession(dateIso: string, courtName?: string, startTime?: string): string {
  const d = new Date(`${dateIso}T00:00:00`)
  const label = isNaN(d.getTime())
    ? dateIso
    : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return [label, startTime, courtName].filter(Boolean).join(' · ')
}

export function CheckIn() {
  const user = useAuthStore((s) => s.user)
  const clubId = user?.clubId ?? ''
  const isMember = user?.role === 'MEMBER_VIEW'
  const myMemberId = user?.memberId
  const { sessions } = useClubDataStore((s) => s.getClubData(clubId))

  // Buổi gần hôm nay nhất trước (check-in thường cho buổi hôm nay); lấy tối đa 12 buổi.
  const sessionOptions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const t = today.getTime()
    return [...sessions]
      .sort(
        (a, b) =>
          Math.abs(new Date(`${a.sessionDate}T00:00:00`).getTime() - t) -
          Math.abs(new Date(`${b.sessionDate}T00:00:00`).getTime() - t),
      )
      .slice(0, 12)
  }, [sessions])

  const [sessionId, setSessionId] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!sessionId && sessionOptions.length > 0) setSessionId(sessionOptions[0].id)
  }, [sessionOptions, sessionId])

  const load = useCallback(async (sid: string) => {
    if (!sid) return
    setLoading(true)
    setError(false)
    try {
      const [attRes, regRes] = await Promise.all([
        api.get(`/attendance/${sid}/attendance`),
        api.get(`/attendance/${sid}/registrations`),
      ])
      const att = (attRes.data?.data ?? []) as { memberId: string; memberName: string; status: 'PRESENT' | 'ABSENT' }[]
      const regSet = new Set(
        ((regRes.data?.data ?? []) as { memberId: string; registered: boolean }[])
          .filter((r) => r.registered)
          .map((r) => r.memberId),
      )
      const merged: Row[] = att
        .map((a) => ({ ...a, registered: regSet.has(a.memberId) }))
        // đã đăng ký lên trước
        .sort((a, b) => Number(b.registered) - Number(a.registered) || a.memberName.localeCompare(b.memberName))
      setRows(merged)
      setPresent(new Set(merged.filter((r) => r.status === 'PRESENT').map((r) => r.memberId)))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(sessionId)
  }, [sessionId, load])

  const toggle = (memberId: string) =>
    setPresent((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })

  // Member self-scope: check-in CHÍNH mình qua PUT /member/me/sessions/:id/checkin (không body).
  const memberCheckInSelf = async () => {
    if (!sessionId || !myMemberId || saving) return
    setSaving(true)
    try {
      await api.put(`/member/me/sessions/${sessionId}/checkin`)
      toast.success('Đã check-in')
      await load(sessionId)
    } catch {
      toast.error('Check-in thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!sessionId) return
    setSaving(true)
    try {
      await api.put(`/attendance/${sessionId}/attendance`, {
        attendance: rows.map((r) => ({
          memberId: r.memberId,
          status: present.has(r.memberId) ? 'PRESENT' : 'ABSENT',
        })),
      })
      toast.success('Đã lưu điểm danh')
      setRows((rs) => rs.map((r) => ({ ...r, status: present.has(r.memberId) ? 'PRESENT' : 'ABSENT' })))
    } catch {
      toast.error('Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const registeredCount = rows.filter((r) => r.registered).length
  const allCheckedIn = rows.length > 0 && present.size === rows.length
  const toggleAllCheckin = () =>
    setPresent(allCheckedIn ? new Set() : new Set(rows.map((r) => r.memberId)))

  return (
    <PageShell>
      <PageHeader
        title="Check-in nhanh"
        subtitle="Chọn buổi chơi và điểm danh một chạm"
        actions={
          !isMember && sessionId && rows.length > 0 ? (
            <ActionButton icon={<Save size={16} />} onClick={save} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu điểm danh'}
            </ActionButton>
          ) : undefined
        }
      />

      {sessionOptions.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={24} />}
          title="Chưa có buổi chơi"
          description="Tạo buổi chơi ở mục Điểm Danh để bắt đầu check-in."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Chọn buổi — dropdown lọc (giống "Lọc theo kỳ" ở Điểm Danh) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Chọn buổi:</span>
            <div className="relative inline-flex items-center max-w-full">
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="max-w-full truncate pl-3 pr-8 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:[border-color:var(--pf-primary)] text-slate-800"
              >
                {sessionOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fmtSession(s.sessionDate, s.courtName, s.startTime)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {loading ? (
            <LoadingState rows={5} />
          ) : error ? (
            <ErrorState onRetry={() => void load(sessionId)} />
          ) : rows.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="Chưa có thành viên hoạt động" />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <MetricCard accent="violet" icon={<UserCheck size={18} />} label="Đã đăng ký" value={registeredCount} />
                <MetricCard accent="green" icon={<Check size={18} />} label="Đã check-in" value={present.size} />
                <MetricCard accent="rose" icon={<Users size={18} />} label="Vắng" value={rows.length - present.size} />
              </div>

              {!isMember && (
                <div className="flex justify-end">
                  <button type="button" onClick={toggleAllCheckin}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] transition-colors">
                    <Check size={13} />{allCheckedIn ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((r) => {
                  const on = present.has(r.memberId)
                  const isSelf = r.memberId === myMemberId
                  const disabled = isMember && (!isSelf || on)
                  return (
                    <button
                      key={r.memberId}
                      onClick={() => (isMember ? (isSelf && !on ? void memberCheckInSelf() : undefined) : toggle(r.memberId))}
                      aria-pressed={on}
                      disabled={disabled}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                      style={{
                        background: on ? 'var(--pf-primary-soft)' : 'var(--pf-surface)',
                        borderColor: on ? 'var(--pf-primary)' : 'var(--pf-border)',
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium [color:var(--pf-text)]">{r.memberName}</span>
                        {r.registered && (
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--pf-primary)' }}>Đã đăng ký</span>
                        )}
                      </span>
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                        style={
                          on
                            ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on)', borderColor: 'var(--pf-primary)' }
                            : { borderColor: 'var(--pf-border)', color: 'transparent' }
                        }
                      >
                        <Check size={15} />
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
