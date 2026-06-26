import { useMemo, useCallback, useState } from 'react'
import { DollarSign, CreditCard, Building2, FileText, AlertTriangle, Clock, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { KpiCard } from '../../components/ui/KpiCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ReceiptUploadModal } from '../../components/ui/ReceiptUploadModal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import api from '../../lib/api'
import * as XLSX from 'xlsx'
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
  const isMobile = useIsMobile()
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

  const [reminding, setReminding] = useState<string | null>(null)
  const [receiptModal, setReceiptModal] = useState<{ id: string; label: string } | null>(null)
  const { setExpenses } = useClubDataStore()

  const handleReceiptSuccess = useCallback((expenseId: string, receiptUrl: string) => {
    setExpenses(user?.clubId ?? '', clubData.expenses.map(e =>
      e.id === expenseId ? { ...e, receiptUrl } : e
    ))
    setReceiptModal(null)
  }, [user?.clubId, clubData.expenses, setExpenses])

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

  const exportLedger = useCallback(() => {
    if (ledger.length === 0) { toast.error('Chưa có giao dịch để xuất'); return }
    const rows = ledger.map(r => ({
      'Ngày': formatDate(r.date),
      'Loại': r.type === 'income' ? 'Thu' : 'Chi',
      'Mô tả': r.description,
      'Số tiền': r.type === 'income' ? r.amount : -r.amount,
      'Số dư': r.balance,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 40 }, { wch: 14 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sổ Quỹ')
    const name = activePeriod ? `SoQuy_${activePeriod.name.replace(/\s/g, '_')}` : 'SoQuy'
    XLSX.writeFile(wb, `${name}.xlsx`)
    toast.success('Đã xuất sổ quỹ Excel!')
  }, [ledger, activePeriod])

  const recent = ledger.slice(-20).reverse()

  if (isMobile) {
    return (
      <>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
          <div className="text-[17px] font-[800] text-slate-900">Thủ Quỹ</div>
          <div className="text-[12px] text-slate-400">{subtitle}</div>
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* Fund cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Quỹ Chung', income: commonIncome, expense: commonExpTotal, balance, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Quỹ Mini', income: miniIncome, expense: miniExpTotal, balance: miniBalance, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map(f => (
              <div key={f.label} className="bg-white rounded-[16px] border border-slate-100 p-3 shadow-sm">
                <div className={`text-[11px] font-[700] ${f.color} mb-2`}>{f.label}</div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-400">Thu</span><span className="text-emerald-600 font-[600]">{formatVND(f.income)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Chi</span><span className="text-orange-500 font-[600]">{formatVND(f.expense)}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-1"><span className="text-slate-600 font-[600]">Số dư</span><span className={`font-[800] ${f.balance >= 0 ? f.color : 'text-red-500'}`}>{formatVND(f.balance)}</span></div>
                </div>
              </div>
            ))}
          </div>
          {/* Total asset */}
          <div className="rounded-[16px] p-4 text-white" style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
            <div className="text-[11px] font-[700] text-indigo-200 uppercase mb-1">Tổng Tài Sản CLB</div>
            <div className="text-[22px] font-[800]">{formatVND(balance + miniBalance)}</div>
            <div className="text-[11px] text-indigo-200 mt-0.5">Quỹ Chung + Quỹ Mini</div>
          </div>
          {/* Alert KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Chưa đóng', value: `${unpaid.length}`, color: unpaid.length > 0 ? 'text-red-500' : 'text-slate-500' },
              { label: 'Thiếu HĐ', value: `${noReceipt.length}`, color: noReceipt.length > 0 ? 'text-amber-600' : 'text-slate-500' },
              { label: 'Chờ xác nhận', value: `${pendingCount}`, color: 'text-slate-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                <div className={`text-[16px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          {/* Action items */}
          {(unpaid.length > 0 || noReceipt.length > 0) && (
            <div className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm space-y-2">
              <div className="text-[13px] font-[700] text-slate-800 mb-2">Cần xử lý</div>
              {unpaid.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-red-50 rounded-[10px] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-[12px] text-red-700 flex-1 truncate"><strong>{c.member?.fullName}</strong> chưa xác nhận</span>
                  <button onClick={() => sendReminder(c.id, c.member?.userId, c.member?.fullName ?? '')} disabled={reminding === c.id} className="text-[11px] text-indigo-600 font-[600] shrink-0 disabled:opacity-40">
                    {reminding === c.id ? '...' : 'Nhắc'}
                  </button>
                </div>
              ))}
              {noReceipt.slice(0, 2).map(e => (
                <div key={e.id} className="flex items-center gap-2 bg-amber-50 rounded-[10px] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[12px] text-amber-700 flex-1 truncate"><strong>{e.description}</strong> thiếu HĐ</span>
                  <button className="text-[11px] font-semibold text-amber-700 underline shrink-0"
                    onClick={() => setReceiptModal({ id: e.id, label: `${e.description} (${formatVND(e.amount)})` })}>
                    Đính kèm
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Recent ledger */}
          <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[14px] font-[700] text-slate-800">Sổ Quỹ Gần Đây</span>
              <button onClick={exportLedger} className="text-[12px] font-[600] text-indigo-600 active:opacity-70">Xuất</button>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-[13px]">Chưa có giao dịch</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.slice(0, 10).map(row => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`h-8 w-8 rounded-[10px] flex items-center justify-center shrink-0 ${row.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {row.type === 'income' ? <TrendingUp size={13} className="text-emerald-600" /> : <TrendingDown size={13} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-[600] text-slate-800 truncate">{row.description}</div>
                      <div className="text-[11px] text-slate-400">{formatDate(row.date)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[13px] font-[700] ${row.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.type === 'income' ? '+' : '-'}{formatVND(row.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500">{formatVND(row.balance)}</div>
                    </div>
                  </div>
                ))}
              </div>
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
      </>
    )
  }

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
                  <Button size="sm" variant="outline" disabled={reminding === c.id} onClick={() => sendReminder(c.id, c.member?.userId, c.member?.fullName ?? '')}>
                    {reminding === c.id ? 'Đang gửi...' : 'Gửi nhắc'}
                  </Button>
                </div>
              ))}
              {noReceipt.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm text-amber-800 flex-1">Khoản chi <strong>{e.description}</strong> ({formatVND(e.amount)}) chưa có hóa đơn</span>
                  <Button size="sm" variant="outline" onClick={() => setReceiptModal({ id: e.id, label: `${e.description} (${formatVND(e.amount)})` })}>Đính kèm</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Sổ Quỹ Gần Đây</h3>
            <Button variant="outline" size="sm" onClick={exportLedger}>Xuất Sổ</Button>
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
      {receiptModal && (
        <ReceiptUploadModal
          expenseId={receiptModal.id}
          expenseLabel={receiptModal.label}
          onSuccess={handleReceiptSuccess}
          onClose={() => setReceiptModal(null)}
        />
      )}
    </div>
  )
}
