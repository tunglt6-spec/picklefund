import { ShieldAlert } from 'lucide-react'
import type { FairnessAlert } from '../../types/minigame'
import { cn } from '../../lib/utils'

const LEVEL_CLASS: Record<FairnessAlert['level'], string> = {
  HIGH: 'bg-red-50 border-red-200 text-red-700',
  MED: 'bg-orange-50 border-orange-200 text-orange-700',
  LOW: 'bg-yellow-50 border-yellow-200 text-yellow-700',
}

const LEVEL_DOT: Record<FairnessAlert['level'], string> = {
  HIGH: 'bg-red-500',
  MED: 'bg-orange-500',
  LOW: 'bg-yellow-500',
}

interface Props {
  alerts: FairnessAlert[]
}

export function FairnessAlerts({ alerts }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={15} className="text-slate-500" />
        <p className="text-sm font-semibold text-slate-800">Cảnh Báo Công Bằng</p>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-slate-400">Không có cảnh báo</p>
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
