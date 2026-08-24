import { useState, useEffect, useRef } from 'react'
import { Receipt, DollarSign, Calendar, TrendingUp, ChevronDown, ChevronUp, Download, AlertCircle, QrCode, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell, PageHeader, MetricCard, ActionButton } from '../../components/shared'
import { Badge } from '../../components/ui/Badge'
import { useAuthStore } from '../../store/authStore'
import { useMemberPortal } from '../../hooks/useMemberPortal'
import { formatDate, formatVND } from '../../lib/utils'
import api from '../../lib/api'
import { useIsMobile } from '../../hooks/useIsMobile'
import { exportReceiptPDF } from '../../lib/export'

/** 1 dòng breakdown cho card "kỳ hiện tại (tạm tính)". */
function LiveRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="[color:var(--pf-color-muted)]">{label}</span>
      <span className={bold ? 'font-bold [color:var(--pf-text)]' : 'font-semibold [color:var(--pf-text)]'}>{value}</span>
    </div>
  )
}

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
  return <span className="text-xs font-semibold [color:var(--pf-color-muted)]">0 ₫</span>
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
  // Chỉ dùng dữ liệu self-scope từ JWT (/member/me/*) — không đọc store club-wide.
  const { finance, attendance } = useMemberPortal()
  const printRef = useRef<HTMLDivElement>(null)

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')
  const [receipts, setReceipts] = useState<PersonalReceipt[]>([])
  const [loading, setLoading] = useState(!isLocal)
  const [expanded, setExpanded] = useState<string | null>(null)
  // Thông tin bank/QR lấy từ endpoint member-scope /member/me/bank-info
  // (chỉ 3 field công khai phục vụ chuyển khoản; null nếu CLB chưa cấu hình).
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)

  const activePeriod = finance?.period ?? null
  const memberName =
    finance?.member?.memberName ?? attendance?.memberName ?? user?.username ?? 'Thành viên'

  useEffect(() => {
    if (isLocal) return
    setLoading(true)
    api.get('/personal-receipts/mine')
      .then(r => setReceipts(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLocal])

  // Thông tin ngân hàng CLB (member-scope) để dựng QR VietQR.
  useEffect(() => {
    if (isLocal) return
    api.get('/member/me/bank-info')
      .then(r => { const d = r.data?.data; if (d?.bank_account_number) setBankInfo(d as BankInfo) })
      .catch(() => {})
  }, [isLocal])

  const displayReceipts: PersonalReceipt[] = isLocal ? [] : receipts

  // Auto-expand the first receipt with debt, or the active period
  const activeReceiptId = displayReceipts.find(r => r.fundPeriodId === activePeriod?.id)?.id ?? displayReceipts[0]?.id ?? null
  const debtReceipt = displayReceipts.find(r => n(r.needToPay) > 0)
  if (!expanded && displayReceipts.length > 0) {
    // will be set by effect below
  }

  useEffect(() => {
    if (displayReceipts.length > 0 && !expanded) {
      setExpanded(debtReceipt?.id ?? activeReceiptId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayReceipts.length])

  // Khi CHƯA có phiếu thu chính thức (kỳ đang diễn ra) → hiển thị số liệu LIVE (tạm tính)
  // từ /member/me/finance để member vẫn thấy đã đóng / chi phí / số dư hiện tại.
  const live = finance?.member
  const hasReceipts = displayReceipts.length > 0
  const totalPaid = hasReceipts ? displayReceipts.reduce((s, r) => s + n(r.amountPaid), 0) : n(live?.paidAmount)
  const totalCost = hasReceipts ? displayReceipts.reduce((s, r) => s + n(r.totalCost), 0) : n(live?.totalCost)
  const netBalance = hasReceipts ? totalPaid - totalCost : n(live?.balance)

  // ĐỒNG BỘ 1 PHIẾU THU: dùng CHUNG exportReceiptPDF với màn Tổng Quan (Dashboard) — cùng
  // bố cục, cùng tên file. KHÔNG tự sinh phiếu thu riêng (chụp màn) nữa. Dữ liệu từ /member/me/finance.
  const handleExport = () => {
    const m = finance?.member
    const p = finance?.period
    if (!m || !p) { toast.error('Chưa có dữ liệu kỳ quỹ để xuất phiếu thu'); return }
    const t = finance?.totals
    exportReceiptPDF({
      receiptNo: 1,
      memberName,
      loginName: user?.username ?? '',
      periodName: p.name,
      periodStartDate: p.startDate,
      periodEndDate: p.endDate,
      contributionAmount: p.contributionAmount,
      clubName: 'CLB Pickleball',
      clubLocation: '',
      amountPaid: n(m.paidAmount),
      paymentDate: finance?.contribution?.paymentDate ?? '',
      attendedSessions: m.attendedSessions,
      totalSessions: m.totalSessions,
      totalCourtFee: t?.court ?? 0,
      memberCountForSplit: t?.memberCount ?? 0,
      courtCost: n(m.courtFee),
      totalOtherFee: t?.living ?? 0,
      livingCost: n(m.livingFee),
      totalCost: n(m.totalCost),
      balance: n(m.balance),
      isConfirmed: finance?.contribution?.isConfirmed ?? false,
    })
    toast.success('Đã xuất Phiếu Thu PDF!')
  }

  // Tải ảnh QR (fetch blob → download; fallback mở tab mới nếu CORS chặn).
  const downloadQr = async (url: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href; a.download = 'QR-thanh-toan-quy.jpg'
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(href)
      toast.success('Đã tải mã QR')
    } catch {
      window.open(url, '_blank')
    }
  }

  // Chia sẻ thông tin thanh toán (Web Share API; fallback copy clipboard).
  const shareQr = async (url: string, amount: number, periodName: string) => {
    if (!bankInfo) return
    const text = `Đóng quỹ ${periodName} — ${formatVND(amount)}\nNgân hàng: ${bankInfo.bank_code}\nSố TK: ${bankInfo.bank_account_number}\nTên TK: ${bankInfo.bank_account_name}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Thanh toán quỹ CLB', text, url }) } catch { /* user hủy */ }
    } else {
      try { await navigator.clipboard.writeText(`${text}\n${url}`); toast.success('Đã sao chép thông tin thanh toán') } catch { /* noop */ }
    }
  }

  if (isMobile && loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen [background:var(--pf-bg)]">
      <div className="h-8 w-8 rounded-full border-2 [border-color:var(--pf-primary)] border-t-transparent animate-spin" />
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-full [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] [color:var(--pf-text)]">Phiếu Thu Cá Nhân</div>
            <div className="text-[12px] [color:var(--pf-color-muted)]">{memberName}</div>
          </div>
          <button onClick={handleExport} className="flex items-center gap-1 text-[12px] font-[600] [color:var(--pf-primary)] active:opacity-70">
            <Download size={13} />Xuất PDF
          </button>
        </div>
        <div ref={printRef} className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Đã đóng', value: formatVND(totalPaid), color: '[color:var(--pf-primary)]' },
              { label: 'Chi phí', value: formatVND(totalCost), color: 'text-amber-600' },
              { label: 'Số dư', value: `${netBalance >= 0 ? '+' : ''}${formatVND(netBalance)}`, color: netBalance >= 0 ? 'text-emerald-600' : 'text-red-500' },
            ].map(k => (
              <div key={k.label} className="[background:var(--pf-surface)] rounded-[14px] border border-[color:var(--pf-border)] p-3 text-center shadow-sm">
                <div className={`text-[13px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[11px] [color:var(--pf-color-muted)] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          {/* Kỳ hiện tại — số liệu LIVE (tạm tính) */}
          {!hasReceipts && live && activePeriod && (
            <div className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-[700] [color:var(--pf-text)]">Kỳ hiện tại</span>
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Tạm tính</span>
              </div>
              <div className="space-y-1">
                <LiveRow label="Đã tham gia" value={`${live.attendedSessions}/${live.totalSessions} buổi`} />
                <LiveRow label="Tiền sân" value={formatVND(n(live.courtFee))} />
                <LiveRow label="Chi phí SH" value={formatVND(n(live.livingFee))} />
                <LiveRow label="Tổng chi phí" value={formatVND(n(live.totalCost))} bold />
                <LiveRow label="Đã đóng" value={formatVND(n(live.paidAmount))} />
                <div className="flex justify-between pt-1 border-t border-[color:var(--pf-border)]">
                  <span className="text-sm [color:var(--pf-color-muted)]">Số dư</span>
                  <BalanceBadge val={n(live.balance)} />
                </div>
              </div>
            </div>
          )}

          {/* Receipt cards */}
          {displayReceipts.length === 0 ? (
            <div className="text-center py-10 [color:var(--pf-color-muted)] text-[13px]">Chưa có phiếu thu chính thức — số liệu trên là tạm tính; phiếu thu tạo sau khi kỳ kết thúc.</div>
          ) : (
            <div className="space-y-2">
              {displayReceipts.map(r => {
                const isExp = expanded === r.id
                const period = r.fundPeriod
                const bal = n(r.balance)
                const needToPay = n(r.needToPay)
                const amountPaid = n(r.amountPaid)
                const totalCostR = n(r.totalCost)
                return (
                  <div key={r.id} className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
                    <button onClick={() => setExpanded(isExp ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 active:[background:var(--pf-surface-muted)]">
                      <div className="text-left">
                        <div className="text-[14px] font-[700] [color:var(--pf-text)]">Kỳ {period?.name ?? r.fundPeriodId}</div>
                        <div className="text-[11px] [color:var(--pf-color-muted)]">{r.attendedSessions}/{r.totalSessions} buổi</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {needToPay > 0 && <Badge variant="orange">Nợ {formatVND(needToPay)}</Badge>}
                        <span className={`text-[14px] font-[700] ${bal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {bal >= 0 ? '+' : ''}{formatVND(bal)}
                        </span>
                        {isExp ? <ChevronUp size={14} className="[color:var(--pf-color-muted)]" /> : <ChevronDown size={14} className="[color:var(--pf-color-muted)]" />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="border-t border-[color:var(--pf-border)] px-4 py-3 [background:var(--pf-color-muted-soft)] space-y-1.5">
                        {[
                          ['Tiền sân', n(r.courtCost)],
                          ['Chi phí SH', n(r.livingCost)],
                          ['Tổng chi phí', totalCostR],
                          ['Đã đóng', amountPaid],
                        ].map(([lbl, val]) => (
                          <div key={lbl as string} className="flex justify-between text-[12px]">
                            <span className="[color:var(--pf-color-muted)]">{lbl}</span>
                            <span className="font-[600] [color:var(--pf-text)]">{formatVND(val as number)}</span>
                          </div>
                        ))}
                        {needToPay > 0 && (() => {
                          const qr = bankInfo ? buildQrUrl(bankInfo, needToPay, `Dong quy ${period?.name ?? ''} - ${memberName}`) : null
                          return (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mt-2 space-y-2">
                              <div className="flex items-center gap-1.5 text-amber-700 text-[12px] font-semibold">
                                <AlertCircle size={12} />Còn thiếu {formatVND(needToPay)}
                              </div>
                              {qr && (
                                <>
                                  <div className="flex gap-3 items-center">
                                    <img src={qr} alt="QR" className="w-24 h-24 rounded-lg [background:var(--pf-surface)] border border-amber-200" />
                                    <div className="text-[11px] [color:var(--pf-color-muted)] space-y-0.5">
                                      <p className="font-mono font-semibold">{bankInfo!.bank_account_number}</p>
                                      <p>{bankInfo!.bank_account_name}</p>
                                      <p className="text-amber-700 font-bold">{formatVND(needToPay)}</p>
                                      <p className="[color:var(--pf-color-muted)]">Quét QR để thanh toán</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => downloadQr(qr)}
                                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg min-h-11 text-xs font-semibold text-white [background:var(--pf-primary)] active:opacity-80">
                                      <Download size={13} />Tải QR
                                    </button>
                                    <button onClick={() => shareQr(qr, needToPay, period?.name ?? '')}
                                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg min-h-11 text-xs font-semibold border border-amber-300 text-amber-700 [background:var(--pf-surface)] active:bg-amber-50">
                                      <Share2 size={13} />Chia sẻ
                                    </button>
                                  </div>
                                </>
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
                        <p className="text-[11px] [color:var(--pf-color-muted)] text-right pt-1">Cập nhật: {formatDate(r.snapshotAt)}</p>
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
    <div className="flex-1 flex items-center justify-center [background:var(--pf-surface-muted)]">
      <div className="h-8 w-8 rounded-full border-2 [border-color:var(--pf-primary)] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <PageShell maxWidth={1200}>
      <PageHeader
        title="Phiếu Thu Cá Nhân"
        subtitle={memberName}
        actions={
          <ActionButton variant="secondary" icon={<Download size={15} />} onClick={handleExport}>
            Xuất PDF
          </ActionButton>
        }
      />

      <div ref={printRef} className="space-y-5">

        {/* QR Payment Banner — shown prominently when member has unpaid balance */}
        {(() => {
          const debt = debtReceipt ? n(debtReceipt.needToPay) : 0
          if (debt <= 0 || !bankInfo) return null
          const period = debtReceipt?.fundPeriod
          const qr = buildQrUrl(bankInfo, debt, `Dong quy ${period?.name ?? ''} - ${memberName}`)
          return (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              <div className="shrink-0">
                {qr
                  ? <img src={qr} alt="QR thanh toán" className="w-32 h-32 rounded-xl border-2 border-amber-300 [background:var(--pf-surface)] shadow-sm" />
                  : <div className="w-32 h-32 rounded-xl border-2 border-amber-200 [background:var(--pf-surface)] flex items-center justify-center"><QrCode size={40} className="text-amber-300" /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span className="text-sm font-bold text-amber-800">Còn nợ quỹ kỳ {period?.name}</span>
                </div>
                <p className="text-3xl font-extrabold text-amber-700 mb-2">{formatVND(debt)}</p>
                <div className="text-xs [color:var(--pf-color-muted)] space-y-0.5">
                  <p><span className="[color:var(--pf-color-muted)]">Ngân hàng:</span> <strong>{bankInfo.bank_code}</strong></p>
                  <p><span className="[color:var(--pf-color-muted)]">Số TK:</span> <span className="font-mono font-semibold">{bankInfo.bank_account_number}</span></p>
                  <p><span className="[color:var(--pf-color-muted)]">Tên TK:</span> {bankInfo.bank_account_name}</p>
                </div>
                <p className="text-xs [color:var(--pf-color-muted)] mt-2">Mở app ngân hàng → Quét mã QR → Kiểm tra số tiền → Chuyển khoản</p>
                {qr && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => downloadQr(qr)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 min-h-11 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] transition-colors">
                      <Download size={14} />Tải mã QR
                    </button>
                    <button onClick={() => shareQr(qr, debt, period?.name ?? '')}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 min-h-11 text-xs font-semibold border border-amber-300 text-amber-700 [background:var(--pf-surface)] hover:bg-amber-50 transition-colors">
                      <Share2 size={14} />Chia sẻ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Summary KPIs — MetricCard (đồng bộ tab Lịch sử đóng / Lịch tham gia / Công nợ) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Tổng đã đóng"
            value={formatVND(totalPaid)}
            sub={activePeriod ? `Kỳ ${activePeriod.name}` : undefined}
            accent="blue"
            icon={<DollarSign size={18} />}
          />
          <MetricCard
            label="Chi phí phân bổ"
            value={formatVND(totalCost)}
            sub="Tiền sân + sinh hoạt"
            accent="amber"
            icon={<TrendingUp size={18} />}
          />
          <MetricCard
            label="Số dư"
            value={`${netBalance >= 0 ? '+' : ''}${formatVND(netBalance)}`}
            sub={netBalance >= 0 ? 'Dư quỹ' : 'Còn thiếu'}
            accent="green"
            negative={netBalance < 0}
            icon={<Receipt size={18} />}
          />
        </div>

        {/* Kỳ hiện tại — số liệu LIVE (tạm tính) khi chưa có phiếu thu chính thức */}
        {!hasReceipts && live && activePeriod && (
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold [color:var(--pf-text)]">Kỳ hiện tại · {activePeriod.name}</h3>
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Tạm tính — đang diễn ra</span>
            </div>
            <div className="space-y-1.5">
              <LiveRow label="Đã tham gia" value={`${live.attendedSessions}/${live.totalSessions} buổi`} />
              <LiveRow label="Tiền sân (phân bổ)" value={formatVND(n(live.courtFee))} />
              <LiveRow label="Chi phí sinh hoạt" value={formatVND(n(live.livingFee))} />
              <LiveRow label="Tổng chi phí" value={formatVND(n(live.totalCost))} bold />
              <LiveRow label="Đã đóng" value={formatVND(n(live.paidAmount))} />
              <div className="flex justify-between pt-1.5 border-t border-[color:var(--pf-border)]">
                <span className="text-sm [color:var(--pf-color-muted)]">Số dư</span>
                <BalanceBadge val={n(live.balance)} />
              </div>
            </div>
          </div>
        )}

        {/* Receipt cards */}
        {displayReceipts.length === 0 ? (
          <div className="[background:var(--pf-surface)] rounded-xl border border-dashed border-[color:var(--pf-border)] py-16 text-center">
            <Receipt size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm [color:var(--pf-color-muted)] font-medium">Chưa có phiếu thu chính thức</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-1">Số liệu bên trên là tạm tính; phiếu thu chính thức được tạo sau khi kỳ quỹ kết thúc.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayReceipts.map(r => {
              const isExpanded = expanded === r.id
              const period = r.fundPeriod
              const bal = n(r.balance)
              const needToPay = n(r.needToPay)
              const amountPaid = n(r.amountPaid)
              const totalCostR = n(r.totalCost)

              return (
                <div key={r.id} className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] overflow-hidden">
                  {/* Header row */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:[background:var(--pf-surface-muted)] transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl [background:var(--pf-primary-soft)] flex items-center justify-center shrink-0">
                        <Calendar size={16} className="[color:var(--pf-primary)]" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold [color:var(--pf-text)]">
                            Kỳ {period?.name ?? r.fundPeriodId}
                          </p>
                          {r.fundPeriodId === activePeriod?.id && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs [color:var(--pf-color-muted)]">
                          {period ? `${formatDate(period.startDate)} – ${formatDate(period.endDate)}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs [color:var(--pf-color-muted)]">Số buổi tham gia</p>
                        <p className="text-sm font-semibold [color:var(--pf-text)]">{r.attendedSessions}/{r.totalSessions}</p>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <p className="text-xs [color:var(--pf-color-muted)]">Số dư</p>
                        <BalanceBadge val={bal} />
                      </div>
                      {needToPay > 0 && (
                        <Badge variant="orange">Còn nợ {formatVND(needToPay)}</Badge>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="[color:var(--pf-color-muted)]" /> : <ChevronDown size={16} className="[color:var(--pf-color-muted)]" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-[color:var(--pf-border)] px-5 py-4 space-y-3 [background:var(--pf-color-muted-soft)]">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div className="flex justify-between py-1.5 border-b border-[color:var(--pf-border)]">
                          <span className="[color:var(--pf-color-muted)]">Tiền sân (phân bổ)</span>
                          <span className="font-medium [color:var(--pf-text)]">{formatVND(n(r.courtCost))}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[color:var(--pf-border)]">
                          <span className="[color:var(--pf-color-muted)]">Chi phí sinh hoạt</span>
                          <span className="font-medium [color:var(--pf-text)]">{formatVND(n(r.livingCost))}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[color:var(--pf-border)]">
                          <span className="[color:var(--pf-color-muted)] font-semibold">Tổng chi phí</span>
                          <span className="font-bold [color:var(--pf-text)]">{formatVND(totalCostR)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[color:var(--pf-border)]">
                          <span className="[color:var(--pf-color-muted)] font-semibold">Đã đóng</span>
                          <span className="font-bold [color:var(--pf-primary)]">{formatVND(amountPaid)}</span>
                        </div>
                      </div>

                      {needToPay > 0 && (() => {
                        const qr = bankInfo ? buildQrUrl(bankInfo, needToPay, `Dong quy ${period?.name ?? ''} - ${memberName}`) : null
                        return (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-center gap-2 text-amber-700 mb-3">
                              <AlertCircle size={14} className="shrink-0" />
                              <span className="text-xs font-semibold">Còn thiếu <strong>{formatVND(needToPay)}</strong> — quét QR để thanh toán</span>
                            </div>
                            {qr ? (
                              <div className="flex gap-5 items-start">
                                <img src={qr} alt="QR thanh toán" className="w-36 h-36 rounded-lg border border-amber-200 [background:var(--pf-surface)]" />
                                <div className="text-xs [color:var(--pf-color-muted)] space-y-1">
                                  <p><span className="[color:var(--pf-color-muted)]">Ngân hàng:</span> {bankInfo!.bank_code}</p>
                                  <p><span className="[color:var(--pf-color-muted)]">Số TK:</span> <span className="font-mono font-semibold">{bankInfo!.bank_account_number}</span></p>
                                  <p><span className="[color:var(--pf-color-muted)]">Tên TK:</span> {bankInfo!.bank_account_name}</p>
                                  <p><span className="[color:var(--pf-color-muted)]">Số tiền:</span> <span className="font-bold text-amber-700">{formatVND(needToPay)}</span></p>
                                  <p className="[color:var(--pf-color-muted)] pt-1">Mở app ngân hàng → Quét QR → Kiểm tra số tiền → Chuyển</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 [color:var(--pf-color-muted)] text-xs">
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

                      <p className="text-[11px] [color:var(--pf-color-muted)] text-right">
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
    </PageShell>
  )
}
