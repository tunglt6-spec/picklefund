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
    <div className={`rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1.5 ${className}`}>
      {lines.map((line, i) => (
        <div key={i}>
          {line.highlight && i > 0 && <div className="h-px bg-slate-200 my-1.5" />}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {line.sign && (
                <span className="text-[11px] font-bold text-slate-400 w-3 shrink-0">{line.sign}</span>
              )}
              <span className={`text-[12px] ${line.highlight ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                {line.label}
              </span>
            </div>
            <span className={`text-[12px] tabular-nums font-semibold shrink-0 ${
              line.highlight
                ? (line.value < 0 ? 'text-red-600 font-bold' : 'text-indigo-700 font-bold')
                : (line.value < 0 ? 'text-red-500' : 'text-slate-700')
            }`}>
              {formatVND(line.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
