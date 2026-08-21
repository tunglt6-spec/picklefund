import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock, RotateCcw, Wallet, ExternalLink, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell, PageHeader, MetricCard, EmptyState, LoadingState, ErrorState, StatusBadge, ActionButton } from '../../components/shared'
import { Modal } from '../../components/ui/Modal'
import api from '../../lib/api'
import { formatVND, formatDate } from '../../lib/utils'

interface PaymentRow {
  id: string
  amount: string | number
  description: string
  status: string
  reportedByMember: boolean
  memberNote: string | null
  recheckNote: string | null
  proofUrl: string | null
  createdAt: string
  member?: { fullName: string; phone?: string | null }
}

interface Stats {
  pendingCount: number
  confirmedCount: number
  confirmedAmount: string | number
  totalCount: number
}

export function PaymentApprovals() {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [recheck, setRecheck] = useState<PaymentRow | null>(null)
  const [recheckNote, setRecheckNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [list, st] = await Promise.all([
        api.get('/payments', { params: { status: 'PENDING', limit: 100 } }),
        api.get('/payments/stats'),
      ])
      setRows(list.data?.data?.items ?? [])
      setStats(st.data?.data ?? null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const confirm = async (id: string) => {
    setBusyId(id)
    try {
      await api.patch(`/payments/${id}/confirm`)
      toast.success('Đã xác nhận đã nhận tiền')
      setRows((r) => r.filter((x) => x.id !== id))
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Xác nhận thất bại')
    } finally {
      setBusyId(null)
    }
  }

  const doRecheck = async () => {
    if (!recheck) return
    setBusyId(recheck.id)
    try {
      await api.patch(`/payments/${recheck.id}/recheck`, { note: recheckNote || undefined })
      toast.success('Đã yêu cầu thành viên kiểm tra lại')
      setRows((r) => r.filter((x) => x.id !== recheck.id))
      setRecheck(null)
      setRecheckNote('')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Thao tác thất bại')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageShell maxWidth={1100}>
      <PageHeader title="Xác Nhận Nộp Quỹ" subtitle="Duyệt các khoản thành viên báo đã chuyển khoản" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Chờ xác nhận" value={`${stats?.pendingCount ?? 0}`} accent="amber" icon={<Clock size={18} />} />
        <MetricCard label="Đã xác nhận" value={`${stats?.confirmedCount ?? 0}`} accent="green" icon={<CheckCircle2 size={18} />} />
        <MetricCard label="Tổng đã thu (xác nhận)" value={formatVND(Number(stats?.confirmedAmount ?? 0))} accent="blue" icon={<Wallet size={18} />} />
      </div>

      {loading ? (
        <LoadingState variant="list" />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<CheckCircle2 size={22} />} title="Không có khoản chờ xác nhận" description="Mọi khoản báo nộp đã được xử lý." />
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl border p-4 [border-color:var(--pf-border)] [background:var(--pf-surface)] shadow-[var(--pf-shadow)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]"><User size={15} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold [color:var(--pf-text)]">{p.member?.fullName ?? 'Thành viên'}</p>
                      <p className="text-[11.5px] [color:var(--pf-color-muted)]">{formatDate(p.createdAt)}{p.member?.phone ? ` · ${p.member.phone}` : ''}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[12.5px] [color:var(--pf-color-muted)]">Nội dung: <span className="[color:var(--pf-text)]">{p.description}</span></p>
                  {p.memberNote && <p className="mt-0.5 text-[12.5px] [color:var(--pf-color-muted)]">Ghi chú: <span className="[color:var(--pf-text)]">{p.memberNote}</span></p>}
                  {p.proofUrl && /^https?:\/\//i.test(p.proofUrl) && (
                    <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold [color:var(--pf-primary)]">
                      <ExternalLink size={13} /> Xem chứng từ
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-extrabold [color:var(--pf-primary)]">{formatVND(Number(p.amount))}</div>
                  {p.reportedByMember && <StatusBadge tone="info">Member báo</StatusBadge>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton variant="primary" onClick={() => confirm(p.id)} disabled={busyId === p.id}>
                  <CheckCircle2 size={15} /> Xác nhận đã nhận
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => { setRecheck(p); setRecheckNote('') }} disabled={busyId === p.id}>
                  <RotateCcw size={15} /> Yêu cầu kiểm tra lại
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!recheck}
        onClose={() => setRecheck(null)}
        title="Yêu cầu kiểm tra lại"
        subtitle={recheck?.member?.fullName}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setRecheck(null)}>Hủy</ActionButton>
            <ActionButton variant="primary" onClick={doRecheck} disabled={busyId === recheck?.id}>Gửi yêu cầu</ActionButton>
          </div>
        }
      >
        <p className="mb-2 text-[13px] [color:var(--pf-color-muted)]">
          Khoản báo nộp sẽ được đánh dấu cần kiểm tra lại (giữ lịch sử), và thành viên nhận thông báo để báo nộp lại.
        </p>
        <textarea
          value={recheckNote}
          onChange={(e) => setRecheckNote(e.target.value)}
          rows={3}
          placeholder="Lý do (VD: chưa thấy tiền về, sai nội dung CK…)"
          className="w-full resize-none rounded-xl border px-3 py-2 text-[14px] outline-none [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] focus:[border-color:var(--pf-primary)]"
        />
      </Modal>
    </PageShell>
  )
}

export default PaymentApprovals
