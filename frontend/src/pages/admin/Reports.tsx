import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'
import { TrendingDown, RefreshCw,
  FileSpreadsheet, FileText, DollarSign, CreditCard, Wallet,
  MapPin, Users, Calendar, AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { formatVND, formatDate } from '../../lib/utils'
import { exportReportsPDF, exportReportsExcel } from '../../lib/export'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import type { FundSource } from '../../types'
import toast from 'react-hot-toast'
import { InfographicPreviewModal } from '../../components/reports/infographic/InfographicPreviewModal'
import { mapToInfographicData } from '../../components/reports/infographic/infographic.utils'

const WARNING_THRESHOLD = 20

interface ReportSummaryMember {
  memberId: string
  memberName: string
  attendedSessions: number
  amountPaid: number
  contributionPaid: boolean
  courtCost: number
  livingCost: number
  totalCost: number
  balance: number
}

interface ReportFundSummary {
  totalIncome: number
  totalExpenses: number
  courtExpenses: number
  livingExpenses: number
  balance: number
  totalAttendance: number
  members: ReportSummaryMember[]
}

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
      <path d={arcPath(startAngle, startAngle + totalArc)} fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
      {zones.map((z, i) => (
        <path key={i} d={arcPath(z.from, z.from + z.span)} fill="none" stroke={z.color} strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      ))}
      <path d={arcPath(startAngle, startAngle + filledArc)} fill="none"
        stroke={pct < 20 ? '#ef4444' : pct < 35 ? '#f59e0b' : '#22c55e'} strokeWidth="12" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#1e293b" />
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="16" fill={pct < 20 ? '#ef4444' : '#1e293b'} fontWeight="700">
        {pct}%
      </text>
      <text x={cx} y={cy + 33} textAnchor="middle" fontSize="8" fill="#94a3b8">Tỷ lệ còn lại</text>
    </svg>
  )
}

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
  const { getClubData, setMemberAttendanceSummary } = useClubDataStore()
  const isMobile = useIsMobile()
  const clubData = getClubData(user?.clubId ?? '')
  const defaultPeriod = clubData.fundPeriods.find(p => p.status === 'active') ?? clubData.fundPeriods[0]
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [fundFilter, setFundFilter] = useState<'ALL' | FundSource>('ALL')
  const [showInfographic, setShowInfographic] = useState(false)
  const [fundSummary, setFundSummary] = useState<ReportFundSummary | null>(null)

  // Sync selectedPeriodId to default active period after data loads
  useEffect(() => {
    if (selectedPeriodId || !defaultPeriod?.id) return
    setSelectedPeriodId(defaultPeriod.id)
  }, [defaultPeriod?.id])

  const activePeriod = clubData.fundPeriods.find(p => p.id === selectedPeriodId) ?? defaultPeriod

  useEffect(() => {
    if (!user?.clubId || !activePeriod?.id) return
    setMemberAttendanceSummary(user.clubId!, []) // reset stale data
    const params = `?fundPeriodId=${activePeriod.id}`
    api.get(`/attendance/member-summary${params}`).then(res => {
      const raw = res.data?.data ?? []
      setMemberAttendanceSummary(user.clubId!, raw.map((s: any) => ({
        memberId: s.memberId,
        memberName: s.memberName,
        attendedSessions: s.attendedSessions ?? 0,
        totalSessions: s.totalSessions ?? 0,
      })))
    }).catch(() => {})
  }, [user?.clubId, activePeriod?.id])

  useEffect(() => {
    if (!activePeriod?.id) {
      setFundSummary(null)
      return
    }
    let cancelled = false
    api.get(`/fund-periods/${activePeriod.id}/summary`).then(res => {
      if (!cancelled) setFundSummary(res.data?.data ?? null)
    }).catch(() => {
      if (!cancelled) setFundSummary(null)
    })
    return () => { cancelled = true }
  }, [activePeriod?.id])

  const hasData = clubData.fundPeriods.length > 0

  const periodName = activePeriod?.name ?? ''
  const periodDate = activePeriod
    ? `${formatDate(activePeriod.startDate)} – ${formatDate(activePeriod.endDate)}`
    : ''

  // Apply fund source filter AND period filter
  const filteredContribs = clubData.contributions.filter(c =>
    (fundFilter === 'ALL' || (c.fundSource ?? 'COMMON') === fundFilter) &&
    c.fundPeriodId === activePeriod?.id
  )
  const countsInFinancialSummary = (e: typeof clubData.expenses[number]) =>
    (e.fundSource ?? 'COMMON') !== 'MINI' || e.status === 'approved' || e.status === 'paid'

  const filteredExpenses = clubData.expenses.filter(e =>
    (fundFilter === 'ALL' || (e.fundSource ?? 'COMMON') === fundFilter) &&
    e.fundPeriodId === activePeriod?.id &&
    countsInFinancialSummary(e)
  )

  const miniIncome = filteredContribs
    .filter(c => c.fundSource === 'MINI' && c.isConfirmed)
    .reduce((a, c) => a + c.amount, 0)
  const miniExpenses = filteredExpenses
    .filter(e => e.fundSource === 'MINI')
    .reduce((a, e) => a + e.amount, 0)
  const totalIncome = fundFilter === 'MINI'
    ? miniIncome
    : (fundSummary?.totalIncome ?? 0) + (fundFilter === 'ALL' ? miniIncome : 0)
  const totalExpenses = fundFilter === 'MINI'
    ? miniExpenses
    : (fundSummary?.totalExpenses ?? 0) + (fundFilter === 'ALL' ? miniExpenses : 0)
  const balance = totalIncome - totalExpenses

  // Carry-over: cộng dồn số dư từ các kỳ quỹ cùng loại trước kỳ hiện tại
  const activePeriodType = activePeriod?.type ?? 'chung'
  const sortedPeriods = [...clubData.fundPeriods]
    .filter(p => (p.type ?? 'chung') === activePeriodType)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const activePeriodIndex = sortedPeriods.findIndex(p => p.id === activePeriod?.id)
  const previousPeriods = activePeriodIndex > 0 ? sortedPeriods.slice(0, activePeriodIndex) : []
  const carryOverBalance = previousPeriods.reduce((total, p) => {
    const prevIncome = clubData.contributions
      .filter(c => c.isConfirmed && c.fundPeriodId === p.id &&
        (fundFilter === 'ALL' || (c.fundSource ?? 'COMMON') === fundFilter))
      .reduce((a, c) => a + c.amount, 0)
    const prevExpenses = clubData.expenses
      .filter(e => e.fundPeriodId === p.id &&
        (fundFilter === 'ALL' || (e.fundSource ?? 'COMMON') === fundFilter) &&
        countsInFinancialSummary(e))
      .reduce((a, e) => a + e.amount, 0)
    return total + (prevIncome - prevExpenses)
  }, 0)
  const displayBalance = balance + carryOverBalance

  const balancePct = totalIncome > 0 ? Math.round((displayBalance / totalIncome) * 100) : 0
  const memberCount = clubData.members.filter(m => m.status === 'active').length
  const confirmedCount = filteredContribs.filter(c => c.isConfirmed).length

  // Sessions for the active period with 3-level fallback:
  // 1. Exact match by fundPeriodId
  // 2. Sessions with no fundPeriodId (created before period validation)
  // 3. Sessions whose sessionDate falls within the period's date range
  const exactPeriodSessions = clubData.sessions.filter(s => s.fundPeriodId === activePeriod?.id)
  const unlinkedSessions = clubData.sessions.filter(s => !s.fundPeriodId)
  const dateRangeSessions = activePeriod
    ? clubData.sessions.filter(s =>
        s.sessionDate >= activePeriod.startDate && s.sessionDate <= activePeriod.endDate
      )
    : []
  const periodSessions = exactPeriodSessions.length > 0
    ? exactPeriodSessions
    : unlinkedSessions.length > 0
      ? unlinkedSessions
      : dateRangeSessions
  const sessionCount = periodSessions.length

  const expenseByCategory = filteredExpenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.description ?? 'Khác'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {})
  const DONUT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4']
  const costBreakdown = Object.entries(expenseByCategory).map(([name, value], i) => ({
    name,
    value,
    pct: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
    fill: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  const attSummary = clubData.memberAttendanceSummary ?? []
  const totalSessionsForRate = sessionCount || attSummary[0]?.totalSessions || 0

  const memberAttendance = clubData.members.map(m => {
    const s = attSummary.find(a => a.memberId === m.id)
    const attended = Math.min(s?.attendedSessions ?? 0, totalSessionsForRate)
    const total = totalSessionsForRate
    return {
      name: m.fullName?.split(' ').slice(-2).join(' ') ?? m.id,
      rate: total > 0 ? Math.round((attended / total) * 100) : 0,
    }
  }).sort((a, b) => b.rate - a.rate)

  const memberCosts = (fundSummary?.members ?? []).map(m => ({
    name: m.memberName?.split(' ').slice(-1)[0] ?? m.memberId,
    san: m.courtCost,
    sh: m.livingCost,
  }))

  const memberBillRows = (fundSummary?.members ?? []).map(m => ({
    memberName: m.memberName,
    attendedSessions: m.attendedSessions,
    totalSessions: sessionCount,
    amountPaid: m.amountPaid,
    contributionPaid: m.contributionPaid,
    courtCost: m.courtCost,
    livingCost: m.livingCost,
    totalCost: m.totalCost,
    balance: m.balance,
  }))

  const periodHistory = clubData.fundPeriods
    .filter(p => (p.type ?? 'chung') === activePeriodType)
    .map(p => {
    const inc = clubData.contributions.filter(c => c.isConfirmed && c.fundPeriodId === p.id &&
      (fundFilter === 'ALL' || (c.fundSource ?? 'COMMON') === fundFilter)).reduce((a, c) => a + c.amount, 0)
    const exp = clubData.expenses.filter(e => e.fundPeriodId === p.id &&
      (fundFilter === 'ALL' || (e.fundSource ?? 'COMMON') === fundFilter) &&
      countsInFinancialSummary(e)).reduce((a, e) => a + e.amount, 0)
    const sodu = inc - exp
    return {
      ky: p.name,
      thu: inc,
      chi: exp,
      sodu,
      tangGiam: sodu,
      tyLe: inc > 0 ? Math.round((sodu / inc) * 100) : 0,
      current: p.id === activePeriod?.id,
    }
  })

  const balanceTrend = periodHistory.map(r => ({ ky: r.ky, sodu: r.sodu }))

  const summaryItems = [
    { label: 'Tổng thu',        value: formatVND(totalIncome),   icon: <DollarSign size={14} />, color: 'text-emerald-600' },
    { label: 'Tổng chi',        value: formatVND(totalExpenses), icon: <CreditCard size={14} />, color: 'text-rose-500' },
    { label: 'Số dư',           value: formatVND(displayBalance),       icon: <Wallet size={14} />,     color: 'text-indigo-600' },
    { label: 'Tỷ lệ chi / thu', value: totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}%` : '—', icon: <TrendingDown size={14} />, color: 'text-amber-600' },
  ]

  const kpiCards = [
    { label: 'Tổng thu kỳ',    value: totalIncome,   icon: <DollarSign size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50', isCount: false },
    { label: 'Tổng chi kỳ',    value: totalExpenses, icon: <CreditCard size={18} />,  color: 'text-rose-500',    bg: 'bg-rose-50',    isCount: false },
    { label: 'Số dư quỹ',      value: displayBalance, icon: <Wallet size={18} />,      color: 'text-indigo-600', bg: 'bg-indigo-50',  isCount: false },
    { label: 'Tổng thành viên', value: memberCount,  icon: <Users size={18} />,       color: 'text-cyan-600',   bg: 'bg-cyan-50',    isCount: true, unit: 'người' },
    { label: 'Buổi chơi',      value: sessionCount,  icon: <Calendar size={18} />,   color: 'text-amber-600',  bg: 'bg-amber-50',   isCount: true, unit: 'buổi' },
    { label: 'Đã đóng quỹ',    value: confirmedCount, icon: <MapPin size={18} />,    color: 'text-purple-600', bg: 'bg-purple-50',  isCount: true, unit: 'người' },
  ]

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-[800] text-slate-900">Báo Cáo</span>
            <div className="flex gap-1 bg-slate-100 rounded-[10px] p-0.5">
              {([['ALL', 'Tất cả'], ['COMMON', 'Chung'], ['MINI', 'Mini']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setFundFilter(val)}
                  className={`text-[12px] font-[600] px-2.5 py-1 rounded-[8px] transition-all ${fundFilter === val ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {clubData.fundPeriods.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Calendar size={12} className="text-slate-400 shrink-0" />
              <select
                value={selectedPeriodId}
                onChange={e => setSelectedPeriodId(e.target.value)}
                className="text-[12px] font-[600] text-slate-600 bg-transparent outline-none cursor-pointer flex-1"
              >
                {[...clubData.fundPeriods]
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.status === 'active' ? ' — Đang mở' : p.status === 'closed' ? ' — Đóng' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            {kpiCards.map(k => (
              <div key={k.label} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center mb-2 ${k.bg}`}>
                  <span className={k.color}>{k.icon}</span>
                </div>
                <div className={`text-[18px] font-[800] ${k.color}`}>
                  {k.isCount ? k.value : formatVND(k.value as number)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Balance chart */}
          {balanceTrend.length > 0 && (
            <div className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
              <div className="text-[13px] font-[700] text-slate-800 mb-3">Xu hướng số dư</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={balanceTrend}>
                  <defs>
                    <linearGradient id="m-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="ky" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} width={36} />
                  <Tooltip formatter={(v) => formatVND(v as number)} />
                  <Area type="monotone" dataKey="sodu" stroke="#4F46E5" fill="url(#m-grad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cost breakdown */}
          {costBreakdown.length > 0 && (
            <div className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
              <div className="text-[13px] font-[700] text-slate-800 mb-3">Chi phí theo danh mục</div>
              <div className="space-y-2">
                {costBreakdown.slice(0, 5).map(c => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                    <span className="text-[13px] text-slate-700 flex-1 truncate">{c.name}</span>
                    <span className="text-[13px] font-[600] text-slate-800">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member attendance top 5 */}
          {memberAttendance.length > 0 && (
            <div className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
              <div className="text-[13px] font-[700] text-slate-800 mb-3">Tỷ lệ điểm danh</div>
              <div className="space-y-2">
                {memberAttendance.slice(0, 5).map(m => (
                  <div key={m.name} className="flex items-center gap-2">
                    <span className="text-[13px] text-slate-700 flex-1 truncate">{m.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${m.rate}%` }} />
                    </div>
                    <span className="text-[12px] font-[600] text-slate-600 w-8 text-right">{m.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member cost breakdown */}
          {memberBillRows.length > 0 && (
            <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50">
                <span className="text-[13px] font-[700] text-slate-800">Chi phí thành viên</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500">Thành viên</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Đã nộp</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Chi phí</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Số dư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberBillRows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[90px]">{r.memberName}</td>
                        <td className="px-3 py-2 text-right text-slate-600 tabular-nums">{formatVND(r.amountPaid)}</td>
                        <td className="px-3 py-2 text-right text-slate-600 tabular-nums">{formatVND(r.totalCost)}</td>
                        <td className={`px-3 py-2 text-right font-semibold tabular-nums ${r.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {r.balance >= 0 ? '+' : ''}{formatVND(r.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Period history table */}
          {periodHistory.length > 0 && (
            <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50">
                <span className="text-[13px] font-[700] text-slate-800">Diễn biến số dư</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500">Kỳ</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Thu</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Chi</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Số dư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodHistory.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${row.current ? 'bg-indigo-50' : ''}`}>
                        <td className={`px-3 py-2.5 font-semibold truncate max-w-[90px] ${row.current ? 'text-indigo-700' : 'text-slate-700'}`}>{row.ky}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">{formatVND(row.thu)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">{formatVND(row.chi)}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${row.current ? 'text-indigo-700' : 'text-slate-800'}`}>{formatVND(row.sodu)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export */}
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-[12px] border border-slate-200 text-[13px] font-[600] text-slate-600 flex items-center justify-center gap-1 active:bg-slate-50"
              onClick={() => {
                exportReportsPDF(
                  { periodName, clubName: (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball', totalIncome, totalExpense: totalExpenses, balance: displayBalance, memberCount, sessionCount, confirmedCount },
                  memberBillRows
                )
                toast.success('Đang tạo PDF...')
              }}>
              <FileText size={14} />PDF
            </button>
            <button className="flex-1 py-2.5 rounded-[12px] border border-emerald-200 text-[13px] font-[600] text-emerald-600 flex items-center justify-center gap-1 active:bg-emerald-50"
              onClick={() => {
                exportReportsExcel(
                  { periodName, clubName: (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball', totalIncome, totalExpense: totalExpenses, balance: displayBalance, memberCount, sessionCount, confirmedCount },
                  memberBillRows.map(r => ({
                    name: r.memberName,
                    attended: r.attendedSessions,
                    paid: r.contributionPaid ? 'Đã đóng' : 'Chưa đóng',
                    cost: r.totalCost,
                    balance: r.balance,
                  }))
                )
                toast.success('Đang xuất Excel...')
              }}>
              <FileSpreadsheet size={14} />Excel
            </button>
          </div>

          {/* Infographic button — mobile */}
          <button
            onClick={() => setShowInfographic(true)}
            className="w-full py-3 rounded-[14px] text-[14px] font-[700] text-white flex items-center justify-center gap-2 shadow-sm active:opacity-80"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
          >
            <Sparkles size={15} />✨ Tạo Infographic
          </button>
        </div>

        {/* Infographic modal — mobile */}
        {showInfographic && (
          <InfographicPreviewModal
            data={mapToInfographicData({
              clubName: (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball',
              periodLabel: periodName,
              totalIncome,
              totalExpenses,
              displayBalance,
              memberCount,
              sessionCount,
              confirmedCount,
              memberBillRows,
            })}
            onClose={() => setShowInfographic(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">Báo Cáo &amp; Thống Kê</h1>
            {periodName && <p className="text-xs text-slate-500 mt-0.5">{periodName} · {periodDate}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fund source filter */}
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-200">
              {([['ALL', 'Tất cả'], ['COMMON', 'Quỹ Chung'], ['MINI', 'Quỹ Mini']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFundFilter(val)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                    fundFilter === val
                      ? val === 'MINI' ? 'bg-white text-violet-600 shadow-sm' : 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {clubData.fundPeriods.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <select
                  value={selectedPeriodId}
                  onChange={e => setSelectedPeriodId(e.target.value)}
                  className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer pr-1"
                >
                  {[...clubData.fundPeriods]
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.status === 'active' ? ' — Đang mở' : p.status === 'closed' ? ' — Đóng' : ' — Chuẩn bị'}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <Button variant="outline" size="sm"
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={() => {
                exportReportsExcel(
                  { periodName, clubName: (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball', totalIncome, totalExpense: totalExpenses, balance: displayBalance, memberCount, sessionCount, confirmedCount },
                  memberBillRows.map(r => ({
                    name: r.memberName,
                    attended: r.attendedSessions,
                    paid: r.contributionPaid ? 'Đã đóng' : 'Chưa đóng',
                    cost: r.totalCost,
                    balance: r.balance,
                  }))
                )
                toast.success('Đã xuất Excel báo cáo!')
              }}>
              <FileSpreadsheet size={13} />Xuất Excel
            </Button>
            <Button size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                exportReportsPDF(
                  { periodName, clubName: (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball', totalIncome, totalExpense: totalExpenses, balance: displayBalance, memberCount, sessionCount, confirmedCount },
                  memberBillRows
                )
                toast.success('Đã xuất PDF báo cáo!')
              }}>
              <FileText size={13} />Xuất PDF
            </Button>
            <button
              onClick={() => setShowInfographic(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-[700] text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
            >
              <Sparkles size={14} />✨ Tạo Infographic
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-[1400px] mx-auto">

        {!hasData ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <p className="text-slate-400 text-sm">CLB chưa có kỳ quỹ nào.<br />Tạo kỳ quỹ đầu tiên để xem báo cáo.</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {kpiCards.map((k, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center ${k.color}`}>
                      {k.icon}
                    </div>
                  </div>
                  <p className={`font-bold leading-tight ${k.isCount ? 'text-2xl text-slate-900' : 'text-lg text-slate-900'}`}>
                    {k.isCount ? `${(k.value as number).toLocaleString('vi-VN')} ${k.unit}` : formatVND(k.value as number)}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Row 2: Bar | Donut | Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
                <SectionTitle>Thu / Chi Theo Kỳ Quỹ</SectionTitle>
                {periodHistory.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={periodHistory.map(r => ({ period: r.ky, income: r.thu, expense: r.chi }))} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}tr`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<VNDTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Thu" />
                      <Bar dataKey="expense" fill="#f97316" radius={[4, 4, 0, 0]} name="Chi" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5 flex-1">
                  <SectionTitle action={<span className="text-[11px] text-slate-400">Kỳ hiện tại</span>}>
                    Cơ Cấu Chi Phí
                  </SectionTitle>
                  {costBreakdown.length === 0 ? (
                    <div className="h-[100px] flex items-center justify-center text-slate-400 text-sm">Chưa có chi phí</div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-28 h-28 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
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
                  )}
                  <p className="text-center text-xs font-bold text-slate-700 mt-2">{formatVND(totalExpenses)}</p>
                  <p className="text-center text-[10px] text-slate-400">Tổng chi kỳ</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
                  <SectionTitle>Tình Trạng Quỹ</SectionTitle>
                  <FundGauge pct={balancePct} />
                  {balancePct < WARNING_THRESHOLD && totalIncome > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                      <AlertTriangle size={12} />
                      <span className="font-medium">Ngưỡng cảnh báo: &lt; {WARNING_THRESHOLD}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Member charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
                <SectionTitle action={<span className="text-[11px] text-slate-400">Kỳ hiện tại</span>}>
                  Tỷ Lệ Tham Gia Của Thành Viên (%)
                </SectionTitle>
                {memberAttendance.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Chưa có thành viên</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={memberAttendance} layout="vertical" barSize={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip content={<PctTooltip />} />
                      <Bar dataKey="rate" fill="#6366f1" radius={[0, 4, 4, 0]} name="Tỷ lệ %" background={{ fill: '#f8fafc', radius: 4 }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
                <SectionTitle action={<span className="text-[11px] text-slate-400">Kỳ hiện tại</span>}>
                  Chi Phí Ước Tính Từng Thành Viên
                </SectionTitle>
                {memberCosts.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu</div>
                ) : (
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
                )}
              </div>
            </div>

            {/* Row 4: History table | Line chart | Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="text-sm font-semibold text-slate-900">Diễn Biến Số Dư Quỹ</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-50 bg-slate-50">
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Kỳ</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Thu</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Chi</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Số dư</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodHistory.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Chưa có dữ liệu</td></tr>
                      ) : periodHistory.map((row, i) => (
                        <tr key={i} className={`border-b border-slate-50 ${row.current ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-2.5 font-semibold ${row.current ? 'text-indigo-700' : 'text-slate-700'}`}>{row.ky}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{formatVND(row.thu)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{formatVND(row.chi)}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${row.current ? 'text-indigo-700' : 'text-slate-800'}`}>{formatVND(row.sodu)}</td>
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

              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
                <SectionTitle action={<span className="text-[11px] text-slate-400">Tất cả kỳ</span>}>
                  Xu Hướng Số Dư Quỹ
                </SectionTitle>
                {balanceTrend.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu</div>
                ) : (
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
                )}
              </div>

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
                {totalIncome > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-50">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Hoàn thành kỳ</span>
                      <span className="font-semibold text-indigo-600">{Math.round((totalExpenses / totalIncome) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, Math.round((totalExpenses / totalIncome) * 100))}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pb-2">
          <RefreshCw size={11} />
          <span>Dữ liệu tính từ store cục bộ</span>
        </div>
      </div>

      {/* Infographic modal — desktop */}
      {showInfographic && (
        <InfographicPreviewModal
          data={mapToInfographicData({
            clubName: (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball',
            periodLabel: periodName,
            totalIncome,
            totalExpenses,
            displayBalance,
            memberCount,
            sessionCount,
            confirmedCount,
            memberBillRows,
          })}
          onClose={() => setShowInfographic(false)}
        />
      )}
    </div>
  )
}
