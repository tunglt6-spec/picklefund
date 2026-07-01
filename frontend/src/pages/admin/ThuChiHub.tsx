/**
 * UI-04 — Finance Workspace Enterprise Implementation (PickleFund v2.1)
 * Kế thừa UI-02 Dashboard 4.0 (Golden Reference). Tuân thủ UIP-04 (Finance Workspace
 * Pattern) + UDP-01 (Design SoT) + Amendment #01 (Loading/Empty/Error DoD) +
 * Amendment #02 (Design Pattern First) + DESIGN-01 + GOV-01.
 *
 * Chỉ trình bày (UI): shared components + token --pf-*. KHÔNG đổi Finance Engine/
 * fund calculation/reports/receipt/approval/API/DB. UI CHỈ render dữ liệu hiện có:
 *  - Fund balances (Quỹ Chính/Phụ/chuyển kỳ) lấy từ BACKEND SUMMARY hiện có (như Dashboard).
 *  - Transaction list + tổng thu/chi lấy từ store (giữ nguyên hành vi màn Thu Chi cũ).
 * Không tự tính lại công thức tài chính. Không hard-code số liệu.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Wallet, Gamepad2, TrendingUp, TrendingDown, AlertCircle,
  Receipt, FileBarChart, X, Eye, RefreshCw, ArrowUpRight, ArrowDownRight, Layers,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import {
  MINI_INCOME_TYPE_LABELS, MINI_EXPENSE_TYPE_LABELS,
  type ExpenseStatus, type FundContribution, type LivingExpense,
} from '../../types'
import {
  PageShell, PageHeader, MetricCard, ChartCard, FilterBar, DataTable, type Column,
  StatusBadge, type StatusTone, ActionButton, EmptyState, LoadingState, MobileCardList,
  ResponsiveTabs,
} from '../../components/shared'

/* Màu chart mirror token --pf-* (recharts cần string — data-viz, không phải semantic UI). */
const CHART_INCOME = '#059669' // --pf-green
const CHART_EXPENSE = '#E11D48' // --pf-color-danger
const DONUT_COLORS = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#0D9488', '#E11D48']

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

/** Hiển thị ngày an toàn: dữ liệu thiếu/không hợp lệ → "—" (không hiện "Invalid Date"). */
function safeDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN')
}

/* ── Expense status → label/tone (badge có text, không chỉ màu) ── */
const EXP_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: 'Chờ duyệt', approved: 'Đã duyệt', paid: 'Đã thanh toán', rejected: 'Từ chối',
}
const EXP_STATUS_TONE: Record<ExpenseStatus, StatusTone> = {
  pending: 'warning', approved: 'info', paid: 'success', rejected: 'danger',
}

/**
 * Backend Summary = Source of Truth tài chính. Field nào backend KHÔNG trả về →
 * để `undefined` và UI hiển thị "Chưa có dữ liệu". UI TUYỆT ĐỐI KHÔNG tự tính finance
 * (không miniIncome−miniExpense, không commonBalance+carryForward).
 */
interface FinanceSummary {
  commonBalance?: number
  commonIncome?: number
  commonExpense?: number
  miniBalance?: number
  carryForwardBalance?: number
  clubAssetsBalance?: number
  unpaidCount?: number
}

type FundTab = 'all' | 'COMMON' | 'MINI'
type TypeFilter = 'all' | 'income' | 'expense'

interface Tx {
  id: string
  kind: 'income' | 'expense'
  fundSource: 'COMMON' | 'MINI'
  party: string
  title: string
  amount: number
  method: string
  date: string
  createdAt: string
  status: StatusTone
  statusLabel: string
  periodId?: string
  notes?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2.5 text-xs min-w-[160px] [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow-hover)]">
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

const FUND_TONE: Record<'COMMON' | 'MINI', StatusTone> = { COMMON: 'info', MINI: 'ai' }
const FUND_LABEL: Record<'COMMON' | 'MINI', string> = { COMMON: 'Quỹ Chính', MINI: 'Quỹ Phụ' }

/* ── Drawer shell: desktop = right panel, mobile = bottom sheet (finance-specific) ── */
function DrawerShell({
  open, onClose, title, subtitle, isMobile, children, footer,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string
  isMobile: boolean; children: React.ReactNode; footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className={`fixed inset-0 z-50 flex ${isMobile ? 'items-end' : 'justify-end'}`}>
      <div className="absolute inset-0" style={{ background: 'rgb(15 23 42 / 0.30)' }} onClick={onClose} />
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`relative flex flex-col [background:var(--pf-surface)] ${
          isMobile ? 'w-full max-h-[88vh] rounded-t-[24px] animate-fadeIn' : 'h-full w-full max-w-md shadow-2xl animate-fadeIn'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4 border-[color:var(--pf-border)]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold [color:var(--pf-text)]">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs [color:var(--pf-color-muted)]">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex items-center gap-3 border-t px-5 py-4 border-[color:var(--pf-border)]">{footer}</div>}
      </div>
    </div>
  )
}

export function ThuChiHub() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const clubData = useClubDataStore(s => s.getClubData(clubId))
  const { contributions, expenses, members, fundPeriods } = clubData

  const currentPeriod = fundPeriods.find(p => p.status === 'active') ?? fundPeriods[0] ?? null

  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fundTab, setFundTab] = useState<FundTab>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  /* ── Backend summary fetch (ĐÚNG endpoint hiện có — như Dashboard; không recompute) ── */
  const fetchSummary = useCallback(async () => {
    if (!currentPeriod?.id || isLocalToken(accessToken)) { setSummary(null); setLoadState('idle'); return }
    setLoadState('loading')
    try {
      const [fundRes, , expenseRes] = await Promise.allSettled([
        api.get(`/fund-periods/${currentPeriod.id}/summary`),
        api.get('/contributions/summary'),
        api.get('/expenses/summary'),
      ])
      if (fundRes.status !== 'fulfilled') throw new Error('fund summary failed')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fund = fundRes.value.data?.data as any
      void expenseRes
      // CHỈ dùng field chính thức từ backend summary. Thiếu → undefined ("Chưa có dữ liệu").
      // UI KHÔNG tự tính lại finance (không miniIncome−miniExpense, không common+carryForward).
      const num = (v: unknown): number | undefined => (v == null ? undefined : Number(v))
      setSummary({
        commonBalance: num(fund.balance),
        commonIncome: num(fund.totalIncome),
        commonExpense: num(fund.totalExpenses),
        miniBalance: num(fund.miniBalance),
        carryForwardBalance: num(fund.carryForward?.balance),
        clubAssetsBalance: num(fund.clubAssets?.balance),
        unpaidCount: num(fund.unpaidCount),
      })
      setLoadState('idle')
    } catch {
      setLoadState('error')
    }
  }, [currentPeriod?.id, accessToken])

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void fetchSummary()
  }, [fetchSummary])

  /* ── Chuẩn hoá giao dịch (read-only, từ store) ── */
  const memberName = (id?: string) => members.find(m => m.id === id)?.fullName
  const incomeTx: Tx[] = contributions.map((c: FundContribution) => ({
    id: `c-${c.id}`,
    kind: 'income',
    fundSource: (c.fundSource ?? 'COMMON') as 'COMMON' | 'MINI',
    party: memberName(c.memberId) ?? c.payerName ?? 'Ẩn danh',
    title: c.fundSource === 'MINI'
      ? (c.miniIncomeType ? MINI_INCOME_TYPE_LABELS[c.miniIncomeType] : 'Thu Quỹ Phụ')
      : 'Thu quỹ',
    amount: c.amount,
    method: c.paymentMethod || '—',
    date: c.paymentDate,
    createdAt: c.createdAt ?? c.paymentDate,
    status: c.isConfirmed ? 'success' : 'warning',
    statusLabel: c.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận',
    periodId: c.fundPeriodId,
    notes: c.notes,
  }))
  const expenseTx: Tx[] = expenses.map((e: LivingExpense) => {
    const st = (e.status ?? 'pending') as ExpenseStatus
    return {
      id: `e-${e.id}`,
      kind: 'expense',
      fundSource: (e.fundSource ?? 'COMMON') as 'COMMON' | 'MINI',
      party: e.receiverName ?? (e.fundSource === 'MINI' && e.miniExpenseType ? MINI_EXPENSE_TYPE_LABELS[e.miniExpenseType] : 'CLB'),
      title: e.description,
      amount: e.amount,
      method: '—',
      date: e.expenseDate,
      createdAt: e.createdAt ?? e.expenseDate,
      status: EXP_STATUS_TONE[st],
      statusLabel: EXP_STATUS_LABEL[st],
      periodId: e.fundPeriodId,
      notes: undefined,
    }
  })
  const allTx = [...incomeTx, ...expenseTx]

  /* ── Filter (chỉ lọc hiển thị — không đổi dữ liệu) ── */
  const q = search.trim().toLowerCase()
  const filteredTx = allTx
    .filter(t => fundTab === 'all' || t.fundSource === fundTab)
    .filter(t => typeFilter === 'all' || t.kind === typeFilter)
    .filter(t => periodFilter === 'all' || t.periodId === periodFilter)
    .filter(t => !q || t.party.toLowerCase().includes(q) || t.title.toLowerCase().includes(q))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  /* ── Transaction View Metrics (CHỈ mô tả danh sách ĐANG LỌC — KHÔNG phải KPI tài chính
     chính thức; số liệu tài chính chính thức lấy từ backend summary/Reports). ── */
  const filteredIncomeTotal = filteredTx.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0)
  const filteredExpenseTotal = filteredTx.filter(t => t.kind === 'expense' && t.statusLabel !== 'Từ chối').reduce((s, t) => s + t.amount, 0)
  const filteredCount = filteredTx.length

  const hasActiveFilter = fundTab !== 'all' || typeFilter !== 'all' || periodFilter !== 'all' || !!q

  /* ── Charts (từ store, COMMON — display aggregation, không phải công thức finance) ── */
  const barData = [...fundPeriods]
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    .slice(-6)
    .map(p => ({
      name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
      Thu: contributions.filter(c => c.fundPeriodId === p.id && c.isConfirmed && (c.fundSource ?? 'COMMON') === 'COMMON').reduce((s, c) => s + c.amount, 0),
      Chi: expenses.filter(e => e.fundPeriodId === p.id && (e.fundSource ?? 'COMMON') === 'COMMON').reduce((s, e) => s + e.amount, 0),
    }))
  const donutGroups: Record<string, number> = {}
  for (const e of expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON')) {
    const key = e.description.length > 20 ? e.description.slice(0, 20) + '…' : e.description
    donutGroups[key] = (donutGroups[key] ?? 0) + e.amount
  }
  const donutData = Object.entries(donutGroups).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0)

  const detailTx = detailId ? allTx.find(t => t.id === detailId) ?? null : null

  const resetFilters = () => { setFundTab('all'); setTypeFilter('all'); setPeriodFilter('all'); setSearch('') }

  const fundTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'COMMON', label: 'Quỹ Chính' },
    { key: 'MINI', label: 'Quỹ Phụ' },
  ]

  const typeChips = (
    <div className="flex items-center gap-1 rounded-full border p-1 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
      {([['all', 'Tất cả'], ['income', 'Thu'], ['expense', 'Chi']] as [TypeFilter, string][]).map(([v, l]) => (
        <button key={v} onClick={() => setTypeFilter(v)} aria-pressed={typeFilter === v}
          className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
          style={typeFilter === v ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)' } : { color: 'var(--pf-color-muted)' }}>
          {l}
        </button>
      ))}
    </div>
  )

  /** KPI tài chính CHÍNH THỨC — value lấy từ backend summary; undefined → "Chưa có dữ liệu". */
  const kpiFund = (
    label: string, value: number | undefined, sub: string,
    accent: 'green' | 'violet' | 'amber' | 'blue' | 'rose' | 'teal', icon: React.ReactNode,
    fmt: (v: number) => string = formatVND,
  ) => (
    <MetricCard
      label={label}
      value={value === undefined ? 'Chưa có' : fmt(value)}
      sub={value === undefined ? 'Chưa có dữ liệu (backend summary)' : sub}
      accent={accent}
      icon={icon}
      negative={value !== undefined && value < 0}
    />
  )

  /* ── Amount cell (dấu +/− + màu + text) ── */
  const Amount = ({ t }: { t: Tx }) => (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums"
      style={{ color: t.kind === 'income' ? 'var(--pf-green)' : 'var(--pf-color-danger)' }}>
      {t.kind === 'income' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {t.kind === 'income' ? '+' : '−'}{formatVND(t.amount)}
    </span>
  )

  const columns: Column<Tx>[] = [
    {
      key: 'kind', header: 'Loại',
      render: (t) => (
        <StatusBadge tone={t.kind === 'income' ? 'success' : 'danger'} dot>
          {t.kind === 'income' ? 'Thu' : 'Chi'}
        </StatusBadge>
      ),
    },
    { key: 'fund', header: 'Nguồn quỹ', render: (t) => <StatusBadge tone={FUND_TONE[t.fundSource]}>{FUND_LABEL[t.fundSource]}</StatusBadge> },
    { key: 'party', header: 'Đối tượng', render: (t) => <span className="font-medium [color:var(--pf-text)]">{t.party}</span> },
    { key: 'title', header: 'Nội dung', render: (t) => <span className="[color:var(--pf-color-muted)]">{t.title}</span> },
    { key: 'amount', header: 'Số tiền', align: 'right', render: (t) => <Amount t={t} /> },
    { key: 'method', header: 'Phương thức', render: (t) => <span className="text-xs [color:var(--pf-color-muted)]">{t.method}</span> },
    { key: 'date', header: 'Ngày', render: (t) => <span className="text-xs [color:var(--pf-color-muted)]">{safeDate(t.date)}</span> },
    { key: 'status', header: 'Trạng thái', render: (t) => <StatusBadge tone={t.status}>{t.statusLabel}</StatusBadge> },
    {
      key: 'actions', header: 'Hành động', align: 'center',
      render: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setDetailId(t.id)} aria-label="Xem chi tiết" title="Xem chi tiết"
            className="flex h-10 w-10 items-center justify-center rounded-xl [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]">
            <Eye size={15} />
          </button>
        </div>
      ),
    },
  ]

  const headerActions = (
    <>
      <ActionButton variant="secondary" iconOnly ariaLabel="Xuất báo cáo" icon={<FileBarChart size={16} />} onClick={() => navigate('/reports')} />
      <ActionButton variant="secondary" icon={<TrendingDown size={15} />} onClick={() => navigate('/expenses')}>Thêm chi phí</ActionButton>
      <ActionButton icon={<Plus size={16} />} onClick={() => navigate('/contributions')}>Thu quỹ</ActionButton>
    </>
  )

  return (
    <PageShell>
      <PageHeader
        title="Tài chính"
        subtitle="Quản lý quỹ, thu chi, công nợ và giao dịch tài chính của CLB."
        actions={headerActions}
      />

      {loadState === 'loading' ? (
        /* ── Workspace Loading (shared LoadingState) ── */
        <>
          <LoadingState variant="cards" rows={6} />
          <div className="mt-4"><LoadingState variant="list" rows={6} /></div>
        </>
      ) : loadState === 'error' ? (
        /* ── Workspace Error + Retry (gọi lại đúng API hiện có) ── */
        <div className="mt-4 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <EmptyState
            icon={<AlertCircle size={26} />}
            title="Không tải được dữ liệu tài chính"
            description="Đã xảy ra lỗi khi tải tổng hợp tài chính. Vui lòng thử lại."
            action={<ActionButton icon={<RefreshCw size={15} />} onClick={() => void fetchSummary()}>Thử lại</ActionButton>}
          />
        </div>
      ) : (
      <>
        {/* ── KPI tài chính CHÍNH THỨC (Backend Summary = Source of Truth) ── */}
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Tổng hợp tài chính · nguồn: backend summary</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {kpiFund('Quỹ Chính', summary?.commonBalance, 'Số dư kỳ (backend)', 'green', <Wallet size={18} />)}
          {kpiFund('Quỹ Phụ', summary?.miniBalance, 'Độc lập Quỹ Chính', 'violet', <Gamepad2 size={18} />)}
          {kpiFund('Tổng thu kỳ', summary?.commonIncome, 'Quỹ Chính (backend)', 'green', <TrendingUp size={18} />)}
          {kpiFund('Tổng chi kỳ', summary?.commonExpense, 'Quỹ Chính (backend)', 'amber', <TrendingDown size={18} />)}
          {kpiFund('Chưa đóng quỹ', summary?.unpaidCount, currentPeriod ? currentPeriod.name : 'Kỳ hiện tại', 'rose', <AlertCircle size={18} />, (v) => v.toLocaleString('vi-VN'))}
        </div>

        {/* ── Transaction View Metrics (chỉ mô tả danh sách ĐANG LỌC — KHÔNG phải số liệu tài chính chính thức) ── */}
        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Giao dịch đang lọc · không phải số liệu tài chính chính thức</p>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Thu đang lọc" value={formatVND(filteredIncomeTotal)} sub="Tổng khoản thu đang hiển thị" accent="teal" icon={<TrendingUp size={18} />} />
          <MetricCard label="Chi đang lọc" value={formatVND(filteredExpenseTotal)} sub="Không tính từ chối" accent="teal" icon={<TrendingDown size={18} />} />
          <MetricCard label="Số giao dịch" value={filteredCount.toLocaleString('vi-VN')} sub="Trong phạm vi lọc" accent="blue" icon={<Layers size={18} />} />
        </div>

        {/* ── Fund Tabs ── */}
        <div className="mt-4">
          <ResponsiveTabs tabs={fundTabs} active={fundTab} onChange={(k) => setFundTab(k as FundTab)} />
        </div>

        {/* ── Filter / Search ── */}
        <div className="mt-3">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm theo đối tượng, nội dung…"
            filters={typeChips}
            onOpenFilters={() => setShowFilterSheet(true)}
          />
        </div>

        {/* ── Charts ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
              <div className="flex h-48 items-center justify-center text-sm [color:var(--pf-color-muted)]">Chưa có chi phí</div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={3} dataKey="value">
                      {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
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
                      <span className="ml-2 font-medium tabular-nums [color:var(--pf-text)]">{donutTotal ? Math.round((d.value / donutTotal) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* ── Transaction list: DataTable (desktop) / MobileCardList (mobile) ── */}
        <div className="mt-4 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <div className="flex items-center justify-between border-b px-5 py-3 border-[color:var(--pf-border-soft)]">
            <h3 className="text-sm font-semibold [color:var(--pf-text)]">Lịch sử giao dịch</h3>
            <span className="text-xs [color:var(--pf-color-muted)]">{filteredTx.length} / {allTx.length} giao dịch</span>
          </div>
          {filteredTx.length === 0 ? (
            hasActiveFilter ? (
              <EmptyState
                icon={<Receipt size={26} />}
                title="Không tìm thấy giao dịch"
                description="Không có giao dịch khớp bộ lọc/từ khóa hiện tại."
                action={<ActionButton variant="secondary" icon={<RefreshCw size={15} />} onClick={resetFilters}>Xóa bộ lọc</ActionButton>}
              />
            ) : (
              <EmptyState
                icon={<Receipt size={26} />}
                title="Chưa có giao dịch nào"
                description="Thêm khoản thu hoặc chi phí để bắt đầu quản lý tài chính CLB."
                action={<ActionButton icon={<Plus size={15} />} onClick={() => navigate('/contributions')}>Thu quỹ</ActionButton>}
              />
            )
          ) : isMobile ? (
            <div className="p-3">
              <MobileCardList
                items={filteredTx}
                itemKey={(t) => t.id}
                onItemClick={(t) => setDetailId(t.id)}
                renderCard={(t) => (
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: t.kind === 'income' ? 'var(--pf-green-soft)' : 'var(--pf-color-danger-soft)', color: t.kind === 'income' ? 'var(--pf-green)' : 'var(--pf-color-danger)' }}>
                      {t.kind === 'income' ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold [color:var(--pf-text)]">{t.party}</p>
                        <Amount t={t} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs [color:var(--pf-color-muted)]">
                        <StatusBadge tone={FUND_TONE[t.fundSource]}>{FUND_LABEL[t.fundSource]}</StatusBadge>
                        <span>{safeDate(t.date)}</span>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          ) : (
            <DataTable columns={columns} rows={filteredTx} rowKey={(t) => t.id} onRowClick={(t) => setDetailId(t.id)} />
          )}
        </div>

        {/* ── Mobile sticky quick action: Thu quỹ ── */}
        {isMobile && (
          <div className="pointer-events-none fixed bottom-20 right-4 z-30">
            <ActionButton className="pointer-events-auto h-12 w-12 shadow-lg" iconOnly ariaLabel="Thu quỹ" icon={<Plus size={20} />} onClick={() => navigate('/contributions')} />
          </div>
        )}
      </>
      )}

      {/* ── Mobile filter bottom sheet ── */}
      {showFilterSheet && (
        <DrawerShell open={showFilterSheet} onClose={() => setShowFilterSheet(false)} isMobile title="Bộ lọc" subtitle="Lọc giao dịch tài chính"
          footer={
            <>
              <ActionButton variant="secondary" fullWidth onClick={() => { resetFilters(); setShowFilterSheet(false) }}>Xóa lọc</ActionButton>
              <ActionButton fullWidth onClick={() => setShowFilterSheet(false)}>Áp dụng</ActionButton>
            </>
          }
        >
          <div className="space-y-5 px-5 py-5">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Loại giao dịch</p>
              <div className="flex flex-wrap gap-2">
                {([['all', 'Tất cả'], ['income', 'Thu'], ['expense', 'Chi']] as [TypeFilter, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setTypeFilter(v)} aria-pressed={typeFilter === v}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={typeFilter === v ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)', borderColor: 'var(--pf-green)' } : { color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Nguồn quỹ</p>
              <div className="flex flex-wrap gap-2">
                {([['all', 'Tất cả'], ['COMMON', 'Quỹ Chính'], ['MINI', 'Quỹ Phụ']] as [FundTab, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setFundTab(v)} aria-pressed={fundTab === v}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={fundTab === v ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)', borderColor: 'var(--pf-green)' } : { color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="fx-period" className="mb-2 block text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Kỳ quỹ</label>
              <select id="fx-period" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="input-base">
                <option value="all">Tất cả kỳ</option>
                {fundPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </DrawerShell>
      )}

      {/* ── Transaction detail drawer ── */}
      {detailTx && (
        <DrawerShell open={!!detailTx} onClose={() => setDetailId(null)} isMobile={isMobile}
          title="Chi tiết giao dịch" subtitle={detailTx.party}
          footer={
            <ActionButton variant="secondary" fullWidth icon={<Eye size={15} />}
              onClick={() => navigate(detailTx.kind === 'income' ? '/contributions' : '/expenses')}>
              Quản lý đầy đủ
            </ActionButton>
          }
        >
          <div className="space-y-5 px-5 py-5">
            <div className="flex items-center justify-between">
              <StatusBadge tone={detailTx.kind === 'income' ? 'success' : 'danger'} dot>
                {detailTx.kind === 'income' ? 'Khoản thu' : 'Khoản chi'}
              </StatusBadge>
              <span className="text-lg font-bold tabular-nums" style={{ color: detailTx.kind === 'income' ? 'var(--pf-green)' : 'var(--pf-color-danger)' }}>
                {detailTx.kind === 'income' ? '+' : '−'}{formatVND(detailTx.amount)}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Đối tượng" value={detailTx.party} />
              <Row label="Nội dung" value={detailTx.title} />
              <Row label="Nguồn quỹ" value={<StatusBadge tone={FUND_TONE[detailTx.fundSource]}>{FUND_LABEL[detailTx.fundSource]}</StatusBadge>} />
              <Row label="Kỳ quỹ" value={fundPeriods.find(p => p.id === detailTx.periodId)?.name ?? 'Không gắn kỳ'} />
              <Row label="Phương thức" value={detailTx.method} />
              <Row label="Ngày" value={safeDate(detailTx.date)} />
              <Row label="Trạng thái" value={<StatusBadge tone={detailTx.status}>{detailTx.statusLabel}</StatusBadge>} />
            </dl>
            {detailTx.notes && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Ghi chú</p>
                <p className="text-sm [color:var(--pf-text)]">{detailTx.notes}</p>
              </div>
            )}
          </div>
        </DrawerShell>
      )}
    </PageShell>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="[color:var(--pf-color-muted)]">{label}</dt>
      <dd className="text-right font-medium [color:var(--pf-text)]">{value}</dd>
    </div>
  )
}
