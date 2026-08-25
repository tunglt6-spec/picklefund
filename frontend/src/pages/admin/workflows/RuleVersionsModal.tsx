/**
 * RuleVersionsModal — Lifecycle control (Phase 3): xem LỊCH SỬ PHIÊN BẢN của 1 WorkflowRule
 * và KHÔI PHỤC (rollback) về phiên bản cũ. Mỗi lần tạo/sửa/rollback đều sinh 1 snapshot.
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../../components/ui/Modal'
import { ActionButton } from '../../../components/shared'
import { fetchRuleVersions, rollbackRuleVersion, type RuleVersion } from '../../../hooks/useWorkflows'

function fmt(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { hour12: false })
}

export function RuleVersionsModal({
  rule,
  onClose,
  onRolledBack,
}: {
  rule: { id: string; name: string } | null
  onClose: () => void
  onRolledBack: () => void
}) {
  const [versions, setVersions] = useState<RuleVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    if (!rule) return
    setLoading(true)
    fetchRuleVersions(rule.id).then(setVersions).catch(() => setVersions([])).finally(() => setLoading(false))
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [rule?.id])

  const doRollback = async (v: RuleVersion) => {
    if (!rule) return
    setBusyId(v.id)
    try {
      await rollbackRuleVersion(rule.id, v.id)
      toast.success(`Đã khôi phục phiên bản v${v.version}`)
      onRolledBack()
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Khôi phục thất bại')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal open={!!rule} onClose={onClose} title="Lịch sử phiên bản rule" subtitle={rule?.name} size="lg">
      {loading ? (
        <div className="py-8 text-center text-[13px] [color:var(--pf-color-muted)]">Đang tải…</div>
      ) : versions.length === 0 ? (
        <div className="py-8 text-center text-[13px] [color:var(--pf-color-muted)]">Chưa có phiên bản nào.</div>
      ) : (
        <div className="space-y-2">
          {versions.map((v, idx) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--pf-border)] p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full [background:var(--pf-primary-soft)] px-2 py-0.5 text-[11px] font-bold [color:var(--pf-primary)]">v{v.version}</span>
                  {idx === 0 && <span className="rounded-full [background:var(--pf-color-success-soft)] px-2 py-0.5 text-[10px] font-semibold [color:var(--pf-color-success)]">Hiện tại</span>}
                  <span className="truncate text-[13px] font-semibold [color:var(--pf-text)]">{v.name}</span>
                </div>
                <p className="mt-0.5 text-[11px] [color:var(--pf-color-muted)]">
                  {v.changeNote ?? '—'} · {fmt(v.createdAt)} · {v.scheduleType} · {v.enabled ? 'Bật' : 'Tắt'}
                </p>
              </div>
              {idx !== 0 && (
                <ActionButton variant="secondary" className="min-h-9 shrink-0" onClick={() => void doRollback(v)} disabled={busyId === v.id}>
                  {busyId === v.id ? 'Đang khôi phục…' : 'Khôi phục'}
                </ActionButton>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
