import { useState, useMemo } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Wallet, Search, FileText, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import { exportLedgerExcel, exportLedgerPDF } from '../../lib/export'
import toast from 'react-hot-toast'

type LedgerRow = {
  id: string
  date: string
  type: 'Thu' | 'Chi'
  desc: string
  amount: number
}

export function TreasurerLedger() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')

  // Build chronological ledger from real store data
  const rows: LedgerRow[] = useMemo(() => {
    const periodId = activePeriod?.id
    const incomes: LedgerRow[] = data.contributions
      .filter(c => !periodId || c.fundPeriodId === periodId)
      .map(c => ({
        id: c.id,
        date: c.paymentDate,
        type: 'Thu' as const,
        desc: `${c.member?.fullName ?? 'Thành viên'} đóng quỹ${activePeriod ? ` ${activePeriod.name}` : ''}`,
        amount: c.amount,
      }))
    const expenses: LedgerRow[] = data.expenses
      .filter(e => !periodId || e.fundPeriodId === periodId)
      .map(e => ({
        id: e.id,
        date: e.expenseDate,
        type: 'Chi' as const,
        desc: e.description,
        amount: -e.amount,
      }))
    return [...incomes, ...expenses].sort((a, b) => a.date.localeCompare(b.date))
  }, [data.contributions, data.expenses, activePeriod])

  // Running balance
  const rowsWithBalance = useMemo(() => {
    let balance = 0
    return rows.map(r => {
      balance += r.amount
      return { ...r, balance }
    })
  }, [rows])

  const totalIncome = rows.filter(r => r.type === 'Thu').reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter(r => r.type === 'Chi').reduce((s, r) => s + Math.abs(r.amount), 0)
  const currentBalance = totalIncome - totalExpense

  const filtered = rowsWithBalance.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false
    if (search && !r.desc.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Sổ Quỹ Chi Tiết"
        subtitle={activePeriod
          ? `${activePeriod.name} · Số dư: ${formatVND(currentBalance)}`
          : `Số dư hiện tại: ${formatVND(currentBalance)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'So_Quy'
              exportLedgerExcel(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })))
              toast.success('Đã xuất Excel sổ quỹ!')
            }}>
              <FileSpreadsheet size={14} />Xuất Excel
            </Button>
            <Button onClick={() => {
              const pName = activePeriod?.name ?? 'Sổ Quỹ'
              exportLedgerPDF(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })), totalIncome, totalExpense, currentBalance)
              toast.success('Đã xuất PDF sổ quỹ!')
            }}>
              <FileText size={14} />Xuất PDF
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-[1000px] mx-auto space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ArrowUpCircle size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng thu</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatVND(totalIncome)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{rows.filter(r => r.type === 'Thu').length} khoản</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                <ArrowDownCircle size={14} className="text-red-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng chi</p>
            </div>
            <p className="text-xl font-bold text-red-500">{formatVND(totalExpense)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{rows.filter(r => r.type === 'Chi').length} khoản</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Wallet size={14} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Số dư</p>
            </div>
            <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
              {formatVND(currentBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{rows.length} giao dịch</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm giao dịch..."
              className="input-base pl-9"
            />
          </div>
          <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
            {(['all', 'Thu', 'Chi'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-14 text-center">
            <Wallet size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th className="text-center w-16">Loại</th>
                  <th>Mô tả</th>
                  <th className="text-right">Số tiền</th>
                  <th className="text-right">Số dư</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} className={row.type === 'Chi' ? 'bg-red-50/20' : ''}>
                    <td className="text-slate-500 text-xs font-mono">{formatDate(row.date)}</td>
                    <td className="text-center">
                      <Badge variant={row.type === 'Thu' ? 'green' : 'red'}>{row.type}</Badge>
                    </td>
                    <td className="text-slate-800">{row.desc}</td>
                    <td className={`text-right font-semibold ${row.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {row.amount > 0 ? '+' : ''}{formatVND(row.amount)}
                    </td>
                    <td className={`text-right font-medium ${row.balance >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
                      {formatVND(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Số dư cuối kỳ</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatVND(totalIncome - totalExpense > 0 ? totalIncome : -totalExpense)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${currentBalance >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{formatVND(currentBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
