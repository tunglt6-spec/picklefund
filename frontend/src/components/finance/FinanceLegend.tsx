interface LegendItem {
  label: string
  color: string
}

interface FinanceLegendProps {
  items: LegendItem[]
  className?: string
}

export function FinanceLegend({ items, className = '' }: FinanceLegendProps) {
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}
