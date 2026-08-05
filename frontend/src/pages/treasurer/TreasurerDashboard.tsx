import { useMemo, useCallback, useState, useEffect } from 'react'
import { DollarSign, CreditCard, Building2, FileText, AlertTriangle, Clock, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { KpiCard } from '../../components/ui/KpiCard'
import { Button } from '../../components/ui/Button'
import { ReceiptUploadModal } from '../../components/ui/ReceiptUploadModal'
import { PageShell, PageHeader, DataTable, MobileCardList, StatusBadge, ActionButton, type Column } from '../../components/shared'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { useClubContributions, useClubExpenses } from '../../hooks/useFinanceData'
import { formatDate, formatVND, getActiveChungPeriod } from '../../lib/utils'
import api from '../../lib/api'
import { exportGenericExcel } from '../../lib/export'
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
  // Option 3: self-fetch cục bộ (không đọc global store) — tái dùng nguyên vẹn phép tính client.
  const { data: contributions } = useClubContributions(user?.clubId ?? '')
  const { data: expenses, setData: setExpenses } = useClubExpenses(user?.clubId ?? '')

  const commonContribs = contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')
  const miniContribs   = contributions.filter(c => c.fundSource === 'MINI')
  const commonExpenses = expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON')
  const miniExpenses   = expenses.filter(e => e.fundSource === 'MINI')

  const commonIncome   = commonContribs.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
  const commonExpTotal = commonExpenses.reduce((a, e) => a + e.amount, 0)
  // Thu MINI chỉ tính ĐÃ xác nhận — khớp financial-calculator + màn Báo cáo (audit M5).
  const miniIncome     = miniContribs.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
  const miniExpTotal   = miniExpenses.reduce((a, e) => a + e.amount, 0)

  const balance = commonIncome - commonExpTotal
  const miniBalance = miniIncome - miniExpTotal
  const unpaid = commonContribs.filter(c => !c.isConfirmed)
  const noReceipt = expenses.filter(e => !e.receiptUrl)
  const pendingCount = unpaid.length

  const activePeriod = getActiveChungPeriod(clubData.fundPeriods)
  const subtitle = activePeriod ? `Kỳ ${activePeriod.name}` : 'Chưa có kỳ quỹ nào đang mở'

  // Finance summary từ backend — source of truth cho Tổng tài sản CLB
  const [financeSummary, setFinanceSummary] = useState<{
    carryForwardBalance: number
    commonBalance: number
    clubAssetsBalance: number
    unpaidCount: number
    totalIncome: number
    totalExpense: number
  } | null>(null)

  useEffect(() => {
    if (!activePeriod?.id) { setFinanceSummary(null); return }
    let cancelled = false
    api.get(`/fund-periods/${activePeriod.id}/summary`)
      .then(res => {
        if (cancelled) return
        const fund = res.data?.data
        const carryForwardBalance = Number(fund?.carryForward?.balance ?? 0)
        const commonBalance = Number(fund?.balance ?? 0)
        setFinanceSummary({
          carryForwardBalance,
          commonBalance,
          // Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ — KHÔNG cộng Quỹ Phụ
          clubAssetsBalance: Number(fund?.clubAssets?.balance ?? (commonBalance + carryForwardBalance)),
          // Số NGƯỜI chưa đóng quỹ (canonical) — khớp màn Báo cáo, khác "Chờ xác nhận" (số dòng).
          unpaidCount: Number(fund?.unpaidCount ?? 0),
          // CANONICAL Thu/Chi kỳ hiện tại: Thu = đã xác nhận; Chi = đã duyệt/đã chi (approved/paid).
          totalIncome: Number(fund?.totalIncome ?? 0),
          totalExpense: Number(fund?.totalExpenses ?? 0),
        })
      })
      .catch(() => { if (!cancelled) setFinanceSummary(null) })
    return () => { cancelled = true }
  }, [activePeriod?.id])

  // Tổng tài sản CLB từ backend; fallback: Quỹ Chính + Số dư chuyển kỳ (không cộng Quỹ Phụ)
  const clubAssetsBalance = financeSummary?.clubAssetsBalance ?? (balance + (financeSummary?.carryForwardBalance ?? 0))
  // "Chưa đóng quỹ" = số NGƯỜI chưa đóng (canonical từ summary); fallback tạm số dòng chờ xác nhận.
  const unpaidMembers = financeSummary?.unpaidCount ?? unpaid.length
  // Thu/Chi/Số dư Quỹ Chính theo CANONICAL (kỳ hiện tại, Chi=approved/paid); fallback client khi chưa có kỳ.
  const canonIncome = financeSummary?.totalIncome ?? commonIncome
  const canonExpense = financeSummary?.totalExpense ?? commonExpTotal
  const canonBalance = financeSummary?.commonBalance ?? balance

  const [reminding, setReminding] = useState<string | null>(null)
  const [receiptModal, setReceiptModal] = useState<{ id: string; label: string } | null>(null)
  const handleReceiptSuccess = useCallback((expenseId: string, receiptUrl: string) => {
    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, receiptUrl } : e))
    setReceiptModal(null)
  }, [setExpenses])

  const sendReminder = useCallback(async (contributionId: string, targetUserId: string | undefined, name: string) => {
    if (!targetUserId) { toast.error(`${name} chưa có tài khoản để nhắc`); return }
    setReminding(contributionId)
    try {
      await api.post('/hermes/dispatch', { type: 'payment_reminder', targetUserId })
      toast.success(`Đã gửi nhắc nhở cho ${name}`)
    } catch {
      toast.error('Không thể gửi nhắc nhở, thử lại sau')
    } finally {
      setReminding(null)
    }
  }, [])

  const ledger = useMemo<LedgerRow[]>(() => {
    const rows: Omit<LedgerRow, 'balance'>[] = [
      ...contributions
        .filter(c => c.isConfirmed)
        .map(c => ({
          id: c.id,
          date: c.paymentDate,
          type: 'income' as const,
          description: c.fundSource === 'MINI'
            ? `Thu Quỹ Phụ — ${c.payerName ?? c.member?.fullName ?? ''}`
            : `Thu Quỹ Chính — ${c.member?.fullName ?? c.memberId ?? ''}`,
          amount: c.amount,
        })),
      ...expenses.map(e => ({
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
  }, [contributions, expenses])

  const exportLedger = useCallback(() => {
    if (ledger.length === 0) { toast.error('Chưa có giao dịch để xuất'); return }
    const name = activePeriod ? `SoQuy_${activePeriod.name.replace(/\s/g, '_')}` : 'SoQuy'
    // Excel chuẩn SaaS dùng chung (đóng khung + header brand màu CLB).
    exportGenericExcel(
      name, 'Sổ Quỹ',
      ['Ngày', 'Loại', 'Mô tả', 'Số tiền (VNĐ)', 'Số dư (VNĐ)'],
      ledger.map(r => [
        formatDate(r.date),
        r.type === 'income' ? 'Thu' : 'Chi',
        r.description,
        r.type === 'income' ? r.amount : -r.amount,
        r.balance,
      ]),
    )
    toast.success('Đã xuất sổ quỹ Excel!')
  }, [ledger, activePeriod])

  const recent = ledger.slice(-20).reverse()

  const fundCards = [
    { label: 'Quỹ Chính', Icon: DollarSign, income: commonIncome, expense: commonExpTotal, bal: balance },
    { label: 'Quỹ Phụ', Icon: Wallet, income: miniIncome, expense: miniExpTotal, bal: miniBalance },
  ]

  const ledgerColumns: Column<LedgerRow>[] = [
    { key: 'date', header: 'Ngày', render: (r) => <span className="whitespace-nowrap text-xs [color:var(--pf-color-muted)]">{formatDate(r.date)}</span> },
    { key: 'type', header: 'Loại', align: 'center', render: (r) => <StatusBadge tone={r.type === 'income' ? 'success' : 'danger'}>{r.type === 'income' ? 'Thu' : 'Chi'}</StatusBadge> },
    { key: 'desc', header: 'Mô tả', render: (r) => <span className="[color:var(--pf-text)]">{r.description}</span> },
    {
      key: 'amount', header: 'Số tiền', align: 'right',
      render: (r) => (
        <span className={`inline-flex items-center justify-end gap-1 font-semibold ${r.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
          {r.type === 'income' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {r.type === 'income' ? '+' : '-'}{formatVND(r.amount)}
        </span>
      ),
    },
    { key: 'balance', header: 'Số dư', align: 'right', render: (r) => <span className="font-bold [color:var(--pf-text)]">{formatVND(r.balance)}</span> },
  ]

  return (
    <PageShell maxWidth={1200}>
      <PageHeader title="Thủ Quỹ Dashboard" subtitle={subtitle} />

      <div className="flex flex-col gap-5">
        {/* Fund split summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {fundCards.map(f => (
            <div key={f.label} className="rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg [background:var(--pf-primary-soft)]"><f.Icon size={14} className="[color:var(--pf-primary)]" /></div>
                <p className="text-xs font-bold uppercase tracking-wide [color:var(--pf-primary)]">{f.label}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] [color:var(--pf-color-muted)]">Thu</p><p className="text-sm font-bold text-emerald-600">{formatVND(f.income)}</p></div>
                <div><p className="text-[10px] [color:var(--pf-color-muted)]">Chi</p><p className="text-sm font-bold text-orange-500">{formatVND(f.expense)}</p></div>
                <div><p className="text-[10px] [color:var(--pf-color-muted)]">Số dư</p><p className={`text-sm font-bold ${f.bal >= 0 ? '[color:var(--pf-primary)]' : 'text-red-500'}`}>{formatVND(f.bal)}</p></div>
              </div>
            </div>
          ))}
          <div className="rounded-2xl p-4 text-white [background:linear-gradient(135deg,var(--pf-primary),var(--pf-primary-hover))]">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/70">Tổng Tài Sản CLB</p>
            <p className="text-xl font-bold">{formatVND(clubAssetsBalance)}</p>
            <p className="mt-1 text-xs text-white/70">Quỹ Chính + Số dư chuyển kỳ</p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard title="Thu Quỹ Chính" value={canonIncome} isCurrency icon={<DollarSign size={18} />} color="green" />
          <KpiCard title="Chi Quỹ Chính" value={canonExpense} isCurrency icon={<CreditCard size={18} />} color="orange" />
          <KpiCard title="Số Dư Q.Chính" value={canonBalance} isCurrency icon={<Building2 size={18} />} color="blue" />
          <KpiCard title="Khoản Chi" value={`${expenses.length} khoản`} icon={<FileText size={18} />} color="purple" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <KpiCard title="Chưa Đóng Quỹ" value={`${unpaidMembers} người`} icon={<AlertTriangle size={18} />} color="orange" alert={unpaidMembers > 0} badge={unpaidMembers > 0 ? `${unpaidMembers}` : undefined} />
          <KpiCard title="Chi Thiếu Hóa Đơn" value={`${noReceipt.length} khoản`} icon={<FileText size={18} />} color="yellow" alert={noReceipt.length > 0} />
          <KpiCard title="Chờ Xác Nhận" value={`${pendingCount} khoản`} icon={<Clock size={18} />} color="gray" />
        </div>

        {/* Action items */}
        {(unpaid.length > 0 || noReceipt.length > 0) && (
          <div className="rounded-2xl border p-5 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
            <h3 className="mb-3 font-semibold [color:var(--pf-text)]">Các Khoản Cần Xử Lý</h3>
            <div className="space-y-2">
              {unpaid.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  <span className="flex-1 text-sm text-red-800"><strong>{c.member?.fullName}</strong> chưa xác nhận đóng quỹ</span>
                  <Button size="sm" variant="outline" disabled={reminding === c.id} onClick={() => sendReminder(c.id, c.member?.userId, c.member?.fullName ?? '')}>
                    {reminding === c.id ? 'Đang gửi...' : 'Gửi nhắc'}
                  </Button>
                </div>
              ))}
              {noReceipt.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="flex-1 text-sm text-amber-800">Khoản chi <strong>{e.description}</strong> ({formatVND(e.amount)}) chưa có hóa đơn</span>
                  <Button size="sm" variant="outline" onClick={() => setReceiptModal({ id: e.id, label: `${e.description} (${formatVND(e.amount)})` })}>Đính kèm</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sổ quỹ gần đây */}
        <div className="rounded-2xl border [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
          <div className="flex items-center justify-between border-b px-5 py-4 [border-color:var(--pf-border)]">
            <h3 className="font-semibold [color:var(--pf-text)]">Sổ Quỹ Gần Đây</h3>
            <ActionButton variant="secondary" onClick={exportLedger}>Xuất Sổ</ActionButton>
          </div>
          <div className="p-2 sm:p-3">
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm [color:var(--pf-color-muted)]">Chưa có giao dịch nào</p>
            ) : (
              <>
                <div className="hidden md:block">
                  <DataTable columns={ledgerColumns} rows={recent} rowKey={(r) => r.id} />
                </div>
                <div className="md:hidden">
                  <MobileCardList
                    items={recent}
                    itemKey={(r) => r.id}
                    renderCard={(row) => (
                      <div className="flex items-center gap-3 rounded-xl border p-3 [background:var(--pf-surface)] [border-color:var(--pf-border)]">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${row.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          {row.type === 'income' ? <TrendingUp size={13} className="text-emerald-600" /> : <TrendingDown size={13} className="text-red-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold [color:var(--pf-text)]">{row.description}</div>
                          <div className="text-[11px] [color:var(--pf-color-muted)]">{formatDate(row.date)}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`text-[13px] font-bold ${row.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {row.type === 'income' ? '+' : '-'}{formatVND(row.amount)}
                          </div>
                          <div className="text-[11px] [color:var(--pf-color-muted)]">{formatVND(row.balance)}</div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {receiptModal && (
        <ReceiptUploadModal
          expenseId={receiptModal.id}
          expenseLabel={receiptModal.label}
          onSuccess={handleReceiptSuccess}
          onClose={() => setReceiptModal(null)}
        />
      )}
    </PageShell>
  )
}
