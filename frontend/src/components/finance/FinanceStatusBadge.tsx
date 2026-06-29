type FundStatus = 'draft' | 'active' | 'closed' | 'finalized'

const STATUS_CONFIG: Record<FundStatus, { label: string; cls: string; dot: string }> = {
  draft:     { label: 'Chuẩn bị',  cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  active:    { label: 'Đang mở',   cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  closed:    { label: 'Đã đóng',   cls: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
  finalized: { label: 'Đã chốt',   cls: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
}

interface FinanceStatusBadgeProps {
  status: FundStatus
  showDot?: boolean
}

export function FinanceStatusBadge({ status, showDot = true }: FinanceStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  )
}
