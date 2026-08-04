export type MinigameStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'GROUPED'
  | 'PAIRED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface StatusBadgeProps {
  // string (không chỉ MinigameStatus) để KHÔNG BAO GIỜ crash nếu backend đổi/thêm status.
  status: MinigameStatus | string;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass?: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: {
    label: 'Nháp',
    badgeClass: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
  },
  // ACTIVE = status backend (Prisma) cho "đang diễn ra" — map hiển thị như IN_PROGRESS.
  ACTIVE: {
    label: 'Đang Diễn Ra',
    badgeClass: 'bg-amber-100 text-amber-700',
    dotClass: 'bg-amber-500',
    pulse: true,
  },
  GROUPED: {
    label: 'Đã Chia Bảng',
    badgeClass: 'bg-sky-100 text-sky-700',
  },
  PAIRED: {
    label: 'Đã Bốc Thăm',
    badgeClass: 'bg-sky-100 text-sky-700',
  },
  SCHEDULED: {
    label: 'Có Lịch',
    badgeClass: '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
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

const FALLBACK_CONFIG: StatusConfig = {
  label: 'Không rõ',
  badgeClass: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  // Fallback: status lạ (backend thêm/đổi) KHÔNG được ném lỗi → tránh màn trắng toàn dashboard.
  const config = STATUS_CONFIG[status] ?? FALLBACK_CONFIG;

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
