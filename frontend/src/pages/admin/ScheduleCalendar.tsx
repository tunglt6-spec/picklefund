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
import { cn } from '../../lib/utils'
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
  const goToday = () => {
    const t = new Date()
    setYear(t.getFullYear()); setMonth(t.getMonth())
    setSelected(key(t.getFullYear(), t.getMonth(), t.getDate()))
  }

  return (
    <PageShell maxWidth={1120}>
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
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Cột lịch (2/3 trên desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* Thanh điều hướng tháng */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} aria-label="Tháng trước" className="flex h-10 w-10 items-center justify-center rounded-full border [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                  <ChevronLeft size={18} />
                </button>
                <span className="min-w-[104px] text-center text-base font-bold [color:var(--pf-text)]">{MONTHS[month]} {year}</span>
                <button onClick={nextMonth} aria-label="Tháng sau" className="flex h-10 w-10 items-center justify-center rounded-full border [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                  <ChevronRight size={18} />
                </button>
                <button onClick={goToday} className="ml-1 rounded-full border px-3 h-10 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]">
                  Hôm nay
                </button>
              </div>
              <span className="text-xs [color:var(--pf-color-muted)]">{monthSessionCount} buổi trong tháng</span>
            </div>

            {/* Lưới lịch */}
            <div className="rounded-2xl border p-2.5 sm:p-3 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="pb-1.5 text-center text-[11px] font-semibold [color:var(--pf-color-muted)]">{w}</div>
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
                      className={cn(
                        'group relative flex min-h-[52px] sm:min-h-[76px] flex-col rounded-xl border p-1 sm:p-1.5 text-left transition-colors',
                        isSel
                          ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]'
                          : 'border-transparent hover:[background:var(--pf-surface-muted)]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-[13px] leading-none',
                          isToday
                            ? 'font-bold text-white [background:var(--pf-primary)]'
                            : isSel
                              ? 'font-bold [color:var(--pf-primary)]'
                              : 'font-medium [color:var(--pf-text)]',
                        )}
                      >
                        {d}
                      </span>
                      {count > 0 && (
                        <>
                          {/* Desktop: chip số buổi */}
                          <span className="mt-auto hidden self-start rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:inline-flex [background:var(--pf-primary)] text-white">
                            {count} buổi
                          </span>
                          {/* Mobile: chấm */}
                          <span className="mt-auto h-1.5 w-1.5 rounded-full sm:hidden [background:var(--pf-primary)]" />
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Panel buổi trong ngày chọn (cột phải desktop / dưới mobile) */}
          <div className="rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] lg:self-start" style={{ boxShadow: 'var(--pf-shadow)' }}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold [color:var(--pf-text)]">
              <CalendarDays size={16} className="[color:var(--pf-primary)]" />
              Ngày {selected.split('-').reverse().join('/')}
            </h3>
            {selectedSessions.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm [color:var(--pf-color-muted)] [border-color:var(--pf-border)]">
                Không có buổi chơi trong ngày này.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {selectedSessions.map((s) => (
                  <div key={s.id} className="rounded-xl border p-3.5 [background:var(--pf-bg)] [border-color:var(--pf-border)]">
                    <p className="text-sm font-semibold [color:var(--pf-text)]">
                      {[s.startTime, s.endTime].filter(Boolean).join(' – ') || 'Buổi chơi'}{s.courtName ? ` · ${s.courtName}` : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] [color:var(--pf-color-muted)]">
                      {s._count?.attendanceRecords ?? 0} lượt điểm danh · {s.status === 'completed' ? 'đã hoàn tất' : 'sắp diễn ra'}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => navigate('/session-registration')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]">
                        <CalendarPlus size={14} /> Đăng ký
                      </button>
                      <button onClick={() => navigate('/check-in')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)]">
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
