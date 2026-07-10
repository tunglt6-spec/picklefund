import { useState } from 'react'
import { CheckCircle, Clock, MapPin, Search } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { PageShell, PageHeader, MetricCard, ChartCard, DataTable, StatusBadge, type Column } from '../../components/shared'
import { formatDate, formatVND } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useMemberPortal } from '../../hooks/useMemberPortal'

export function MemberAttendance() {
  const isMobile = useIsMobile()
  const { attendance } = useMemberPortal()

  const activePeriod = attendance?.period ?? null
  // Session trong kỳ đã gồm cờ present + attendeeCount từ backend (self-scope, không lộ member khác).
  const periodSessions = (attendance?.sessions ?? [])
    .map(s => ({
      ...s,
      present: s.present,
      _count: { attendanceRecords: s.attendeeCount },
    }))
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
  const attended = new Set(periodSessions.filter(s => s.present).map(s => s.id))

  const myMember = attendance ? { fullName: attendance.memberName } : undefined

  const [search, setSearch] = useState('')
  const filtered = periodSessions.filter(s =>
    !search || s.courtName?.toLowerCase().includes(search.toLowerCase()) || formatDate(s.sessionDate).includes(search)
  )

  const completedSessions = periodSessions.filter(s => s.status === 'completed')
  const attendedCount = completedSessions.filter(s => attended.has(s.id)).length
  const rate = completedSessions.length > 0 ? Math.round((attendedCount / completedSessions.length) * 100) : 0

  const courtCostPerSession = completedSessions.reduce((s, sess) => {
    const present = attended.has(sess.id)
    const attendees = sess._count?.attendanceRecords || 6
    return s + (present ? sess.courtFee / attendees : 0)
  }, 0)

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
          <div className="text-[17px] font-[800] text-slate-900">Lịch Tham Gia</div>
          {activePeriod && <div className="text-[12px] text-slate-400">{activePeriod.name} · {myMember?.fullName ?? 'Thành viên'}</div>}
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tham gia', value: `${attendedCount}/${completedSessions.length}`, color: '[color:var(--pf-primary)]' },
              { label: 'Tỷ lệ', value: `${rate}%`, color: rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-500' },
              { label: 'Sắp TG', value: `${periodSessions.filter(s => s.status === 'scheduled').length}`, color: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                <div className={`text-[15px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          {/* Cost */}
          <div className="bg-white rounded-[14px] border border-slate-100 p-3 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-500" />
              <span className="text-[13px] text-slate-600">Chi phí sân cá nhân</span>
            </div>
            <span className="text-[15px] font-[800] text-emerald-600">{formatVND(Math.round(courtCostPerSession))}</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo ngày hoặc sân..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] bg-white border border-slate-200 text-[14px] outline-none focus:[border-color:var(--pf-primary)]" />
          </div>
          {/* Rate bar */}
          {completedSessions.length > 0 && (
            <div className="bg-white rounded-[14px] border border-slate-100 p-3 shadow-sm">
              <div className="flex justify-between mb-1.5">
                <span className="text-[12px] font-[600] text-slate-600">Tỷ lệ tham gia</span>
                <span className={`text-[12px] font-[700] ${rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{rate}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          )}
          {/* Session list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-[14px]">Chưa có buổi tập nào</div>
          ) : (
            <div className="space-y-2">
              {[...filtered].reverse().map((s) => {
                const present = s.status === 'completed' ? attended.has(s.id) : null
                const attendees = s._count?.attendanceRecords ?? 6
                const costShare = present ? Math.round(s.courtFee / attendees) : 0
                return (
                  <div key={s.id} className={`bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm ${!present && s.status === 'completed' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[15px] font-[700] text-slate-900">{formatDate(s.sessionDate)}</span>
                      {s.status === 'scheduled'
                        ? <Badge variant="blue" dot>Sắp TG</Badge>
                        : present
                          ? <Badge variant="green" dot>Có mặt</Badge>
                          : <Badge variant="gray" dot>Vắng</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={11} />{s.courtName ?? 'Sân chưa đặt'}</span>
                      {s.startTime && s.endTime && <span><Clock size={11} className="inline mr-0.5" />{s.startTime}–{s.endTime}</span>}
                    </div>
                    {present && costShare > 0 && (
                      <div className="mt-2 text-[12px] [color:var(--pf-primary)] font-[600]">Chi phí: {formatVND(costShare)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // DataTable columns (desktop) — cùng design system Admin, read-only.
  type SessRow = (typeof filtered)[number]
  const sessColumns: Column<SessRow>[] = [
    { key: 'idx', header: '#', render: (_s, i) => <span className="text-xs [color:var(--pf-color-muted)]">#{i + 1}</span> },
    { key: 'date', header: 'Ngày', render: (s) => <span className="font-medium [color:var(--pf-text)]">{formatDate(s.sessionDate)}</span> },
    { key: 'court', header: 'Sân', render: (s) => <span className="text-xs [color:var(--pf-color-muted)]">{s.courtName ?? 'Sân chưa đặt'}</span> },
    { key: 'time', header: 'Thời gian', align: 'center', render: (s) => <span className="text-xs [color:var(--pf-color-muted)]">{s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '—'}</span> },
    {
      key: 'status', header: 'Tình trạng', align: 'center', render: (s) => {
        const present = s.status === 'completed' ? attended.has(s.id) : null
        return s.status === 'scheduled'
          ? <StatusBadge tone="info" dot>Sắp diễn ra</StatusBadge>
          : present
            ? <StatusBadge tone="success" dot>Có mặt</StatusBadge>
            : <StatusBadge tone="neutral" dot>Vắng mặt</StatusBadge>
      },
    },
    {
      key: 'cost', header: 'Chi phí sân', align: 'right', render: (s) => {
        const present = s.status === 'completed' ? attended.has(s.id) : null
        const attendees = s._count?.attendanceRecords ?? 6
        return s.status === 'completed' && present
          ? <span className="font-medium [color:var(--pf-primary)]">{formatVND(Math.round(s.courtFee / attendees))}</span>
          : <span className="text-slate-300">—</span>
      },
    },
  ]
  const rateColor = rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-500'
  const rateBar = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <PageShell maxWidth={1200}>
      <PageHeader
        title="Lịch Tham Gia"
        subtitle={activePeriod ? `${activePeriod.name} · ${myMember?.fullName ?? 'Thành viên'}` : 'Chưa có kỳ quỹ'}
      />

      {/* KPI — MetricCard giống Admin */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Buổi tham gia" value={`${attendedCount} / ${completedSessions.length}`} sub={`Tỷ lệ: ${rate}%`} accent="blue" icon={<CheckCircle size={18} />} />
        <MetricCard label="Sắp diễn ra" value={`${periodSessions.filter(s => s.status === 'scheduled').length} buổi`} sub="Trong kỳ này" accent="amber" icon={<Clock size={18} />} />
        <MetricCard label="Chi phí sân" value={formatVND(Math.round(courtCostPerSession))} sub="Phần chia cá nhân" accent="green" icon={<MapPin size={18} />} />
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
        <ChartCard title="Tỷ lệ tham gia" actions={<span className={`text-sm font-bold ${rateColor}`}>{rate}%</span>}>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${rateBar}`} style={{ width: `${rate}%` }} />
          </div>
        </ChartCard>
      )}

      {/* Bảng buổi tập — DataTable read-only */}
      <ChartCard title="Danh sách buổi tập" subtitle={`${filtered.length} buổi`}>
        <DataTable columns={sessColumns} rows={filtered} rowKey={(s) => s.id} emptyText="Chưa có buổi tập nào" />
      </ChartCard>
    </PageShell>
  )
}
