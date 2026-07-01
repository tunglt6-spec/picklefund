/**
 * UI-02 — Dashboard 4.0 (Tổng quan CLB) theo DASH-01 + UDP-01.
 *
 * Chỉ trình bày: dùng shared components (PageShell/PageHeader/MetricCard/ChartCard/
 * DataTable/MobileCardList/StatusBadge/ActionButton/EmptyState) + token --pf-*.
 * KHÔNG đổi data/logic/công thức tài chính (Tổng tài sản = Quỹ Chính + chuyển kỳ,
 * KHÔNG cộng Quỹ Phụ). AI = insight/đề xuất read-only (không hiển thị đã execute).
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users, AlertCircle, Plus, Bell, Activity, Zap, Wallet,
  ArrowLeftRight, BarChart3, Gamepad2, Trophy, QrCode, Brain,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import {
  PageShell, PageHeader, MetricCard, ChartCard, DataTable, type Column,
  StatusBadge, type StatusTone, ActionButton, EmptyState, MobileCardList,
} from '../../components/shared'

/* Màu chart mirror token --pf-* (recharts cần string màu — data-viz, không phải semantic UI). */
const CHART_INCOME = '#059669' // --pf-green
const CHART_EXPENSE = '#E11D48' // --pf-color-danger
const DONUT_COLORS = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#0D9488', '#E11D48']

function pct(a: number, b: number) {
  if (!b) return 0
  return Math.min(100, Math.round((a / b) * 100))
}

interface FundPeriodApiSummary {
  totalIncome: number
  totalExpenses: number
  courtExpenses: number
  balance: number
  costPerAttendance: number
  unpaidCount: number
}

interface DashboardFinanceSummary {
  commonIncome: number
  commonExpense: number
  commonBalance: number
  miniIncome: number
  miniExpense: number
  miniBalance: number
  carryForwardBalance: number
  carryForwardPeriodName: string | null
  clubAssetsBalance: number
  courtExpense: number
  costPerAttendance: number
  unpaidCount: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl border px-3 py-2.5 text-xs min-w-[160px] [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow-hover)]"
    >
      <p className="mb-1.5 font-semibold [color:var(--pf-text)] truncate max-w-[160px]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mb-0.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
          <span className="[color:var(--pf-color-muted)]">{p.name}:</span>
          <span className="font-bold tabular-nums [color:var(--pf-text)]">{formatVND(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border px-3 py-2 text-xs [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow-hover)]">
      <p className="font-semibold [color:var(--pf-text)]">{d.name}</p>
      <p className="mt-0.5 tabular-nums [color:var(--pf-color-muted)]">{formatVND(d.value)}</p>
    </div>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const LEVEL_TONE: Record<'ok' | 'warn' | 'danger', StatusTone> = {
  ok: 'success',
  warn: 'warning',
  danger: 'danger',
}

export function ClubDashboard() {
  const { user, accessToken } = useAuthStore()
  const navigate = useNavigate()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(clubId)
  const isMobile = useIsMobile()
  const [txTab, setTxTab] = useState<'income' | 'expense'>('income')
  const [financeSummary, setFinanceSummary] =
    useState<DashboardFinanceSummary | null>(null)
  const [maikaScore, setMaikaScore] = useState<null | {
    score: number
    recommendations: string[]
    interpretation: string
  }>(null)

  const fetchMaikaScore = useCallback(async () => {
    if (!clubId) return
    try {
      const res = await api.get('/maika/health-score')
      const data = res.data?.data ?? res.data
      if (data?.score !== undefined) setMaikaScore(data)
    } catch {
      /* silent — fallback to computed */
    }
  }, [clubId])

  useEffect(() => {
    fetchMaikaScore()
  }, [fetchMaikaScore])

  /* ── Derived data (GIỮ NGUYÊN logic/công thức) ── */
  const currentPeriod =
    clubData.fundPeriods.find((p) => p.status === 'active') ??
    clubData.fundPeriods[0]
  const isLocalSession =
    !accessToken ||
    accessToken.startsWith('local-token-') ||
    accessToken.startsWith('token-')

  useEffect(() => {
    if (!currentPeriod?.id || isLocalSession) {
      setFinanceSummary(null)
      return
    }
    let cancelled = false
    Promise.allSettled([
      api.get(`/fund-periods/${currentPeriod.id}/summary`),
      api.get('/contributions/summary'),
      api.get('/expenses/summary'),
    ])
      .then(([fundRes, contribRes, expenseRes]) => {
        if (cancelled || fundRes.status !== 'fulfilled') return
        const fund = fundRes.value.data?.data as FundPeriodApiSummary & {
          miniIncome?: number
          miniExpense?: number
          miniBalance?: number
          carryForward?: { balance: number; previousPeriodName: string | null }
          clubAssets?: { balance: number }
        }
        const contrib =
          contribRes.status === 'fulfilled' ? contribRes.value.data?.data : null
        const expense =
          expenseRes.status === 'fulfilled' ? expenseRes.value.data?.data : null
        const miniIncome = Number(fund.miniIncome ?? contrib?.mini?.total ?? 0)
        const miniExpense = Number(fund.miniExpense ?? expense?.mini?.total ?? 0)
        const carryForwardBalance = Number(fund.carryForward?.balance ?? 0)
        const commonBalance = Number(fund.balance ?? 0)
        setFinanceSummary({
          commonIncome: Number(fund.totalIncome ?? 0),
          commonExpense: Number(fund.totalExpenses ?? 0),
          commonBalance,
          miniIncome,
          miniExpense,
          miniBalance: miniIncome - miniExpense,
          carryForwardBalance,
          carryForwardPeriodName: fund.carryForward?.previousPeriodName ?? null,
          // Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
          clubAssetsBalance: Number(
            fund.clubAssets?.balance ?? commonBalance + carryForwardBalance,
          ),
          courtExpense: Number(fund.courtExpenses ?? 0),
          costPerAttendance: Number(fund.costPerAttendance ?? 0),
          unpaidCount: Number(fund.unpaidCount ?? 0),
        })
      })
      .catch(() => {
        if (!cancelled) setFinanceSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [currentPeriod?.id, isLocalSession])

  const commonContribs = useMemo(
    () =>
      clubData.contributions.filter(
        (c) => (c.fundSource ?? 'COMMON') === 'COMMON' && c.isConfirmed,
      ),
    [clubData.contributions],
  )
  const commonExpenses = useMemo(
    () =>
      clubData.expenses.filter((e) => (e.fundSource ?? 'COMMON') === 'COMMON'),
    [clubData.expenses],
  )

  const commonIncome = financeSummary?.commonIncome ?? 0
  const commonExpTotal = financeSummary?.commonExpense ?? 0
  const commonBalance = financeSummary?.commonBalance ?? 0
  const miniBalance = financeSummary?.miniBalance ?? 0
  const carryForwardBalance = financeSummary?.carryForwardBalance ?? 0
  const carryForwardPeriodName = financeSummary?.carryForwardPeriodName ?? null
  // Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ (KHÔNG cộng Quỹ Phụ)
  const clubAssetsBalance =
    financeSummary?.clubAssetsBalance ?? commonBalance + carryForwardBalance

  const totalTurns = clubData.sessions.reduce(
    (a, s) => a + (s._count?.attendanceRecords ?? 0),
    0,
  )
  const avgCostPerTurn = financeSummary?.costPerAttendance ?? 0
  const activeMembers = clubData.members.filter(
    (m) => m.status === 'active',
  ).length
  const totalMembers = clubData.members.length
  const unpaidCount = financeSummary?.unpaidCount ?? 0
  const currentPeriodSessions = currentPeriod
    ? clubData.sessions.filter((s) => s.fundPeriodId === currentPeriod.id)
    : []
  const courtExpense = financeSummary?.courtExpense ?? 0

  const barData = useMemo(() => {
    const sortedPeriods = [...clubData.fundPeriods]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-6)
    return sortedPeriods.map((p) => ({
      name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
      Thu: clubData.contributions
        .filter(
          (c) =>
            c.fundPeriodId === p.id &&
            c.isConfirmed &&
            (c.fundSource ?? 'COMMON') === 'COMMON',
        )
        .reduce((s, c) => s + c.amount, 0),
      Chi: clubData.expenses
        .filter(
          (e) =>
            e.fundPeriodId === p.id && (e.fundSource ?? 'COMMON') === 'COMMON',
        )
        .reduce((s, e) => s + e.amount, 0),
    }))
  }, [clubData.fundPeriods, clubData.contributions, clubData.expenses])

  const donutData = useMemo(() => {
    const groups: Record<string, number> = {}
    for (const e of commonExpenses) {
      const key =
        e.description.length > 20
          ? e.description.slice(0, 20) + '…'
          : e.description
      groups[key] = (groups[key] ?? 0) + e.amount
    }
    return Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  }, [commonExpenses])

  const recentTx = useMemo(() => {
    if (txTab === 'income') {
      return [...clubData.contributions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
    }
    return [...clubData.expenses]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
  }, [txTab, clubData.contributions, clubData.expenses])

  const unpaidMembers = useMemo(() => {
    if (!currentPeriod) return []
    return clubData.members
      .filter(
        (m) =>
          m.status === 'active' &&
          !commonContribs.some(
            (c) => c.memberId === m.id && c.fundPeriodId === currentPeriod.id,
          ),
      )
      .slice(0, 5)
  }, [currentPeriod, clubData.members, commonContribs])

  const computedHealthScore = useMemo(() => {
    if (clubData.fundPeriods.length === 0) return 0
    const finScore =
      commonIncome > 0
        ? Math.round(
            Math.min(25, (25 * Math.max(0, commonBalance)) / Math.max(commonIncome, 1)),
          )
        : 0
    const paidRatio =
      activeMembers > 0 ? (activeMembers - unpaidCount) / activeMembers : 1
    const engScore = Math.round(25 * paidRatio)
    const planned = currentPeriod?.totalSessions ?? 1
    const held = currentPeriodSessions.length
    const actScore = Math.round(
      Math.min(20, 20 * Math.min(held / Math.max(planned, 1), 1)),
    )
    const goalScore =
      activeMembers >= 5 ? 15 : Math.round((15 * activeMembers) / 5)
    const issueScore = Math.round(
      15 * (1 - Math.min(unpaidCount / Math.max(activeMembers, 1), 1)),
    )
    return finScore + engScore + actScore + goalScore + issueScore
  }, [
    commonIncome,
    commonBalance,
    activeMembers,
    unpaidCount,
    currentPeriod,
    currentPeriodSessions,
    clubData.fundPeriods.length,
  ])
  const healthScore = maikaScore?.score ?? computedHealthScore

  const computedHealthCauses = useMemo(() => {
    const causes: { text: string; level: 'ok' | 'warn' | 'danger' }[] = []
    if (commonBalance < 0) causes.push({ text: 'Quỹ Chính đang âm', level: 'danger' })
    else if (commonBalance < commonExpTotal * 0.2)
      causes.push({ text: 'Quỹ Chính thấp', level: 'warn' })
    else causes.push({ text: 'Quỹ Chính dương', level: 'ok' })
    if (clubAssetsBalance < 0)
      causes.push({ text: 'Tổng tài sản CLB đang âm', level: 'danger' })
    else causes.push({ text: 'Tổng tài sản CLB dương', level: 'ok' })
    if (commonBalance < 0 && commonIncome > 0)
      causes.push({ text: 'Thu chưa đủ bù chi', level: 'danger' })
    else if (commonBalance >= 0 && commonExpTotal > 0)
      causes.push({ text: 'Thu/chi cân đối', level: 'ok' })
    return causes.slice(0, 3)
  }, [commonBalance, clubAssetsBalance, commonExpTotal, commonIncome])

  const computedRecs = useMemo(() => {
    const recs: { text: string; level: 'ok' | 'warn' | 'danger' }[] = []
    if (unpaidCount === 0 && activeMembers > 0)
      recs.push({ text: 'Tất cả thành viên đã đóng quỹ kỳ này', level: 'ok' })
    else if (unpaidCount > 0)
      recs.push({
        text: `${unpaidCount} thành viên chưa đóng quỹ — cần nhắc nhở`,
        level: unpaidCount > activeMembers * 0.3 ? 'danger' : 'warn',
      })
    if (commonBalance < 0)
      recs.push({
        text: `Cân đối thu chi — Quỹ Chính đang âm. Cần thu thêm khoảng ${formatVND(Math.abs(commonBalance))}`,
        level: 'danger',
      })
    else if (commonBalance < commonExpTotal * 0.2)
      recs.push({ text: 'Quỹ Chính sắp cạn — theo dõi chi tiêu chặt hơn', level: 'warn' })
    else
      recs.push({
        text: `Quỹ Chính ổn định — số dư ${Math.round(commonBalance / 1000)}k`,
        level: 'ok',
      })
    if (clubAssetsBalance < 0)
      recs.push({
        text: `Tổng tài sản CLB đang âm. Cần bổ sung khoảng ${formatVND(Math.abs(clubAssetsBalance))}`,
        level: 'warn',
      })
    if (carryForwardBalance < 0)
      recs.push({
        text: 'Kỳ trước chuyển sang số dư âm — cần xử lý trước khi mở rộng chi phí',
        level: 'warn',
      })
    if (miniBalance > 0)
      recs.push({
        text: `Quỹ Phụ đang dương (${formatVND(miniBalance)}) nhưng không dùng để bù Quỹ Chính`,
        level: 'ok',
      })
    if (currentPeriodSessions.length === 0 && currentPeriod)
      recs.push({ text: 'Chưa có buổi tập nào trong kỳ này', level: 'warn' })
    if (activeMembers < 5)
      recs.push({ text: 'CLB còn ít thành viên — mời thêm để tăng quỹ', level: 'warn' })
    return recs.slice(0, 4)
  }, [
    unpaidCount,
    activeMembers,
    commonBalance,
    commonExpTotal,
    clubAssetsBalance,
    carryForwardBalance,
    miniBalance,
    currentPeriodSessions,
    currentPeriod,
  ])

  const aiRecommendations: { text: string; level: 'ok' | 'warn' | 'danger' }[] =
    maikaScore?.recommendations
      ? maikaScore.recommendations.slice(0, 4).map((t) => ({
          text: t,
          level: (t.includes('âm') || t.includes('cạn')
            ? 'danger'
            : t.includes('tốt') || t.includes('ổn')
              ? 'ok'
              : 'warn') as 'ok' | 'warn' | 'danger',
        }))
      : computedRecs

  const isEmpty =
    clubData.fundPeriods.length === 0 && clubData.contributions.length === 0
  const clubName = (clubData.settings?.name as string | undefined) ?? 'CLB'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Chào buổi sáng'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  })()

  /* ── Member summary rows (dữ liệu hiện có; không đổi logic) ── */
  interface MemberRow {
    id: string
    name: string
    status: string
    attended: number
    total: number
    paid: boolean
  }
  const memberRows: MemberRow[] = useMemo(
    () =>
      clubData.members.slice(0, 10).map((m) => {
        const att = clubData.memberAttendanceSummary?.find(
          (s) => s.memberId === m.id,
        )
        const paid = currentPeriod
          ? commonContribs.some(
              (c) => c.memberId === m.id && c.fundPeriodId === currentPeriod.id,
            )
          : false
        return {
          id: m.id,
          name: m.fullName,
          status: m.status,
          attended: att?.attendedSessions ?? 0,
          total: att?.totalSessions ?? currentPeriod?.totalSessions ?? 0,
          paid,
        }
      }),
    [clubData.members, clubData.memberAttendanceSummary, commonContribs, currentPeriod],
  )

  const primaryAction = (
    <ActionButton icon={<Plus size={15} />} onClick={() => navigate('/contributions')}>
      Thu quỹ
    </ActionButton>
  )
  const bell = (
    <ActionButton
      variant="secondary"
      iconOnly
      ariaLabel="Thông báo"
      icon={<Bell size={16} />}
      onClick={() => navigate('/notifications')}
    />
  )

  if (isEmpty) {
    return (
      <PageShell>
        <PageHeader
          title="Tổng quan CLB"
          subtitle={`${greeting}, ${clubName}`}
          actions={<>{bell}{primaryAction}</>}
        />
        <ChartCard title={clubName}>
          <EmptyState
            icon={<Activity size={26} />}
            title="Chưa có dữ liệu"
            description="Thêm kỳ quỹ và giao dịch để xem tổng quan CLB."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton variant="secondary" onClick={() => navigate('/fund-periods')}>
                  Tạo kỳ quỹ
                </ActionButton>
                <ActionButton icon={<Plus size={15} />} onClick={() => navigate('/contributions')}>
                  Thêm giao dịch
                </ActionButton>
              </div>
            }
          />
        </ChartCard>
      </PageShell>
    )
  }

  const scoreTone: StatusTone =
    healthScore >= 70 ? 'success' : healthScore >= 40 ? 'warning' : 'danger'
  const paidMembers = activeMembers - unpaidCount

  /* ── Member table columns (desktop) ── */
  const memberColumns: Column<MemberRow>[] = [
    { key: 'name', header: 'Thành viên', render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => (
        <StatusBadge tone={r.status === 'active' ? 'success' : 'neutral'} dot>
          {r.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
        </StatusBadge>
      ),
    },
    { key: 'attended', header: 'Buổi', align: 'right', render: (r) => <span className="tabular-nums">{r.attended}/{r.total}</span> },
    {
      key: 'paid',
      header: 'Đóng quỹ',
      align: 'right',
      render: (r) => (
        <StatusBadge tone={r.paid ? 'success' : 'warning'}>
          {r.paid ? 'Đã đóng' : 'Chưa đóng'}
        </StatusBadge>
      ),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Tổng quan CLB"
        subtitle={`${greeting} · ${clubName} · Cập nhật ${new Date().toLocaleDateString('vi-VN')}`}
        actions={<>{bell}{primaryAction}</>}
      />

      {/* ── KPI Row: 4 quỹ ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Quỹ Chính"
          value={formatVND(commonBalance)}
          sub="Số dư hiện tại"
          accent="green"
          icon={<Wallet size={18} />}
          negative={commonBalance < 0}
        />
        <MetricCard
          label="Quỹ Phụ"
          value={formatVND(miniBalance)}
          sub="Độc lập với Quỹ Chính"
          accent="violet"
          icon={<Gamepad2 size={18} />}
          negative={miniBalance < 0}
        />
        <MetricCard
          label="Số dư chuyển kỳ"
          value={(carryForwardBalance > 0 ? '+' : '') + formatVND(carryForwardBalance)}
          sub={carryForwardPeriodName ? `Từ: ${carryForwardPeriodName}` : 'Chưa có kỳ trước'}
          accent="amber"
          icon={<ArrowLeftRight size={18} />}
          negative={carryForwardBalance < 0}
        />
        <MetricCard
          label="Tổng tài sản CLB"
          value={formatVND(clubAssetsBalance)}
          sub="Quỹ Chính + chuyển kỳ"
          accent="blue"
          icon={<BarChart3 size={18} />}
          negative={clubAssetsBalance < 0}
        />
      </div>

      {/* ── Secondary KPI ── */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Tổng lượt chơi" value={totalTurns.toLocaleString('vi-VN')} sub="Tất cả kỳ" accent="blue" icon={<Activity size={16} />} />
        <MetricCard label="Chi phí TB/lượt" value={avgCostPerTurn > 0 ? `${Math.round(avgCostPerTurn / 1000)}k` : '—'} sub="Quỹ Chính" accent="teal" icon={<Zap size={16} />} />
        <MetricCard label="Thành viên" value={`${activeMembers}/${totalMembers}`} sub="đang hoạt động" accent="green" icon={<Users size={16} />} />
        <MetricCard label="Chưa đóng quỹ" value={unpaidCount.toString()} sub={currentPeriod ? currentPeriod.name : 'Kỳ hiện tại'} accent={unpaidCount > 0 ? 'amber' : 'green'} icon={<AlertCircle size={16} />} negative={unpaidCount > 0} />
        <MetricCard label="Chi sân kỳ này" value={courtExpense > 0 ? `${Math.round(courtExpense / 1000)}k` : '—'} sub={`${currentPeriodSessions.length} buổi`} accent="violet" icon={<Trophy size={16} />} />
      </div>

      {/* ── Main workspace: left charts/table + right insight panel ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ChartCard title="Thu / Chi theo kỳ quỹ" subtitle="6 kỳ gần nhất (Quỹ Chính)">
            {barData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm [color:var(--pf-color-muted)]">Chưa có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}k` : `${v}`)} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#F7F9FC' }} />
                  <Bar dataKey="Thu" fill={CHART_INCOME} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Chi" fill={CHART_EXPENSE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Cơ cấu chi phí" subtitle="Quỹ Chính · tất cả kỳ">
            {donutData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm [color:var(--pf-color-muted)]">Chưa có chi phí</div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value">
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-1.5">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="truncate [color:var(--pf-color-muted)]">{d.name}</span>
                      </span>
                      <span className="ml-2 font-medium tabular-nums [color:var(--pf-text)]">{pct(d.value, commonExpTotal)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>

          {/* Member summary — DataTable (desktop) / MobileCardList (mobile) */}
          <ChartCard title="Thành viên" subtitle="Tình hình tham gia & đóng quỹ" actions={<ActionButton variant="ghost" onClick={() => navigate('/members')}>Xem tất cả</ActionButton>}>
            {isMobile ? (
              <MobileCardList
                items={memberRows}
                itemKey={(m) => m.id}
                emptyText="Chưa có thành viên"
                renderCard={(m) => (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium [color:var(--pf-text)]">{m.name}</p>
                      <p className="text-xs [color:var(--pf-color-muted)]">{m.attended}/{m.total} buổi</p>
                    </div>
                    <StatusBadge tone={m.paid ? 'success' : 'warning'}>{m.paid ? 'Đã đóng' : 'Chưa đóng'}</StatusBadge>
                  </div>
                )}
              />
            ) : (
              <DataTable columns={memberColumns} rows={memberRows} rowKey={(m) => m.id} emptyText="Chưa có thành viên" />
            )}
          </ChartCard>

          {/* Recent activity */}
          <ChartCard
            title="Giao dịch gần đây"
            actions={
              <div className="flex overflow-hidden rounded-full border border-[color:var(--pf-border)]">
                {(['income', 'expense'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTxTab(tab)}
                    className="px-3 py-1 text-xs font-medium transition-colors"
                    style={
                      txTab === tab
                        ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)' }
                        : { background: 'var(--pf-surface)', color: 'var(--pf-color-muted)' }
                    }
                  >
                    {tab === 'income' ? 'Thu' : 'Chi'}
                  </button>
                ))}
              </div>
            }
          >
            {recentTx.length === 0 ? (
              <div className="py-8 text-center text-sm [color:var(--pf-color-muted)]">Không có dữ liệu</div>
            ) : (
              <div className="flex flex-col divide-y divide-[color:var(--pf-border-soft)]">
                {recentTx.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={
                          txTab === 'income'
                            ? { background: 'var(--pf-green-soft)', color: 'var(--pf-green)' }
                            : { background: 'var(--pf-color-danger-soft)', color: 'var(--pf-color-danger)' }
                        }
                      >
                        {txTab === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium [color:var(--pf-text)] max-w-[200px]">
                          {txTab === 'income' ? ((tx as { member?: { fullName?: string }; payerName?: string }).member?.fullName ?? (tx as { payerName?: string }).payerName ?? 'Ẩn danh') : (tx as { description?: string }).description}
                        </p>
                        <p className="text-[11px] [color:var(--pf-color-muted)]">{tx.fundSource === 'MINI' ? 'Quỹ Phụ' : 'Quỹ Chính'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: txTab === 'income' ? 'var(--pf-green)' : 'var(--pf-color-danger)' }}>
                      {txTab === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        {/* Right insight panel */}
        <div className="flex flex-col gap-4">
          {/* Maika AI Insight — read-only */}
          <ChartCard title="Sức khoẻ CLB" subtitle="Maika AI · Đề xuất (read-only)" actions={<Brain size={16} style={{ color: 'var(--pf-color-ai)' }} />}>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl" style={{ background: 'var(--pf-color-ai-soft)' }}>
                <span className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--pf-color-ai)' }}>{healthScore}</span>
                <span className="text-[10px] [color:var(--pf-color-muted)]">/100</span>
              </div>
              <div className="min-w-0">
                <StatusBadge tone={scoreTone}>{healthScore >= 70 ? 'Tốt' : healthScore >= 40 ? 'Trung bình' : 'Cần chú ý'}</StatusBadge>
                <p className="mt-1 text-xs [color:var(--pf-color-muted)]">Điểm sức khoẻ tài chính</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {computedHealthCauses.map((c, i) => (
                <StatusBadge key={i} tone={LEVEL_TONE[c.level]} dot>{c.text}</StatusBadge>
              ))}
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {aiRecommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.level === 'ok' ? 'var(--pf-color-success)' : r.level === 'warn' ? 'var(--pf-color-warning)' : 'var(--pf-color-danger)' }} />
                  <span className="[color:var(--pf-text)]">{r.text}</span>
                </li>
              ))}
            </ul>
            <ActionButton variant="secondary" fullWidth className="mt-3" icon={<Brain size={14} />} onClick={() => navigate('/lisa')}>
              Hỏi Lisa AI
            </ActionButton>
          </ChartCard>

          {/* Công nợ */}
          <ChartCard title="Công nợ" subtitle="Kỳ hiện tại" actions={<ActionButton variant="ghost" onClick={() => navigate('/contributions')}>Thu nhanh</ActionButton>}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tabular-nums" style={{ color: unpaidCount > 0 ? 'var(--pf-color-warning)' : 'var(--pf-color-success)' }}>{unpaidCount}</p>
                <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">thành viên chưa đóng</p>
              </div>
              {currentPeriod && (
                <div className="text-right">
                  <p className="text-xs font-semibold tabular-nums [color:var(--pf-text)]">{paidMembers}/{activeMembers}</p>
                  <p className="text-[10px] [color:var(--pf-color-muted)]">đã đóng</p>
                </div>
              )}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--pf-color-muted-soft)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${activeMembers > 0 ? pct(paidMembers, activeMembers) : 100}%`, background: unpaidCount === 0 ? 'var(--pf-color-success)' : 'var(--pf-color-warning)' }} />
            </div>
            {unpaidMembers.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {unpaidMembers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-xs">
                    <span className="truncate [color:var(--pf-text)] max-w-[140px]">{m.fullName}</span>
                    <StatusBadge tone="warning">Chưa đóng</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>

          {/* Chi sân + QR */}
          <ChartCard title="Chi sân kỳ này" subtitle={`${currentPeriodSessions.length} buổi · Quỹ Chính`}>
            <p className="text-2xl font-bold tabular-nums [color:var(--pf-text)]">{courtExpense > 0 ? formatVND(courtExpense) : '—'}</p>
            <p className="mt-1 text-xs [color:var(--pf-color-muted)]">Chi phí sân trong kỳ hiện tại</p>
            <ActionButton fullWidth className="mt-3" icon={<QrCode size={14} />} onClick={() => navigate('/contributions')}>
              Tạo QR thu tiền
            </ActionButton>
          </ChartCard>
        </div>
      </div>
    </PageShell>
  )
}
