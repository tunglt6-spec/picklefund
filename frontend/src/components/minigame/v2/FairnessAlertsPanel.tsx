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
    <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="[color:var(--pf-color-warning)]" />
        <h2 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
          Cảnh Báo &amp; Nhắc Nhở
        </h2>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 [color:var(--pf-color-muted)]">
          <span className="text-2xl mb-2">🎉</span>
          <p className="text-sm">Tất cả ổn!</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => {
            const isHigh = alert.level === 'HIGH';
            const isMed = alert.level === 'MED';

            const containerCls = isHigh
              ? '[background:var(--pf-color-danger-soft)] border-l-4 [border-color:var(--pf-color-danger)]'
              : isMed
              ? '[background:var(--pf-color-warning-soft)] border-l-4 [border-color:var(--pf-color-warning)]'
              : '[background:var(--pf-color-info-soft)] border-l-4 [border-color:var(--pf-color-info)]';

            const IconComponent = isHigh ? AlertOctagon : isMed ? AlertTriangle : Info;
            const iconCls = isHigh
              ? '[color:var(--pf-color-danger)]'
              : isMed
              ? '[color:var(--pf-color-warning)]'
              : '[color:var(--pf-color-info)]';

            const buttonCls = isHigh
              ? '[color:var(--pf-color-danger)]'
              : isMed
              ? '[color:var(--pf-color-warning)]'
              : '[color:var(--pf-color-info)]';

            return (
              <li
                key={alert.id}
                className={`rounded-xl p-3 flex items-start gap-3 ${containerCls}`}
              >
                <IconComponent size={16} className={`mt-0.5 shrink-0 ${iconCls}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold [color:var(--pf-text)]">{alert.title}</p>
                  <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{alert.description}</p>
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
