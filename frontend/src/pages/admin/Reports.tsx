import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'
import { TrendingUp, TrendingDown, Filter, RefreshCw,
  FileSpreadsheet, FileText, DollarSign, CreditCard, Wallet,
  MapPin, Users, Calendar, AlertTriangle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { mockFundSummary, mockChartData } from '../../lib/mockData'
import { formatVND, formatDate } from '../../lib/utils'
import { exportReportsPDF, exportReportsExcel } from '../../lib/export'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../../store/clubDataStore'
import toast from 'react-hot-toast'

/* ── Static report data ── */
const FALLBACK_PERIOD_NAME = 'Kỳ Q2/2026'
const FALLBACK_PERIOD_DATE = '01/04/2026 – 30/06/2026'

function buildKpiCards(periodName: string) {
  return [
    { label: 'Tổng thu kỳ',    value: 8_000_000,  trend: +18, icon: <DollarSign size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50', up: true },
    { label: 'Tổng chi kỳ',    value: 6_455_704,  trend: -12, icon: <CreditCard size={18} />,  color: 'text-rose-500',    bg: 'bg-rose-50',    up: false },
    { label: 'Số dư quỹ',      value: 1_544_296,  trend: +8,  icon: <Wallet size={18} />,       color: 'text-indigo-600', bg: 'bg-indigo-50',  up: true },
    { label: 'Tiền sân',       value: 5_387_500,  trend: +15, icon: <MapPin size={18} />,       color: 'text-purple-600', bg: 'bg-purple-50',  up: true },
    { label: 'Tổng lượt chơi', value: 78,         trend: +10, icon: <Users size={18} />,        color: 'text-cyan-600',   bg: 'bg-cyan-50',    up: true, isCount: true, unit: 'lượt' },
    { label: 'Buổi chơi',      value: 10,         trend: null, icon: <Calendar size={18} />,    color: 'text-amber-600',  bg: 'bg-amber-50',   up: true, isCount: true, unit: 'buổi', sub: periodName },
  ]
}

const costBreakdown = [
  { name: 'Tiền sân',  value: 5_387_500, pct: 83.5, fill: '#6366f1' },
  { name: 'Ăn uống',  value: 620_000,   pct: 9.6,  fill: '#22c55e' },
  { name: 'Nước uống',value: 280_000,   pct: 4.3,  fill: '#f59e0b' },
  { name: 'Phát sinh', value: 168_204,  pct: 2.6,  fill: '#ef4444' },
]

const periodHistory = [
  { ky: 'Q3/2025', thu: 7_600_000, chi: 4_900_000, sodu: 2_700_000, tangGiam: +1_200_000, tyLe: 35.5 },
  { ky: 'Q4/2025', thu: 8_500_000, chi: 6_300_000, sodu: 2_200_000, tangGiam: -500_000,   tyLe: 25.9 },
  { ky: 'Q1/2026', thu: 8_200_000, chi: 6_800_000, sodu: 1_400_000, tangGiam: -800_000,   tyLe: 17.1 },
  { ky: 'Q2/2026', thu: 8_000_000, chi: 6_455_704, sodu: 1_544_296, tangGiam: +144_296,   tyLe: 19.3, current: true },
]

const balanceTrend = [
  { ky: 'Q3/2025', sodu: 2_700_000 },
  { ky: 'Q4/2025', sodu: 2_200_000 },
  { ky: 'Q1/2026', sodu: 1_400_000 },
  { ky: 'Q2/2026', sodu: 1_544_296 },
]

const summaryItems = [
  { label: 'Tổng thu',         value: formatVND(8_000_000),   icon: <DollarSign size={14} />, color: 'text-emerald-600' },
  { label: 'Tổng chi',         value: formatVND(6_455_704),   icon: <CreditCard size={14} />,  color: 'text-rose-500' },
  { label: 'Số dư đầu kỳ',    value: formatVND(1_400_000),   icon: <Wallet size={14} />,       color: 'text-slate-600' },
  { label: 'Số dư cuối kỳ',   value: formatVND(1_544_296),   icon: <Wallet size={14} />,       color: 'text-indigo-600' },
  { label: 'Tỷ lệ chi / thu',  value: '80.7%',                icon: <TrendingDown size={14} />, color: 'text-amber-600' },
]

const memberAttendance = mockFundSummary.members.map(m => ({
  name: m.memberName.split(' ').slice(-2).join(' '),
  rate: Math.round((m.attendedSessions / 13) * 100),
})).sort((a, b) => b.rate - a.rate)

const memberCosts = mockFundSummary.members.map(m => ({
  name: m.memberName.split(' ').slice(-1)[0],
  san: m.courtCost,
  sh: m.livingCost,
}))

const BALANCE_PCT = 19.3
const WARNING_THRESHOLD = 20

/* ── Gauge SVG ── */
function FundGauge({ pct }: { pct: number }) {
  const r = 56
  const cx = 80
  const cy = 80
  const startAngle = 210
  const endAngle = 330
  const totalArc = 360 - startAngle + endAngle
  const filledArc = (pct / 100) * totalArc

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const pt = (angle: number, radius = r) => ({
    x: cx + radius * Math.cos(toRad(angle)),
    y: cy + radius * Math.sin(toRad(angle)),
  })

  const arcPath = (from: number, to: number, radius = r) => {
    const sweep = ((to - from) + 360) % 360
    const large = sweep > 180 ? 1 : 0
    const s = pt(from, radius)
    const e = pt(to, radius)
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const zones = [
    { from: startAngle, span: totalArc * 0.2,  color: '#ef4444' },
    { from: startAngle + totalArc * 0.2, span: totalArc * 0.3, color: '#f59e0b' },
    { from: startAngle + totalArc * 0.5, span: totalArc * 0.5, color: '#22c55e' },
  ]

  const needleAngle = startAngle + (pct / 100) * totalArc
  const needleTip = pt(needleAngle, r - 8)

  return (
    <svg viewBox="0 0 160 110" className="w-full max-w-[160px] mx-auto">
      {/* Track */}
      <path d={arcPath(startAngle, startAngle + totalArc)} fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
      {/* Colored zones */}
      {zones.map((z, i) => (
        <path key={i} d={arcPath(z.from, z.from + z.span)} fill="none" stroke={z.color} strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      ))}
      {/* Filled arc */}
      <path d={arcPath(startAngle, startAngle + filledArc)} fill="none"
        stroke={pct < 20 ? '#ef4444' : pct < 35 ? '#f59e0b' : '#22c55e'} strokeWidth="12" strokeLinecap="round" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#1e293b" />
      {/* Label */}
      <text x={cx} y={cy + 20} textAnchor="middle" className="font-bold" fontSize="16" fill={pct < 20 ? '#ef4444' : '#1e293b'} fontWeight="700">
        {pct}%
      </text>
      <text x={cx} y={cy + 33} textAnchor="middle" fontSize="8" fill="#94a3b8">Tỷ lệ còn lại</text>
    </svg>
  )
}

/* ── Custom tooltip ── */
function VNDTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatVND(p.value)}</p>
      ))}
    </div>
  )
}

function PctTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{label}: <span className="text-indigo-600">{payload[0].value}%</span></p>
    </div>
  )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-slate-900">{children}</h3>
      {action}
    </div>
  )
}

export function Reports() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? DEMO_CLUB_ID
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(clubId)
  const activePeriod = clubData.fundPeriods.find(p => p.status === 'active') ?? clubData.fundPeriods[0]

  const periodName = activePeriod?.name ?? FALLBACK_PERIOD_NAME
  const periodDate = activePeriod
    ? `${formatDate(activePeriod.startDate)} – ${formatDate(activePeriod.endDate)}`
    : FALLBACK_PERIOD_DATE

  const kpiCards = buildKpiCards(periodName)

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">Báo Cáo &amp; Thống Kê</h1>
            <p className="text-xs text-slate-500 mt-0.5">{periodName} · {periodDate}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period pill */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <Calendar size={13} className="text-slate-400" />
              <span className="font-medium">{periodName}</span>
              <span className="text-slate-400">{periodDate}</span>
            </div>
            <Button variant="outline" size="sm"><Filter size={13} />Bộ lọc</Button>
            <Button variant="outline" size="sm"
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={() => {
                exportReportsExcel(
                  { periodName, clubName: 'CLB Pickleball Hà Nội', totalIncome: 8_000_000, totalExpense: 6_455_704, balance: 1_544_296, memberCount: 8, sessionCount: 10, confirmedCount: 6 },
                  mockFundSummary.members.map(m => ({ name: m.memberName, attended: m.attendedSessions, paid: m.contributionPaid ? 'Đã đóng' : 'Chưa đóng', cost: m.totalCost, balance: m.balance }))
                )
                toast.success('Đã xuất Excel báo cáo!')
              }}>
              <FileSpreadsheet size={13} />Xuất Excel
            </Button>
            <Button size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                exportReportsPDF(
                  { periodName, clubName: 'CLB Pickleball Hà Nội', totalIncome: 8_000_000, totalExpense: 6_455_704, balance: 1_544_296, memberCount: 8, sessionCount: 10, confirmedCount: 6 },
                  mockFundSummary.members.map(m => ({
                    memberName: m.memberName,
                    attendedSessions: m.attendedSessions,
                    totalSessions: 13,
                    amountPaid: m.amountPaid ? 1_000_000 : 0,
                    contributionPaid: m.contributionPaid,
                    courtCost: m.courtCost,
                    livingCost: m.livingCost,
                    totalCost: m.totalCost,
                    balance: m.balance,
                  }))
                )
                toast.success('Đã xuất PDF báo cáo!')
              }}>
              <FileText size={13} />Xuất PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-[1400px] mx-auto">

        {/* ── Row 1: KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpiCards.map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center ${k.color}`}>
                  {k.icon}
                </div>
                {k.trend !== null && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                    k.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                  }`}>
                    {k.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(k.trend!)}%
                  </span>
                )}
              </div>
              <p className={`font-bold leading-tight ${k.isCount ? 'text-2xl text-slate-900' : 'text-lg text-slate-900'}`}>
                {k.isCount ? `${k.value.toLocaleString('vi-VN')} ${k.unit}` : formatVND(k.value)}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{k.label}</p>
              {k.sub && <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>}
              {k.trend !== null && <p className="text-[10px] text-slate-400 mt-0.5">so với kỳ trước</p>}
            </div>
          ))}
        </div>

        {/* ── Row 2: Bar chart | Donut | Gauge ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart - 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
            <SectionTitle action={
              <span className="text-[11px] text-indigo-600 font-medium cursor-pointer hover:underline">Tất cả kỳ ↓</span>
            }>Thu / Chi Theo Kỳ Quỹ (So sánh nhiều kỳ)</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mockChartData.incomeExpenseByPeriod} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}tr`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<VNDTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Thu" />
                <Bar dataKey="expense" fill="#f97316" radius={[4, 4, 0, 0]} name="Chi" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut + Gauge stacked */}
          <div className="flex flex-col gap-4">
            {/* Donut */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5 flex-1">
              <SectionTitle action={<span className="text-[11px] text-slate-400">Kỳ hiện tại</span>}>
                Cơ Cấu Chi Phí
              </SectionTitle>
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                        dataKey="value" strokeWidth={0}>
                        {costBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatVND(v as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 min-w-0">
                  {costBreakdown.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.fill }} />
                      <span className="text-[11px] text-slate-600 truncate">{c.name}</span>
                      <span className="ml-auto text-[11px] font-semibold text-slate-900 shrink-0">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-center text-xs font-bold text-slate-700 mt-2">{formatVND(6_455_704)}</p>
              <p className="text-center text-[10px] text-slate-400">Tổng chi kỳ</p>
            </div>

            {/* Gauge */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
              <SectionTitle>Tình Trạng Quỹ</SectionTitle>
              <FundGauge pct={BALANCE_PCT} />
              {BALANCE_PCT < WARNING_THRESHOLD && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={12} />
                  <span className="font-medium">Ngưỡng cảnh báo: &lt; {WARNING_THRESHOLD}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 3: Member charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Horizontal bar - attendance rate */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
            <SectionTitle action={<span className="text-[11px] text-slate-400">Kỳ hiện tại</span>}>
              Tỷ Lệ Tham Gia Của Thành Viên (%)
            </SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={memberAttendance} layout="vertical" barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<PctTooltip />} />
                <Bar dataKey="rate" fill="#6366f1" radius={[0, 4, 4, 0]} name="Tỷ lệ %" background={{ fill: '#f8fafc', radius: 4 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stacked bar - member costs */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
            <SectionTitle action={<span className="text-[11px] text-slate-400">Kỳ hiện tại</span>}>
              Chi Phí Thực Tế Từng Thành Viên
            </SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={memberCosts} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<VNDTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="san" stackId="a" fill="#6366f1" name="Tiền sân" />
                <Bar dataKey="sh" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Sinh hoạt" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Row 4: History table | Line chart | Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Period history table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">Diễn Biến Số Dư Quỹ</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Kỳ</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Tổng thu</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Tổng chi</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Số dư</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Tăng/Giảm</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {periodHistory.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${row.current ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                      <td className={`px-4 py-2.5 font-semibold ${row.current ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {row.ky}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatVND(row.thu)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatVND(row.chi)}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${row.current ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {formatVND(row.sodu)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${row.tangGiam >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {row.tangGiam >= 0 ? '+' : ''}{formatVND(row.tangGiam)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.tyLe < 20 ? 'bg-rose-50 text-rose-600' :
                          row.tyLe < 30 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>{row.tyLe}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance trend line */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
            <SectionTitle action={<span className="text-[11px] text-slate-400">Tất cả kỳ</span>}>
              Xu Hướng Số Dư Quỹ
            </SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={balanceTrend}>
                <defs>
                  <linearGradient id="soduGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="ky" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}tr`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<VNDTooltip />} />
                <Area type="monotone" dataKey="sodu" stroke="#6366f1" strokeWidth={2}
                  fill="url(#soduGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} name="Số dư" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Summary card */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Tổng Kết {periodName}</h3>
            <div className="space-y-3 flex-1">
              {summaryItems.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 ${s.color}`}>{s.icon}</span>
                    <span className="text-xs text-slate-600">{s.label}</span>
                  </div>
                  <span className={`text-xs font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500">Hoàn thành kỳ</span>
                <span className="font-semibold text-indigo-600">80.7%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '80.7%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pb-2">
          <RefreshCw size={11} />
          <span>Dữ liệu được cập nhật lúc 21:20 – 17/05/2026</span>
        </div>
      </div>
    </div>
  )
}
