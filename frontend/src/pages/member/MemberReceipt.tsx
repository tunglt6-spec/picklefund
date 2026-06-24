import { useState, useEffect, useRef } from 'react'
import { Receipt, DollarSign, Calendar, TrendingUp, ChevronDown, ChevronUp, Download, AlertCircle, QrCode } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import api from '../../lib/api'
import { useIsMobile } from '../../hooks/useIsMobile'

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

function n(v: string | number | null | undefined) {
  return v == null ? 0 : typeof v === 'number' ? v : Number(v)
}

function BalanceBadge({ val }: { val: number }) {
  if (val > 0) return <span className="text-xs font-semibold text-emerald-600">+{formatVND(val)}</span>
  if (val < 0) return <span className="text-xs font-semibold text-red-500">{formatVND(val)}</span>
  return <span className="text-xs font-semibold text-slate-500">0 ₫</span>
}

interface BankInfo { bank_code: string; bank_account_number: string; bank_account_name: string }

function buildQrUrl(bank: BankInfo, amount: number, addInfo: string) {
  if (!bank.bank_account_number || !bank.bank_account_name) return null
  const base = `https://img.vietqr.io/image/${bank.bank_code}-${bank.bank_account_number}-compact2.jpg`
  return `${base}?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(bank.bank_account_name)}`
}

export function MemberReceipt() {
  const isMobile = useIsMobile()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const memberId = user?.memberId ?? ''
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)
  const printRef = useRef<HTMLDivElement>(null)

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')
  const [receipts, setReceipts] = useState<PersonalReceipt[]>([])
  const [loading, setLoading] = useState(!isLocal)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const myContribs = data.contributions.filter(c => c.memberId === memberId)
  const myMember = data.members.find(m => m.id === memberId)
  const attended = new Set(data.myAttendedSessionIds ?? [])

  useEffect(() => {
    if (isLocal) return
    setLoading(true)
    api.get('/personal-receipts/mine')
      .then(r => setReceipts(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLocal])

  useEffect(() => {
    api.get('/system-settings').then(res => {
      const d: Record<string, string> = res.data?.data ?? {}
      if (d.bank_account_number && d.bank_account_name) {
        setBankInfo({ bank_code: d.bank_code || 'MB', bank_account_number: d.bank_account_number, bank_account_name: d.bank_account_name })
      }
    }).catch(() => {})
  }, [])

  // Derive a local fallback receipt from store data for the active period
  const localReceipt: PersonalReceipt | null = activePeriod ? (() => {
    const periodSessions = data.sessions.filter(s => s.fundPeriodId === activePeriod.id)
    const completedSessions = periodSessions.filter(s => s.status === 'completed')
    const attendedCount = completedSessions.filter(s => attended.has(s.id)).length
    const total = completedSessions.length || 1
    const paid = myContribs
      .filter(c => c.fundPeriodId === activePeriod.id && c.isConfirmed)
      .reduce((s, c) => s + c.amount, 0)
    const courtCost = completedSessions.reduce((s, sess) => {
      const attendees = (sess as any)._count?.attendanceRecords ?? 6
      return s + (attended.has(sess.id) ? sess.courtFee / attendees : 0)
    }, 0)
    const allExpenses = data.expenses.filter(e => e.fundPeriodId === activePeriod.id)
    const livingCost = allExpenses.reduce((s, e) => s + e.amount, 0) / (data.members.filter(m => m.status === 'active').length || 1)
    const totalCost = courtCost + livingCost
    return {
      id: `local-${activePeriod.id}`,
      fundPeriodId: activePeriod.id,
      fundPeriod: { name: activePeriod.name, startDate: activePeriod.startDate, endDate: activePeriod.endDate },
      attendedSessions: attendedCount,
      totalSessions: total,
      amountPaid: paid,
      courtCost,
      livingCost,
      totalCost,
      balance: paid - totalCost,
      needToPay: Math.max(0, totalCost - paid),
      snapshotAt: new Date().toISOString(),
    }
  })() : null

  const displayReceipts: PersonalReceipt[] = isLocal
    ? (localReceipt ? [localReceipt] : [])
    : receipts

  const totalPaid = displayReceipts.reduce((s, r) => s + n(r.amountPaid), 0)
  const totalCost = displayReceipts.reduce((s, r) => s + n(r.totalCost), 0)
  const netBalance = totalPaid - totalCost

  const handleExport = () => {
    const style = document.createElement('style')
    style.innerHTML = `@media print { body > *:not(#print-receipt) { display: none !important; } #print-receipt { display: block !important; } }`
    document.head.appendChild(style)
    const el = printRef.current
    if (el) { el.id = 'print-receipt'; el.style.display = 'block' }
    window.print()
    document.head.removeChild(style)
    if (el) el.removeAttribute('id')
  }

  if (isMobile && loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] text-slate-900">Phiếu Thu Cá Nhân</div>
            {myMember && <div className="text-[12px] text-slate-400">{myMember.fullName}</div>}
          </div>
          <button onClick={handleExport} className="flex items-center gap-1 text-[12px] font-[600] text-indigo-600 active:opacity-70">
            <Download size={13} />Xuất PDF
          </button>
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Đã đóng', value: formatVND(totalPaid), color: 'text-indigo-600' },
              { label: 'Chi phí', value: formatVND(totalCost), color: 'text-amber-600' },
              { label: 'Số dư', value: `${netBalance >= 0 ? '+' : ''}${formatVND(netBalance)}`, color: netBalance >= 0 ? 'text-emerald-600' : 'text-red-500' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                <div className={`text-[13px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          {/* Receipt cards */}
          {displayReceipts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-[14px]">Chưa có phiếu thu nào</div>
          ) : (
            <div className="space-y-2">
              {displayReceipts.map(r => {
                const isExp = expanded === r.id
                const period = r.fundPeriod ?? data.fundPeriods.find(p => p.id === r.fundPeriodId)
                const bal = n(r.balance)
                const needToPay = n(r.needToPay)
                const amountPaid = n(r.amountPaid)
                const totalCostR = n(r.totalCost)
                return (
                  <div key={r.id} className="bg-white rounded-[16px] border border-slate-100 shadow-sm overflow-hidden">
                    <button onClick={() => setExpanded(isExp ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50">
                      <div className="text-left">
                        <div className="text-[14px] font-[700] text-slate-900">Kỳ {period?.name ?? r.fundPeriodId}</div>
                        <div className="text-[11px] text-slate-400">{r.attendedSessions}/{r.totalSessions} buổi</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {needToPay > 0 && <Badge variant="orange">Nợ {formatVND(needToPay)}</Badge>}
                        <span className={`text-[14px] font-[700] ${bal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {bal >= 0 ? '+' : ''}{formatVND(bal)}
                        </span>
                        {isExp ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-1.5">
                        {[
                          ['Tiền sân', n(r.courtCost)],
                          ['Chi phí SH', n(r.livingCost)],
                          ['Tổng chi phí', totalCostR],
                          ['Đã đóng', amountPaid],
                        ].map(([lbl, val]) => (
                          <div key={lbl as string} className="flex justify-between text-[12px]">
                            <span className="text-slate-500">{lbl}</span>
                            <span className="font-[600] text-slate-700">{formatVND(val as number)}</span>
                          </div>
                        ))}
                        {needToPay > 0 && (() => {
                          const qr = bankInfo ? buildQrUrl(bankInfo, needToPay, `Dong quy ${period?.name ?? ''} - ${myMember?.fullName ?? ''}`) : null
                          return (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mt-2 space-y-2">
                              <div className="flex items-center gap-1.5 text-amber-700 text-[12px] font-semibold">
                                <AlertCircle size={12} />Còn thiếu {formatVND(needToPay)}
                              </div>
                              {qr && (
                                <div className="flex gap-3 items-center">
                                  <img src={qr} alt="QR" className="w-24 h-24 rounded-lg bg-white border border-amber-200" />
                                  <div className="text-[11px] text-slate-600 space-y-0.5">
                                    <p className="font-mono font-semibold">{bankInfo!.bank_account_number}</p>
                                    <p>{bankInfo!.bank_account_name}</p>
                                    <p className="text-amber-700 font-bold">{formatVND(needToPay)}</p>
                                    <p className="text-slate-400">Quét QR để thanh toán</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        {bal > 0 && (
                          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 text-[12px] mt-2">
                            <Receipt size={12} className="shrink-0" />
                            <span>Đóng dư <strong>{formatVND(bal)}</strong> — khấu trừ kỳ sau</span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400 text-right pt-1">Cập nhật: {formatDate(r.snapshotAt)}</p>
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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Phiếu Thu Cá Nhân"
        subtitle={myMember?.fullName ?? user?.username ?? 'Thành viên'}
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} />Xuất PDF
          </Button>
        }
      />

      <div ref={printRef} className="p-6 max-w-[800px] mx-auto space-y-5">

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <DollarSign size={14} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng đã đóng</p>
            </div>
            <p className="text-xl font-bold text-indigo-600">{formatVND(totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp size={14} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chi phí phân bổ</p>
            </div>
            <p className="text-xl font-bold text-amber-600">{formatVND(totalCost)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Receipt size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Số dư</p>
            </div>
            <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {netBalance >= 0 ? '+' : ''}{formatVND(netBalance)}
            </p>
          </div>
        </div>

        {/* Receipt cards */}
        {displayReceipts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <Receipt size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-500 font-medium">Chưa có phiếu thu nào</p>
            <p className="text-xs text-slate-400 mt-1">Phiếu thu sẽ được tạo sau khi kỳ quỹ kết thúc</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayReceipts.map(r => {
              const isExpanded = expanded === r.id
              const period = r.fundPeriod ?? data.fundPeriods.find(p => p.id === r.fundPeriodId)
              const bal = n(r.balance)
              const needToPay = n(r.needToPay)
              const amountPaid = n(r.amountPaid)
              const totalCostR = n(r.totalCost)

              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
                  {/* Header row */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Calendar size={16} className="text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900">
                          Kỳ {period?.name ?? r.fundPeriodId}
                        </p>
                        <p className="text-xs text-slate-400">
                          {period ? `${formatDate(period.startDate)} – ${formatDate(period.endDate)}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Số buổi tham gia</p>
                        <p className="text-sm font-semibold text-slate-700">{r.attendedSessions}/{r.totalSessions}</p>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <p className="text-xs text-slate-400">Số dư</p>
                        <BalanceBadge val={bal} />
                      </div>
                      {needToPay > 0 && (
                        <Badge variant="orange">Còn nợ {formatVND(needToPay)}</Badge>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Tiền sân (phân bổ)</span>
                          <span className="font-medium text-slate-700">{formatVND(n(r.courtCost))}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Chi phí sinh hoạt</span>
                          <span className="font-medium text-slate-700">{formatVND(n(r.livingCost))}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Tổng chi phí</span>
                          <span className="font-bold text-slate-900">{formatVND(totalCostR)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Đã đóng</span>
                          <span className="font-bold text-indigo-600">{formatVND(amountPaid)}</span>
                        </div>
                      </div>

                      {needToPay > 0 && (() => {
                        const qr = bankInfo ? buildQrUrl(bankInfo, needToPay, `Dong quy ${period?.name ?? ''} - ${myMember?.fullName ?? ''}`) : null
                        return (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-center gap-2 text-amber-700 mb-3">
                              <AlertCircle size={14} className="shrink-0" />
                              <span className="text-xs font-semibold">Còn thiếu <strong>{formatVND(needToPay)}</strong> — quét QR để thanh toán</span>
                            </div>
                            {qr ? (
                              <div className="flex gap-5 items-start">
                                <img src={qr} alt="QR thanh toán" className="w-36 h-36 rounded-lg border border-amber-200 bg-white" />
                                <div className="text-xs text-slate-600 space-y-1">
                                  <p><span className="text-slate-400">Ngân hàng:</span> {bankInfo!.bank_code}</p>
                                  <p><span className="text-slate-400">Số TK:</span> <span className="font-mono font-semibold">{bankInfo!.bank_account_number}</span></p>
                                  <p><span className="text-slate-400">Tên TK:</span> {bankInfo!.bank_account_name}</p>
                                  <p><span className="text-slate-400">Số tiền:</span> <span className="font-bold text-amber-700">{formatVND(needToPay)}</span></p>
                                  <p className="text-slate-400 pt-1">Mở app ngân hàng → Quét QR → Kiểm tra số tiền → Chuyển</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-500 text-xs">
                                <QrCode size={14} />
                                <span>Liên hệ thủ quỹ để lấy thông tin thanh toán.</span>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {bal > 0 && (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2.5 text-xs">
                          <Receipt size={14} className="shrink-0" />
                          <span>Bạn đóng dư <strong>{formatVND(bal)}</strong> — sẽ được khấu trừ vào kỳ sau.</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 text-right">
                        Cập nhật lần cuối: {formatDate(r.snapshotAt)}
                      </p>
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
