import { useState, useMemo } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Wallet, Search, FileText, FileSpreadsheet } from 'lucide-react'
import { PageShell, PageHeader } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useClubContributions, useClubExpenses } from '../../hooks/useFinanceData'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND, getActiveChungPeriod } from '../../lib/utils'
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
  // Option 3: self-fetch cục bộ (không đọc global store) — tái dùng nguyên vẹn phép tính client.
  const { data: contributions } = useClubContributions(clubId)
  const { data: expenses } = useClubExpenses(clubId)

  const activePeriod = getActiveChungPeriod(data.fundPeriods)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')

  // Build chronological ledger from real store data
  const rows: LedgerRow[] = useMemo(() => {
    const periodId = activePeriod?.id
    const incomes: LedgerRow[] = contributions
      .filter(c => !periodId || c.fundPeriodId === periodId || c.fundSource === 'MINI')
      .map(c => ({
        id: c.id,
        date: c.paymentDate,
        type: 'Thu' as const,
        desc: c.fundSource === 'MINI'
          ? `[Quỹ Phụ] ${c.payerName ?? c.member?.fullName ?? 'Thành viên'}`
          : `${c.member?.fullName ?? 'Thành viên'} đóng quỹ${activePeriod ? ` ${activePeriod.name}` : ''}`,
        amount: c.amount,
      }))
    const expenseRows: LedgerRow[] = expenses
      .filter(e => !periodId || e.fundPeriodId === periodId || e.fundSource === 'MINI')
      .map(e => ({
        id: e.id,
        date: e.expenseDate,
        type: 'Chi' as const,
        desc: e.fundSource === 'MINI'
          ? `[Quỹ Phụ] ${e.description}`
          : e.description,
        amount: -e.amount,
      }))
    return [...incomes, ...expenseRows].sort((a, b) => a.date.localeCompare(b.date))
  }, [contributions, expenses, activePeriod])

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
      <div className="min-h-screen [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] [color:var(--pf-text)]">Sổ Quỹ</div>
            {activePeriod && <div className="text-[12px] [color:var(--pf-color-muted)]">{activePeriod.name}</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const pName = activePeriod?.name ?? 'So_Quy'
              exportLedgerExcel(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })))
              toast.success('Đã xuất Excel!')
            }} className="h-8 px-3 flex items-center gap-1 rounded-[10px] text-[12px] font-[600] [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] active:bg-slate-200">
              <FileSpreadsheet size={13} />Excel
            </button>
            <button onClick={() => {
              const pName = activePeriod?.name ?? 'Sổ Quỹ'
              exportLedgerPDF(pName, rowsWithBalance.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance })), totalIncome, totalExpense, currentBalance)
              toast.success('Đã xuất PDF!')
            }} className="h-8 px-3 flex items-center gap-1 rounded-[10px] text-[12px] font-[600] [background:var(--pf-primary-soft)] [color:var(--pf-primary)] active:[background:var(--pf-primary-soft)]">
              <FileText size={13} />PDF
            </button>
          </div>
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tổng thu', value: formatVND(totalIncome), color: 'text-emerald-600' },
              { label: 'Tổng chi', value: formatVND(totalExpense), color: 'text-red-500' },
              { label: 'Số dư', value: formatVND(currentBalance), color: currentBalance >= 0 ? '[color:var(--pf-primary)]' : 'text-red-500' },
            ].map(k => (
              <div key={k.label} className="[background:var(--pf-surface)] rounded-[14px] border border-[color:var(--pf-border)] p-3 text-center shadow-sm">
                <div className={`text-[13px] font-[800] ${k.color} truncate`}>{k.value}</div>
                <div className="text-[10px] [color:var(--pf-color-muted)] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Search + filter tabs */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm giao dịch..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] [background:var(--pf-surface)] border border-[color:var(--pf-border)] text-[14px] outline-none focus:[border-color:var(--pf-primary)]" />
          </div>
          <div className="flex gap-1 [background:var(--pf-surface)] rounded-[12px] border border-[color:var(--pf-border)] p-1">
            {(['all', 'Thu', 'Chi'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1.5 rounded-[9px] text-[12px] font-[600] transition-all ${typeFilter === t ? '[background:var(--pf-primary)] text-white shadow-sm' : '[color:var(--pf-color-muted)]'}`}>
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>

          {/* Transactions */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-[14px]">Chưa có giao dịch nào</div>
          ) : (
            <div className="space-y-2">
              {[...filtered].reverse().map(row => (
                <div key={row.id} className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-[12px] flex items-center justify-center shrink-0 ${row.type === 'Thu' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {row.type === 'Thu'
                        ? <ArrowUpCircle size={16} className="text-emerald-600" />
                        : <ArrowDownCircle size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-[600] [color:var(--pf-text)] leading-tight">{row.desc}</div>
                      <div className="text-[11px] [color:var(--pf-color-muted)] mt-0.5">{formatDate(row.date)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[14px] font-[800] ${row.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.amount > 0 ? '+' : ''}{formatVND(row.amount)}
                      </div>
                      <div className={`text-[11px] font-[600] mt-0.5 ${row.balance >= 0 ? '[color:var(--pf-color-muted)]' : 'text-red-500'}`}>
                        Dư: {formatVND(row.balance)}
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
    <PageShell maxWidth={1000}>
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

      <div className="flex flex-col gap-5">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ArrowUpCircle size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Tổng thu</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatVND(totalIncome)}</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{rows.filter(r => r.type === 'Thu').length} khoản</p>
          </div>
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                <ArrowDownCircle size={14} className="text-red-500" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Tổng chi</p>
            </div>
            <p className="text-xl font-bold text-red-500">{formatVND(totalExpense)}</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{rows.filter(r => r.type === 'Chi').length} khoản</p>
          </div>
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg [background:var(--pf-primary-soft)] flex items-center justify-center">
                <Wallet size={14} className="[color:var(--pf-primary)]" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Số dư</p>
            </div>
            <p className={`text-xl font-bold ${currentBalance >= 0 ? '[color:var(--pf-primary)]' : 'text-red-500'}`}>
              {formatVND(currentBalance)}
            </p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{rows.length} giao dịch</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm giao dịch..."
              className="input-base pl-9"
            />
          </div>
          <div className="flex gap-1 [background:var(--pf-surface)] rounded-lg border border-[color:var(--pf-border)] p-1">
            {(['all', 'Thu', 'Chi'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  typeFilter === t
                    ? '[background:var(--pf-primary)] text-white shadow-sm'
                    : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="[background:var(--pf-surface)] rounded-xl border border-dashed border-[color:var(--pf-border)] py-14 text-center">
            <Wallet size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm [color:var(--pf-color-muted)]">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] overflow-hidden">
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
                    <td className="[color:var(--pf-color-muted)] text-xs font-mono">{formatDate(row.date)}</td>
                    <td className="text-center">
                      <Badge variant={row.type === 'Thu' ? 'green' : 'red'}>{row.type}</Badge>
                    </td>
                    <td className="[color:var(--pf-text)]">{row.desc}</td>
                    <td className={`text-right font-semibold ${row.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {row.amount > 0 ? '+' : ''}{formatVND(row.amount)}
                    </td>
                    <td className={`text-right font-medium ${row.balance >= 0 ? '[color:var(--pf-text)]' : 'text-red-500'}`}>
                      {formatVND(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[color:var(--pf-border)] [background:var(--pf-surface-muted)]">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Số dư cuối kỳ</td>
                  <td className={`px-4 py-3 text-right font-bold ${currentBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{currentBalance >= 0 ? '+' : ''}{formatVND(currentBalance)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${currentBalance >= 0 ? '[color:var(--pf-primary)]' : 'text-red-600'}`}>{formatVND(currentBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  )
}
