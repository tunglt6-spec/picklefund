import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { DollarSign, CheckCircle, Clock, Search, Receipt, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { PageShell, PageHeader, MetricCard, ChartCard, DataTable, StatusBadge, type Column } from '../../components/shared'
import { useAuthStore } from '../../store/authStore'
import { useMemberPortal } from '../../hooks/useMemberPortal'
import { formatDate, formatVND } from '../../lib/utils'
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

function toNum(v: string | number | null | undefined): number {
  return v == null ? 0 : typeof v === 'number' ? v : Number(v)
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

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')

  useEffect(() => {
    if (isLocal) return
    api.get('/personal-receipts/mine').then(res => {
      setReceipts(res.data?.data ?? [])
    }).catch(() => {})
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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
          <div className="text-[17px] font-[800] text-slate-900">Lịch Sử Đóng Quỹ</div>
          <div className="text-[12px] text-slate-400">{memberName}</div>
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tổng đóng', value: formatVND(totalPaid), color: '[color:var(--pf-primary)]' },
              { label: 'Xác nhận', value: `${confirmedCount}`, color: 'text-emerald-600' },
              { label: 'Chờ', value: `${pendingCount}`, color: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                <div className={`text-[15px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo kỳ quỹ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] bg-white border border-slate-200 text-[14px] outline-none focus:[border-color:var(--pf-primary)]" />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-[14px]">Chưa có khoản đóng quỹ nào</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                return (
                  <div key={c.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[15px] font-[700] text-slate-900">{c.periodName ?? 'Kỳ quỹ'}</span>
                      {c.isConfirmed ? <Badge variant="green" dot>Xác nhận</Badge> : <Badge variant="yellow" dot>Chờ</Badge>}
                    </div>
                    <div className="text-[12px] text-slate-500 mb-2">{formatDate(c.paymentDate)} · {c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
                    <div className="text-[17px] font-[800] text-emerald-600">{formatVND(c.amount)}</div>
                  </div>
                )
              })}
            </div>
          )}
          {receipts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Receipt size={14} className="text-slate-500" /><span className="text-[13px] font-[700] text-slate-700">Sao Kê Đã Chốt</span>
              </div>
              {receipts.map(r => {
                const bal = toNum(r.balance)
                const isExp = expandedReceipt === r.id
                return (
                  <div key={r.id} className="bg-white rounded-[16px] border border-slate-100 shadow-sm overflow-hidden">
                    <button onClick={() => setExpandedReceipt(isExp ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50">
                      <div className="text-left">
                        <div className="text-[14px] font-[700] text-slate-800">{r.fundPeriod?.name ?? 'Kỳ đã chốt'}</div>
                        <div className="text-[11px] text-slate-400">{r.attendedSessions}/{r.totalSessions} buổi</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-[700] ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {bal >= 0 ? '+' : ''}{formatVND(bal)}
                        </span>
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-1.5 text-[12px]">
                        {[['Đã đóng quỹ', toNum(r.amountPaid), 'text-emerald-600'], ['Chi phí sân', toNum(r.courtCost), ''], ['Chi phí SH', toNum(r.livingCost), ''], ['Tổng chi phí', toNum(r.totalCost), '']].map(([lbl, val, cls]) => (
                          <div key={lbl as string} className="flex justify-between">
                            <span className="text-slate-500">{lbl}</span>
                            <span className={`font-[600] text-slate-700 ${cls}`}>{formatVND(val as number)}</span>
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
    <PageShell maxWidth={1200}>
      <PageHeader title="Lịch Sử Đóng Quỹ" subtitle={memberName} />

      {/* KPI — MetricCard giống Admin */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Tổng đã đóng" value={formatVND(totalPaid)} sub={`${contributions.length} khoản`} accent="blue" icon={<DollarSign size={18} />} />
        <MetricCard label="Đã xác nhận" value={`${confirmedCount} khoản`} sub={formatVND(contributions.filter(c => c.isConfirmed).reduce((s, c) => s + c.amount, 0))} accent="green" icon={<CheckCircle size={18} />} />
        <MetricCard label="Chờ xác nhận" value={`${pendingCount} khoản`} sub={activePeriod ? `Kỳ ${activePeriod.name}` : 'Không có kỳ mở'} accent="amber" icon={<Clock size={18} />} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                  <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
                    <button
                      onClick={() => setExpandedReceipt(isExpanded ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-800">
                            {r.fundPeriod?.name ?? 'Kỳ đã chốt'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Chốt ngày {formatDate(r.snapshotAt)} · {r.attendedSessions}/{r.totalSessions} buổi
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {balance >= 0 ? '+' : ''}{formatVND(balance)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {balance >= 0 ? 'Dư quỹ' : 'Còn nợ'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Đã đóng quỹ</span>
                            <span className="font-semibold text-emerald-600">{formatVND(toNum(r.amountPaid))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Chi phí sân</span>
                            <span className="font-semibold text-slate-700">{formatVND(toNum(r.courtCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Chi phí sinh hoạt</span>
                            <span className="font-semibold text-slate-700">{formatVND(toNum(r.livingCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tổng chi phí</span>
                            <span className="font-semibold text-slate-700">{formatVND(toNum(r.totalCost))}</span>
                          </div>
                          {toNum(r.needToPay) > 0 && (
                            <div className="col-span-2 flex justify-between border-t border-slate-200 pt-2 mt-1">
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
    </PageShell>
  )
}
