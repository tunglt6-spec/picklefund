import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle, Clock, TrendingUp, Search, Receipt, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import api from '../../lib/api'

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

function toNum(v: string | number | null | undefined): number {
  return v == null ? 0 : typeof v === 'number' ? v : Number(v)
}

export function MemberContributions() {
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const memberId = user?.memberId ?? 'mem-1'
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const myContribs = data.contributions.filter(c => c.memberId === memberId)
  const myMember = data.members.find(m => m.id === memberId)
  const activePeriod = data.fundPeriods.find(p => p.status === 'active')

  const [search, setSearch] = useState('')
  const [receipts, setReceipts] = useState<PersonalReceipt[]>([])
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')

  useEffect(() => {
    if (isLocal) return
    api.get('/personal-receipts/mine').then(res => {
      setReceipts(res.data?.data ?? [])
    }).catch(() => {})
  }, [accessToken, isLocal])

  const filtered = myContribs.filter(c => {
    const period = data.fundPeriods.find(fp => fp.id === c.fundPeriodId)
    return !search || period?.name.toLowerCase().includes(search.toLowerCase())
  })

  const totalPaid = myContribs.reduce((s, c) => s + c.amount, 0)
  const confirmedCount = myContribs.filter(c => c.isConfirmed).length
  const pendingCount = myContribs.filter(c => !c.isConfirmed).length

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Lịch Sử Đóng Quỹ"
        subtitle={myMember ? myMember.fullName : 'Tài khoản thành viên'}
      />

      <div className="p-6 max-w-[900px] mx-auto space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <DollarSign size={14} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng đã đóng</p>
            </div>
            <p className="text-xl font-bold text-indigo-600">{formatVND(totalPaid)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{myContribs.length} khoản</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đã xác nhận</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{confirmedCount} khoản</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatVND(myContribs.filter(c => c.isConfirmed).reduce((s, c) => s + c.amount, 0))}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock size={14} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chờ xác nhận</p>
            </div>
            <p className="text-xl font-bold text-amber-600">{pendingCount} khoản</p>
            <p className="text-xs text-slate-500 mt-0.5">{activePeriod ? `Kỳ ${activePeriod.name}` : 'Không có kỳ mở'}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo kỳ quỹ..."
            className="input-base pl-9"
          />
        </div>

        {/* Contribution table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-14 text-center">
            <TrendingUp size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Chưa có khoản đóng quỹ nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Kỳ quỹ</th>
                  <th className="text-center">Ngày đóng</th>
                  <th className="text-right">Số tiền</th>
                  <th className="text-center">Hình thức</th>
                  <th className="text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const period = data.fundPeriods.find(fp => fp.id === c.fundPeriodId)
                  return (
                    <tr key={c.id}>
                      <td className="font-medium text-slate-900">{period?.name ?? 'Kỳ quỹ'}</td>
                      <td className="text-center text-slate-500 text-xs">{formatDate(c.paymentDate)}</td>
                      <td className="text-right font-semibold text-emerald-600">{formatVND(c.amount)}</td>
                      <td className="text-center">
                        <Badge variant="gray">{c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</Badge>
                      </td>
                      <td className="text-center">
                        {c.isConfirmed
                          ? <Badge variant="green" dot>Đã xác nhận</Badge>
                          : <Badge variant="yellow" dot>Chờ xác nhận</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Personal receipts from finalized periods */}
        {receipts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Sao Kê Kỳ Đã Chốt</h3>
            </div>
            <div className="space-y-2">
              {receipts.map(r => {
                const balance = toNum(r.balance)
                const isExpanded = expandedReceipt === r.id
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
                    <button
                      onClick={() => setExpandedReceipt(isExpanded ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-800">
                            {r.fundPeriod?.name ?? 'Kỳ đã chốt'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Chốt ngày {formatDate(r.snapshotAt)} · {r.attendedSessions}/{r.totalSessions} buổi
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {balance >= 0 ? '+' : ''}{formatVND(balance)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {balance >= 0 ? 'Dư quỹ' : 'Còn nợ'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Đã đóng quỹ</span>
                            <span className="font-semibold text-emerald-600">{formatVND(toNum(r.amountPaid))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Chi phí sân</span>
                            <span className="font-semibold text-slate-700">{formatVND(toNum(r.courtCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Chi phí sinh hoạt</span>
                            <span className="font-semibold text-slate-700">{formatVND(toNum(r.livingCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tổng chi phí</span>
                            <span className="font-semibold text-slate-700">{formatVND(toNum(r.totalCost))}</span>
                          </div>
                          {toNum(r.needToPay) > 0 && (
                            <div className="col-span-2 flex justify-between border-t border-slate-200 pt-2 mt-1">
                              <span className="text-red-600 font-medium">Cần nộp thêm</span>
                              <span className="font-bold text-red-600">{formatVND(toNum(r.needToPay))}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
