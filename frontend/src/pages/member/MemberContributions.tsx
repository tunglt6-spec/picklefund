import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
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

  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
          <div className="text-[17px] font-[800] text-slate-900">Lịch Sử Đóng Quỹ</div>
          {myMember && <div className="text-[12px] text-slate-400">{myMember.fullName}</div>}
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tổng đóng', value: formatVND(totalPaid), color: 'text-indigo-600' },
              { label: 'Xác nhận', value: `${confirmedCount}`, color: 'text-emerald-600' },
              { label: 'Chờ', value: `${pendingCount}`, color: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                <div className={`text-[15px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo kỳ quỹ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] bg-white border border-slate-200 text-[14px] outline-none focus:border-indigo-400" />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-[14px]">Chưa có khoản đóng quỹ nào</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const period = data.fundPeriods.find(fp => fp.id === c.fundPeriodId)
                return (
                  <div key={c.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[15px] font-[700] text-slate-900">{period?.name ?? 'Kỳ quỹ'}</span>
                      {c.isConfirmed ? <Badge variant="green" dot>Xác nhận</Badge> : <Badge variant="yellow" dot>Chờ</Badge>}
                    </div>
                    <div className="text-[12px] text-slate-500 mb-2">{formatDate(c.paymentDate)} · {c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
                    <div className="text-[17px] font-[800] text-emerald-600">{formatVND(c.amount)}</div>
                  </div>
                )
              })}
            </div>
          )}
          {receipts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Receipt size={14} className="text-slate-500" /><span className="text-[13px] font-[700] text-slate-700">Sao Kê Đã Chốt</span>
              </div>
              {receipts.map(r => {
                const bal = toNum(r.balance)
                const isExp = expandedReceipt === r.id
                return (
                  <div key={r.id} className="bg-white rounded-[16px] border border-slate-100 shadow-sm overflow-hidden">
                    <button onClick={() => setExpandedReceipt(isExp ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50">
                      <div className="text-left">
                        <div className="text-[14px] font-[700] text-slate-800">{r.fundPeriod?.name ?? 'Kỳ đã chốt'}</div>
                        <div className="text-[11px] text-slate-400">{r.attendedSessions}/{r.totalSessions} buổi</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-[700] ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {bal >= 0 ? '+' : ''}{formatVND(bal)}
                        </span>
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-1.5 text-[12px]">
                        {[['Đã đóng quỹ', toNum(r.amountPaid), 'text-emerald-600'], ['Chi phí sân', toNum(r.courtCost), ''], ['Chi phí SH', toNum(r.livingCost), ''], ['Tổng chi phí', toNum(r.totalCost), '']].map(([lbl, val, cls]) => (
                          <div key={lbl as string} className="flex justify-between">
                            <span className="text-slate-500">{lbl}</span>
                            <span className={`font-[600] text-slate-700 ${cls}`}>{formatVND(val as number)}</span>
                          </div>
                        ))}
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
