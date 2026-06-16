import { useState } from 'react'
import { DollarSign, CheckCircle, Clock, TrendingUp, Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'

export function MemberContributions() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const memberId = user?.memberId ?? 'mem-1'
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const myContribs = data.contributions.filter(c => c.memberId === memberId)
  const myMember = data.members.find(m => m.id === memberId)
  const activePeriod = data.fundPeriods.find(p => p.status === 'active')

  const [search, setSearch] = useState('')

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

        {/* Table */}
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
      </div>
    </div>
  )
}
