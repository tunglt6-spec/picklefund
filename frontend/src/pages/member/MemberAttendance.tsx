import { useState } from 'react'
import { CheckCircle, Clock, MapPin, Search, UserPlus, UserCheck, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { PageShell, PageHeader, MetricCard, ChartCard, DataTable, StatusBadge, ExportActions, runExport, type Column } from '../../components/shared'
import { formatDate, formatVND } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useMemberPortal } from '../../hooks/useMemberPortal'
import api from '../../lib/api'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'

export function MemberAttendance() {
  const isMobile = useIsMobile()
  const { attendance, finance, reload } = useMemberPortal()
  const [busyId, setBusyId] = useState<string | null>(null)

  const toggleRegister = async (sessionId: string, register: boolean) => {
    setBusyId(sessionId)
    try {
      await api.put(`/member/me/sessions/${sessionId}/registration`, { register })
      toast.success(register ? 'Đã đăng ký tham gia' : 'Đã hủy đăng ký')
      reload()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Thao tác thất bại')
    } finally {
      setBusyId(null)
    }
  }

  const activePeriod = attendance?.period ?? null
  // Session trong kỳ đã gồm cờ present + attendeeCount từ backend (self-scope, không lộ member khác).
  const periodSessions = (attendance?.sessions ?? [])
    .slice()
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

  // Chi phí sân cá nhân: LẤY NGUYÊN từ calculator backend (/member/me/finance) cho cùng kỳ đang mở —
  // CHI PHÍ SÂN chia đều theo sĩ số đã chốt của kỳ; khớp Phiếu thu / Tài chính cá nhân.
  // KHÔNG tự tính lại ở FE (không chia theo số người có mặt từng buổi).
  const myCourtCost: number | null = finance?.member ? Number(finance.member.courtFee) || 0 : null
  const courtCostText = myCourtCost === null ? '—' : formatVND(myCourtCost)

  // ── Xuất lịch sử điểm danh CÁ NHÂN (self-scope /member/me/attendance), đúng tập đang lọc ──
  const sessionStatusLabel = (s: (typeof filtered)[number]) =>
    s.status === 'cancelled' ? 'Đã hủy'
      : s.status === 'scheduled' ? 'Sắp diễn ra'
      : attended.has(s.id) ? 'Có mặt' : 'Vắng mặt'
  // Không xuất cột tiền: chi phí sân thật = tổng chi sân Quỹ Chính ÷ sĩ số chốt (xem Phiếu thu / Tài chính cá nhân).
  const exportMeName = myMember?.fullName ?? 'Thành viên'
  const exportSlug = exportMeName.replace(/\s+/g, '_').replace(/[/\?%*:|"<>]/g, '')
  const exportSessions = [...filtered].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  const doExportExcel = () => {
    if (exportSessions.length === 0) return
    return runExport(() => exportGenericExcel(`Diem_danh_${exportSlug}`, 'Điểm danh',
      ['Ngày', 'Sân', 'Thời gian', 'Tình trạng'],
      exportSessions.map((s) => [
        formatDate(s.sessionDate), s.courtName ?? '', s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '',
        sessionStatusLabel(s),
      ]),
    ), 'Đã xuất Excel lịch tham gia')
  }
  const doExportPdf = () => {
    if (exportSessions.length === 0) return
    return runExport(() => exportGenericTablePDF({
      fileBase: `Diem_danh_${exportSlug}`,
      title: 'Lịch Tham Gia Cá Nhân',
      subtitle: exportMeName,
      metaLeft: `${activePeriod ? `Kỳ ${activePeriod.name} · ` : ''}${exportSessions.length} buổi · Tham gia ${attendedCount}/${completedSessions.length} (${rate}%)`,
      columns: [
        { header: 'Ngày', align: 'center' }, { header: 'Sân' }, { header: 'Thời gian', align: 'center' },
        { header: 'Tình trạng', align: 'center' },
      ],
      rows: exportSessions.map((s) => [
        formatDate(s.sessionDate), s.courtName ?? '—', s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '—',
        sessionStatusLabel(s),
      ]),
      summaryLabel: 'Số buổi có mặt',
      summaryValue: `${attendedCount}/${completedSessions.length}`,
    }), 'Đã xuất PDF lịch tham gia')
  }
  const exportButtons = exportSessions.length > 0 ? <ExportActions onExcel={doExportExcel} onPdf={doExportPdf} /> : undefined

  if (isMobile) {
    return (
      <div className="min-h-full [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg font-[800] [color:var(--pf-text)]">Lịch Tham Gia</div>
            {activePeriod && <div className="text-xs [color:var(--pf-color-muted)] truncate">{activePeriod.name} · {myMember?.fullName ?? 'Thành viên'}</div>}
          </div>
          {exportButtons}
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tham gia', value: `${attendedCount}/${completedSessions.length}`, color: '[color:var(--pf-primary-text)]' },
              { label: 'Tỷ lệ', value: `${rate}%`, color: rate >= 80 ? '[color:var(--pf-green)]' : rate >= 60 ? '[color:var(--pf-color-warning)]' : '[color:var(--pf-color-danger)]' },
              { label: 'Sắp TG', value: `${periodSessions.filter(s => s.status === 'scheduled').length}`, color: '[color:var(--pf-color-warning)]' },
            ].map(k => (
              <div key={k.label} className="pf-stat-cell rounded-lg px-2 py-2.5 text-center">
                <div className="text-[10px] uppercase font-semibold tracking-wide [color:var(--pf-color-muted)] mb-1">{k.label}</div>
                <div className={`text-base font-bold ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>
          {/* Cost */}
          <div className="pf-glass rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="[color:var(--pf-green)]" />
              <span className="text-sm [color:var(--pf-color-muted)]">Chi phí sân cá nhân</span>
            </div>
            <span className="text-base font-[800] [color:var(--pf-green)]">{courtCostText}</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo ngày hoặc sân..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] [background:var(--pf-surface)] border border-[color:var(--pf-border)] text-sm outline-none focus:[border-color:var(--pf-primary)]" />
          </div>
          {/* Rate bar */}
          {completedSessions.length > 0 && (
            <div className="pf-glass rounded-xl p-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-[600] [color:var(--pf-color-muted)]">Tỷ lệ tham gia</span>
                <span className={`text-xs font-[700] ${rate >= 80 ? '[color:var(--pf-green)]' : rate >= 60 ? '[color:var(--pf-color-warning)]' : '[color:var(--pf-color-danger)]'}`}>{rate}%</span>
              </div>
              <div className="h-2 [background:var(--pf-color-muted-soft)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${rate >= 80 ? '[background:var(--pf-green)]' : rate >= 60 ? '[background:var(--pf-color-warning)]' : '[background:var(--pf-color-danger)]'}`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          )}
          {/* Session list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-sm">Chưa có buổi tập nào</div>
          ) : (
            <div className="space-y-2">
              {[...filtered].reverse().map((s) => {
                const present = s.status === 'completed' ? attended.has(s.id) : null
                return (
                  <div key={s.id} className={`pf-rowcard p-4 ${!present && s.status === 'completed' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-[700] [color:var(--pf-text)]">{formatDate(s.sessionDate)}</span>
                      {s.status === 'cancelled'
                        ? <Badge variant="gray" dot>Đã hủy</Badge>
                        : s.status === 'scheduled'
                        ? <Badge variant="blue" dot>Sắp TG</Badge>
                        : present
                          ? <Badge variant="green" dot>Có mặt</Badge>
                          : <Badge variant="gray" dot>Vắng</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs [color:var(--pf-color-muted)]">
                      <span className="flex items-center gap-1"><MapPin size={11} />{s.courtName ?? 'Sân chưa đặt'}</span>
                      {s.startTime && s.endTime && <span><Clock size={11} className="inline mr-0.5" />{s.startTime}–{s.endTime}</span>}
                      {s.status === 'scheduled' && (s.registeredCount ?? 0) > 0 && <span>· {s.registeredCount} đăng ký</span>}
                    </div>
                    {s.status === 'scheduled' && (
                      <div className="mt-3">
                        {s.registered ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold [color:var(--pf-color-success)]"><UserCheck size={14} /> Đã đăng ký – Chờ tham gia</span>
                            <button onClick={() => toggleRegister(s.id, false)} disabled={busyId === s.id}
                              className="inline-flex min-h-11 items-center px-2 text-xs font-semibold [color:var(--pf-color-muted)] underline disabled:opacity-50">Hủy</button>
                          </div>
                        ) : (
                          <button onClick={() => toggleRegister(s.id, true)} disabled={busyId === s.id}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] text-sm font-bold [color:var(--pf-primary-on)] active:scale-[0.98] disabled:opacity-50"
                            style={{ background: 'var(--pf-primary)' }}>
                            <UserPlus size={15} /> Đăng ký tham gia
                          </button>
                        )}
                      </div>
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
        return s.status === 'cancelled'
          ? <StatusBadge tone="neutral" dot>Đã hủy</StatusBadge>
          : s.status === 'scheduled'
          ? <StatusBadge tone="info" dot>Sắp diễn ra</StatusBadge>
          : present
            ? <StatusBadge tone="success" dot>Có mặt</StatusBadge>
            : <StatusBadge tone="neutral" dot>Vắng mặt</StatusBadge>
      },
    },
    {
      key: 'register', header: 'Đăng ký', align: 'center', render: (s) => {
        if (s.status !== 'scheduled') return <span className="[color:var(--pf-color-muted)]">—</span>
        return s.registered ? (
          <div className="inline-flex items-center gap-2">
            <StatusBadge tone="success" dot>Đã đăng ký</StatusBadge>
            <button onClick={() => toggleRegister(s.id, false)} disabled={busyId === s.id}
              className="text-xs font-semibold [color:var(--pf-color-muted)] underline disabled:opacity-50">Hủy</button>
          </div>
        ) : (
          <button onClick={() => toggleRegister(s.id, true)} disabled={busyId === s.id}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--pf-primary)' }}>
            <UserPlus size={13} /> Đăng ký
          </button>
        )
      },
    },
  ]
  const rateBar = rate >= 80 ? '[background:var(--pf-green)]' : rate >= 60 ? '[background:var(--pf-color-warning)]' : '[background:var(--pf-color-danger)]'
  const scheduledCount = periodSessions.filter(s => s.status === 'scheduled').length

  return (
    <PageShell maxWidth={1760}>
      <PageHeader
        title="Lịch Tham Gia"
        subtitle={activePeriod ? `${activePeriod.name} · ${myMember?.fullName ?? 'Thành viên'}` : 'Chưa có kỳ quỹ'}
        actions={exportButtons}
      />

      {/* Bố cục giống Tổng Quan: trái 2/3 (KPI 2×2 + danh sách buổi) · phải 1/3 (tiến độ tham gia) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* CỘT TRÁI (2/3) */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Buổi tham gia" value={`${attendedCount} / ${completedSessions.length}`} sub={`Tỷ lệ: ${rate}%`} accent="blue" icon={<CheckCircle size={18} />} />
            <MetricCard label="Tỷ lệ tham gia" value={`${rate}%`} sub="So với toàn kỳ" accent={rate >= 50 ? 'green' : 'amber'} icon={<TrendingUp size={18} />} />
            <MetricCard label="Sắp diễn ra" value={`${scheduledCount} buổi`} sub="Trong kỳ này" accent="amber" icon={<Clock size={18} />} />
            <MetricCard label="Chi phí sân" value={courtCostText} sub="Cả kỳ · khớp Phiếu thu" accent="green" icon={<MapPin size={18} />} />
          </div>

          <ChartCard title="Danh sách buổi tập" subtitle={`${filtered.length} buổi`}>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo ngày hoặc sân..."
                className="input-base pl-9"
              />
            </div>
            <DataTable columns={sessColumns} rows={filtered} rowKey={(s) => s.id} emptyText="Chưa có buổi tập nào" />
          </ChartCard>
        </div>

        {/* CỘT PHẢI (1/3) — Tiến độ tham gia (vòng %) */}
        <ChartCard title="Tiến độ tham gia" subtitle={activePeriod?.name ?? undefined}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-28 w-28">
              <div
                className="h-28 w-28 rounded-full"
                style={{ background: `conic-gradient(var(--pf-primary) ${Math.min(100, rate) * 3.6}deg, var(--pf-color-muted-soft) 0deg)` }}
              />
              <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full [background:var(--pf-surface)]">
                <span className="text-2xl font-extrabold [color:var(--pf-text)]">{rate}%</span>
                <span className="text-xs [color:var(--pf-color-muted)]">tham gia</span>
              </div>
            </div>
            <span className="text-xs [color:var(--pf-color-muted)]">{attendedCount}/{completedSessions.length} buổi hoàn thành</span>
            <div className="w-full">
              <div className="h-3 w-full overflow-hidden rounded-full [background:var(--pf-color-muted-soft)]">
                <div className={`h-full rounded-full transition-all ${rateBar}`} style={{ width: `${rate}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs [color:var(--pf-color-muted)]">
                <span>Sắp diễn ra: {scheduledCount}</span>
                <span>Chi phí sân kỳ: {courtCostText}</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </PageShell>
  )
}
