import { ChevronDown } from 'lucide-react'
import type { FundPeriod } from '../../types'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Chuẩn bị', active: 'Đang mở', closed: 'Đóng', finalized: 'Đóng'
}

interface Props {
  periods: FundPeriod[]
  selectedId: string
  onChange: (id: string) => void
  label?: string
}

export function PeriodSelector({ periods, selectedId, onChange, label = 'Kỳ quỹ' }: Props) {
  if (periods.length === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}:</span>
      <div className="relative inline-flex items-center">
        <select
          value={selectedId}
          onChange={e => onChange(e.target.value)}
          className="pl-3 pr-7 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:border-indigo-400 text-slate-800"
        >
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — {STATUS_LABEL[p.status] ?? p.status}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}
