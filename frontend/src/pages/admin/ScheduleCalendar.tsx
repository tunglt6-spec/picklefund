/**
 * ScheduleCalendar (13) — Lịch sinh hoạt CLB (SCHEDULE-UI-REFRESH-001).
 * Layout SaaS: Header · Month nav · KPI cards · Filter chips · Calendar lớn · Right detail panel.
 * Read-only từ clubDataStore (buổi tập đã sync) + registrations qua endpoint CÓ SẴN
 * (GET /attendance/:id/registrations). Session CRUD dùng API hiện có (POST/PUT/DELETE
 * /attendance). KHÔNG mock dữ liệu; KPI tính từ dữ liệu thật. Mobile-first, không tràn ngang.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, UserCheck, CalendarPlus,
  Users, ClipboardList, Gauge, Pencil, Copy, Trash2, Clock, MapPin, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { PageShell, PageHeader, MetricCard, EmptyState, ActionButton, StatusBadge } from '../../components/shared'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import type { AttendanceSession } from '../../types'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const FULL_WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

type FilterKey = 'all' | 'play' | 'tournament' | 'minigame' | 'meeting'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'play', label: 'Buổi chơi' },
  { key: 'tournament', label: 'Giải đấu' },
  { key: 'minigame', label: 'MiniGame' },
  { key: 'meeting', label: 'Lịch họp' },
]
/** Hiện tại chỉ có buổi chơi (session không có trường type) → coi tất cả là 'play'. */
const hasEventsForFilter = (f: FilterKey) => f === 'all' || f === 'play'

interface RegRow { memberId: string; memberName: string; registered: boolean }
interface RegInfo { registered: number; pool: number; members: RegRow[] }

const pad = (n: number) => String(n).padStart(2, '0')
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const hhmm = (t?: string) => (t ?? '').slice(0, 5)
const isLocalToken = (t?: string | null) => !t || t.startsWith('local-token-') || t.startsWith('token-')

function timeRange(s: AttendanceSession): string {
  const parts = [hhmm(s.startTime), hhmm(s.endTime)].filter(Boolean)
  return parts.length ? parts.join(' - ') : 'Cả ngày'
}
/** Tên buổi suy từ giờ bắt đầu (không có trường tên trong dữ liệu). */
function sessionLabel(s: AttendanceSession): string {
  const h = Number(hhmm(s.startTime).slice(0, 2))
  if (Number.isFinite(h) && hhmm(s.startTime)) {
    if (h < 11) return 'Buổi sáng'
    if (h < 17) return 'Buổi chiều'
    return 'Buổi tối'
  }
  return 'Buổi chơi'
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() || '?'
}

export function ScheduleCalendar() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { sessions, members } = useClubDataStore((s) => s.getClubData(clubId))
  const setSessions = useClubDataStore((s) => s.setSessions)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string>(key(now.getFullYear(), now.getMonth(), now.getDate()))
  const [filter, setFilter] = useState<FilterKey>('all')
  const [regMap, setRegMap] = useState<Record<string, RegInfo>>({})
  const [regLoading, setRegLoading] = useState(false)
  const [confirmDel, setConfirmDel] = useState<AttendanceSession | null>(null)
  const [showAllMembers, setShowAllMembers] = useState<string | null>(null)

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'active').length, [members])

  // Buổi theo ngày (YYYY-MM-DD).
  const byDate = useMemo(() => {
    const map: Record<string, AttendanceSession[]> = {}
    for (const s of sessions) {
      const d = (s.sessionDate ?? '').slice(0, 10)
      if (!d) continue
      ;(map[d] ??= []).push(s)
    }
    for (const d in map) map[d].sort((a, b) => hhmm(a.startTime).localeCompare(hhmm(b.startTime)))
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

  // Buổi trong tháng đang xem (chỉ COMMON play sessions — dữ liệu hiện có).
  const monthSessions = useMemo(
    () => sessions.filter((s) => {
      const d = (s.sessionDate ?? '').slice(0, 10)
      return d.startsWith(`${year}-${pad(month + 1)}`)
    }),
    [sessions, year, month],
  )
  const monthSessionKey = useMemo(() => monthSessions.map((s) => s.id).sort().join(','), [monthSessions])

  // Nạp registrations cho các buổi trong tháng (endpoint có sẵn) → KPI + card + panel.
  const loadRegs = useCallback(async (ids: string[]) => {
    if (ids.length === 0 || isLocalToken(accessToken)) { setRegMap({}); return }
    setRegLoading(true)
    try {
      const res = await Promise.allSettled(ids.map((id) => api.get(`/attendance/${id}/registrations`)))
      const map: Record<string, RegInfo> = {}
      res.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const rows = (r.value.data?.data ?? []) as RegRow[]
          map[ids[i]] = { registered: rows.filter((x) => x.registered).length, pool: rows.length, members: rows }
        }
      })
      setRegMap(map)
    } finally {
      setRegLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadRegs(monthSessionKey ? monthSessionKey.split(',') : [])
  }, [monthSessionKey, loadRegs])

  // KPI (từ dữ liệu thật; regMap có thể trống trên demo → hiển thị 0/…)
  const kpi = useMemo(() => {
    const sessionCount = monthSessions.length
    let totalReg = 0
    let fillSum = 0
    let fillN = 0
    for (const s of monthSessions) {
      const info = regMap[s.id]
      if (info) {
        totalReg += info.registered
        if (info.pool > 0) { fillSum += info.registered / info.pool; fillN += 1 }
      }
    }
    const fillRate = fillN > 0 ? Math.round((fillSum / fillN) * 100) : 0
    return { sessionCount, totalReg, fillRate }
  }, [monthSessions, regMap])

  const monthSessionCount = monthSessions.length
  const selectedSessions = hasEventsForFilter(filter) ? (byDate[selected] ?? []) : []

  const prevMonth = () => { const m = month - 1; if (m < 0) { setMonth(11); setYear((y) => y - 1) } else setMonth(m) }
  const nextMonth = () => { const m = month + 1; if (m > 11) { setMonth(0); setYear((y) => y + 1) } else setMonth(m) }
  const goToday = () => {
    const t = new Date()
    setYear(t.getFullYear()); setMonth(t.getMonth()); setSelected(key(t.getFullYear(), t.getMonth(), t.getDate()))
  }

  const regText = (s: AttendanceSession) => {
    const info = regMap[s.id]
    if (info) return `${info.registered}/${info.pool}`
    return `${s._count?.attendanceRecords ?? 0}` // fallback demo/không tải được
  }

  // ── Actions (API có sẵn) ──
  const handleDelete = async (s: AttendanceSession) => {
    try {
      await api.delete(`/attendance/${s.id}`)
      setSessions(clubId, sessions.filter((x) => x.id !== s.id))
      setConfirmDel(null)
      toast.success('Đã xóa buổi chơi')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Xóa buổi chơi thất bại')
    }
  }
  const handleCopy = async (s: AttendanceSession) => {
    try {
      const res = await api.post('/attendance', {
        fundPeriodId: s.fundPeriodId, sessionDate: s.sessionDate, courtFee: s.courtFee,
        courtName: s.courtName, startTime: s.startTime, endTime: s.endTime, notes: s.notes,
      })
      const created = res.data?.data
      if (created?.id) {
        setSessions(clubId, [{ ...s, id: created.id, _count: { attendanceRecords: 0 } }, ...sessions])
        toast.success('Đã sao chép buổi chơi')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Sao chép thất bại')
    }
  }

  const statusTone = (st: AttendanceSession['status']) => st === 'completed' ? 'neutral' : st === 'cancelled' ? 'danger' : 'success'
  const statusText = (st: AttendanceSession['status']) => st === 'completed' ? 'Đã hoàn tất' : st === 'cancelled' ? 'Đã hủy' : 'Đang mở'

  const selDate = new Date(`${selected}T00:00:00`)
  const selHeading = `${FULL_WEEKDAYS[selDate.getDay()]}, ${selected.split('-').reverse().join('/')}`

  return (
    <PageShell maxWidth={1240}>
      <PageHeader
        title="Lịch sinh hoạt"
        subtitle="Quản lý lịch chơi và đăng ký của CLB"
        actions={<ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="Chưa có buổi chơi"
          description="Tạo buổi chơi ở mục Điểm Danh để hiển thị trên lịch."
          action={<ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard accent="violet" icon={<CalendarDays size={18} />} label="Buổi chơi" value={kpi.sessionCount} sub="trong tháng" />
            <MetricCard accent="teal" icon={<ClipboardList size={18} />} label="Đăng ký" value={regLoading ? '…' : kpi.totalReg} sub="tổng lượt tháng này" />
            <MetricCard accent="blue" icon={<Users size={18} />} label="Thành viên" value={activeMembers} sub="đang hoạt động" />
            <MetricCard accent="amber" icon={<Gauge size={18} />} label="Tỷ lệ lấp đầy" value={regLoading ? '…' : `${kpi.fillRate}%`} sub="đăng ký / thành viên" />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Lọc loại sự kiện">
            {FILTERS.map((f) => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors border"
                  style={active
                    ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on)', borderColor: 'var(--pf-primary)' }
                    : { background: 'var(--pf-surface)', color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)' }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Cột lịch (2/3 desktop) */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {/* Month nav */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} aria-label="Tháng trước" className="flex h-10 w-10 items-center justify-center rounded-full border [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="min-w-[124px] text-center text-base font-bold [color:var(--pf-text)]">{MONTHS[month]} {year}</span>
                  <button onClick={nextMonth} aria-label="Tháng sau" className="flex h-10 w-10 items-center justify-center rounded-full border [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={goToday} className="ml-1 h-10 rounded-full border px-3 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]">
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
                    if (d === null) return <div key={`b${i}`} className="min-h-[52px] sm:min-h-[112px] rounded-xl opacity-40" />
                    const k = key(year, month, d)
                    const daySessions = hasEventsForFilter(filter) ? (byDate[k] ?? []) : []
                    const isToday = k === todayKey
                    const isSel = k === selected
                    return (
                      <button
                        key={k}
                        onClick={() => setSelected(k)}
                        aria-label={`Ngày ${d}${daySessions.length ? `, ${daySessions.length} buổi` : ''}`}
                        aria-pressed={isSel}
                        className={cn(
                          'group relative flex min-h-[52px] sm:min-h-[112px] flex-col gap-1 rounded-xl border p-1 sm:p-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:[--tw-ring-color:var(--pf-primary)]',
                          isSel ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]' : 'border-transparent hover:[background:var(--pf-surface-muted)]',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-[13px] leading-none',
                            isToday ? 'font-bold text-white [background:var(--pf-primary)]'
                              : isSel ? 'font-bold [color:var(--pf-primary)]' : 'font-medium [color:var(--pf-text)]',
                          )}
                        >
                          {d}
                        </span>

                        {/* Desktop: event mini-cards (tối đa 2 + more) */}
                        {daySessions.length > 0 && (
                          <div className="hidden sm:flex flex-col gap-1 overflow-hidden">
                            {daySessions.slice(0, 2).map((s) => (
                              <div key={s.id} className="rounded-md border-l-2 px-1.5 py-1 [border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]">
                                <p className="truncate text-[10px] font-semibold [color:var(--pf-primary)]">{timeRange(s)}</p>
                                <p className="truncate text-[10px] [color:var(--pf-color-muted)]">{sessionLabel(s)} · {regText(s)}</p>
                              </div>
                            ))}
                            {daySessions.length > 2 && (
                              <span className="text-[10px] font-semibold [color:var(--pf-primary)]">+{daySessions.length - 2} buổi</span>
                            )}
                          </div>
                        )}
                        {/* Mobile: chấm */}
                        {daySessions.length > 0 && (
                          <span className="mt-auto h-1.5 w-1.5 rounded-full sm:hidden [background:var(--pf-primary)]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right detail panel */}
            <div className="rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] lg:self-start" style={{ boxShadow: 'var(--pf-shadow)' }}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold [color:var(--pf-text)]">
                <CalendarDays size={16} className="[color:var(--pf-primary)]" />
                {selHeading}
              </h3>

              {selectedSessions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center [border-color:var(--pf-border)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full [background:var(--pf-primary-soft)]">
                    <CalendarDays size={22} className="[color:var(--pf-primary)]" />
                  </div>
                  <p className="text-sm font-medium [color:var(--pf-text)]">Không có buổi chơi trong ngày này</p>
                  <ActionButton icon={<Plus size={15} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedSessions.map((s) => {
                    const info = regMap[s.id]
                    const reg = info?.registered ?? (s._count?.attendanceRecords ?? 0)
                    const pool = info?.pool ?? activeMembers
                    const pct = pool > 0 ? Math.min(100, Math.round((reg / pool) * 100)) : 0
                    const registeredMembers = (info?.members ?? []).filter((m) => m.registered)
                    const showAll = showAllMembers === s.id
                    const visible = showAll ? registeredMembers : registeredMembers.slice(0, 6)
                    return (
                      <div key={s.id} className="rounded-xl border p-3.5 [background:var(--pf-bg)] [border-color:var(--pf-border)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-bold [color:var(--pf-text)]">
                              <Clock size={13} className="[color:var(--pf-primary)]" />{timeRange(s)}
                            </p>
                            <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">{sessionLabel(s)}{s.courtName ? <span className="inline-flex items-center gap-1"> · <MapPin size={11} />{s.courtName}</span> : ''}</p>
                          </div>
                          <StatusBadge tone={statusTone(s.status)}>{statusText(s.status)}</StatusBadge>
                        </div>

                        {/* Progress đăng ký */}
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] [color:var(--pf-color-muted)]">
                            <span>Đăng ký</span>
                            <span className="font-semibold [color:var(--pf-text)]">{info ? `${reg}/${pool}` : `${reg}`}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full [background:var(--pf-surface-muted)]">
                            <div className="h-full rounded-full [background:var(--pf-primary)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Người tham gia */}
                        {registeredMembers.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-1.5 text-[11px] font-semibold [color:var(--pf-color-muted)]">Người tham gia ({registeredMembers.length})</p>
                            <div className="flex flex-col gap-1.5">
                              {visible.map((m) => (
                                <div key={m.memberId} className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{initials(m.memberName)}</span>
                                  <span className="truncate text-xs [color:var(--pf-text)]">{m.memberName}</span>
                                  <UserCheck size={12} className="ml-auto [color:var(--pf-color-secondary,var(--pf-primary))]" />
                                </div>
                              ))}
                            </div>
                            {registeredMembers.length > 6 && (
                              <button onClick={() => setShowAllMembers(showAll ? null : s.id)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold [color:var(--pf-primary)]">
                                {showAll ? 'Thu gọn' : `Xem tất cả (${registeredMembers.length})`}<ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Nút chính */}
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => navigate('/check-in')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)]">
                            <UserCheck size={14} />Điểm danh
                          </button>
                          <button onClick={() => navigate('/session-registration')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]">
                            <CalendarPlus size={14} />Đăng ký
                          </button>
                        </div>

                        {/* Thao tác nhanh */}
                        <div className="mt-2 flex items-center gap-1 border-t pt-2 [border-color:var(--pf-border)]">
                          <button onClick={() => navigate('/attendance')} aria-label="Chỉnh sửa buổi" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-text)]">
                            <Pencil size={12} />Sửa
                          </button>
                          <button onClick={() => handleCopy(s)} aria-label="Sao chép buổi" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-text)]">
                            <Copy size={12} />Sao chép
                          </button>
                          <button onClick={() => setConfirmDel(s)} aria-label="Xóa buổi" className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]">
                            <Trash2 size={12} />Xóa
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDel !== null}
        title="Xóa buổi chơi?"
        message="Buổi chơi và các đăng ký liên quan sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={() => confirmDel && handleDelete(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </PageShell>
  )
}
