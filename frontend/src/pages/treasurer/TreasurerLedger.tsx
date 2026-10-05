import { useState, useMemo, useEffect } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Wallet, Search, FileText, FileSpreadsheet } from 'lucide-react'
import { PageShell, PageHeader } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useClubContributions, useClubExpenses } from '../../hooks/useFinanceData'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND, getActiveChungPeriod } from '../../lib/utils'
import { exportLedgerExcel, exportLedgerPDF } from '../../lib/export'
import api from '../../lib/api'
import { buildLedgerRows } from '../../lib/finance-ledger'
import { useExportRunner } from '../../hooks/useExportRunner'
import { useIsMobile } from '../../hooks/useIsMobile'

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
  const { busy, run } = useExportRunner()

  // Số dư mở đầu = số dư chuyển kỳ (canonical từ /fund-periods/:id/summary). null = chưa tải được.
  const [opening, setOpening] = useState<number | null>(null)
  useEffect(() => {
    if (!activePeriod?.id) { setOpening(0); return }
    let cancelled = false
    setOpening(null)
    api.get(`/fund-periods/${activePeriod.id}/summary`)
      .then(res => { if (!cancelled) setOpening(Number(res.data?.data?.carryForward?.balance ?? 0)) })
      .catch(() => { if (!cancelled) setOpening(null) })
    return () => { cancelled = true }
  }, [activePeriod?.id])

  // Sổ Quỹ CHÍNH của kỳ đang chọn: Thu đã xác nhận + Chi approved|paid, Quỹ Phụ KHÔNG gộp.
  const ledger = useMemo(
    () => buildLedgerRows(contributions, expenses, activePeriod?.id, opening ?? 0, activePeriod?.name),
    [contributions, expenses, activePeriod, opening],
  )
  const rowsWithBalance = ledger.rows
  const { totalIncome, totalExpense, closingBalance: currentBalance } = ledger
  // Đang tải / lỗi số dư chuyển kỳ → KHÔNG hiện số dư tính với opening=0 (sai). Hiện "—" + ghi chú.
  const blocked = !!activePeriod && opening === null
  const fmtBal = (n: number) => (blocked ? '—' : formatVND(n))

  const filtered = rowsWithBalance.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false
    if (search && !r.desc.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const isFiltered = typeFilter !== 'all' || search.trim() !== ''
  const safe = (t: string) => t.replace(/[^\p{L}\p{N} ]/gu, '').trim()
  const filterNote = isFiltered
    ? ` – lọc ${[typeFilter !== 'all' ? typeFilter : '', safe(search)].filter(Boolean).join(' ')}`
    : ''

  // Export ĐÚNG tập đang hiển thị (filtered), số dư chạy tuyệt đối từ số dư mở đầu của kỳ.
  const exportRows = filtered.map(r => ({ date: formatDate(r.date), type: r.type, desc: r.desc, amount: r.amount, balance: r.balance }))
  const exportName = `${activePeriod?.name ?? 'So_Quy'}${filterNote}`
  // Khi lọc: tổng thu/chi + số dư cuối kỳ trong file đều là TOÀN SỔ (nhãn "(toàn sổ)") để khớp nhau.
  // `ledger.totalExpense` đã là số dương (xem finance-ledger.ts).
  const onExcel = () => run(
    () => exportLedgerExcel(exportName, exportRows, ledger.openingBalance, currentBalance, { filtered: isFiltered, totalIncome, totalExpense }),
    { success: 'Đã xuất Excel sổ quỹ!', empty: exportRows.length === 0 || blocked, emptyMsg: blocked ? 'Chưa tải được số dư chuyển kỳ, thử lại sau' : 'Chưa có giao dịch để xuất' },
  )
  const onPdf = () => run(
    () => exportLedgerPDF(exportName, exportRows, totalIncome, totalExpense, currentBalance, ledger.openingBalance, { filtered: isFiltered }),
    { success: 'Đã xuất PDF sổ quỹ!', empty: exportRows.length === 0 || blocked, emptyMsg: blocked ? 'Chưa tải được số dư chuyển kỳ, thử lại sau' : 'Chưa có giao dịch để xuất' },
  )

  if (isMobile) {
    return (
      <div className="min-h-full [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-[800] [color:var(--pf-text)]">Sổ Quỹ</div>
            {activePeriod && <div className="text-xs [color:var(--pf-color-muted)]">{activePeriod.name} · Quỹ Chính</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={onExcel} disabled={busy} className="h-8 px-3 flex items-center gap-1 rounded-[10px] text-xs font-[600] disabled:opacity-50 [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] active:bg-slate-200">
              <FileSpreadsheet size={13} />Excel
            </button>
            <button onClick={onPdf} disabled={busy} className="h-8 px-3 flex items-center gap-1 rounded-[10px] text-xs font-[600] disabled:opacity-50 [background:var(--pf-primary-soft)] [color:var(--pf-primary)] active:[background:var(--pf-primary-soft)]">
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
              { label: 'Số dư', value: fmtBal(currentBalance), color: currentBalance >= 0 ? '[color:var(--pf-primary)]' : 'text-red-500' },
            ].map(k => (
              <div key={k.label} className="pf-stat-cell rounded-lg px-2 py-2.5 text-center">
                <div className="text-[10px] uppercase font-semibold tracking-wide [color:var(--pf-color-muted)] mb-1">{k.label}</div>
                <div className={`text-base font-bold ${k.color} truncate`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Search + filter tabs */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm giao dịch..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] [background:var(--pf-surface)] border border-[color:var(--pf-border)] text-sm outline-none focus:[border-color:var(--pf-primary)]" />
          </div>
          <div className="flex gap-1 [background:var(--pf-surface)] rounded-[12px] border border-[color:var(--pf-border)] p-1">
            {(['all', 'Thu', 'Chi'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1.5 rounded-[9px] text-xs font-[600] transition-all ${typeFilter === t ? '[background:var(--pf-primary)] text-white shadow-sm' : '[color:var(--pf-color-muted)]'}`}>
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>

          {/* Transactions */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-sm">Chưa có giao dịch nào</div>
          ) : (
            <div className="space-y-2">
              {[...filtered].reverse().map(row => (
                <div key={row.id} className="pf-rowcard p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-[12px] flex items-center justify-center shrink-0 ${row.type === 'Thu' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {row.type === 'Thu'
                        ? <ArrowUpCircle size={16} className="text-emerald-600" />
                        : <ArrowDownCircle size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-[600] [color:var(--pf-text)] leading-tight">{row.desc}</div>
                      <div className="text-xs [color:var(--pf-color-muted)] mt-0.5">{formatDate(row.date)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-[800] ${row.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.amount > 0 ? '+' : ''}{formatVND(row.amount)}
                      </div>
                      <div className={`text-xs font-[600] mt-0.5 ${row.balance >= 0 ? '[color:var(--pf-color-muted)]' : 'text-red-500'}`}>
                        Dư: {fmtBal(row.balance)}
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
    <PageShell maxWidth={1760}>
      <PageHeader
        title="Sổ Quỹ Chi Tiết"
        subtitle={activePeriod
          ? `${activePeriod.name} · Quỹ Chính · Chuyển kỳ: ${fmtBal(ledger.openingBalance)} · Số dư: ${fmtBal(currentBalance)}`
          : `Số dư hiện tại: ${fmtBal(currentBalance)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onExcel} disabled={busy}>
              <FileSpreadsheet size={14} />Xuất Excel
            </Button>
            <Button onClick={onPdf} disabled={busy}>
              <FileText size={14} />Xuất PDF
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          <div className="pf-stat-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ArrowUpCircle size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Tổng thu</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatVND(totalIncome)}</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{rowsWithBalance.filter(r => r.type === 'Thu').length} khoản</p>
          </div>
          <div className="pf-stat-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                <ArrowDownCircle size={14} className="text-red-500" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Tổng chi</p>
            </div>
            <p className="text-xl font-bold text-red-500">{formatVND(totalExpense)}</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{rowsWithBalance.filter(r => r.type === 'Chi').length} khoản</p>
          </div>
          <div className="pf-stat-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg [background:var(--pf-primary-soft)] flex items-center justify-center">
                <Wallet size={14} className="[color:var(--pf-primary)]" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Số dư</p>
            </div>
            <p className={`text-xl font-bold ${currentBalance >= 0 ? '[color:var(--pf-primary)]' : 'text-red-500'}`}>
              {fmtBal(currentBalance)}
            </p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{blocked ? 'Đang tải số dư chuyển kỳ…' : `${rowsWithBalance.length} giao dịch`}</p>
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
            <Wallet size={32} className="mx-auto [color:var(--pf-color-muted)] opacity-40 mb-3" />
            <p className="text-sm [color:var(--pf-color-muted)]">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="pf-glass-strong rounded-xl overflow-x-auto">
            <table className="table-base pf-rows">
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
                      {fmtBal(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[color:var(--pf-border)] [background:var(--pf-surface-muted)]">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Số dư cuối kỳ</td>
                  <td className={`px-4 py-3 text-right font-bold ${currentBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{!blocked && currentBalance >= 0 ? '+' : ''}{fmtBal(currentBalance)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${currentBalance >= 0 ? '[color:var(--pf-primary)]' : 'text-red-600'}`}>{fmtBal(currentBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  )
}
