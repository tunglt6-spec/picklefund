/**
 * ScheduleCalendar (13) — Lịch sinh hoạt CLB dạng lịch tháng. Read-only từ clubDataStore
 * (buổi tập đã sync), KHÔNG gọi backend mới. Click ngày → xem buổi + link Check-in/Đăng ký.
 * V2.2 Clean Modern SaaS. Mobile-first (lịch co giãn, không tràn ngang).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, UserCheck, CalendarPlus } from 'lucide-react'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { PageShell, PageHeader, EmptyState, ActionButton } from '../../components/shared'
import type { AttendanceSession } from '../../types'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']

const pad = (n: number) => String(n).padStart(2, '0')
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

export function ScheduleCalendar() {
  const navigate = useNavigate()
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const { sessions } = useClubDataStore((s) => s.getClubData(clubId))

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string>(key(now.getFullYear(), now.getMonth(), now.getDate()))

  // Buổi theo ngày (YYYY-MM-DD) → danh sách.
  const byDate = useMemo(() => {
    const map: Record<string, AttendanceSession[]> = {}
    for (const s of sessions) {
      const d = (s.sessionDate ?? '').slice(0, 10)
      if (!d) continue
      ;(map[d] ??= []).push(s)
    }
    return map
  }, [sessions])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const lead = (first.getDay() + 6) % 7 // Mon = 0
    const days = new Date(year, month + 1, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < lead; i++) arr.push(null)
    for (let d = 1; d <= days; d++) arr.push(d)
    return arr
  }, [year, month])

  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate())
  const monthSessionCount = cells.reduce<number>(
    (acc, d) => acc + (d ? (byDate[key(year, month, d)]?.length ?? 0) : 0),
    0,
  )
  const selectedSessions = byDate[selected] ?? []

  const prevMonth = () => {
    const m = month - 1
    if (m < 0) { setMonth(11); setYear((y) => y - 1) } else setMonth(m)
  }
  const nextMonth = () => {
    const m = month + 1
    if (m > 11) { setMonth(0); setYear((y) => y + 1) } else setMonth(m)
  }

  return (
    <PageShell>
      <PageHeader
        title="Lịch sinh hoạt"
        subtitle="Lịch tháng các buổi chơi của CLB"
        actions={<ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="Chưa có buổi chơi"
          description="Tạo buổi chơi ở mục Điểm Danh để hiển thị trên lịch."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Thanh điều hướng tháng */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} aria-label="Tháng trước" className="flex h-9 w-9 items-center justify-center rounded-full border [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[110px] text-center text-base font-bold [color:var(--pf-text)]">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} aria-label="Tháng sau" className="flex h-9 w-9 items-center justify-center rounded-full border [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                <ChevronRight size={18} />
              </button>
            </div>
            <span className="text-xs [color:var(--pf-color-muted)]">{monthSessionCount} buổi trong tháng</span>
          </div>

          {/* Lưới lịch */}
          <div className="rounded-2xl border p-3 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-center text-[11px] font-semibold [color:var(--pf-color-muted)]">{w}</div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />
                const k = key(year, month, d)
                const count = byDate[k]?.length ?? 0
                const isToday = k === todayKey
                const isSel = k === selected
                return (
                  <button
                    key={k}
                    onClick={() => setSelected(k)}
                    className="relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors"
                    style={
                      isSel
                        ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on)' }
                        : count > 0
                          ? { background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }
                          : { color: 'var(--pf-text)' }
                    }
                  >
                    <span className={isToday && !isSel ? 'font-extrabold underline' : 'font-medium'}>{d}</span>
                    {count > 0 && (
                      <span
                        className="absolute bottom-1 h-1.5 w-1.5 rounded-full"
                        style={{ background: isSel ? 'var(--pf-primary-on)' : 'var(--pf-primary)' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Buổi trong ngày chọn */}
          <div>
            <h3 className="mb-2 text-sm font-semibold [color:var(--pf-text)]">
              Buổi ngày {selected.split('-').reverse().join('/')}
            </h3>
            {selectedSessions.length === 0 ? (
              <p className="rounded-2xl border p-4 text-sm [color:var(--pf-color-muted)] [background:var(--pf-surface)] [border-color:var(--pf-border)]">
                Không có buổi chơi trong ngày này.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedSessions.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold [color:var(--pf-text)]">
                        {[s.startTime, s.endTime].filter(Boolean).join(' – ') || 'Buổi chơi'}{s.courtName ? ` · ${s.courtName}` : ''}
                      </p>
                      <p className="text-[11px] [color:var(--pf-color-muted)]">
                        {s._count?.attendanceRecords ?? 0} lượt điểm danh · {s.status === 'completed' ? 'đã hoàn tất' : 'sắp diễn ra'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate('/session-registration')} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]">
                        <CalendarPlus size={14} /> Đăng ký
                      </button>
                      <button onClick={() => navigate('/check-in')} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
                        <UserCheck size={14} /> Check-in
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
