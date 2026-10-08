/**
 * SuperPayments (Super Admin) — Thanh toán gói dịch vụ của các CLB: lịch sử (mọi cổng + ghi nhận thủ công),
 * tổng hợp doanh thu, ghi nhận gia hạn thủ công, hủy bản ghi nhập nhầm.
 */
import { useCallback, useEffect, useState } from 'react'
import { Plus, Wallet, CalendarDays, Receipt, Landmark, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageShell, PageHeader, FilterBar, DataTable, StatusBadge, MetricCard, LoadingState, EmptyState, ErrorState, type Column } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { RecordPlanPaymentModal, type ClubOption } from '../../components/super/RecordPlanPaymentModal'
import { formatVND } from '../../lib/utils'

interface Row {
  orderCode: string; club: { id: string; name: string; code: string }; planTier: string; billingCycle: string; months: number | null
  amount: number; gateway: string; method: string | null; reference: string | null; note: string | null; paidAt: string | null; invoiceNumber: string | null
}
interface Summary { total: number; count: number; thisMonthTotal: number; thisMonthCount: number; byGateway: { gateway: string; total: number; count: number }[] }

const PLAN: Record<string, string> = { STARTER: 'Starter', PRO: 'Pro', CLUB_PLUS: 'Enterprise' }
const METHOD: Record<string, string> = { BANK_TRANSFER: 'Chuyển khoản', CASH: 'Tiền mặt', EWALLET: 'Ví điện tử', OTHER: 'Khác' }
const channel = (r: Row) => (r.gateway === 'MANUAL' ? `Thủ công · ${METHOD[r.method ?? ''] ?? '—'}` : r.gateway === 'MOCK' ? 'Sandbox' : r.gateway)

export function SuperPayments() {
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [clubs, setClubs] = useState<ClubOption[]>([])
  const [clubId, setClubId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const [toVoid, setToVoid] = useState<Row | null>(null)
  const [voiding, setVoiding] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    api.get('/billing/manual-payments', { params: clubId ? { clubId } : {} })
      .then((r) => { setRows(r.data?.data?.items ?? []); setSummary(r.data?.data?.summary ?? null) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clubId])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/clubs', { params: { limit: 200 } })
      .then((r) => setClubs((r.data?.data ?? []).map((c: any) => ({ id: c.id, name: c.name, plan: c.plan, planExpiresAt: c.planExpiresAt }))))
      .catch(() => setClubs([]))
  }, [open])

  const q = search.trim().toLowerCase()
  const filtered = q ? rows.filter((r) => `${r.club.name} ${r.club.code} ${r.orderCode} ${r.reference ?? ''} ${r.note ?? ''}`.toLowerCase().includes(q)) : rows
  const manualTotal = summary?.byGateway.find((g) => g.gateway === 'MANUAL')

  const doVoid = async () => {
    if (!toVoid) return
    setVoiding(true)
    try {
      await api.post(`/billing/manual-payments/${toVoid.orderCode}/void`)
      toast.success('Đã hủy ghi nhận')
      setToVoid(null)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Hủy thất bại')
    } finally { setVoiding(false) }
  }

  const columns: Column<Row>[] = [
    { key: 'paid', header: 'Ngày thu', className: 'whitespace-nowrap text-xs [color:var(--pf-color-muted)]', render: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleDateString('vi-VN') : '—') },
    { key: 'club', header: 'CLB', render: (r) => <div><p className="font-medium [color:var(--pf-text)]">{r.club.name}</p><p className="text-xs [color:var(--pf-color-muted)]">{r.club.code}</p></div> },
    { key: 'plan', header: 'Gói', align: 'center', render: (r) => <StatusBadge tone="ai">{PLAN[r.planTier] ?? r.planTier}{r.months ? ` · ${r.months} th` : r.billingCycle === 'YEARLY' ? ' · năm' : ' · tháng'}</StatusBadge> },
    { key: 'amount', header: 'Số tiền', align: 'right', className: 'font-semibold tabular-nums', render: (r) => formatVND(r.amount) },
    { key: 'ch', header: 'Kênh', className: 'text-xs [color:var(--pf-color-muted)]', render: channel },
    { key: 'ref', header: 'Mã GD / Ghi chú', className: 'text-xs [color:var(--pf-color-muted)]', render: (r) => [r.reference, r.note].filter(Boolean).join(' · ') || r.orderCode },
    {
      key: 'act', header: '', align: 'center',
      render: (r) => r.gateway === 'MANUAL' ? (
        <button onClick={() => setToVoid(r)} title="Hủy ghi nhận (nhập nhầm)" aria-label="Hủy ghi nhận" className="inline-flex h-7 w-7 items-center justify-center rounded-md [color:var(--pf-color-muted)] hover:bg-red-50 hover:text-red-500"><Ban size={14} /></button>
      ) : null,
    },
  ]

  return (
    <PageShell maxWidth={1760}>
      <PageHeader
        title="Thanh toán gói dịch vụ"
        subtitle="Ghi nhận & theo dõi chi phí sử dụng nền tảng của các CLB"
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} />Ghi nhận thanh toán</Button>}
      />

      <div className="pf-kpi-row mb-4">
        <MetricCard compact icon={<Wallet size={16} />} label="Tổng thu" value={formatVND(summary?.total ?? 0)} sub={`${summary?.count ?? 0} giao dịch`} />
        <MetricCard compact icon={<CalendarDays size={16} />} label="Tháng này" value={formatVND(summary?.thisMonthTotal ?? 0)} sub={`${summary?.thisMonthCount ?? 0} giao dịch`} />
        <MetricCard compact icon={<Landmark size={16} />} label="Ghi nhận thủ công" value={formatVND(manualTotal?.total ?? 0)} sub={`${manualTotal?.count ?? 0} giao dịch`} />
        <MetricCard compact icon={<Receipt size={16} />} label="TB / giao dịch" value={formatVND(summary && summary.count ? Math.round(summary.total / summary.count) : 0)} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterBar className="flex-1" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Tìm CLB, mã giao dịch, ghi chú…" />
        <select value={clubId} onChange={(e) => setClubId(e.target.value)} aria-label="Lọc theo CLB"
          className="h-10 rounded-full border px-3 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]">
          <option value="">Tất cả CLB</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="pf-glass rounded-[16px] p-2">
        {loading ? <LoadingState variant="table" rows={6} />
          : error ? <ErrorState onRetry={load} />
          : filtered.length === 0 ? <EmptyState icon={<Receipt size={24} />} title="Chưa có thanh toán" description="Bấm “Ghi nhận thanh toán” để ghi nhận khoản gia hạn gói của CLB." />
          : <DataTable className="pf-compact-table" columns={columns} rows={filtered} rowKey={(r) => r.orderCode} />}
      </div>

      <RecordPlanPaymentModal open={open} onClose={() => setOpen(false)} clubs={clubs} onDone={load} />
      <ConfirmDialog
        open={!!toVoid}
        variant="danger"
        title="Hủy ghi nhận thanh toán?"
        message={`Hủy khoản ${toVoid ? formatVND(toVoid.amount) : ''} của "${toVoid?.club.name ?? ''}"? Khoản này sẽ không còn tính vào doanh thu. Hạn gói của CLB KHÔNG tự đổi — chỉnh ở màn Quản lý CLB nếu cần.`}
        confirmLabel={voiding ? 'Đang hủy…' : 'Hủy ghi nhận'}
        cancelLabel="Giữ lại"
        onCancel={() => setToVoid(null)}
        onConfirm={doVoid}
      />
    </PageShell>
  )
}
