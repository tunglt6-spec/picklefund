import { useMemo } from 'react'
import { DollarSign, CreditCard, Building2, FileText, AlertTriangle, Clock, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { KpiCard } from '../../components/ui/KpiCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

type LedgerRow = {
  id: string
  date: string
  type: 'income' | 'expense'
  description: string
  amount: number
  balance: number
}

export function TreasurerDashboard() {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(user?.clubId ?? '')

  const commonContribs = clubData.contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')
  const miniContribs   = clubData.contributions.filter(c => c.fundSource === 'MINI')
  const commonExpenses = clubData.expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON')
  const miniExpenses   = clubData.expenses.filter(e => e.fundSource === 'MINI')

  const commonIncome   = commonContribs.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
  const commonExpTotal = commonExpenses.reduce((a, e) => a + e.amount, 0)
  const miniIncome     = miniContribs.reduce((a, c) => a + c.amount, 0)
  const miniExpTotal   = miniExpenses.reduce((a, e) => a + e.amount, 0)

  const balance = commonIncome - commonExpTotal
  const miniBalance = miniIncome - miniExpTotal
  const unpaid = commonContribs.filter(c => !c.isConfirmed)
  const noReceipt = clubData.expenses.filter(e => !e.receiptUrl)
  const pendingCount = unpaid.length

  const activePeriod = clubData.fundPeriods.find(p => p.status === 'active')
  const subtitle = activePeriod ? `Kỳ ${activePeriod.name}` : 'Chưa có kỳ quỹ nào đang mở'

  const ledger = useMemo<LedgerRow[]>(() => {
    const rows: Omit<LedgerRow, 'balance'>[] = [
      ...clubData.contributions
        .filter(c => c.isConfirmed)
        .map(c => ({
          id: c.id,
          date: c.paymentDate,
          type: 'income' as const,
          description: c.fundSource === 'MINI'
            ? `Thu Quỹ Mini — ${c.payerName ?? c.member?.fullName ?? ''}`
            : `Thu Quỹ Chung — ${c.member?.fullName ?? c.memberId ?? ''}`,
          amount: c.amount,
        })),
      ...clubData.expenses.map(e => ({
        id: e.id,
        date: e.expenseDate,
        type: 'expense' as const,
        description: e.description,
        amount: e.amount,
      })),
    ]
    rows.sort((a, b) => a.date.localeCompare(b.date))

    let runningBalance = 0
    return rows.map(r => {
      runningBalance += r.type === 'income' ? r.amount : -r.amount
      return { ...r, balance: runningBalance }
    })
  }, [clubData.contributions, clubData.expenses])

  const recent = ledger.slice(-20).reverse()

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader title="Thủ Quỹ Dashboard" subtitle={subtitle} />

      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
        {/* Fund split summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center"><DollarSign size={14} className="text-indigo-600" /></div>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Quỹ Chung</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-slate-400">Thu</p><p className="text-sm font-bold text-emerald-600">{formatVND(commonIncome)}</p></div>
              <div><p className="text-[10px] text-slate-400">Chi</p><p className="text-sm font-bold text-orange-500">{formatVND(commonExpTotal)}</p></div>
              <div><p className="text-[10px] text-slate-400">Số dư</p><p className={`text-sm font-bold ${balance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>{formatVND(balance)}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center"><Wallet size={14} className="text-violet-600" /></div>
              <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">Quỹ Mini</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-slate-400">Thu</p><p className="text-sm font-bold text-emerald-600">{formatVND(miniIncome)}</p></div>
              <div><p className="text-[10px] text-slate-400">Chi</p><p className="text-sm font-bold text-orange-500">{formatVND(miniExpTotal)}</p></div>
              <div><p className="text-[10px] text-slate-400">Số dư</p><p className={`text-sm font-bold ${miniBalance >= 0 ? 'text-violet-600' : 'text-red-500'}`}>{formatVND(miniBalance)}</p></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-200 mb-2">Tổng Tài Sản CLB</p>
            <p className="text-xl font-bold">{formatVND(balance + miniBalance)}</p>
            <p className="text-xs text-indigo-200 mt-1">Quỹ Chung + Quỹ Mini</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Thu Quỹ Chung" value={commonIncome} isCurrency icon={<DollarSign size={18} />} color="green" />
          <KpiCard title="Chi Quỹ Chung" value={commonExpTotal} isCurrency icon={<CreditCard size={18} />} color="orange" />
          <KpiCard title="Số Dư Q.Chung" value={balance} isCurrency icon={<Building2 size={18} />} color="blue" />
          <KpiCard title="Khoản Chi" value={`${clubData.expenses.length} khoản`} icon={<FileText size={18} />} color="purple" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <KpiCard title="Chưa Đóng Quỹ" value={`${unpaid.length} người`} icon={<AlertTriangle size={18} />} color="orange" alert={unpaid.length > 0} badge={unpaid.length > 0 ? `${unpaid.length}` : undefined} />
          <KpiCard title="Chi Thiếu Hóa Đơn" value={`${noReceipt.length} khoản`} icon={<FileText size={18} />} color="yellow" alert={noReceipt.length > 0} />
          <KpiCard title="Chờ Xác Nhận" value={`${pendingCount} khoản`} icon={<Clock size={18} />} color="gray" />
        </div>

        {(unpaid.length > 0 || noReceipt.length > 0) && (
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-3">Các Khoản Cần Xử Lý</h3>
            <div className="space-y-2">
              {unpaid.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm text-red-800 flex-1"><strong>{c.member?.fullName}</strong> chưa xác nhận đóng quỹ</span>
                  <Button size="sm" variant="outline" onClick={() => toast.success(`Đã gửi nhắc ${c.member?.fullName}`)}>
                    Gửi nhắc
                  </Button>
                </div>
              ))}
              {noReceipt.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm text-amber-800 flex-1">Khoản chi <strong>{e.description}</strong> ({formatVND(e.amount)}) chưa có hóa đơn</span>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Đã đính kèm hóa đơn!')}>Đính kèm</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Sổ Quỹ Gần Đây</h3>
            <Button variant="outline" size="sm" onClick={() => toast.success('Xuất sổ quỹ Excel!')}>Xuất Sổ</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Ngày</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Loại</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Mô tả</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Số tiền</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Số dư</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Chưa có giao dịch nào</td>
                </tr>
              ) : recent.map(row => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.type === 'income'
                      ? <Badge variant="green" dot>Thu</Badge>
                      : <Badge variant="red" dot>Chi</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.description}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span className={`flex items-center justify-end gap-1 ${row.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.type === 'income' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {row.type === 'income' ? '+' : '-'}{formatVND(row.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatVND(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
