/**
 * ClubDashboard (06) — Dashboard Tổng quan CLB (VẬN HÀNH) theo UI Spec V2.2 đã duyệt.
 * 4 KPI vận hành (Thành viên · Check-in · Vắng mặt · Tỷ lệ chuyên cần) + "Lịch hôm nay"
 * + "Hoạt động gần đây". Read-only từ clubDataStore (KHÔNG gọi finance — tài chính ở màn 07
 * /finance-dashboard). V2.2 Clean Modern SaaS, mobile-first.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, UserCheck, UserX, TrendingUp, CalendarDays, Activity, Plus, Clock, DollarSign,
} from 'lucide-react'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import {
  PageShell, PageHeader, MetricCard, ChartCard, EmptyState, ActionButton,
} from '../../components/shared'

const todayKey = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function ClubDashboard() {
  const navigate = useNavigate()
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)
  const { members, sessions, contributions, memberAttendanceSummary } = data

  const stats = useMemo(() => {
    const activeMembers = members.filter((m) => m.status === 'active').length
    const checkins = sessions.reduce((a, s) => a + (s._count?.attendanceRecords ?? 0), 0)
    const summary = memberAttendanceSummary ?? []
    const rated = summary.filter((m) => m.totalSessions > 0)
    const absent = rated.reduce((a, m) => a + Math.max(0, m.totalSessions - m.attendedSessions), 0)
    const attendanceRate =
      rated.length > 0
        ? Math.round(
            (rated.reduce((a, m) => a + m.attendedSessions / m.totalSessions, 0) / rated.length) * 100,
          )
        : null
    return { activeMembers, checkins, absent, attendanceRate }
  }, [members, sessions, memberAttendanceSummary])

  const todaySessions = useMemo(() => {
    const tk = todayKey()
    return sessions
      .filter((s) => (s.sessionDate ?? '').slice(0, 10) === tk)
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  }, [sessions])

  const recentActivity = useMemo(
    () =>
      [...contributions]
        .filter((c) => c.paymentDate)
        .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1))
        .slice(0, 6),
    [contributions],
  )

  const hasData = members.length > 0 || sessions.length > 0

  return (
    <PageShell>
      <PageHeader
        title="Tổng quan CLB"
        subtitle="Tình hình vận hành câu lạc bộ"
        actions={
          <div className="flex items-center gap-2">
            <ActionButton variant="secondary" icon={<UserCheck size={16} />} onClick={() => navigate('/check-in')}>
              Check-in
            </ActionButton>
            <ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>
              Tạo buổi chơi
            </ActionButton>
          </div>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={<Activity size={24} />}
          title="Chưa có dữ liệu vận hành"
          description="Thêm thành viên và tạo buổi chơi để xem tổng quan hoạt động CLB."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* 4 KPI vận hành */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard accent="violet" icon={<Users size={18} />} label="Thành viên" value={stats.activeMembers} />
            <MetricCard accent="blue" icon={<UserCheck size={18} />} label="Lượt check-in" value={stats.checkins} />
            <MetricCard accent="rose" icon={<UserX size={18} />} label="Vắng mặt" value={stats.absent} negative={stats.absent > 0} />
            <MetricCard accent="teal" icon={<TrendingUp size={18} />} label="Tỷ lệ chuyên cần" value={stats.attendanceRate === null ? '—' : `${stats.attendanceRate}%`} sub={stats.attendanceRate === null ? 'Chưa đủ dữ liệu' : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Lịch hôm nay */}
            <ChartCard title="Lịch hôm nay" subtitle="Buổi chơi trong ngày">
              {todaySessions.length === 0 ? (
                <div className="flex items-center gap-2 py-6 text-sm [color:var(--pf-color-muted)]">
                  <CalendarDays size={16} /> Hôm nay chưa có buổi chơi nào.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[color:var(--pf-border-soft)]">
                  {todaySessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                          <Clock size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium [color:var(--pf-text)]">
                            {[s.startTime, s.endTime].filter(Boolean).join(' – ') || 'Buổi chơi'}
                          </p>
                          <p className="text-[11px] [color:var(--pf-color-muted)]">{s.courtName || 'Chưa rõ sân'}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                        {s._count?.attendanceRecords ?? 0} người
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Hoạt động gần đây */}
            <ChartCard title="Hoạt động gần đây" subtitle="Đóng quỹ mới nhất">
              {recentActivity.length === 0 ? (
                <div className="flex items-center gap-2 py-6 text-sm [color:var(--pf-color-muted)]">
                  <Activity size={16} /> Chưa có hoạt động gần đây.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[color:var(--pf-border-soft)]">
                  {recentActivity.map((c) => {
                    const name = c.member?.fullName ?? c.payerName ?? 'Thành viên'
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--pf-green-soft)', color: 'var(--pf-green)' }}>
                            <DollarSign size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium [color:var(--pf-text)]">{name}</p>
                            <p className="text-[11px] [color:var(--pf-color-muted)]">
                              đóng quỹ · {(c.paymentDate ?? '').slice(0, 10).split('-').reverse().join('/')}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: 'var(--pf-green)' }}>
                          +{formatVND(c.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </PageShell>
  )
}
