export type MinigameStatus =
  | 'DRAFT'
  | 'GROUPED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface StatusBadgeProps {
  status: MinigameStatus;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass?: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<MinigameStatus, StatusConfig> = {
  DRAFT: {
    label: 'Nháp',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
  GROUPED: {
    label: 'Đã Chia Bảng',
    badgeClass: 'bg-sky-100 text-sky-700',
  },
  SCHEDULED: {
    label: 'Có Lịch',
    badgeClass: 'bg-indigo-100 text-indigo-700',
  },
  IN_PROGRESS: {
    label: 'Đang Diễn Ra',
    badgeClass: 'bg-amber-100 text-amber-700',
    dotClass: 'bg-amber-500',
    pulse: true,
  },
  COMPLETED: {
    label: 'Hoàn Thành',
    badgeClass: 'bg-green-100 text-green-700',
  },
  CANCELLED: {
    label: 'Đã Hủy',
    badgeClass: 'bg-red-100 text-red-700',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      {config.dotClass && (
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${config.dotClass} ${config.pulse ? 'animate-pulse' : ''}`}
        />
      )}
      {config.label}
    </span>
  );
}
