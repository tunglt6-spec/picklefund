/**
 * WeeklyActivity (08) — Dashboard hoạt động tuần. Read-only, tính từ dữ liệu buổi tập +
 * điểm danh có sẵn trong clubDataStore (KHÔNG gọi backend mới). V2.2 Clean Modern SaaS.
 */
import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { CalendarDays, UserCheck, TrendingUp, Users, CalendarRange } from 'lucide-react'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import {
  PageShell, PageHeader, MetricCard, ChartCard, EmptyState,
} from '../../components/shared'

const CHART_PRIMARY = '#6D5DFB' // mirror --pf-primary (recharts cần string màu)

/** Thứ 2 đầu tuần (00:00) của ngày d. */
function weekStart(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = (x.getDay() + 6) % 7 // 0 = Mon
  x.setDate(x.getDate() - day)
  return x
}

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`)
}

export function WeeklyActivity() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const data = useClubDataStore((s) => s.getClubData(clubId))
  const { sessions, members, memberAttendanceSummary } = data

  const stats = useMemo(() => {
    const now = new Date()
    const curStart = weekStart(now)
    const nextStart = new Date(curStart)
    nextStart.setDate(nextStart.getDate() + 7)

    // 8 tuần gần nhất (cũ → mới)
    const buckets = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(curStart)
      start.setDate(start.getDate() - (7 - i) * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return { start, end, sessions: 0, checkins: 0 }
    })

    let weekSessions = 0
    let weekCheckins = 0
    for (const s of sessions) {
      const d = parseDate(s.sessionDate)
      const checkins = s._count?.attendanceRecords ?? 0
      if (d >= curStart && d < nextStart) {
        weekSessions += 1
        weekCheckins += checkins
      }
      for (const b of buckets) {
        if (d >= b.start && d < b.end) {
          b.sessions += 1
          b.checkins += checkins
          break
        }
      }
    }

    const summary = memberAttendanceSummary ?? []
    const rated = summary.filter((m) => m.totalSessions > 0)
    const attendanceRate =
      rated.length > 0
        ? Math.round(
            (rated.reduce((acc, m) => acc + m.attendedSessions / m.totalSessions, 0) /
              rated.length) *
              100,
          )
        : null

    const activeMembers = members.filter((m) => m.status === 'active').length

    const chart = buckets.map((b) => ({
      label: `${b.start.getDate()}/${b.start.getMonth() + 1}`,
      'Lượt check-in': b.checkins,
      'Buổi chơi': b.sessions,
    }))

    return { weekSessions, weekCheckins, attendanceRate, activeMembers, chart }
  }, [sessions, members, memberAttendanceSummary])

  const hasData = sessions.length > 0

  return (
    <PageShell>
      <PageHeader
        title="Hoạt động tuần"
        subtitle="Tổng quan buổi chơi, check-in và chuyên cần theo tuần"
      />

      {!hasData ? (
        <EmptyState
          icon={<CalendarRange size={24} />}
          title="Chưa có dữ liệu hoạt động"
          description="Tạo buổi chơi và điểm danh để xem thống kê hoạt động theo tuần."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard
              accent="violet"
              icon={<CalendarDays size={18} />}
              label="Buổi chơi tuần này"
              value={stats.weekSessions}
            />
            <MetricCard
              accent="blue"
              icon={<UserCheck size={18} />}
              label="Lượt check-in tuần này"
              value={stats.weekCheckins}
            />
            <MetricCard
              accent="teal"
              icon={<TrendingUp size={18} />}
              label="Chuyên cần trung bình"
              value={stats.attendanceRate === null ? '—' : `${stats.attendanceRate}%`}
              sub={stats.attendanceRate === null ? 'Chưa đủ dữ liệu' : 'Trên toàn CLB'}
            />
            <MetricCard
              accent="green"
              icon={<Users size={18} />}
              label="Thành viên hoạt động"
              value={stats.activeMembers}
            />
          </div>

          <ChartCard title="Xu hướng 8 tuần" subtitle="Lượt check-in và số buổi chơi mỗi tuần">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--pf-border)',
                      fontSize: 12,
                      boxShadow: 'var(--pf-shadow-hover)',
                    }}
                  />
                  <Bar dataKey="Lượt check-in" fill={CHART_PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}
    </PageShell>
  )
}
