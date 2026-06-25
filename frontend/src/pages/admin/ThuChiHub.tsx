import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, CreditCard, Plus, TrendingUp, TrendingDown, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { ExpenseStatus } from '../../types'

type Tab = 'thu' | 'chi'

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  paid: 'Đã thanh toán',
  rejected: 'Từ chối',
}

const STATUS_COLOR: Record<ExpenseStatus, string> = {
  pending: 'text-amber-600 bg-amber-50',
  approved: 'text-blue-600 bg-blue-50',
  paid: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-red-500 bg-red-50',
}

const STATUS_ICON: Record<ExpenseStatus, React.ReactNode> = {
  pending: <Clock size={12} />,
  approved: <CheckCircle size={12} />,
  paid: <CheckCircle size={12} />,
  rejected: <XCircle size={12} />,
}

export function ThuChiHub() {
  const [tab, setTab] = useState<Tab>('thu')
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const clubData = useClubDataStore(s => s.getClubData(clubId))

  const { contributions, expenses, members, fundPeriods } = clubData
  const activePeriod = fundPeriods.find(p => p.status === 'active')

  // On desktop, redirect to dedicated pages
  if (!isMobile) {
    return (
      <div className="flex gap-6 p-8">
        <div className="flex-1">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => navigate('/contributions')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
            >
              Thu Quỹ
            </button>
            <button
              onClick={() => navigate('/expenses')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
            >
              Chi Phí
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Mobile layout ── */
  const sortedContributions = [...contributions].sort(
    (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  )
  const sortedExpenses = [...expenses].sort(
    (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  )

  const totalThu = contributions.reduce((s, c) => s + c.amount, 0)
  const totalChi = expenses.filter(e => e.status !== 'rejected').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sticky header with tab bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="px-4 pt-3 pb-0 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-[700] text-slate-900">Thu Chi</h2>
            <p className="text-[12px] text-slate-400">{activePeriod?.name ?? 'Chưa có kỳ quỹ'}</p>
          </div>
          <button
            onClick={() => navigate(tab === 'thu' ? '/contributions' : '/expenses')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex px-4 pt-2">
          <button
            onClick={() => setTab('thu')}
            className={`flex-1 pb-2 text-[13px] font-[600] border-b-2 transition-colors ${
              tab === 'thu'
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-400 border-transparent'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <TrendingUp size={14} />
              Thu Quỹ
            </span>
          </button>
          <button
            onClick={() => setTab('chi')}
            className={`flex-1 pb-2 text-[13px] font-[600] border-b-2 transition-colors ${
              tab === 'chi'
                ? 'text-rose-500 border-rose-500'
                : 'text-slate-400 border-transparent'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <TrendingDown size={14} />
              Chi Phí
            </span>
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-3">
        {tab === 'thu' ? (
          <>
            <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Tổng Thu</p>
              <p className="text-[17px] font-[700] text-indigo-600 tabular-nums">{formatVND(totalThu)}</p>
            </div>
            <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Số giao dịch</p>
              <p className="text-[17px] font-[700] text-slate-700 tabular-nums">{contributions.length}</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Tổng Chi</p>
              <p className="text-[17px] font-[700] text-rose-500 tabular-nums">{formatVND(totalChi)}</p>
            </div>
            <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Chờ duyệt</p>
              <p className="text-[17px] font-[700] text-amber-500 tabular-nums">
                {expenses.filter(e => e.status === 'pending').length}
              </p>
            </div>
          </>
        )}
      </div>

      {/* List */}
      <div className="px-4 pt-2 pb-28 space-y-2">
        {tab === 'thu' ? (
          sortedContributions.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-sm">
              <DollarSign size={36} className="mx-auto text-slate-200 mb-3" />
              Chưa có khoản thu nào
            </div>
          ) : sortedContributions.map(c => {
            const memberName = members.find(m => m.id === c.memberId)?.fullName ?? c.payerName ?? 'N/A'
            const initials = memberName.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()
            return (
              <div
                key={c.id}
                className="bg-white rounded-[16px] border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3"
                onClick={() => navigate('/contributions')}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-[700] shrink-0"
                  style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-[600] text-slate-800 truncate">{memberName}</p>
                  <p className="text-[12px] text-slate-400">{formatDate(c.paymentDate)} · {c.fundSource === 'COMMON' ? 'Quỹ Chung' : 'Quỹ Mini'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-[700] text-indigo-600 tabular-nums">+{formatVND(c.amount)}</p>
                  {c.isConfirmed ? (
                    <span className="text-[11px] text-emerald-500 font-[500]">Đã xác nhận</span>
                  ) : (
                    <span className="text-[11px] text-amber-500 font-[500]">Chờ xác nhận</span>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          sortedExpenses.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-sm">
              <CreditCard size={36} className="mx-auto text-slate-200 mb-3" />
              Chưa có khoản chi nào
            </div>
          ) : sortedExpenses.map(e => {
            const status = (e.status ?? 'pending') as ExpenseStatus
            return (
              <div
                key={e.id}
                className="bg-white rounded-[16px] border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3"
                onClick={() => navigate('/expenses')}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(244,63,94,0.12),rgba(251,113,133,0.08))' }}
                >
                  <CreditCard size={18} className="text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-[600] text-slate-800 truncate">{e.description}</p>
                  <p className="text-[12px] text-slate-400">{formatDate(e.expenseDate)}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-[15px] font-[700] text-rose-500 tabular-nums">-{formatVND(e.amount)}</p>
                  <span className={`text-[10px] font-[600] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${STATUS_COLOR[status]}`}>
                    {STATUS_ICON[status]}
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              </div>
            )
          })
        )}

        {/* Management link */}
        <button
          onClick={() => navigate(tab === 'thu' ? '/contributions' : '/expenses')}
          className="w-full py-3 text-[13px] font-[600] text-indigo-500 text-center"
        >
          Quản lý đầy đủ →
        </button>
      </div>
    </div>
  )
}
