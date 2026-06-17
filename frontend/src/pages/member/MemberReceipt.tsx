import { useState, useEffect } from 'react'
import { Receipt, DollarSign, Calendar, TrendingUp, ChevronDown, ChevronUp, Download, AlertCircle } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface PersonalReceipt {
  id: string
  fundPeriodId: string
  fundPeriod?: { name: string; startDate: string; endDate: string }
  attendedSessions: number
  totalSessions: number
  amountPaid: string | number
  courtCost: string | number
  livingCost: string | number
  totalCost: string | number
  balance: string | number
  needToPay: string | number
  snapshotAt: string
}

function n(v: string | number | null | undefined) {
  return v == null ? 0 : typeof v === 'number' ? v : Number(v)
}

function BalanceBadge({ val }: { val: number }) {
  if (val > 0) return <span className="text-xs font-semibold text-emerald-600">+{formatVND(val)}</span>
  if (val < 0) return <span className="text-xs font-semibold text-red-500">{formatVND(val)}</span>
  return <span className="text-xs font-semibold text-slate-500">0 ₫</span>
}

export function MemberReceipt() {
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const memberId = user?.memberId ?? ''
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')
  const [receipts, setReceipts] = useState<PersonalReceipt[]>([])
  const [loading, setLoading] = useState(!isLocal)
  const [expanded, setExpanded] = useState<string | null>(null)

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const myContribs = data.contributions.filter(c => c.memberId === memberId)
  const myMember = data.members.find(m => m.id === memberId)
  const attended = new Set(data.myAttendedSessionIds ?? [])

  useEffect(() => {
    if (isLocal) return
    setLoading(true)
    api.get('/personal-receipts/mine')
      .then(r => setReceipts(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLocal])

  // Derive a local fallback receipt from store data for the active period
  const localReceipt: PersonalReceipt | null = activePeriod ? (() => {
    const periodSessions = data.sessions.filter(s => s.fundPeriodId === activePeriod.id)
    const completedSessions = periodSessions.filter(s => s.status === 'completed')
    const attendedCount = completedSessions.filter(s => attended.has(s.id)).length
    const total = completedSessions.length || 1
    const paid = myContribs
      .filter(c => c.fundPeriodId === activePeriod.id && c.isConfirmed)
      .reduce((s, c) => s + c.amount, 0)
    const courtCost = completedSessions.reduce((s, sess) => {
      const attendees = (sess as any)._count?.attendanceRecords ?? 6
      return s + (attended.has(sess.id) ? sess.courtFee / attendees : 0)
    }, 0)
    const allExpenses = data.expenses.filter(e => e.fundPeriodId === activePeriod.id)
    const livingCost = allExpenses.reduce((s, e) => s + e.amount, 0) / (data.members.filter(m => m.status === 'active').length || 1)
    const totalCost = courtCost + livingCost
    return {
      id: `local-${activePeriod.id}`,
      fundPeriodId: activePeriod.id,
      fundPeriod: { name: activePeriod.name, startDate: activePeriod.startDate, endDate: activePeriod.endDate },
      attendedSessions: attendedCount,
      totalSessions: total,
      amountPaid: paid,
      courtCost,
      livingCost,
      totalCost,
      balance: paid - totalCost,
      needToPay: Math.max(0, totalCost - paid),
      snapshotAt: new Date().toISOString(),
    }
  })() : null

  const displayReceipts: PersonalReceipt[] = isLocal
    ? (localReceipt ? [localReceipt] : [])
    : receipts

  const totalPaid = displayReceipts.reduce((s, r) => s + n(r.amountPaid), 0)
  const totalCost = displayReceipts.reduce((s, r) => s + n(r.totalCost), 0)
  const netBalance = totalPaid - totalCost

  const handleExport = () => {
    toast.success('Tính năng xuất PDF sẽ sớm ra mắt')
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Phiếu Thu Cá Nhân"
        subtitle={myMember?.fullName ?? user?.username ?? 'Thành viên'}
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} />Xuất PDF
          </Button>
        }
      />

      <div className="p-6 max-w-[800px] mx-auto space-y-5">

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <DollarSign size={14} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng đã đóng</p>
            </div>
            <p className="text-xl font-bold text-indigo-600">{formatVND(totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp size={14} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chi phí phân bổ</p>
            </div>
            <p className="text-xl font-bold text-amber-600">{formatVND(totalCost)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Receipt size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Số dư</p>
            </div>
            <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {netBalance >= 0 ? '+' : ''}{formatVND(netBalance)}
            </p>
          </div>
        </div>

        {/* Receipt cards */}
        {displayReceipts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <Receipt size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-500 font-medium">Chưa có phiếu thu nào</p>
            <p className="text-xs text-slate-400 mt-1">Phiếu thu sẽ được tạo sau khi kỳ quỹ kết thúc</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayReceipts.map(r => {
              const isExpanded = expanded === r.id
              const period = r.fundPeriod ?? data.fundPeriods.find(p => p.id === r.fundPeriodId)
              const bal = n(r.balance)
              const needToPay = n(r.needToPay)
              const amountPaid = n(r.amountPaid)
              const totalCostR = n(r.totalCost)

              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
                  {/* Header row */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Calendar size={16} className="text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900">
                          Kỳ {period?.name ?? r.fundPeriodId}
                        </p>
                        <p className="text-xs text-slate-400">
                          {period ? `${formatDate(period.startDate)} – ${formatDate(period.endDate)}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Số buổi tham gia</p>
                        <p className="text-sm font-semibold text-slate-700">{r.attendedSessions}/{r.totalSessions}</p>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <p className="text-xs text-slate-400">Số dư</p>
                        <BalanceBadge val={bal} />
                      </div>
                      {needToPay > 0 && (
                        <Badge variant="orange">Còn nợ {formatVND(needToPay)}</Badge>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Tiền sân (phân bổ)</span>
                          <span className="font-medium text-slate-700">{formatVND(n(r.courtCost))}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Chi phí sinh hoạt</span>
                          <span className="font-medium text-slate-700">{formatVND(n(r.livingCost))}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Tổng chi phí</span>
                          <span className="font-bold text-slate-900">{formatVND(totalCostR)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Đã đóng</span>
                          <span className="font-bold text-indigo-600">{formatVND(amountPaid)}</span>
                        </div>
                      </div>

                      {needToPay > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-3 py-2.5 text-xs">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>Còn thiếu <strong>{formatVND(needToPay)}</strong>. Vui lòng liên hệ thủ quỹ để thanh toán.</span>
                        </div>
                      )}
                      {bal > 0 && (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2.5 text-xs">
                          <Receipt size={14} className="shrink-0" />
                          <span>Bạn đóng dư <strong>{formatVND(bal)}</strong> — sẽ được khấu trừ vào kỳ sau.</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 text-right">
                        Cập nhật lần cuối: {formatDate(r.snapshotAt)}
                      </p>
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
