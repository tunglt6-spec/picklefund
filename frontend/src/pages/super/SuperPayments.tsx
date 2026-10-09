/**
 * SuperPayments (Super Admin) — Thanh toán gói dịch vụ của các CLB: lịch sử (mọi cổng + ghi nhận thủ công),
 * tổng hợp doanh thu, ghi nhận gia hạn thủ công, hủy bản ghi nhập nhầm.
 */
import { useCallback, useEffect, useState } from 'react'
import { Plus, Wallet, CalendarDays, Receipt, Landmark, Ban, Check, X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageShell, PageHeader, FilterBar, DataTable, StatusBadge, MetricCard, LoadingState, EmptyState, ErrorState, type Column } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { confirmDialog, promptDialog } from '../../components/ui/ConfirmHost'
import { RecordPlanPaymentModal, type ClubOption } from '../../components/super/RecordPlanPaymentModal'
import { formatVND } from '../../lib/utils'

interface Row {
  orderCode: string; club: { id: string; name: string; code: string }; planTier: string; billingCycle: string; months: number | null
  amount: number; gateway: string; method: string | null; reference: string | null; note: string | null; paidAt: string | null; invoiceNumber: string | null
}
interface Pending { orderCode: string; club: { id: string; name: string; code: string }; planTier: string; months: number | null; amount: number; method: string | null; reference: string | null; note: string | null; paidAt: string | null; createdAt: string }
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
  const [pending, setPending] = useState<Pending[]>([])
  const [pendingError, setPendingError] = useState(false)
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, number>>({})

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    api.get('/billing/manual-payments', { params: clubId ? { clubId } : {} })
      .then((r) => { setRows(r.data?.data?.items ?? []); setSummary(r.data?.data?.summary ?? null) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clubId])
  const loadPending = useCallback(() => {
    setPendingError(false)
    api.get('/billing/manual-payments/pending').then((r) => setPending(r.data?.data ?? [])).catch(() => { setPending([]); setPendingError(true) })
  }, [])
  useEffect(() => { load(); loadPending() }, [load, loadPending])
  const act = async (code: string, kind: 'confirm' | 'reject') => {
    const row = pending.find((x) => x.orderCode === code)
    const claimed = row?.amount
    const real = amounts[code] ?? claimed ?? 0
    let reason: string | undefined
    if (kind === 'confirm') {
      if (!(real > 0)) { toast.error('Số tiền thực nhận phải lớn hơn 0'); return }
      const ok = await confirmDialog({
        title: 'Xác nhận đã nhận tiền?',
        message: `Xác nhận ${formatVND(real)} từ "${row?.club.name ?? ''}" và gia hạn gói ${PLAN[row?.planTier ?? ''] ?? ''} ${row?.months ?? ''} tháng. Gói của CLB sẽ có hiệu lực ngay.`,
        confirmLabel: 'Xác nhận',
      })
      if (!ok) return
    } else {
      const r = await promptDialog('Từ chối yêu cầu', 'Lý do từ chối (không bắt buộc)', 'VD: Chưa nhận được tiền')
      if (r === null || r === undefined) return
      reason = String(r).trim() || undefined
    }
    setBusyCode(code)
    try {
      await api.post(`/billing/manual-payments/${code}/${kind}`, kind === 'confirm' ? (real !== claimed ? { amount: real } : {}) : { reason })
      toast.success(kind === 'confirm' ? 'Đã xác nhận — gói của CLB đã được gia hạn' : 'Đã từ chối yêu cầu')
      load(); loadPending()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Xử lý thất bại')
    } finally { setBusyCode(null) }
  }

  useEffect(() => {
    api.get('/clubs', { params: { limit: 500 } })
      .then((r) => setClubs((r.data?.data?.clubs ?? r.data?.data ?? []).map((c: any) => ({ id: c.id, name: c.name, plan: c.plan, planExpiresAt: c.planExpiresAt }))))
      .catch(() => { setClubs([]); toast.error('Không tải được danh sách CLB cho bộ lọc') })
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
        <button onClick={() => setToVoid(r)} title="Hủy ghi nhận (nhập nhầm)" aria-label="Hủy ghi nhận" className="inline-flex h-7 w-7 items-center justify-center rounded-md [color:var(--pf-color-muted)] hover:[background:var(--pf-color-danger-soft)] hover:[color:var(--pf-color-danger)]"><Ban size={14} /></button>
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

      {pendingError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm [border-color:var(--pf-color-warning)] [background:var(--pf-color-warning-soft)] [color:var(--pf-text)]">
          <span>Không tải được danh sách yêu cầu chờ xác nhận — có thể đang thiếu khoản cần duyệt.</span>
          <button onClick={loadPending} className="shrink-0 font-semibold [color:var(--pf-primary-text)]">Thử lại</button>
        </div>
      )}
      {pending.length > 0 && (
        <div className="pf-glass mb-4 rounded-[16px] p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold [color:var(--pf-text)]"><Clock size={16} className="[color:var(--pf-color-warning)]" />Chờ xác nhận ({pending.length}) — CLB báo đã chuyển khoản</p>
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.orderCode} className="grid grid-cols-1 items-center gap-3 rounded-xl border px-4 py-3 [border-color:var(--pf-border)] [background:var(--pf-surface)] md:grid-cols-[minmax(0,1fr)_210px_220px]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold [color:var(--pf-text)]">{r.club.name} · {PLAN[r.planTier] ?? r.planTier} {r.months ? `${r.months} tháng` : ''}</p>
                  <p className="mt-0.5 truncate text-xs [color:var(--pf-color-muted)]">{METHOD[r.method ?? ''] ?? '—'}{r.reference ? ` · ${r.reference}` : ''}{r.note ? ` · ${r.note}` : ''} · ngày chuyển {r.paidAt ? new Date(r.paidAt).toLocaleDateString('vi-VN') : '—'}</p>
                  {amounts[r.orderCode] != null && amounts[r.orderCode] !== r.amount && (
                    <p className="mt-0.5 text-[11px] [color:var(--pf-color-warning)]">CLB khai {formatVND(r.amount)}</p>
                  )}
                </div>
                <div>
                  <label htmlFor={`amt-${r.orderCode}`} className="mb-1 block text-[10px] font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">Số tiền thực nhận (đ)</label>
                  <input
                    id={`amt-${r.orderCode}`}
                    type="number"
                    min={0}
                    value={amounts[r.orderCode] ?? r.amount}
                    onChange={(e) => setAmounts((m) => ({ ...m, [r.orderCode]: Math.max(0, Number(e.target.value) || 0) }))}
                    className="h-10 w-full rounded-xl border px-3 text-right text-sm font-bold tabular-nums [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] focus:outline-none focus:[border-color:var(--pf-primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:self-end">
                  <button disabled={busyCode === r.orderCode} onClick={() => act(r.orderCode, 'confirm')} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--pf-primary)' }}><Check size={15} />Xác nhận</button>
                  <button disabled={busyCode === r.orderCode} onClick={() => act(r.orderCode, 'reject')} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold [color:var(--pf-color-danger)] border-[color:var(--pf-border)] disabled:opacity-50"><X size={15} />Từ chối</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
