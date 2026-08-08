import { ShieldAlert } from 'lucide-react'
import type { FairnessAlert } from '../../types/minigame'
import { cn } from '../../lib/utils'

const LEVEL_CLASS: Record<FairnessAlert['level'], string> = {
  HIGH: '[background:var(--pf-color-danger-soft)] border-[color:var(--pf-color-danger-soft)] [color:var(--pf-color-danger)]',
  MED: '[background:var(--pf-color-warning-soft)] border-[color:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]',
  LOW: '[background:var(--pf-color-warning-soft)] border-[color:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]',
}

const LEVEL_DOT: Record<FairnessAlert['level'], string> = {
  HIGH: '[background:var(--pf-color-danger)]',
  MED: '[background:var(--pf-color-warning)]',
  LOW: '[background:var(--pf-color-warning)]',
}

interface Props {
  alerts: FairnessAlert[]
}

export function FairnessAlerts({ alerts }: Props) {
  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={15} className="[color:var(--pf-color-muted)]" />
        <p className="text-sm font-semibold [color:var(--pf-text)]">Cảnh Báo Công Bằng</p>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs [color:var(--pf-color-muted)]">Không có cảnh báo</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={cn('flex items-center justify-between rounded-lg border px-3 py-2', LEVEL_CLASS[a.level])}>
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full shrink-0', LEVEL_DOT[a.level])} />
                <span className="text-xs font-medium">{a.message}</span>
              </div>
              <button className="text-xs font-semibold hover:underline whitespace-nowrap ml-2">{a.actionLabel}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
