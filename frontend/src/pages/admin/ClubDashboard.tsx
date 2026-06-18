import { useState, useMemo } from 'react'
import {
  Users, AlertCircle, Calendar,
  Plus, Bell, ArrowUpRight, ArrowDownLeft, Activity,
  ChevronRight, Trophy, Zap, ShieldCheck,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { Link, useNavigate } from 'react-router-dom'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { MobileWelcomeCard } from '../../components/mobile/MobileWelcomeCard'
import { MobileKpiCard } from '../../components/mobile/MobileKpiCard'
import { MobileTransactionCard } from '../../components/mobile/MobileTransactionCard'

/* ─── Brand tokens ─── */
const brand = {
  primary: '#4F46E5',
  secondary: '#06B6D4',
  accent: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  dark: '#0F172A',
  bg: '#F8FAFC',
}

/* ─── Helpers ─── */
function pct(a: number, b: number) {
  if (!b) return 0
  return Math.min(100, Math.round((a / b) * 100))
}

/* ─── Custom bar chart tooltip ─── */
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 px-3 py-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-600 mb-1.5 truncate max-w-[160px]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800 tabular-nums">{formatVND(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

/* ─── Custom donut tooltip ─── */
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{d.name}</p>
      <p className="text-slate-500 tabular-nums mt-0.5">{formatVND(d.value)}</p>
    </div>
  )
}

const DONUT_COLORS = ['#4F46E5', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']

/* ─── FundCard ─── */
interface FundCardProps {
  title: string
  balance: number
  income: number
  expense: number
  variant?: 'indigo' | 'cyan' | 'gradient'
  tag?: string
}
function FundCard({ title, balance, income, expense, variant = 'indigo', tag }: FundCardProps) {
  const isGradient = variant === 'gradient'
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 shadow-md"
      style={isGradient
        ? { background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)`, color: '#fff' }
        : { background: '#fff', border: '1px solid #E2E8F0' }
      }
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold tracking-wider uppercase ${isGradient ? 'text-white/70' : 'text-slate-400'}`}>
          {title}
        </span>
        {tag && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={isGradient
              ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
              : { background: variant === 'indigo' ? '#EEF2FF' : '#ECFEFF', color: variant === 'indigo' ? brand.primary : brand.secondary }
            }
          >
            {tag}
          </span>
        )}
      </div>

      <div>
        <p
          className="text-2xl font-bold tabular-nums leading-none"
          style={{ letterSpacing: '-0.02em', color: isGradient ? '#fff' : brand.dark }}
        >
          {formatVND(balance)}
        </p>
        <p className={`text-xs mt-1 ${isGradient ? 'text-white/60' : 'text-slate-400'}`}>Số dư hiện tại</p>
      </div>

      <div className={`h-px ${isGradient ? 'bg-white/20' : 'bg-slate-100'}`} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowUpRight size={11} className={isGradient ? 'text-green-300' : 'text-emerald-500'} />
            <span className={`text-[10px] font-medium uppercase tracking-wide ${isGradient ? 'text-white/60' : 'text-slate-400'}`}>Thu</span>
          </div>
          <p className={`text-sm font-semibold tabular-nums ${isGradient ? 'text-white' : 'text-slate-800'}`}>{formatVND(income)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowDownLeft size={11} className={isGradient ? 'text-red-300' : 'text-red-400'} />
            <span className={`text-[10px] font-medium uppercase tracking-wide ${isGradient ? 'text-white/60' : 'text-slate-400'}`}>Chi</span>
          </div>
          <p className={`text-sm font-semibold tabular-nums ${isGradient ? 'text-white' : 'text-slate-800'}`}>{formatVND(expense)}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── MiniKpiCard ─── */
interface MiniKpiProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: string
  bgColor: string
}
function MiniKpiCard({ icon, label, value, sub, color, bgColor }: MiniKpiProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bgColor }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide leading-tight">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums text-slate-900" style={{ letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

/* ─── ProgressRow ─── */
function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = pct(value, total)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-700 tabular-nums">{value}<span className="text-slate-400">/{total}</span></span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, background: color }}
        />
      </div>
    </div>
  )
}

/* ─── Empty state ─── */
function DashboardEmpty({ clubName }: { clubName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#EEF2FF' }}>
        <Activity size={28} color={brand.primary} />
      </div>
      <div className="text-center">
        <p className="text-slate-800 font-semibold text-base">{clubName || 'CLB của bạn'} chưa có dữ liệu</p>
        <p className="text-slate-400 text-sm mt-1">Thêm kỳ quỹ và giao dịch để xem tổng quan</p>
      </div>
      <div className="flex gap-3 mt-2">
        <Link to="/fund-periods">
          <button className="text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Tạo kỳ quỹ
          </button>
        </Link>
        <Link to="/contributions">
          <button
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white flex items-center gap-1.5 transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }}
          >
            <Plus size={14} />
            Thêm giao dịch
          </button>
        </Link>
      </div>
    </div>
  )
}

/* ─── Main ─── */
export function ClubDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(clubId)
  const isMobile = useIsMobile()
  const [txTab, setTxTab] = useState<'income' | 'expense'>('income')
  const [activePeriodId, setActivePeriodId] = useState<string>('all')

  /* ── Derived data ── */
  const activePeriods = clubData.fundPeriods.filter(p => p.status === 'active')
  const currentPeriod = clubData.fundPeriods.find(p => p.status === 'active') ?? clubData.fundPeriods[0]

  const commonContribs = useMemo(
    () => clubData.contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON' && c.isConfirmed),
    [clubData.contributions]
  )
  const miniContribs = useMemo(
    () => clubData.contributions.filter(c => c.fundSource === 'MINI'),
    [clubData.contributions]
  )
  const commonExpenses = useMemo(
    () => clubData.expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON'),
    [clubData.expenses]
  )
  const miniExpenses = useMemo(
    () => clubData.expenses.filter(e => e.fundSource === 'MINI'),
    [clubData.expenses]
  )

  const commonIncome = commonContribs.reduce((s, c) => s + c.amount, 0)
  const commonExpTotal = commonExpenses.reduce((s, e) => s + e.amount, 0)
  const miniIncome = miniContribs.reduce((s, c) => s + c.amount, 0)
  const miniExpTotal = miniExpenses.reduce((s, e) => s + e.amount, 0)

  const commonBalance = commonIncome - commonExpTotal
  const miniBalance = miniIncome - miniExpTotal
  const totalAssets = commonBalance + miniBalance

  /* ── KPI values ── */
  const totalTurns = clubData.sessions.reduce((a, s) => a + (s._count?.attendanceRecords ?? 0), 0)
  const avgCostPerTurn = totalTurns > 0 ? Math.round(commonExpTotal / totalTurns) : 0
  const activeMembers = clubData.members.filter(m => m.status === 'active').length
  const totalMembers = clubData.members.length

  const unpaidCount = !currentPeriod ? 0 : clubData.members.filter(
    m => !commonContribs.some(c => c.memberId === m.id && c.fundPeriodId === currentPeriod.id)
  ).length

  const currentPeriodSessions = currentPeriod
    ? clubData.sessions.filter(s => s.fundPeriodId === currentPeriod.id)
    : []
  const courtExpense = currentPeriodSessions.reduce((a, s) => a + (s.courtFee ?? 0), 0)

  /* ── Bar chart: Thu/Chi theo kỳ ── */
  const barData = useMemo(() => {
    const sortedPeriods = [...clubData.fundPeriods]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-6)
    return sortedPeriods.map(p => ({
      name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
      Thu: clubData.contributions
        .filter(c => c.fundPeriodId === p.id && c.isConfirmed)
        .reduce((s, c) => s + c.amount, 0),
      Chi: clubData.expenses
        .filter(e => e.fundPeriodId === p.id)
        .reduce((s, e) => s + e.amount, 0),
    }))
  }, [clubData.fundPeriods, clubData.contributions, clubData.expenses])

  /* ── Donut: cơ cấu chi phí Quỹ Chung ── */
  const donutData = useMemo(() => {
    const groups: Record<string, number> = {}
    for (const e of commonExpenses) {
      const key = e.description.length > 20 ? e.description.slice(0, 20) + '…' : e.description
      groups[key] = (groups[key] ?? 0) + e.amount
    }
    return Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  }, [commonExpenses])

  /* ── Recent transactions ── */
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

  /* ── Quick list: members not paid ── */
  const unpaidMembers = useMemo(() => {
    if (!currentPeriod) return []
    return clubData.members
      .filter(m => m.status === 'active' &&
        !commonContribs.some(c => c.memberId === m.id && c.fundPeriodId === currentPeriod.id))
      .slice(0, 5)
  }, [currentPeriod, clubData.members, commonContribs])

  /* ── Attendance stats ── */
  const attendedInPeriod = currentPeriod
    ? clubData.memberAttendanceSummary?.filter(s => s.attendedSessions > 0).length ?? 0
    : 0

  /* ── Empty state ── */
  const isEmpty = clubData.fundPeriods.length === 0 && clubData.contributions.length === 0

  const clubName = (clubData.settings?.name as string | undefined) ?? 'CLB'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Chào buổi sáng'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  })()

  if (isEmpty && isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 pt-4">
        <MobileWelcomeCard title={clubName} subtitle="Chưa có dữ liệu" stats={[]} />
        <div className="text-center py-10 text-slate-400 text-sm">
          <p>Thêm kỳ quỹ để bắt đầu</p>
          <Link to="/fund-periods">
            <button className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
              Tạo kỳ quỹ
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="min-h-full" style={{ background: brand.bg, padding: '24px 28px' }}>
        <DashboardEmpty clubName={clubName} />
      </div>
    )
  }

  /* ── Mobile layout ─────────────────────────────────────────── */
  if (isMobile) {
    const recentTxAll = [...clubData.contributions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
    const recentExpAll = [...clubData.expenses]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="px-4 pt-4 pb-6 space-y-4">
          <MobileWelcomeCard
            title={clubName}
            subtitle={`${greeting} 👋`}
            stats={[
              { label: 'Thành viên', value: activeMembers },
              { label: 'Tổng tài sản', value: formatVND(totalAssets) },
              { label: 'Chưa đóng', value: unpaidCount },
            ]}
          />

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            <MobileKpiCard label="Quỹ Chung" value={formatVND(commonBalance)} icon={<ArrowUpRight size={18} />} accent="#4F46E5" />
            <MobileKpiCard label="Quỹ Mini" value={formatVND(miniBalance)} icon={<Trophy size={18} />} accent="#06B6D4" />
            <MobileKpiCard label="Thành viên" value={String(activeMembers)} icon={<Users size={18} />} accent="#8B5CF6" />
            <MobileKpiCard label="Chưa đóng" value={String(unpaidCount)} icon={<AlertCircle size={18} />} accent={unpaidCount > 0 ? '#EF4444' : '#22C55E'} />
          </div>

          {/* Recent income */}
          {recentTxAll.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-[700] text-slate-800">Thu gần đây</h3>
                <Link to="/contributions" className="text-[13px] font-[600]" style={{ color: '#4F46E5' }}>Xem thêm</Link>
              </div>
              <div className="space-y-2">
                {recentTxAll.map(tx => (
                  <MobileTransactionCard
                    key={tx.id}
                    name={clubData.members.find(m => m.id === tx.memberId)?.fullName ?? 'N/A'}
                    description={tx.note ?? ''}
                    amount={tx.amount}
                    type="income"
                    fundSource={tx.fundSource}
                    status={tx.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent expenses */}
          {recentExpAll.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-[700] text-slate-800">Chi gần đây</h3>
                <Link to="/expenses" className="text-[13px] font-[600]" style={{ color: '#4F46E5' }}>Xem thêm</Link>
              </div>
              <div className="space-y-2">
                {recentExpAll.map(ex => (
                  <MobileTransactionCard
                    key={ex.id}
                    name={ex.description}
                    description={ex.note ?? ''}
                    amount={ex.amount}
                    type="expense"
                    fundSource={ex.fundSource}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full" style={{ background: brand.bg, padding: '24px 28px' }}>
      <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1
              className="text-xl font-bold text-slate-900"
              style={{ letterSpacing: '-0.02em' }}
            >
              {greeting}, Admin 👋
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {clubName} · Cập nhật {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activePeriods.length > 0 && (
              <div className="relative">
                <select
                  value={activePeriodId}
                  onChange={e => setActivePeriodId(e.target.value)}
                  className="appearance-none text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="all">Tất cả kỳ</option>
                  {activePeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Calendar size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            <button
              className="relative w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
              title="Thông báo"
            >
              <Bell size={15} className="text-slate-500" />
              {unpaidCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ background: brand.danger }}>{unpaidCount > 9 ? '9+' : unpaidCount}</span>
              )}
            </button>
            <button
              onClick={() => navigate('/contributions')}
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }}
            >
              <Plus size={14} />
              Thêm giao dịch
            </button>
          </div>
        </div>

        {/* ── 3 Fund Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FundCard
            title="Quỹ Chung"
            balance={commonBalance}
            income={commonIncome}
            expense={commonExpTotal}
            variant="indigo"
            tag="Quỹ chính"
          />
          <FundCard
            title="Quỹ Mini"
            balance={miniBalance}
            income={miniIncome}
            expense={miniExpTotal}
            variant="cyan"
            tag="Phụ trợ"
          />
          <FundCard
            title="Tổng tài sản CLB"
            balance={totalAssets}
            income={commonIncome + miniIncome}
            expense={commonExpTotal + miniExpTotal}
            variant="gradient"
            tag="Tổng cộng"
          />
        </div>

        {/* ── 5 KPI mini cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MiniKpiCard
            icon={<Activity size={15} />}
            label="Tổng lượt chơi"
            value={totalTurns.toLocaleString('vi-VN')}
            sub="Tất cả kỳ"
            color={brand.primary}
            bgColor="#EEF2FF"
          />
          <MiniKpiCard
            icon={<Zap size={15} />}
            label="Chi phí TB/lượt"
            value={avgCostPerTurn > 0 ? `${Math.round(avgCostPerTurn / 1000)}k` : '—'}
            sub="Quỹ Chung"
            color={brand.secondary}
            bgColor="#ECFEFF"
          />
          <MiniKpiCard
            icon={<Users size={15} />}
            label="Thành viên"
            value={`${activeMembers}/${totalMembers}`}
            sub="đang hoạt động"
            color={brand.accent}
            bgColor="#F0FDF4"
          />
          <MiniKpiCard
            icon={<AlertCircle size={15} />}
            label="Chưa đóng quỹ"
            value={unpaidCount.toString()}
            sub={currentPeriod ? currentPeriod.name : 'Kỳ hiện tại'}
            color={unpaidCount > 0 ? brand.warning : brand.accent}
            bgColor={unpaidCount > 0 ? '#FFFBEB' : '#F0FDF4'}
          />
          <MiniKpiCard
            icon={<Trophy size={15} />}
            label="Chi sân kỳ này"
            value={courtExpense > 0 ? `${Math.round(courtExpense / 1000)}k` : '—'}
            sub={currentPeriodSessions.length + ' buổi'}
            color="#8B5CF6"
            bgColor="#F5F3FF"
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Bar chart 60% */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
                  Thu / Chi theo kỳ quỹ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">6 kỳ gần nhất</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: brand.primary }} />Thu
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FDA4AF' }} />Chi
                </span>
              </div>
            </div>
            {barData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Chưa có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000000 ? `${v / 1000000}M` : v >= 1000 ? `${v / 1000}k` : v} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="Thu" fill={brand.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Chi" fill="#FDA4AF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut 40% */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
                Cơ cấu chi phí
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Quỹ Chung · Tất cả kỳ</p>
            </div>
            {donutData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">Chưa có chi phí</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-col gap-1.5">
                  {donutData.slice(0, 4).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="text-slate-500 truncate">{d.name}</span>
                      </div>
                      <span className="text-slate-700 font-medium tabular-nums ml-2 flex-shrink-0">
                        {pct(d.value, commonExpTotal)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-4">

          {/* Recent transactions 65% */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
                Giao dịch gần đây
              </h3>
              <div className="flex rounded-lg overflow-hidden border border-slate-100">
                {(['income', 'expense'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTxTab(tab)}
                    className="text-xs font-medium px-3 py-1.5 transition-colors"
                    style={txTab === tab
                      ? { background: brand.primary, color: '#fff' }
                      : { background: '#fff', color: '#64748B' }
                    }
                  >
                    {tab === 'income' ? 'Thu' : 'Chi'}
                  </button>
                ))}
              </div>
            </div>

            {recentTx.length === 0 ? (
              <div className="py-10 text-center text-slate-300 text-sm">Không có dữ liệu</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="text-left text-slate-400 font-medium px-5 py-2.5">Mô tả</th>
                      <th className="text-right text-slate-400 font-medium px-5 py-2.5">Số tiền</th>
                      <th className="text-right text-slate-400 font-medium px-5 py-2.5">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTx.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: txTab === 'income' ? '#EEF2FF' : '#FFF1F2' }}
                            >
                              {txTab === 'income'
                                ? <ArrowUpRight size={11} color={brand.primary} />
                                : <ArrowDownLeft size={11} color={brand.danger} />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-700 truncate max-w-[180px]">
                                {txTab === 'income'
                                  ? (tx.member?.fullName ?? tx.payerName ?? 'Ẩn danh')
                                  : tx.description
                                }
                              </p>
                              <p className="text-slate-400 text-[10px]">
                                {txTab === 'income'
                                  ? (tx.fundSource === 'MINI' ? 'Quỹ Mini' : 'Quỹ Chung')
                                  : (tx.fundSource === 'MINI' ? 'Quỹ Mini' : 'Quỹ Chung')
                                }
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className="font-semibold tabular-nums"
                            style={{ color: txTab === 'income' ? brand.accent : brand.danger }}
                          >
                            {txTab === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-400">
                          {new Date(tx.paymentDate ?? tx.expenseDate ?? tx.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-5 py-3 border-t border-slate-50">
              <Link
                to={txTab === 'income' ? '/contributions' : '/expenses'}
                className="text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all"
                style={{ color: brand.primary }}
              >
                Xem tất cả <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {/* Quick stats 35% */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Member payment progress */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
                  Tiến độ đóng quỹ
                </h3>
                {currentPeriod && (
                  <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {currentPeriod.name}
                  </span>
                )}
              </div>

              {currentPeriod ? (
                <>
                  <ProgressRow
                    label="Đã đóng quỹ"
                    value={activeMembers - unpaidCount}
                    total={activeMembers}
                    color={brand.primary}
                  />
                  <ProgressRow
                    label="Đi tập kỳ này"
                    value={attendedInPeriod}
                    total={activeMembers}
                    color={brand.secondary}
                  />
                  <ProgressRow
                    label="Buổi đã tổ chức"
                    value={currentPeriodSessions.length}
                    total={currentPeriod.totalSessions || Math.max(currentPeriodSessions.length, 1)}
                    color={brand.accent}
                  />
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Không có kỳ đang hoạt động</p>
              )}
            </div>

            {/* Unpaid quick list */}
            {unpaidMembers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
                    Chưa đóng quỹ
                  </h3>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#FFF7ED', color: brand.warning }}
                  >
                    {unpaidCount} người
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {unpaidMembers.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})` }}
                        >
                          {m.fullName.charAt(m.fullName.lastIndexOf(' ') + 1).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-600 truncate max-w-[120px]">{m.fullName}</span>
                      </div>
                      <span className="text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                        Chưa đóng
                      </span>
                    </div>
                  ))}
                </div>
                <Link to="/contributions" className="text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all"
                  style={{ color: brand.primary }}>
                  Thu nhanh <ChevronRight size={12} />
                </Link>
              </div>
            )}

            {/* Summary stats */}
            <div
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: `linear-gradient(135deg, ${brand.primary}10, ${brand.secondary}15)`, border: `1px solid ${brand.primary}20` }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} color={brand.primary} />
                <span className="text-xs font-semibold text-slate-700">Sức khỏe tài chính</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Số dư QC', value: formatVND(commonBalance) },
                  { label: 'Số dư QM', value: formatVND(miniBalance) },
                  { label: 'Tổng Thu', value: formatVND(commonIncome + miniIncome) },
                  { label: 'Tổng Chi', value: formatVND(commonExpTotal + miniExpTotal) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-xs font-semibold text-slate-700 tabular-nums mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
