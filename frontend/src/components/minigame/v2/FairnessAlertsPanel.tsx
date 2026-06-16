import { AlertTriangle, AlertOctagon, Info, ChevronRight } from 'lucide-react';

interface DashboardAlert {
  id: string;
  level: 'HIGH' | 'MED' | 'LOW';
  title: string;
  description: string;
  actionLabel: string;
}

interface FairnessAlertsPanelProps {
  alerts: DashboardAlert[];
  onAction?: (alertId: string) => void;
}

export function FairnessAlertsPanel({ alerts, onAction }: FairnessAlertsPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Cảnh Báo &amp; Nhắc Nhở
        </h2>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <span className="text-2xl mb-2">🎉</span>
          <p className="text-sm">Tất cả ổn!</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => {
            const isHigh = alert.level === 'HIGH';
            const isMed = alert.level === 'MED';

            const containerCls = isHigh
              ? 'bg-red-50 border-l-4 border-red-500'
              : isMed
              ? 'bg-amber-50 border-l-4 border-amber-400'
              : 'bg-sky-50 border-l-4 border-sky-400';

            const IconComponent = isHigh ? AlertOctagon : isMed ? AlertTriangle : Info;
            const iconCls = isHigh
              ? 'text-red-500'
              : isMed
              ? 'text-amber-500'
              : 'text-sky-500';

            const buttonCls = isHigh
              ? 'text-red-600 hover:text-red-800'
              : isMed
              ? 'text-amber-600 hover:text-amber-800'
              : 'text-sky-600 hover:text-sky-800';

            return (
              <li
                key={alert.id}
                className={`rounded-xl p-3 flex items-start gap-3 ${containerCls}`}
              >
                <IconComponent size={16} className={`mt-0.5 shrink-0 ${iconCls}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
                </div>
                <button
                  onClick={() => onAction?.(alert.id)}
                  className={`flex items-center gap-0.5 text-xs font-medium shrink-0 mt-0.5 ${buttonCls}`}
                >
                  {alert.actionLabel}
                  <ChevronRight size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
