/**
 * WeeklyActivity (08) — Dashboard Hoạt động tuần theo UI Spec V2.2 đã duyệt.
 * 4 KPI (Số buổi · Lượt đăng ký · Lượt check-in · Tỷ lệ chuyên cần) + LINE chart xu hướng
 * tỷ lệ chuyên cần theo tuần. Read-only từ clubDataStore; "Lượt đăng ký" tuần này lấy từ
 * endpoint registrations CÓ SẴN (bounded theo số buổi trong tuần). KHÔNG backend mới.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { CalendarDays, UserCheck, TrendingUp, CalendarPlus, CalendarRange } from 'lucide-react'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import { PageShell, PageHeader, MetricCard, ChartCard, EmptyState } from '../../components/shared'

const CHART_PRIMARY = '#6D5DFB' // --pf-primary

function weekStart(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // Mon = 0
  return x
}
const parseDate = (s: string) => new Date(`${s}T00:00:00`)

export function WeeklyActivity() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const data = useClubDataStore((s) => s.getClubData(clubId))
  const { sessions, members, memberAttendanceSummary } = data

  const [weekRegs, setWeekRegs] = useState<number | null>(null)

  const stats = useMemo(() => {
    const now = new Date()
    const curStart = weekStart(now)
    const nextStart = new Date(curStart)
    nextStart.setDate(nextStart.getDate() + 7)
    const activeMembers = members.filter((m) => m.status === 'active').length

    const buckets = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(curStart)
      start.setDate(start.getDate() - (7 - i) * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return { start, end, sessions: 0, checkins: 0 }
    })

    let weekSessions = 0
    let weekCheckins = 0
    const weekSessionIds: string[] = []
    for (const s of sessions) {
      const d = parseDate(s.sessionDate)
      const checkins = s._count?.attendanceRecords ?? 0
      if (d >= curStart && d < nextStart) {
        weekSessions += 1
        weekCheckins += checkins
        weekSessionIds.push(s.id)
      }
      for (const b of buckets) {
        if (d >= b.start && d < b.end) { b.sessions += 1; b.checkins += checkins; break }
      }
    }

    const summary = memberAttendanceSummary ?? []
    const rated = summary.filter((m) => m.totalSessions > 0)
    const attendanceRate =
      rated.length > 0
        ? Math.round((rated.reduce((a, m) => a + m.attendedSessions / m.totalSessions, 0) / rated.length) * 100)
        : null

    // Tỷ lệ chuyên cần theo tuần (xấp xỉ): check-in / (buổi × TV hoạt động).
    const chart = buckets.map((b) => ({
      label: `${b.start.getDate()}/${b.start.getMonth() + 1}`,
      'Tỷ lệ chuyên cần': b.sessions > 0 && activeMembers > 0
        ? Math.min(100, Math.round((b.checkins / (b.sessions * activeMembers)) * 100))
        : 0,
    }))

    return { weekSessions, weekCheckins, attendanceRate, chart, weekSessionIds }
  }, [sessions, members, memberAttendanceSummary])

  // Lượt đăng ký tuần này — tổng registrations của các buổi trong tuần (endpoint có sẵn).
  const loadRegs = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setWeekRegs(0); return }
    const res = await Promise.allSettled(ids.map((id) => api.get(`/attendance/${id}/registrations`)))
    let total = 0
    for (const r of res) {
      if (r.status === 'fulfilled') {
        total += ((r.value.data?.data ?? []) as { registered: boolean }[]).filter((x) => x.registered).length
      }
    }
    setWeekRegs(total)
  }, [])

  useEffect(() => {
    void loadRegs(stats.weekSessionIds)
  }, [stats.weekSessionIds, loadRegs])

  const hasData = sessions.length > 0

  return (
    <PageShell>
      <PageHeader title="Hoạt động tuần" subtitle="Buổi chơi, đăng ký, check-in và chuyên cần theo tuần" />

      {!hasData ? (
        <EmptyState icon={<CalendarRange size={24} />} title="Chưa có dữ liệu hoạt động" description="Tạo buổi chơi và điểm danh để xem thống kê hoạt động theo tuần." />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard accent="violet" icon={<CalendarDays size={18} />} label="Buổi chơi tuần này" value={stats.weekSessions} />
            <MetricCard accent="amber" icon={<CalendarPlus size={18} />} label="Lượt đăng ký tuần này" value={weekRegs === null ? '…' : weekRegs} />
            <MetricCard accent="blue" icon={<UserCheck size={18} />} label="Lượt check-in tuần này" value={stats.weekCheckins} />
            <MetricCard accent="teal" icon={<TrendingUp size={18} />} label="Chuyên cần trung bình" value={stats.attendanceRate === null ? '—' : `${stats.attendanceRate}%`} sub={stats.attendanceRate === null ? 'Chưa đủ dữ liệu' : 'Trên toàn CLB'} />
          </div>

          <ChartCard title="Xu hướng chuyên cần 8 tuần" subtitle="Tỷ lệ tham dự mỗi tuần (%)">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chart} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${Number(v)}%`} contentStyle={{ borderRadius: 12, border: '1px solid var(--pf-border)', fontSize: 12 }} />
                  <Line type="monotone" dataKey="Tỷ lệ chuyên cần" stroke={CHART_PRIMARY} strokeWidth={2.5} dot={{ r: 3, fill: CHART_PRIMARY }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}
    </PageShell>
  )
}
