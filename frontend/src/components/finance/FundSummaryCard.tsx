import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { formatVND } from '../../lib/utils'

export interface FundSummaryCardProps {
  title: string
  balance: number
  income?: number
  expense?: number
  gradFrom: string
  gradTo: string
  icon: React.ReactNode
  tag?: string
  note?: string
  subtitle?: string
  formulaLines?: { label: string; value: number | string; isTotal?: boolean }[]
  showSign?: boolean
  statusLabel?: string
  animDelay?: number
}

export function FundSummaryCard({
  title, balance, income, expense,
  gradFrom, gradTo, icon, tag, note, subtitle,
  formulaLines, showSign, statusLabel, animDelay = 0,
}: FundSummaryCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 shadow-lg text-white"
      style={{
        background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`,
        animation: 'fundCardFadeIn 0.4s ease both',
        animationDelay: `${animDelay}ms`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white/70 leading-tight">
            {title}
          </span>
        </div>
        {tag && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white flex-shrink-0">
            {tag}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p
          className="text-xl sm:text-2xl font-bold tabular-nums leading-tight break-words whitespace-normal max-w-full"
          style={{ letterSpacing: '-0.02em' }}
        >
          {showSign && balance > 0 ? '+' : ''}{formatVND(balance)}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-xs text-white/60">Số dư hiện tại</p>
          {balance < 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-200">⚠ Âm</span>
          )}
          {statusLabel && balance >= 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20 text-white">{statusLabel}</span>
          )}
        </div>
      </div>

      {subtitle && <p className="text-[10px] -mt-1 text-white/60 truncate">{subtitle}</p>}

      <div className="h-px bg-white/20" />

      {formulaLines ? (
        <div className="flex flex-col gap-1">
          {formulaLines.map((line, i) => (
            <div key={i}>
              {line.isTotal && <div className="h-px bg-white/30 my-1" />}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className={`text-[10px] min-w-0 shrink ${line.isTotal ? 'text-white font-semibold' : 'text-white/60'}`}>
                  {line.label}
                </span>
                <span className={`text-[11px] font-semibold tabular-nums text-right break-words min-w-0 max-w-[55%] ${
                  line.isTotal
                    ? (typeof line.value === 'number' && line.value < 0 ? 'text-red-300' : 'text-white')
                    : 'text-white/80'
                }`}>
                  {typeof line.value === 'number' ? formatVND(line.value) : line.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUpRight size={11} className="text-green-300" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/60">Thu</span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-white">{formatVND(income ?? 0)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowDownLeft size={11} className="text-red-300" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/60">Chi</span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-white">{formatVND(expense ?? 0)}</p>
          </div>
        </div>
      )}

      {note && <p className="text-[10px] text-white/50 leading-snug">{note}</p>}
    </div>
  )
}
