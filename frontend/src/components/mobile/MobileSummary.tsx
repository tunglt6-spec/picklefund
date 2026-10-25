import type { ReactNode } from 'react'
import { moneyTone, type MoneyKind } from '../../lib/moneyTone'
import { readingSignal, type SignalTone } from '../../lib/statusDesign'

type SummaryValue = { label: string; value: ReactNode; tone?: SignalTone; money?: { value: number | null | undefined; kind?: MoneyKind } }

/** Compact mobile overview: one leading value, secondary metrics disclosed on demand. */
export function MobileSummary({ label, value, note, items, module = 'system', tone, money }: {
  label: string; value: ReactNode; note?: ReactNode
  items: SummaryValue[]
  module?: string
  tone?: SignalTone
  money?: SummaryValue['money']
}) {
  return <section className="pf-mobile-summary lg:hidden" data-mod={module} data-pf-signal={money ? moneyTone(money.value, money.kind) : tone ?? readingSignal(value)} aria-label={label}>
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="text-xs font-medium [color:var(--pf-text-muted)]">{label}</p>
        <p className="pf-summary-value mt-1 text-[24px] font-extrabold leading-tight tabular-nums [color:var(--pf-text)]">{value}</p></div>
      {note && <p className="text-xs [color:var(--pf-text-muted)]">{note}</p>}
    </div>
    {items.length > 0 && <details className="mt-3 border-t pt-1 [border-color:var(--pf-border-soft)]">
      <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold [color:var(--pf-primary-text)]">Chi tiết thống kê</summary>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-4 pb-2">
        {items.map(item=><div key={item.label} className="min-w-0"><dt className="text-xs [color:var(--pf-text-muted)]">{item.label}</dt><dd data-pf-signal={item.money ? moneyTone(item.money.value, item.money.kind) : item.tone ?? readingSignal(item.value)} className="pf-summary-item mt-1 text-sm font-bold tabular-nums [color:var(--pf-text)]">{item.value}</dd></div>)}
      </dl>
    </details>}
  </section>
}
