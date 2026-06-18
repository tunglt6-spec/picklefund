interface MobileKpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  accent?: string
}

export function MobileKpiCard({ label, value, icon, accent = '#4F46E5' }: MobileKpiCardProps) {
  return (
    <div className="bg-white rounded-[18px] border border-slate-100 p-3.5 flex flex-col justify-between shadow-sm"
      style={{ minHeight: 92 }}>
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${accent}18` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
      <div>
        <div className="text-[26px] font-[800] leading-none text-slate-900 tabular-nums">{value}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 leading-tight">{label}</div>
      </div>
    </div>
  )
}
