/**
 * UI-05 — Reports Center Enterprise Workspace (PickleFund v2.1)
 * Kế thừa UI-02 Dashboard 4.0 (Golden Reference). Tuân thủ UIP-05 (Reports Center Pattern)
 * + UDP-01 (Design SoT) + Amendment #01 (Loading/Empty/Error DoD) + Amendment #02 +
 * VDS-01 (Visual Quality Gate) + DESIGN-01 + GOV-01.
 *
 * REPORT SOURCE OF TRUTH: backend `fundSummary` là nguồn chân lý tài chính.
 *  - KPI tài chính CHÍNH THỨC lấy TRỰC TIẾP từ fundSummary (totalIncome/totalExpenses/
 *    balance/miniBalance/carryForward/totalAttendance/unpaidCount…). Thiếu field → "Chưa có dữ liệu".
 *  - KHÔNG recompute/fallback/estimate finance ở UI. KHÔNG fake data.
 *  - Charts là VISUALIZATION từ store (tiền lệ Dashboard) — không phải KPI chính thức.
 *  - Member bill lấy từ fundSummary.members (backend calculator). KHÔNG tự tính phiếu thu.
 *  - Reports/PDF/Excel/Infographic dùng hàm/API export hiện có (không đổi contract).
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Gamepad2, ArrowLeftRight, Users, Calendar,
  Activity, AlertCircle, RefreshCw, FileSpreadsheet, FileText, Sparkles,
} from 'lucide-react'
import { formatVND } from '../../lib/utils'
import { exportReportsPDF, exportReportsExcel } from '../../lib/export'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import type { FundSource } from '../../types'
import toast from 'react-hot-toast'
import { InfographicPreviewModal } from '../../components/reports/infographic/InfographicPreviewModal'
import { mapToInfographicData } from '../../components/reports/infographic/infographic.utils'
import {
  PageShell, PageHeader, MetricCard, ChartCard, FilterBar, DataTable, type Column,
  StatusBadge, ActionButton, EmptyState, LoadingState, MobileCardList, ResponsiveTabs,
} from '../../components/shared'

/* Màu chart mirror token --pf-* (recharts cần string — data-viz). */
const CHART_INCOME = '#059669'
const CHART_EXPENSE = '#E11D48'
const DONUT_COLORS = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#0D9488', '#E11D48']

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}
/** Số official từ backend; null/undefined → undefined ("Chưa có dữ liệu"). Không fallback. */
function num(v: unknown): number | undefined {
  return v == null ? undefined : Number(v)
}

type ReportTab = 'overview' | 'finance' | 'member' | 'attendance'
const REPORT_TABS = [
  { key: 'overview', label: 'Tổng hợp' },
  { key: 'finance', label: 'Tài chính' },
  { key: 'member', label: 'Thành viên' },
  { key: 'attendance', label: 'Điểm danh' },
]

/* eslint-disable @typescript-eslint/no-explicit-any */
function VNDTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2 text-xs [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow-hover)]">
      <p className="mb-1 font-semibold [color:var(--pf-text)]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="[color:var(--pf-color-muted)]">{p.name}:</span>
          <span className="font-semibold tabular-nums [color:var(--pf-text)]">{formatVND(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
function PctTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2 text-xs [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow-hover)]">
      <p className="[color:var(--pf-text)]">{label}: <span className="font-semibold" style={{ color: 'var(--pf-green)' }}>{payload[0].value}%</span></p>
    </div>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface MemberBillRow {
  memberName: string
  attendedSessions: number
  totalSessions?: number
  amountPaid: number
  contributionPaid: boolean
  courtCost: number
  livingCost: number
  totalCost: number
  balance: number
}

export function Reports() {
  const { user, accessToken } = useAuthStore()
  const { getClubData, setMemberAttendanceSummary } = useClubDataStore()
  const isMobile = useIsMobile()
  const clubData = getClubData(user?.clubId ?? '')
  const defaultPeriod = clubData.fundPeriods.find(p => p.status === 'active') ?? clubData.fundPeriods[0]

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [fundFilter, setFundFilter] = useState<'ALL' | FundSource>('ALL')
  const [reportTab, setReportTab] = useState<ReportTab>('overview')
  const [showInfographic, setShowInfographic] = useState(false)
  // fundSummary = backend Source of Truth (raw response.data.data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fundSummary, setFundSummary] = useState<any>(null)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (selectedPeriodId || !defaultPeriod?.id) return
    setSelectedPeriodId(defaultPeriod.id)
  }, [defaultPeriod?.id, selectedPeriodId])

  const activePeriod = clubData.fundPeriods.find(p => p.id === selectedPeriodId) ?? defaultPeriod

  /* ── Attendance member-summary (backend) — GIỮ NGUYÊN fetch ── */
  useEffect(() => {
    if (!user?.clubId || !activePeriod?.id) return
    setMemberAttendanceSummary(user.clubId, [])
    api.get(`/attendance/member-summary?fundPeriodId=${activePeriod.id}`).then(res => {
      const raw = res.data?.data ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMemberAttendanceSummary(user.clubId!, raw.map((s: any) => ({
        memberId: s.memberId, memberName: s.memberName,
        attendedSessions: s.attendedSessions ?? 0, totalSessions: s.totalSessions ?? 0,
      })))
    }).catch(() => {})
  }, [user?.clubId, activePeriod?.id, setMemberAttendanceSummary])

  /* ── Fund period summary (backend = Source of Truth) — điều khiển Loading/Error ── */
  const fetchSummary = useCallback(async () => {
    if (!activePeriod?.id || isLocalToken(accessToken)) { setFundSummary(null); setLoadState('idle'); return }
    setLoadState('loading')
    try {
      const res = await api.get(`/fund-periods/${activePeriod.id}/summary`)
      setFundSummary(res.data?.data ?? null)
      setLoadState('idle')
    } catch {
      setLoadState('error')
    }
  }, [activePeriod?.id, accessToken])

  const summaryPeriodRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activePeriod?.id) return
    if (summaryPeriodRef.current === activePeriod.id) return
    summaryPeriodRef.current = activePeriod.id
    void fetchSummary()
  }, [activePeriod?.id, fetchSummary])

  const hasPeriods = clubData.fundPeriods.length > 0
  const periodName = activePeriod?.name ?? ''
  const clubName = (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball'

  /* ── KPI tài chính CHÍNH THỨC — chỉ từ backend fundSummary (không recompute) ── */
  const fs = fundSummary
  const kIncome = num(fs?.totalIncome)
  const kExpense = num(fs?.totalExpenses)
  const kCommonBalance = num(fs?.balance)
  const kMiniBalance = num(fs?.miniBalance)
  const kCarry = num(fs?.carryForward?.balance)
  const kAttendance = num(fs?.totalAttendance)
  const kUnpaid = num(fs?.unpaidCount)
  // Số thành viên hoạt động = đếm danh sách (không phải công thức tài chính)
  const activeMemberCount = clubData.members.filter(m => m.status === 'active').length

  /* ── Member bill (backend calculator: fundSummary.members) — không tự tính phiếu thu ── */
  const memberBillRows: MemberBillRow[] = (fs?.members ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => ({
      memberName: m.memberName,
      attendedSessions: m.attendedSessions ?? 0,
      totalSessions: num(fs?.totalSessions),
      amountPaid: m.amountPaid ?? 0,
      contributionPaid: !!m.contributionPaid,
      courtCost: m.courtCost ?? 0,
      livingCost: m.livingCost ?? 0,
      totalCost: m.totalCost ?? 0,
      balance: m.balance ?? 0,
    }),
  )

  /* ── Charts = VISUALIZATION từ store (tiền lệ Dashboard UI-02) ── */
  const activePeriodType = activePeriod?.type ?? 'chung'
  const periodBars = [...clubData.fundPeriods]
    .filter(p => (p.type ?? 'chung') === activePeriodType)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    .slice(-6)
    .map(p => ({
      ky: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
      Thu: clubData.contributions.filter(c => c.fundPeriodId === p.id && c.isConfirmed && (fundFilter === 'ALL' || (c.fundSource ?? 'COMMON') === fundFilter)).reduce((a, c) => a + c.amount, 0),
      Chi: clubData.expenses.filter(e => e.fundPeriodId === p.id && (fundFilter === 'ALL' || (e.fundSource ?? 'COMMON') === fundFilter)).reduce((a, e) => a + e.amount, 0),
    }))

  const donutGroups: Record<string, number> = {}
  for (const e of clubData.expenses.filter(e => e.fundPeriodId === activePeriod?.id && (fundFilter === 'ALL' || (e.fundSource ?? 'COMMON') === fundFilter))) {
    const key = (e.description ?? 'Khác').length > 20 ? e.description.slice(0, 20) + '…' : (e.description ?? 'Khác')
    donutGroups[key] = (donutGroups[key] ?? 0) + e.amount
  }
  const costBreakdown = Object.entries(donutGroups).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
  const costTotal = costBreakdown.reduce((s, d) => s + d.value, 0)

  const attSummary = clubData.memberAttendanceSummary ?? []
  const attendanceRates = clubData.members.map(m => {
    const s = attSummary.find(a => a.memberId === m.id)
    const total = s?.totalSessions ?? 0
    const attended = Math.min(s?.attendedSessions ?? 0, total)
    return { name: m.fullName?.split(' ').slice(-2).join(' ') ?? m.id, rate: total > 0 ? Math.round((attended / total) * 100) : 0 }
  }).sort((a, b) => b.rate - a.rate)
  const hasAttendanceData = attSummary.some(s => (s.totalSessions ?? 0) > 0)

  /* ── Export / Infographic (reuse hàm hiện có) ──
     REQUIRED official fields (backend summary). Thiếu → KHÔNG export/infographic,
     KHÔNG ép 0/fake. Chỉ dựng payload khi đủ field. */
  const kSessions = num(fs?.totalSessions)
  const officialReady =
    kIncome !== undefined && kExpense !== undefined &&
    kCommonBalance !== undefined && kSessions !== undefined
  const EXPORT_NOT_READY = 'Chưa có đủ dữ liệu backend summary để xuất báo cáo.'
  const INFO_NOT_READY = 'Chưa có đủ dữ liệu backend summary để tạo infographic.'
  const EXPORT_HINT = 'Cần backend summary đầy đủ để xuất báo cáo.'

  const buildExportSummary = () => ({
    periodName, clubName,
    totalIncome: kIncome as number, totalExpense: kExpense as number, balance: kCommonBalance as number,
    memberCount: activeMemberCount, sessionCount: kSessions as number,
    confirmedCount: memberBillRows.filter(r => r.contributionPaid).length,
  })
  // Rows đầy đủ cho export/infographic — chỉ dùng khi officialReady (kSessions là số thật, không phải 0 giả).
  const billRowsForExport = () => memberBillRows.map(r => ({ ...r, totalSessions: r.totalSessions ?? (kSessions as number) }))
  const EXPORT_FAILED = 'Không thể xuất báo cáo. Vui lòng thử lại.'
  const doExportPDF = async () => {
    if (!officialReady) { toast.error(EXPORT_NOT_READY); return }
    try {
      // exportReportsPDF trả Promise (downloadPDF là async) → phải await để bắt lỗi
      // render/tải file; không báo success trước khi hoàn tất.
      await exportReportsPDF(buildExportSummary(), billRowsForExport())
      toast.success('Đã xuất PDF báo cáo!')
    } catch (e) {
      if (import.meta.env?.DEV) console.error('[Reports] exportPDF failed:', e)
      toast.error(EXPORT_FAILED)
    }
  }
  const doExportExcel = () => {
    if (!officialReady) { toast.error(EXPORT_NOT_READY); return }
    try {
      exportReportsExcel(buildExportSummary(), memberBillRows.map(r => ({
        name: r.memberName, attended: r.attendedSessions, paid: r.contributionPaid ? 'Đã đóng' : 'Chưa đóng', cost: r.totalCost, balance: r.balance,
      })))
      toast.success('Đã xuất Excel báo cáo!')
    } catch (e) {
      if (import.meta.env?.DEV) console.error('[Reports] exportExcel failed:', e)
      toast.error(EXPORT_FAILED)
    }
  }
  const openInfographic = () => {
    if (!officialReady) { toast.error(INFO_NOT_READY); return }
    setShowInfographic(true)
  }

  const resetFilters = () => { setFundFilter('ALL'); if (defaultPeriod?.id) setSelectedPeriodId(defaultPeriod.id) }

  /* ── KPI card helper (official) ── */
  const kpi = (label: string, value: number | undefined, sub: string, accent: 'green' | 'rose' | 'violet' | 'amber' | 'blue' | 'teal', icon: React.ReactNode, fmt: (v: number) => string = formatVND) => (
    <MetricCard label={label} value={value === undefined ? 'Chưa có' : fmt(value)}
      sub={value === undefined ? 'Chưa có dữ liệu (backend summary)' : sub}
      accent={accent} icon={icon} negative={value !== undefined && value < 0} />
  )

  const fundChips = (
    <div className="flex items-center gap-1 rounded-full border p-1 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
      {([['ALL', 'Tất cả'], ['COMMON', 'Quỹ Chính'], ['MINI', 'Quỹ Phụ']] as ['ALL' | FundSource, string][]).map(([v, l]) => (
        <button key={v} onClick={() => setFundFilter(v)} aria-pressed={fundFilter === v}
          className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
          style={fundFilter === v ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)' } : { color: 'var(--pf-color-muted)' }}>
          {l}
        </button>
      ))}
    </div>
  )

  const periodSelect = (
    <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
      <Calendar size={14} className="shrink-0 [color:var(--pf-color-muted)]" />
      <label htmlFor="rp-period" className="sr-only">Kỳ quỹ</label>
      <select id="rp-period" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}
        className="bg-transparent text-xs font-medium outline-none [color:var(--pf-text)]">
        {[...clubData.fundPeriods].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')).map(p => (
          <option key={p.id} value={p.id}>{p.name}{p.status === 'active' ? ' — Đang mở' : p.status === 'closed' ? ' — Đóng' : ''}</option>
        ))}
      </select>
    </div>
  )

  const headerActions = (
    <>
      <ActionButton variant="secondary" iconOnly ariaLabel="Xuất Excel" icon={<FileSpreadsheet size={16} />} onClick={doExportExcel} disabled={!officialReady} title={officialReady ? 'Xuất Excel' : EXPORT_HINT} />
      <ActionButton variant="secondary" iconOnly ariaLabel="Xuất PDF" icon={<FileText size={16} />} onClick={doExportPDF} disabled={!officialReady} title={officialReady ? 'Xuất PDF' : EXPORT_HINT} />
      <ActionButton icon={<Sparkles size={15} />} onClick={openInfographic} disabled={!officialReady} title={officialReady ? 'Tạo Infographic' : EXPORT_HINT}>Infographic</ActionButton>
    </>
  )

  /* ── Member bill table columns ── */
  const billColumns: Column<MemberBillRow>[] = [
    { key: 'name', header: 'Thành viên', render: (r) => <span className="font-medium [color:var(--pf-text)]">{r.memberName}</span> },
    { key: 'attended', header: 'Buổi', align: 'right', render: (r) => <span className="tabular-nums [color:var(--pf-color-muted)]">{r.attendedSessions}{r.totalSessions ? `/${r.totalSessions}` : ''}</span> },
    { key: 'paid', header: 'Đóng quỹ', align: 'center', render: (r) => <StatusBadge tone={r.contributionPaid ? 'success' : 'warning'}>{r.contributionPaid ? 'Đã đóng' : 'Chưa đóng'}</StatusBadge> },
    { key: 'amountPaid', header: 'Đã nộp', align: 'right', render: (r) => <span className="tabular-nums [color:var(--pf-text)]">{formatVND(r.amountPaid)}</span> },
    { key: 'totalCost', header: 'Chi phí', align: 'right', render: (r) => <span className="tabular-nums [color:var(--pf-color-muted)]">{formatVND(r.totalCost)}</span> },
    {
      key: 'balance', header: 'Số dư', align: 'right',
      render: (r) => <span className="font-semibold tabular-nums" style={{ color: r.balance >= 0 ? 'var(--pf-green)' : 'var(--pf-color-danger)' }}>{r.balance >= 0 ? '+' : ''}{formatVND(r.balance)}</span>,
    },
  ]

  const showFinance = reportTab === 'overview' || reportTab === 'finance'
  const showMember = reportTab === 'overview' || reportTab === 'member'
  const showAttendance = reportTab === 'overview' || reportTab === 'attendance'

  return (
    <PageShell>
      <PageHeader
        title="Báo cáo"
        subtitle="Tổng hợp tài chính, thành viên, điểm danh và hiệu quả hoạt động của CLB."
        actions={headerActions}
      />

      {!hasPeriods ? (
        <div className="rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <EmptyState icon={<FileText size={26} />} title="Chưa có kỳ quỹ nào" description="Tạo kỳ quỹ đầu tiên để xem báo cáo." />
        </div>
      ) : loadState === 'loading' ? (
        <>
          <LoadingState variant="cards" rows={6} />
          <div className="mt-4"><LoadingState variant="list" rows={5} /></div>
        </>
      ) : loadState === 'error' ? (
        <div className="rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <EmptyState icon={<AlertCircle size={26} />} title="Không tải được dữ liệu báo cáo"
            description="Đã xảy ra lỗi khi tải tổng hợp báo cáo. Vui lòng thử lại."
            action={<ActionButton icon={<RefreshCw size={15} />} onClick={() => void fetchSummary()}>Thử lại</ActionButton>} />
        </div>
      ) : (
        <>
          {/* ── Report Type Tabs ── */}
          <ResponsiveTabs tabs={REPORT_TABS} active={reportTab} onChange={(k) => setReportTab(k as ReportTab)} />

          {/* ── Filter / Search ── */}
          <div className="mt-3">
            <FilterBar
              searchPlaceholder="Báo cáo kỳ quỹ…"
              filters={<>{fundChips}{periodSelect}</>}
              onOpenFilters={() => setShowFilterSheet(true)}
            />
          </div>

          {/* ── Official KPI Summary (backend fundSummary = Source of Truth) ── */}
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Tổng hợp chính thức · nguồn: backend summary</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
            {kpi('Tổng thu kỳ', kIncome, 'Quỹ Chính (backend)', 'green', <TrendingUp size={18} />)}
            {kpi('Tổng chi kỳ', kExpense, 'Quỹ Chính (backend)', 'amber', <TrendingDown size={18} />)}
            {kpi('Số dư Quỹ Chính', kCommonBalance, 'Backend summary', 'green', <Wallet size={18} />)}
            {kpi('Quỹ Phụ', kMiniBalance, 'Độc lập Quỹ Chính', 'violet', <Gamepad2 size={18} />)}
            {kpi('Số dư chuyển kỳ', kCarry, 'Từ kỳ trước', 'blue', <ArrowLeftRight size={18} />)}
            {kpi('Tổng lượt điểm danh', kAttendance, 'Backend summary', 'teal', <Activity size={18} />, (v) => v.toLocaleString('vi-VN'))}
            {kpi('Chưa đóng quỹ', kUnpaid, periodName || 'Kỳ hiện tại', 'rose', <AlertCircle size={18} />, (v) => v.toLocaleString('vi-VN'))}
            <MetricCard label="Thành viên hoạt động" value={activeMemberCount.toLocaleString('vi-VN')} sub="Đang sinh hoạt" accent="blue" icon={<Users size={18} />} />
          </div>

          {/* ── Charts (visualization từ store — không phải KPI chính thức) ── */}
          {(showFinance || showAttendance) && (
            <>
              <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Biểu đồ trực quan</p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {showFinance && (
                  <ChartCard title="Thu / Chi theo kỳ quỹ" subtitle="6 kỳ gần nhất">
                    {periodBars.length === 0 ? (
                      <div className="flex h-52 items-center justify-center text-sm [color:var(--pf-color-muted)]">Chưa có dữ liệu</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={periodBars} barCategoryGap="28%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                          <XAxis dataKey="ky" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(v: number) => `${(v / 1e6).toFixed(0)}tr`} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<VNDTooltip />} cursor={{ fill: '#F7F9FC' }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          <Bar dataKey="Thu" fill={CHART_INCOME} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Chi" fill={CHART_EXPENSE} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                )}

                {showFinance && (
                  <ChartCard title="Cơ cấu chi phí" subtitle={`Kỳ ${periodName || 'hiện tại'}`}>
                    {costBreakdown.length === 0 ? (
                      <div className="flex h-52 items-center justify-center text-sm [color:var(--pf-color-muted)]">Chưa có chi phí</div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={3} dataKey="value">
                              {costBreakdown.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: unknown) => formatVND(v as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-1 flex-col gap-1.5">
                          {costBreakdown.map((d, i) => (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                <span className="truncate [color:var(--pf-color-muted)]">{d.name}</span>
                              </span>
                              <span className="ml-2 font-medium tabular-nums [color:var(--pf-text)]">{costTotal ? Math.round((d.value / costTotal) * 100) : 0}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </ChartCard>
                )}

                {showAttendance && (
                  <ChartCard title="Tỷ lệ tham gia thành viên" subtitle="Kỳ hiện tại" className="lg:col-span-2">
                    {!hasAttendanceData ? (
                      <div className="flex h-52 items-center justify-center text-sm [color:var(--pf-color-muted)]">Chưa có dữ liệu điểm danh</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.max(200, Math.min(attendanceRates.length, 10) * 28)}>
                        <BarChart data={attendanceRates.slice(0, 10)} layout="vertical" barSize={10}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={100} />
                          <Tooltip content={<PctTooltip />} />
                          <Bar dataKey="rate" fill="#2563EB" radius={[0, 4, 4, 0]} name="Tỷ lệ %" background={{ fill: '#F7F9FC', radius: 4 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                )}
              </div>
            </>
          )}

          {/* ── Member bill / Personal receipt preview (backend calculator) ── */}
          {showMember && (
            <div className="mt-4 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <div className="flex items-center justify-between border-b px-5 py-3 border-[color:var(--pf-border-soft)]">
                <h3 className="text-sm font-semibold [color:var(--pf-text)]">Bảng chi phí thành viên</h3>
                <span className="text-xs [color:var(--pf-color-muted)]">Nguồn: backend calculator</span>
              </div>
              {memberBillRows.length === 0 ? (
                <EmptyState icon={<Users size={26} />} title="Chưa có dữ liệu" description="Backend summary chưa có bảng chi phí thành viên cho kỳ này." />
              ) : isMobile ? (
                <div className="p-3">
                  <MobileCardList items={memberBillRows} itemKey={(r, i) => `${r.memberName}-${i}`}
                    renderCard={(r) => (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold [color:var(--pf-text)]">{r.memberName}</p>
                          <span className="font-semibold tabular-nums" style={{ color: r.balance >= 0 ? 'var(--pf-green)' : 'var(--pf-color-danger)' }}>{r.balance >= 0 ? '+' : ''}{formatVND(r.balance)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs [color:var(--pf-color-muted)]">
                          <StatusBadge tone={r.contributionPaid ? 'success' : 'warning'}>{r.contributionPaid ? 'Đã đóng' : 'Chưa đóng'}</StatusBadge>
                          <span>{r.attendedSessions}{r.totalSessions ? `/${r.totalSessions}` : ''} buổi</span>
                          <span>Chi phí {formatVND(r.totalCost)}</span>
                        </div>
                      </div>
                    )}
                  />
                </div>
              ) : (
                <DataTable columns={billColumns} rows={memberBillRows} rowKey={(r, i) => `${r.memberName}-${i}`} />
              )}
            </div>
          )}

          {/* ── Export panel ── */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold [color:var(--pf-text)]">Xuất báo cáo</h3>
              <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">
                {officialReady ? 'PDF · Excel · Infographic — dùng dữ liệu tổng hợp backend hiện có.' : `${EXPORT_HINT} (Chưa có đủ dữ liệu backend summary)`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton variant="secondary" icon={<FileText size={15} />} onClick={doExportPDF} disabled={!officialReady} title={officialReady ? 'Xuất PDF' : EXPORT_HINT}>PDF</ActionButton>
              <ActionButton variant="secondary" icon={<FileSpreadsheet size={15} />} onClick={doExportExcel} disabled={!officialReady} title={officialReady ? 'Xuất Excel' : EXPORT_HINT}>Excel</ActionButton>
              <ActionButton icon={<Sparkles size={15} />} onClick={openInfographic} disabled={!officialReady} title={officialReady ? 'Tạo Infographic' : EXPORT_HINT}>Infographic</ActionButton>
            </div>
          </div>

          {/* ── Mobile sticky quick action: Infographic ── */}
          {isMobile && (
            <div className="pointer-events-none fixed bottom-20 right-4 z-30">
              <ActionButton className="pointer-events-auto h-12 w-12 shadow-lg" iconOnly ariaLabel="Tạo Infographic" icon={<Sparkles size={20} />} onClick={openInfographic} disabled={!officialReady} title={officialReady ? 'Tạo Infographic' : EXPORT_HINT} />
            </div>
          )}
        </>
      )}

      {/* ── Mobile filter bottom sheet ── */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0" style={{ background: 'rgb(15 23 42 / 0.30)' }} onClick={() => setShowFilterSheet(false)} />
          <div role="dialog" aria-modal="true" aria-label="Bộ lọc báo cáo" className="relative flex max-h-[88vh] w-full flex-col rounded-t-[24px] [background:var(--pf-surface)]">
            <div className="flex items-center justify-between border-b px-5 py-4 border-[color:var(--pf-border)]">
              <h2 className="text-base font-semibold [color:var(--pf-text)]">Bộ lọc báo cáo</h2>
              <button onClick={() => setShowFilterSheet(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl text-lg [color:var(--pf-color-muted)]"><span aria-hidden>✕</span></button>
            </div>
            <div className="space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Nguồn quỹ</p>
                <div className="flex flex-wrap gap-2">
                  {([['ALL', 'Tất cả'], ['COMMON', 'Quỹ Chính'], ['MINI', 'Quỹ Phụ']] as ['ALL' | FundSource, string][]).map(([v, l]) => (
                    <button key={v} onClick={() => setFundFilter(v)} aria-pressed={fundFilter === v}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={fundFilter === v ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)', borderColor: 'var(--pf-green)' } : { color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)' }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="rp-period-m" className="mb-2 block text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Kỳ quỹ</label>
                <select id="rp-period-m" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)} className="input-base">
                  {[...clubData.fundPeriods].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t px-5 py-4 border-[color:var(--pf-border)]">
              <ActionButton variant="secondary" fullWidth onClick={() => { resetFilters(); setShowFilterSheet(false) }}>Xóa lọc</ActionButton>
              <ActionButton fullWidth onClick={() => setShowFilterSheet(false)}>Áp dụng</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Infographic modal — chỉ mở khi đủ official field (không fallback 0/fake) ── */}
      {showInfographic && officialReady && (
        <InfographicPreviewModal
          data={mapToInfographicData({
            clubName,
            periodLabel: periodName,
            totalIncome: kIncome as number,
            totalExpenses: kExpense as number,
            displayBalance: kCommonBalance as number,
            memberCount: activeMemberCount,
            sessionCount: kSessions as number,
            confirmedCount: memberBillRows.filter(r => r.contributionPaid).length,
            memberBillRows: billRowsForExport(),
          })}
          onClose={() => setShowInfographic(false)}
        />
      )}
    </PageShell>
  )
}
