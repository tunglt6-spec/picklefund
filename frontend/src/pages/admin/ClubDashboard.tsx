import { useState } from 'react'
import type { MemberSummary } from '../../types'
import {
  Users, DollarSign, TrendingUp, AlertTriangle, CreditCard,
  BarChart2, ChevronRight, Link as LinkIcon, Calendar,
  AlertCircle, CheckCircle2, UserX, Activity, Bell, Plus,
  PieChart, Gauge, Wallet,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart as RechartPie, Pie, Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { KpiCard } from '../../components/ui/KpiCard'
import { Badge } from '../../components/ui/Badge'
import { formatVND } from '../../lib/utils'

/* ─── Tooltip chart ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{formatVND(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

/* ─── Alert Banner ─── */
function AlertBanner({ type, text, to }: { type: 'warning' | 'danger'; text: string; to?: string }) {
  const cfg = {
    warning: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-500', text: 'text-amber-800' },
    danger:  { bg: 'bg-red-50 border-red-200',     icon: 'text-red-500',   text: 'text-red-800'   },
  }[type]
  const Inner = (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${cfg.bg}`}>
      <AlertTriangle size={15} className={`${cfg.icon} shrink-0`} />
      <span className={`text-xs font-medium flex-1 ${cfg.text}`}>{text}</span>
      {to && <ChevronRight size={14} className={cfg.icon} />}
    </div>
  )
  return to ? <Link to={to}>{Inner}</Link> : Inner
}

const PIE_COLORS = ['#6366F1', '#F59E0B', '#22C55E', '#EF4444']

/* ─── Main ─── */
export function ClubDashboard() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(clubId)
  const [chartFilter, setChartFilter] = useState<'all' | 'current'>('all')

  const currentPeriod = clubData.fundPeriods.find(f => f.status === 'active')

  const commonContribs = clubData.contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')
  const miniContribs   = clubData.contributions.filter(c => c.fundSource === 'MINI')
  const commonExpenses = clubData.expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON')
  const miniExpenses   = clubData.expenses.filter(e => e.fundSource === 'MINI')

  const commonIncome   = commonContribs.filter(c => c.isConfirmed).reduce((s, c) => s + c.amount, 0)
  const commonExpTotal = commonExpenses.reduce((s, e) => s + e.amount, 0)
  const miniIncome     = miniContribs.reduce((s, c) => s + c.amount, 0)
  const miniExpTotal   = miniExpenses.reduce((s, e) => s + e.amount, 0)

  const totalIncome   = commonIncome + miniIncome
  const totalExpenses = commonExpTotal + miniExpTotal
  const totalAttendance = clubData.sessions.reduce((a, se) => a + (se._count?.attendanceRecords ?? 0), 0)

  const unpaidCount = !currentPeriod ? 0 : clubData.members.filter(m =>
    !commonContribs.some(c => c.memberId === m.id && c.fundPeriodId === currentPeriod.id && c.isConfirmed)
  ).length

  const s = {
    totalIncome: commonIncome,
    totalExpenses: commonExpTotal,
    courtExpenses: commonExpenses.filter(e => e.allocationRule === 'ATTENDANCE').reduce((s, e) => s + e.amount, 0),
    livingExpenses: commonExpenses.filter(e => e.allocationRule !== 'ATTENDANCE').reduce((s, e) => s + e.amount, 0),
    balance: commonIncome - commonExpTotal,
    miniBalance: miniIncome - miniExpTotal,
    totalAssets: (commonIncome - commonExpTotal) + (miniIncome - miniExpTotal),
    totalAttendance,
    costPerAttendance: totalAttendance > 0 ? Math.round(commonExpTotal / totalAttendance) : 0,
    unpaidCount,
    negativeBalanceCount: 0,
    lowAttendanceCount: 0,
    members: [] as MemberSummary[],
  }

  const realChartData = clubData.fundPeriods.map(fp => ({
    period: fp.name,
    income: commonContribs.filter(c => c.fundPeriodId === fp.id && c.isConfirmed).reduce((s, c) => s + c.amount, 0),
    expense: commonExpenses.filter(e => e.fundPeriodId === fp.id).reduce((s, e) => s + e.amount, 0),
  }))

  const memberCount = clubData.members.length
  const balancePct  = s.totalIncome > 0 ? Math.round((s.balance / s.totalIncome) * 100) : 0

  const pieData = [
    { name: 'Tiền sân',    value: s.courtExpenses },
    { name: 'Ăn uống',    value: s.livingExpenses * 0.4 },
    { name: 'Nước uống',  value: s.livingExpenses * 0.3 },
    { name: 'Phát sinh',  value: s.livingExpenses * 0.3 },
  ].filter(d => d.value > 0)

  /* ── Empty state ── */
  if (clubData.members.length === 0 && clubData.fundPeriods.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex h-16 w-16 rounded-2xl items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
            <Users size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Chào mừng đến với PickleFund!</h2>
          <p className="text-slate-500 text-sm mb-6">Hoàn thành 3 bước để bắt đầu quản lý quỹ CLB</p>
          <div className="space-y-3 text-left">
            {[
              { num: 1, title: 'Thêm thành viên',  desc: 'Nhập danh sách thành viên CLB',           to: '/members',       icon: <Users size={16}/>,      bg: 'bg-indigo-50 text-indigo-600' },
              { num: 2, title: 'Tạo kỳ quỹ',       desc: 'Thiết lập kỳ quản lý quỹ (quý/tháng)',  to: '/fund-periods',  icon: <Calendar size={16}/>,   bg: 'bg-emerald-50 text-emerald-600' },
              { num: 3, title: 'Ghi nhận thu quỹ', desc: 'Ghi lại các khoản đóng quỹ',             to: '/contributions', icon: <DollarSign size={16}/>, bg: 'bg-violet-50 text-violet-600' },
            ].map(step => (
              <Link key={step.num} to={step.to}
                className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${step.bg}`}>{step.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{step.num}. {step.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Chào mừng trở lại, <span className="text-indigo-600">{user?.username}</span>! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dưới đây là tổng quan hoạt động {memberCount} thành viên của CLB
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period badge */}
          {currentPeriod && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600">
              <Calendar size={12} className="text-indigo-500" />
              <span className="font-semibold text-slate-800">Kỳ {currentPeriod.name}</span>
              <span className="text-slate-400">{currentPeriod.startDate} – {currentPeriod.endDate}</span>
            </div>
          )}
          {/* Bell */}
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
            <Bell size={16} />
            {s.unpaidCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                {s.unpaidCount}
              </span>
            )}
          </button>
          {/* CTA */}
          <Link to="/contributions"
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Plus size={15} />Thêm nhanh
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-[1400px] mx-auto">

        {/* ── Alerts ── */}
        {(s.unpaidCount > 0 || s.balance < s.totalIncome * 0.2) && (
          <div className="space-y-2">
            {s.unpaidCount > 0 && (
              <AlertBanner type="warning"
                text={`${s.unpaidCount} thành viên chưa đóng quỹ kỳ này — Nhắc nhở ngay`}
                to="/contributions" />
            )}
            {s.balance < s.totalIncome * 0.2 && s.totalIncome > 0 && (
              <AlertBanner type="danger"
                text={`Quỹ sắp hết — Còn lại ${formatVND(s.balance)} (${balancePct}% tổng thu)`} />
            )}
          </div>
        )}

        {/* ── Fund split cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quỹ Chung */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <DollarSign size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Quỹ Chung</p>
                <p className="text-[10px] text-slate-400">Thu / Chi / Số dư</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Thu</p><p className="text-sm font-bold text-emerald-600">{formatVND(s.totalIncome)}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Chi</p><p className="text-sm font-bold text-orange-500">{formatVND(s.totalExpenses)}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Số dư</p><p className={`text-sm font-bold ${s.balance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>{formatVND(s.balance)}</p></div>
            </div>
            {s.unpaidCount > 0 && <p className="text-xs text-amber-600 mt-2">⚠ {s.unpaidCount} thành viên chưa đóng quỹ</p>}
          </div>
          {/* Quỹ Mini */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <Wallet size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">Quỹ Mini</p>
                <p className="text-[10px] text-slate-400">Thu / Chi / Số dư</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Thu</p><p className="text-sm font-bold text-emerald-600">{formatVND(miniIncome)}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Chi</p><p className="text-sm font-bold text-orange-500">{formatVND(miniExpTotal)}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Số dư</p><p className={`text-sm font-bold ${s.miniBalance >= 0 ? 'text-violet-600' : 'text-red-500'}`}>{formatVND(s.miniBalance)}</p></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Không tính vào công nợ thành viên</p>
          </div>
          {/* Tổng tài sản */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-indigo-200" />
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-100">Tổng Tài Sản CLB</p>
            </div>
            <p className="text-2xl font-bold">{formatVND(s.totalAssets)}</p>
            <p className="text-xs text-indigo-200 mt-1">Quỹ Chung + Quỹ Mini</p>
            <div className="mt-3 pt-3 border-t border-indigo-500/40 grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-indigo-200">Quỹ Chung</p><p className="font-semibold">{formatVND(s.balance)}</p></div>
              <div><p className="text-indigo-200">Quỹ Mini</p><p className="font-semibold">{formatVND(s.miniBalance)}</p></div>
            </div>
          </div>
        </div>

        {/* ── KPI Row 1 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Thu Quỹ Chung"  value={s.totalIncome}    isCurrency icon={<DollarSign size={18}/>}  color="green"  trend={18} />
          <KpiCard title="Chi Quỹ Chung"  value={s.totalExpenses}  isCurrency icon={<CreditCard size={18}/>}  color="orange" trend={-12} />
          <KpiCard title="Số dư Q.Chung"  value={s.balance}        isCurrency icon={<TrendingUp size={18}/>}  color="indigo" trend={8} />
          <KpiCard title="Tiền sân"        value={s.courtExpenses}  isCurrency icon={<BarChart2 size={18}/>}   color="purple" trend={15} />
        </div>

        {/* ── KPI Row 2 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Tổng lượt chơi"    value={`${s.totalAttendance} lượt`} icon={<Activity size={18}/>}  color="cyan"  trend={10} />
          <KpiCard title="CP bình quân/lượt" value={s.costPerAttendance}  isCurrency icon={<BarChart2 size={18}/>} color="slate" trend={-5} />
          <KpiCard title="Tham gia ít"       value={`${s.lowAttendanceCount} người`} icon={<UserX size={18}/>}   color="orange"
            badge={s.lowAttendanceCount > 0 ? 'Nhắc nhở' : undefined} />
          <KpiCard title="Chưa đóng quỹ"    value={`${s.unpaidCount} người`}    icon={<AlertCircle size={18}/>} color="red"
            badge={s.unpaidCount > 0 ? 'Nhắc nhở' : undefined} />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Thu / Chi Theo Kỳ Quỹ</h3>
                <p className="text-xs text-slate-400 mt-0.5">So sánh thu chi qua các kỳ</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                {(['all', 'current'] as const).map(f => (
                  <button key={f} onClick={() => setChartFilter(f)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
                      chartFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}>
                    {f === 'all' ? 'Tất cả kỳ' : 'Kỳ hiện tại'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={realChartData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v/1000000).toFixed(0)}tr`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)', radius: 8 }} />
                <Legend iconType="circle" iconSize={7} formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                <Bar dataKey="income"  name="Thu" fill="#22c55e" radius={[6,6,0,0]} maxBarSize={32} />
                <Bar dataKey="expense" name="Chi" fill="#f97316" radius={[6,6,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Cơ Cấu Chi Phí</h3>
              <p className="text-xs text-slate-400 mt-0.5">Phân bổ các khoản chi</p>
            </div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <RechartPie>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatVND(v as number)} />
                  </RechartPie>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-slate-500">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{formatVND(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                <PieChart size={32} className="mb-2" />
                <p className="text-xs">Chưa có dữ liệu</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick cards row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Tình trạng quỹ */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 mb-3">
              <Gauge size={16} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">Tình Trạng Quỹ</h3>
            </div>
            <div className="flex items-center justify-center py-4">
              <div className="relative flex items-center justify-center">
                <svg width="120" height="80" viewBox="0 0 120 80">
                  <path d="M10 70 A50 50 0 0 1 110 70" fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round" />
                  <path d="M10 70 A50 50 0 0 1 110 70" fill="none"
                    stroke={balancePct < 20 ? '#EF4444' : balancePct < 50 ? '#F59E0B' : '#22C55E'}
                    strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${(balancePct / 100) * 157} 157`} />
                </svg>
                <div className="absolute bottom-0 text-center">
                  <p className="text-2xl font-extrabold text-slate-900 leading-none">{balancePct}%</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tỷ lệ còn lại</p>
                </div>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 mt-2 ${
              balancePct < 20 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {balancePct < 20 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
              {balancePct < 20 ? 'Ngưỡng cảnh báo < 20%' : `Quỹ an toàn (ngưỡng ${balancePct}%)`}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">Thống Kê Nhanh</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Số dư âm',       value: s.negativeBalanceCount, unit: 'người', color: s.negativeBalanceCount > 0 ? 'text-red-600' : 'text-emerald-600', to: '/members' },
                { label: 'Buổi chơi kỳ này', value: clubData.sessions.length, unit: 'buổi',  color: 'text-indigo-600',  to: '/attendance' },
                { label: 'Thành viên',    value: memberCount,             unit: 'người', color: 'text-slate-800',   to: '/members' },
              ].map(item => (
                <Link key={item.label} to={item.to}
                  className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 hover:opacity-80 transition-opacity">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${item.color}`}>
                    {item.value} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Danh sách nhanh */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon size={15} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900">Danh Sách Nhanh</h3>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Thành viên chưa đóng', count: s.unpaidCount,          to: '/contributions', color: 'bg-orange-100 text-orange-700' },
                { label: 'Số dư âm',             count: s.negativeBalanceCount, to: '/members',       color: 'bg-red-100 text-red-700' },
                { label: 'Tham gia ít (<50%)',   count: s.lowAttendanceCount,   to: '/members',       color: 'bg-amber-100 text-amber-700' },
                { label: 'Kỳ quỹ',               count: clubData.fundPeriods.length, to: '/fund-periods', color: 'bg-indigo-100 text-indigo-700' },
              ].map(item => (
                <Link key={item.label} to={item.to}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors group">
                  <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.color}`}>{item.count}</span>
                    <ChevronRight size={13} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Member table (desktop) ── */}
        {s.members.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">Tổng Hợp Thành Viên Kỳ Này</h3>
              <Link to="/reports" className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-700">
                Xem báo cáo <ChevronRight size={13} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    {['Thành viên','Buổi','Đóng quỹ','Chi sân','Chi SH','Tổng chi','Số dư','Trạng thái'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.members.map(m => (
                    <tr key={m.memberId}>
                      <td className="font-medium text-slate-900">{m.memberName}</td>
                      <td className="text-center">{m.attendedSessions}</td>
                      <td className="text-center">
                        {m.contributionPaid
                          ? <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                          : <AlertCircle size={15} className="text-red-400 mx-auto" />}
                      </td>
                      <td className="text-right tabular-nums">{formatVND(m.courtCost)}</td>
                      <td className="text-right tabular-nums">{formatVND(m.livingCost)}</td>
                      <td className="text-right font-semibold tabular-nums">{formatVND(m.totalCost)}</td>
                      <td className={`text-right font-bold tabular-nums ${m.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.balance >= 0 ? '+' : ''}{formatVND(m.balance)}
                      </td>
                      <td>
                        <Badge variant={m.contributionPaid ? 'green' : 'red'} dot>
                          {m.contributionPaid ? 'OK' : 'Chưa đóng'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
