import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { DollarSign, CheckCircle, Clock, Search, Receipt, ChevronDown, ChevronUp, FileSpreadsheet, FileText, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { PageShell, PageHeader, MetricCard, ChartCard, DataTable, StatusBadge, ExportActions, ActionButton, type Column } from '../../components/shared'
import { ReportPaymentModal } from '../../components/member/ReportPaymentModal'
import { useAuthStore } from '../../store/authStore'
import { useMemberPortal } from '../../hooks/useMemberPortal'
import { formatDate, formatVND } from '../../lib/utils'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import api from '../../lib/api'

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

interface ReportedPayment {
  id: string
  amount: number
  description: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | string
  reportedByMember: boolean
  memberNote: string | null
  recheckNote: string | null
  proofUrl: string | null
  createdAt: string
  confirmedAt: string | null
}

function toNum(v: string | number | null | undefined): number {
  return v == null ? 0 : typeof v === 'number' ? v : Number(v)
}

/** Map trạng thái Payment → nhãn + tone StatusBadge. */
function paymentStatusMeta(s: string): { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' } {
  if (s === 'PENDING') return { label: 'Chờ Admin xác nhận', tone: 'warning' }
  if (s === 'CONFIRMED') return { label: 'Đã xác nhận', tone: 'success' }
  if (s === 'CANCELLED') return { label: 'Cần kiểm tra lại', tone: 'danger' }
  return { label: s, tone: 'neutral' }
}

export function MemberContributions() {
  const { user, accessToken } = useAuthStore()
  // Chỉ dùng dữ liệu self-scope từ JWT (/member/me/*) — không đọc store club-wide.
  const { finance, attendance, contributions } = useMemberPortal()

  const memberName =
    finance?.member?.memberName ?? attendance?.memberName ?? user?.username ?? 'Thành viên'
  const activePeriod = finance?.period ?? null

  const [search, setSearch] = useState('')
  const [receipts, setReceipts] = useState<PersonalReceipt[]>([])
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [myPayments, setMyPayments] = useState<ReportedPayment[]>([])

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')

  const loadPayments = () => {
    if (isLocal) return
    api.get('/member/me/payments').then(res => {
      setMyPayments(res.data?.data ?? [])
    }).catch(() => {})
  }

  useEffect(() => {
    if (isLocal) return
    api.get('/personal-receipts/mine').then(res => {
      setReceipts(res.data?.data ?? [])
    }).catch(() => {})
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isLocal])

  const filtered = contributions.filter(c =>
    !search || (c.periodName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // "Tổng đã đóng" = CHỈ khoản đã xác nhận (khớp "Đã Đóng Quỹ" ở Tổng quan; khoản chờ xác nhận
  // chưa tính là đã đóng). Trước đây cộng cả khoản chưa xác nhận → lệch với Dashboard.
  const totalPaid = contributions.reduce((s, c) => s + (c.isConfirmed ? c.amount : 0), 0)
  const confirmedCount = contributions.filter(c => c.isConfirmed).length
  const pendingCount = contributions.filter(c => !c.isConfirmed).length

  const isMobile = useIsMobile()

  // Mục "Khoản đã báo nộp" — đóng vòng lặp báo→duyệt→báo lại (dùng chung mobile + desktop).
  const reportedSection = myPayments.length > 0 && (
    <div className="[background:var(--pf-surface)] rounded-2xl border border-[color:var(--pf-border)] shadow-[var(--pf-shadow)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Send size={15} className="[color:var(--pf-primary)]" />
        <span className="text-[14px] font-bold [color:var(--pf-text)]">Khoản bạn đã báo nộp</span>
      </div>
      <div className="space-y-2">
        {myPayments.map((p) => {
          const meta = paymentStatusMeta(p.status)
          return (
            <div key={p.id} className="rounded-xl border border-[color:var(--pf-border)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold [color:var(--pf-text)]">{formatVND(toNum(p.amount))}</span>
                <StatusBadge tone={meta.tone} dot>{meta.label}</StatusBadge>
              </div>
              <p className="mt-0.5 text-[11.5px] [color:var(--pf-color-muted)]">{formatDate(p.createdAt)}</p>
              {p.status === 'CANCELLED' && p.recheckNote && (
                <p className="mt-1.5 text-[12.5px] [color:var(--pf-color-danger)]">Admin yêu cầu kiểm tra lại: {p.recheckNote}</p>
              )}
              {p.status === 'CANCELLED' && (
                <button onClick={() => setReportOpen(true)}
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white active:scale-[0.98] [background:var(--pf-primary)]">
                  <Send size={14} /> Báo nộp lại
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  const memberSlug = memberName.replace(/\s/g, '_')
  const doExportExcel = () => {
    exportGenericExcel('Dong_quy_' + memberSlug, 'Đóng quỹ',
      ['Kỳ quỹ', 'Ngày đóng', 'Số tiền (VNĐ)', 'Hình thức', 'Trạng thái'],
      filtered.map((c) => [c.periodName ?? 'Kỳ quỹ', formatDate(c.paymentDate), c.amount, c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt', c.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận']),
    )
    toast.success('Đã xuất Excel lịch sử đóng quỹ')
  }
  const doExportPdf = () => {
    exportGenericTablePDF({
      fileBase: 'Dong_quy_' + memberSlug,
      title: 'Lịch Sử Đóng Quỹ',
      subtitle: memberName,
      metaLeft: `${filtered.length} khoản · Đã xác nhận ${confirmedCount}`,
      columns: [
        { header: 'Kỳ quỹ' }, { header: 'Ngày đóng', align: 'center' }, { header: 'Số tiền', align: 'right' },
        { header: 'Hình thức', align: 'center' }, { header: 'Trạng thái', align: 'center' },
      ],
      rows: filtered.map((c) => [c.periodName ?? 'Kỳ quỹ', formatDate(c.paymentDate), formatVND(c.amount), c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt', c.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận']),
      summaryLabel: 'Tổng đã đóng (đã xác nhận)',
      summaryValue: formatVND(totalPaid),
    })
    toast.success('Đã xuất PDF lịch sử đóng quỹ')
  }

  if (isMobile) {
    return (
      <div className="min-h-full [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[17px] font-[800] [color:var(--pf-text)]">Lịch Sử Đóng Quỹ</div>
            <div className="text-[12px] [color:var(--pf-color-muted)] truncate">{memberName}</div>
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={doExportExcel} aria-label="Xuất Excel"
                className="inline-flex h-11 items-center gap-1 rounded-[10px] px-2.5 text-[11px] font-semibold [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] active:[background:var(--pf-border)]">
                <FileSpreadsheet size={14} />Excel
              </button>
              <button onClick={doExportPdf} aria-label="Xuất PDF"
                className="inline-flex h-11 items-center gap-1 rounded-[10px] px-2.5 text-[11px] font-semibold [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] active:[background:var(--pf-border)]">
                <FileText size={14} />PDF
              </button>
            </div>
          )}
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-bold text-white active:scale-[0.98]"
            style={{ background: 'var(--pf-primary)' }}
          >
            <Send size={17} /> Báo đã nộp quỹ
          </button>
          {reportedSection}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tổng đóng', value: formatVND(totalPaid), color: '[color:var(--pf-primary)]' },
              { label: 'Xác nhận', value: `${confirmedCount}`, color: 'text-emerald-600' },
              { label: 'Chờ', value: `${pendingCount}`, color: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="[background:var(--pf-surface)] rounded-[14px] border border-[color:var(--pf-border)] p-3 text-center shadow-sm">
                <div className={`text-[15px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[11px] [color:var(--pf-color-muted)] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo kỳ quỹ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] [background:var(--pf-surface)] border border-[color:var(--pf-border)] text-[14px] outline-none focus:[border-color:var(--pf-primary)]" />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-[14px]">Chưa có khoản đóng quỹ nào</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                return (
                  <div key={c.id} className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[15px] font-[700] [color:var(--pf-text)]">{c.periodName ?? 'Kỳ quỹ'}</span>
                      {c.isConfirmed ? <Badge variant="green" dot>Xác nhận</Badge> : <Badge variant="yellow" dot>Chờ</Badge>}
                    </div>
                    <div className="text-[12px] [color:var(--pf-color-muted)] mb-2">{formatDate(c.paymentDate)} · {c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
                    <div className="text-[17px] font-[800] text-emerald-600">{formatVND(c.amount)}</div>
                  </div>
                )
              })}
            </div>
          )}
          {receipts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Receipt size={14} className="[color:var(--pf-color-muted)]" /><span className="text-[13px] font-[700] [color:var(--pf-text)]">Sao Kê Đã Chốt</span>
              </div>
              {receipts.map(r => {
                const bal = toNum(r.balance)
                const isExp = expandedReceipt === r.id
                return (
                  <div key={r.id} className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
                    <button onClick={() => setExpandedReceipt(isExp ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 active:[background:var(--pf-surface-muted)]">
                      <div className="text-left">
                        <div className="text-[14px] font-[700] [color:var(--pf-text)]">{r.fundPeriod?.name ?? 'Kỳ đã chốt'}</div>
                        <div className="text-[11px] [color:var(--pf-color-muted)]">{r.attendedSessions}/{r.totalSessions} buổi</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-[700] ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {bal >= 0 ? '+' : ''}{formatVND(bal)}
                        </span>
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="border-t border-[color:var(--pf-border)] px-4 py-3 [background:var(--pf-color-muted-soft)] space-y-1.5 text-[12px]">
                        {[['Đã đóng quỹ', toNum(r.amountPaid), 'text-emerald-600'], ['Chi phí sân', toNum(r.courtCost), ''], ['Chi phí SH', toNum(r.livingCost), ''], ['Tổng chi phí', toNum(r.totalCost), '']].map(([lbl, val, cls]) => (
                          <div key={lbl as string} className="flex justify-between">
                            <span className="[color:var(--pf-color-muted)]">{lbl}</span>
                            <span className={`font-[600] [color:var(--pf-text)] ${cls}`}>{formatVND(val as number)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <ReportPaymentModal open={reportOpen} onClose={() => setReportOpen(false)} onReported={loadPayments} />
      </div>
    )
  }

  // DataTable columns — cùng design system Admin, read-only.
  type ContribRow = (typeof contributions)[number]
  const contribColumns: Column<ContribRow>[] = [
    { key: 'period', header: 'Kỳ quỹ', render: (c) => <span className="font-medium [color:var(--pf-text)]">{c.periodName ?? 'Kỳ quỹ'}</span> },
    { key: 'date', header: 'Ngày đóng', align: 'center', render: (c) => <span className="text-xs [color:var(--pf-color-muted)]">{formatDate(c.paymentDate)}</span> },
    { key: 'amount', header: 'Số tiền', align: 'right', render: (c) => <span className="font-semibold text-emerald-600">{formatVND(c.amount)}</span> },
    { key: 'method', header: 'Hình thức', align: 'center', render: (c) => <StatusBadge tone="neutral">{c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</StatusBadge> },
    { key: 'status', header: 'Trạng thái', align: 'center', render: (c) => <StatusBadge tone={c.isConfirmed ? 'success' : 'warning'} dot>{c.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}</StatusBadge> },
  ]

  return (
    <PageShell>
      <PageHeader title="Lịch Sử Đóng Quỹ" subtitle={memberName}
        actions={
          <div className="flex items-center gap-2">
            <ActionButton variant="primary" onClick={() => setReportOpen(true)}><Send size={15} /> Báo đã nộp quỹ</ActionButton>
            {filtered.length > 0 && <ExportActions onExcel={doExportExcel} onPdf={doExportPdf} />}
          </div>
        }
      />

      {/* KPI — MetricCard giống Admin */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Tổng đã đóng" value={formatVND(totalPaid)} sub={`${contributions.length} khoản`} accent="blue" icon={<DollarSign size={18} />} />
        <MetricCard label="Đã xác nhận" value={`${confirmedCount} khoản`} sub={formatVND(contributions.filter(c => c.isConfirmed).reduce((s, c) => s + c.amount, 0))} accent="green" icon={<CheckCircle size={18} />} />
        <MetricCard label="Chờ xác nhận" value={`${pendingCount} khoản`} sub={activePeriod ? `Kỳ ${activePeriod.name}` : 'Không có kỳ mở'} accent="amber" icon={<Clock size={18} />} />
      </div>

      {reportedSection}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo kỳ quỹ..."
          className="input-base pl-9"
        />
      </div>

      {/* Bảng đóng quỹ — DataTable, read-only */}
      <ChartCard title="Các khoản đóng quỹ" subtitle={`${filtered.length} khoản`}>
        <DataTable columns={contribColumns} rows={filtered} rowKey={(c) => c.id} emptyText="Chưa có khoản đóng quỹ nào" />
      </ChartCard>

      {/* Sao kê kỳ đã chốt */}
      {receipts.length > 0 && (
        <ChartCard title="Sao Kê Kỳ Đã Chốt" subtitle={`${receipts.length} kỳ`} actions={<Receipt size={16} className="[color:var(--pf-color-muted)]" />}>
          <div className="space-y-2">
              {receipts.map(r => {
                const balance = toNum(r.balance)
                const isExpanded = expandedReceipt === r.id
                return (
                  <div key={r.id} className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] overflow-hidden">
                    <button
                      onClick={() => setExpandedReceipt(isExpanded ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:[background:var(--pf-surface-muted)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className="text-left">
                          <p className="text-sm font-semibold [color:var(--pf-text)]">
                            {r.fundPeriod?.name ?? 'Kỳ đã chốt'}
                          </p>
                          <p className="text-xs [color:var(--pf-color-muted)]">
                            Chốt ngày {formatDate(r.snapshotAt)} · {r.attendedSessions}/{r.totalSessions} buổi
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {balance >= 0 ? '+' : ''}{formatVND(balance)}
                          </p>
                          <p className="text-xs [color:var(--pf-color-muted)]">
                            {balance >= 0 ? 'Dư quỹ' : 'Còn nợ'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="[color:var(--pf-color-muted)]" /> : <ChevronDown size={14} className="[color:var(--pf-color-muted)]" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[color:var(--pf-border)] px-4 py-3 [background:var(--pf-color-muted-soft)]">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="[color:var(--pf-color-muted)]">Đã đóng quỹ</span>
                            <span className="font-semibold text-emerald-600">{formatVND(toNum(r.amountPaid))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="[color:var(--pf-color-muted)]">Chi phí sân</span>
                            <span className="font-semibold [color:var(--pf-text)]">{formatVND(toNum(r.courtCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="[color:var(--pf-color-muted)]">Chi phí sinh hoạt</span>
                            <span className="font-semibold [color:var(--pf-text)]">{formatVND(toNum(r.livingCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="[color:var(--pf-color-muted)]">Tổng chi phí</span>
                            <span className="font-semibold [color:var(--pf-text)]">{formatVND(toNum(r.totalCost))}</span>
                          </div>
                          {toNum(r.needToPay) > 0 && (
                            <div className="col-span-2 flex justify-between border-t border-[color:var(--pf-border)] pt-2 mt-1">
                              <span className="text-red-600 font-medium">Cần nộp thêm</span>
                              <span className="font-bold text-red-600">{formatVND(toNum(r.needToPay))}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </ChartCard>
      )}
      <ReportPaymentModal open={reportOpen} onClose={() => setReportOpen(false)} onReported={loadPayments} />
    </PageShell>
  )
}
