import { useState } from 'react'
import { Calendar, CheckCircle, Clock, MapPin, Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'

export function MemberAttendance() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const memberId = user?.memberId ?? 'mem-1'
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)
  const attended = new Set(data.myAttendedSessionIds ?? [])

  const myMember = data.members.find(m => m.id === memberId)
  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const periodSessions = data.sessions.filter(s =>
    activePeriod ? s.fundPeriodId === activePeriod.id : true
  ).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))

  const [search, setSearch] = useState('')
  const filtered = periodSessions.filter(s =>
    !search || s.courtName?.toLowerCase().includes(search.toLowerCase()) || formatDate(s.sessionDate).includes(search)
  )

  const completedSessions = periodSessions.filter(s => s.status === 'completed')
  const attendedCount = completedSessions.filter(s => attended.has(s.id)).length
  const rate = completedSessions.length > 0 ? Math.round((attendedCount / completedSessions.length) * 100) : 0

  const courtCostPerSession = completedSessions.reduce((s, sess) => {
    const present = attended.has(sess.id)
    const attendees = sess._count?.attendanceRecords ?? 6
    return s + (present ? sess.courtFee / attendees : 0)
  }, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Lịch Tham Gia"
        subtitle={activePeriod ? `${activePeriod.name} · ${myMember?.fullName ?? 'Thành viên'}` : 'Chưa có kỳ quỹ'}
      />

      <div className="p-6 max-w-[900px] mx-auto space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <CheckCircle size={14} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Buổi tham gia</p>
            </div>
            <p className="text-xl font-bold text-indigo-600">{attendedCount}<span className="text-sm font-medium text-slate-400"> / {completedSessions.length}</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Tỷ lệ: {rate}%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock size={14} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sắp diễn ra</p>
            </div>
            <p className="text-xl font-bold text-amber-600">{periodSessions.filter(s => s.status === 'scheduled').length} buổi</p>
            <p className="text-xs text-slate-500 mt-0.5">Trong kỳ này</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <MapPin size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chi phí sân</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatVND(Math.round(courtCostPerSession))}</p>
            <p className="text-xs text-slate-500 mt-0.5">Phần chia cá nhân</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo ngày hoặc sân..."
            className="input-base pl-9"
          />
        </div>

        {/* Rate bar */}
        {completedSessions.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Tỷ lệ tham gia</span>
              <span className={`text-sm font-bold ${rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{rate}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-14 text-center">
            <Calendar size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Chưa có buổi tập nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Ngày</th>
                  <th>Sân</th>
                  <th className="text-center">Thời gian</th>
                  <th className="text-center">Tình trạng</th>
                  <th className="text-right">Chi phí sân</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const present = s.status === 'completed' ? attended.has(s.id) : null
                  const attendees = s._count?.attendanceRecords ?? 6
                  const costShare = present ? Math.round(s.courtFee / attendees) : 0
                  return (
                    <tr key={s.id} className={!present && s.status === 'completed' ? 'opacity-60' : ''}>
                      <td className="text-slate-400 text-xs">#{i + 1}</td>
                      <td className="font-medium text-slate-800">{formatDate(s.sessionDate)}</td>
                      <td className="text-slate-600 text-xs">{s.courtName ?? 'Sân chưa đặt'}</td>
                      <td className="text-center text-xs text-slate-500">
                        {s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '—'}
                      </td>
                      <td className="text-center">
                        {s.status === 'scheduled'
                          ? <Badge variant="blue" dot>Sắp diễn ra</Badge>
                          : present
                            ? <Badge variant="green" dot>Có mặt</Badge>
                            : <Badge variant="gray" dot>Vắng mặt</Badge>}
                      </td>
                      <td className="text-right font-medium">
                        {s.status === 'completed' && present
                          ? <span className="text-indigo-600">{formatVND(costShare)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
