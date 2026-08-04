import { formatVND } from '../../lib/utils'

interface FormulaLine {
  label: string
  value: number
  sign?: '+' | '='
  highlight?: boolean
}

interface FinanceFormulaProps {
  lines: FormulaLine[]
  className?: string
}

export function FinanceFormula({ lines, className = '' }: FinanceFormulaProps) {
  return (
    <div className={`rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-surface-muted)] px-4 py-3 space-y-1.5 ${className}`}>
      {lines.map((line, i) => (
        <div key={i}>
          {line.highlight && i > 0 && <div className="h-px bg-slate-200 my-1.5" />}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {line.sign && (
                <span className="text-[11px] font-bold [color:var(--pf-color-muted)] w-3 shrink-0">{line.sign}</span>
              )}
              <span className={`text-[12px] ${line.highlight ? 'font-bold [color:var(--pf-text)]' : '[color:var(--pf-color-muted)]'}`}>
                {line.label}
              </span>
            </div>
            <span className={`text-[12px] tabular-nums font-semibold shrink-0 ${
              line.highlight
                ? (line.value < 0 ? 'text-red-600 font-bold' : '[color:var(--pf-primary)] font-bold')
                : (line.value < 0 ? 'text-red-500' : '[color:var(--pf-text)]')
            }`}>
              {formatVND(line.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
