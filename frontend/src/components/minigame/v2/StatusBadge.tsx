/**
 * StatusBadge (minigame) — WRAPPER mỏng bọc shared StatusBadge để THỐNG NHẤT pill trạng thái
 * toàn app (một nguồn màu semantic --pf-color-*). Giữ nguyên API `status` (string) nên mọi
 * call-site cũ không đổi; map status → tone + nhãn tiếng Việt. Status lạ (backend thêm/đổi)
 * → tone neutral, KHÔNG crash.
 */
import { StatusBadge as SharedStatusBadge, type StatusTone } from '../../shared/StatusBadge'

export type MinigameStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'GROUPED'
  | 'PAIRED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

interface StatusBadgeProps {
  // string (không chỉ MinigameStatus) để KHÔNG BAO GIỜ crash nếu backend đổi/thêm status.
  status: MinigameStatus | string
}

/** status → { nhãn hiển thị, tone semantic, có chấm nhấp nháy (đang diễn ra) }. */
const STATUS_MAP: Record<string, { label: string; tone: StatusTone; dot?: boolean }> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  ACTIVE: { label: 'Đang Diễn Ra', tone: 'warning', dot: true },
  IN_PROGRESS: { label: 'Đang Diễn Ra', tone: 'warning', dot: true },
  GROUPED: { label: 'Đã Chia Bảng', tone: 'info' },
  PAIRED: { label: 'Đã Bốc Thăm', tone: 'info' },
  SCHEDULED: { label: 'Có Lịch', tone: 'info' },
  COMPLETED: { label: 'Hoàn Thành', tone: 'success' },
  CANCELLED: { label: 'Đã Hủy', tone: 'danger' },
}

const FALLBACK = { label: 'Không rõ', tone: 'neutral' as StatusTone }

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status] ?? FALLBACK
  return (
    <SharedStatusBadge tone={cfg.tone} dot={cfg.dot}>
      {cfg.label}
    </SharedStatusBadge>
  )
}
