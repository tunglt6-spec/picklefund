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
import { useIsMobile } from '../../hooks/useIsMobile'

type LedgerRow = {
  id: string
  date: string
  type: 'Thu' | 'Chi'
  desc: string
  amount: number
}

export function TreasurerLedger() {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')

  // Build chronological ledger from real store data
  const rows: LedgerRow[] = useMemo(() => {
    const periodId = activePeriod?.id
    const incomes: LedgerRow[] = data.contributions
      .filter(c => !periodId || c.fundPeriodId === periodId || c.fundSource === 'MINI')
      .map(c => ({
        id: c.id,
        date: c.paymentDate,
        type: 'Thu' as const,
        desc: c.fundSource === 'MINI'
          ? `[Quá»¹ Mini] ${c.payerName ?? c.member?.fullName ?? 'ThÃ nh viÃªn'}`
          : `${c.member?.fullName ?? 'ThÃ nh viÃªn'} Ä‘Ã³ng quá»¹${activePeriod ? ` ${activePeriod.name}` : ''}`,
        amount: c.amount,
      }))
    const expenses: LedgerRow[] = data.expenses
      .filter(e => !periodId || e.fundPeriodId === periodId || e.fundSource === 'MINI')
      .map(e => ({
        id: e.id,
        date: e.expenseDate,
        type: 'Chi' as const,
        desc: e.fundSource === 'MINI'
          ? `[Quá»¹ Mini] ${e.description}`
          : e.description,
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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] text-slate-900">Sá»• Quá»¹</div>
            {activePeriod && <div className="text-[12px] text-slate-400">{activePeriod.name}</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const pName = activePeriod?.name ?? 'So_Quy'
              exportLedgerExcel(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })))
              toast.success('ÄÃ£ xuáº¥t Excel!')
            }} className="h-8 px-3 flex items-center gap-1 rounded-[10px] text-[12px] font-[600] bg-slate-100 text-slate-600 active:bg-slate-200">
              <FileSpreadsheet size={13} />Excel
            </button>
            <button onClick={() => {
              const pName = activePeriod?.name ?? 'Sá»• Quá»¹'
              exportLedgerPDF(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })), totalIncome, totalExpense, currentBalance)
              toast.success('ÄÃ£ xuáº¥t PDF!')
            }} className="h-8 px-3 flex items-center gap-1 rounded-[10px] text-[12px] font-[600] bg-indigo-50 text-indigo-600 active:bg-indigo-100">
              <FileText size={13} />PDF
            </button>
          </div>
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tá»•ng thu', value: formatVND(totalIncome), color: 'text-emerald-600' },
              { label: 'Tá»•ng chi', value: formatVND(totalExpense), color: 'text-red-500' },
              { label: 'Sá»‘ dÆ°', value: formatVND(currentBalance), color: currentBalance >= 0 ? 'text-indigo-600' : 'text-red-500' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                <div className={`text-[13px] font-[800] ${k.color} truncate`}>{k.value}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Search + filter tabs */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="TÃ¬m giao dá»‹ch..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] bg-white border border-slate-200 text-[14px] outline-none focus:border-indigo-400" />
          </div>
          <div className="flex gap-1 bg-white rounded-[12px] border border-slate-200 p-1">
            {(['all', 'Thu', 'Chi'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1.5 rounded-[9px] text-[12px] font-[600] transition-all ${typeFilter === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}>
                {t === 'all' ? 'Táº¥t cáº£' : t}
              </button>
            ))}
          </div>

          {/* Transactions */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-[14px]">ChÆ°a cÃ³ giao dá»‹ch nÃ o</div>
          ) : (
            <div className="space-y-2">
              {[...filtered].reverse().map(row => (
                <div key={row.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-[12px] flex items-center justify-center shrink-0 ${row.type === 'Thu' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {row.type === 'Thu'
                        ? <ArrowUpCircle size={16} className="text-emerald-600" />
                        : <ArrowDownCircle size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-[600] text-slate-800 leading-tight">{row.desc}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(row.date)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[14px] font-[800] ${row.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.amount > 0 ? '+' : ''}{formatVND(row.amount)}
                      </div>
                      <div className={`text-[11px] font-[600] mt-0.5 ${row.balance >= 0 ? 'text-slate-500' : 'text-red-500'}`}>
                        DÆ°: {formatVND(row.balance)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Sá»• Quá»¹ Chi Tiáº¿t"
        subtitle={activePeriod
          ? `${activePeriod.name} Â· Sá»‘ dÆ°: ${formatVND(currentBalance)}`
          : `Sá»‘ dÆ° hiá»‡n táº¡i: ${formatVND(currentBalance)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'So_Quy'
              exportLedgerExcel(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })))
              toast.success('ÄÃ£ xuáº¥t Excel sá»• quá»¹!')
            }}>
              <FileSpreadsheet size={14} />Xuáº¥t Excel
            </Button>
            <Button onClick={() => {
              const pName = activePeriod?.name ?? 'Sá»• Quá»¹'
              exportLedgerPDF(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })), totalIncome, totalExpense, currentBalance)
              toast.success('ÄÃ£ xuáº¥t PDF sá»• quá»¹!')
            }}>
              <FileText size={14} />Xuáº¥t PDF
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tá»•ng thu</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatVND(totalIncome)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{rows.filter(r => r.type === 'Thu').length} khoáº£n</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                <ArrowDownCircle size={14} className="text-red-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tá»•ng chi</p>
            </div>
            <p className="text-xl font-bold text-red-500">{formatVND(totalExpense)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{rows.filter(r => r.type === 'Chi').length} khoáº£n</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Wallet size={14} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sá»‘ dÆ°</p>
            </div>
            <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
              {formatVND(currentBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{rows.length} giao dá»‹ch</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="TÃ¬m kiáº¿m giao dá»‹ch..."
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
                {t === 'all' ? 'Táº¥t cáº£' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-14 text-center">
            <Wallet size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">ChÆ°a cÃ³ giao dá»‹ch nÃ o</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <table className="table-base">
              <thead>
                <tr>
                  <th>NgÃ y</th>
                  <th className="text-center w-16">Loáº¡i</th>
                  <th>MÃ´ táº£</th>
                  <th className="text-right">Sá»‘ tiá»n</th>
                  <th className="text-right">Sá»‘ dÆ°</th>
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
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Sá»‘ dÆ° cuá»‘i ká»³</td>
                  <td className={`px-4 py-3 text-right font-bold ${currentBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{currentBalance >= 0 ? '+' : ''}{formatVND(currentBalance)}</td>
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

