import { ScoringCategory, ScoringSource } from '@prisma/client';

export interface DefaultScoringRule {
  /** Khóa hệ thống BẤT BIẾN — engine khớp rule qua key này (không phụ thuộc label
   *  admin có thể sửa). Rule do CLB tự tạo có systemKey = null. */
  systemKey: string;
  category: ScoringCategory;
  label: string;
  delta: number;
  source: ScoringSource;
  sortOrder: number;
}

/**
 * systemKey của các rule AUTO — engine LIVE đọc mức trừ qua đây (bền vững kể cả
 * khi CLB đổi label). CHỈ 3 rule auto trong model MỚI (chỉ giảm điểm).
 */
export const RULE_KEY = {
  ATTENDANCE_ABSENT: 'ATTENDANCE_ABSENT',
  FINANCE_LATE: 'FINANCE_LATE',
  FINANCE_OVERDUE: 'FINANCE_OVERDUE',
} as const;

/**
 * Thang điểm mặc định (model MỚI: mọi TV mặc định 100đ, điểm CHỈ GIẢM).
 * - AUTO: mức trừ tự động tính LIVE từ data (điểm danh + tài chính), CLB chỉnh được.
 * - MANUAL: vi phạm admin nhập tay khi có (trừ) / miễn trừ (cộng bù).
 * - BONUS: thưởng (cộng, cap 100).
 */
export const DEFAULT_SCORING_RULES: DefaultScoringRule[] = [
  // ── AUTO (mức trừ, tính LIVE, CLB chỉnh được) ──
  { systemKey: RULE_KEY.ATTENDANCE_ABSENT, category: 'PARTICIPATION', label: 'Vắng buổi tập (mỗi buổi)', delta: -5, source: 'AUTO_ATTENDANCE', sortOrder: 10 },
  { systemKey: RULE_KEY.FINANCE_LATE, category: 'FINANCE', label: 'Đóng quỹ trễ hạn', delta: -5, source: 'AUTO_FINANCE', sortOrder: 20 },
  { systemKey: RULE_KEY.FINANCE_OVERDUE, category: 'FINANCE', label: 'Nợ quỹ quá hạn (chưa đóng)', delta: -10, source: 'AUTO_FINANCE', sortOrder: 21 },
  // ── MANUAL (vi phạm — admin nhập tay khi có) ──
  { systemKey: 'CONDUCT_RUDE', category: 'CONDUCT', label: 'Chửi tục, ứng xử thiếu văn minh', delta: -5, source: 'MANUAL', sortOrder: 30 },
  { systemKey: 'CONDUCT_INSULT', category: 'CONDUCT', label: 'Cãi vã, xúc phạm người khác', delta: -10, source: 'MANUAL', sortOrder: 31 },
  { systemKey: 'CONDUCT_FIGHT', category: 'CONDUCT', label: 'Gây gổ, đánh nhau', delta: -30, source: 'MANUAL', sortOrder: 32 },
  { systemKey: 'DISCIPLINE_CHEAT', category: 'DISCIPLINE', label: 'Gian lận thi đấu', delta: -10, source: 'MANUAL', sortOrder: 40 },
  { systemKey: 'DISCIPLINE_REPUTATION', category: 'DISCIPLINE', label: 'Làm ảnh hưởng uy tín CLB', delta: -15, source: 'MANUAL', sortOrder: 41 },
  { systemKey: 'DISCIPLINE_VANDALISM', category: 'DISCIPLINE', label: 'Phá hoại tài sản CLB', delta: -20, source: 'MANUAL', sortOrder: 42 },
  { systemKey: 'PARTICIPATION_LATE', category: 'PARTICIPATION', label: 'Đi muộn', delta: -2, source: 'MANUAL', sortOrder: 11 },
  { systemKey: 'ATTENDANCE_EXCUSED', category: 'PARTICIPATION', label: 'Miễn trừ vắng có phép (cộng bù mỗi buổi)', delta: 5, source: 'MANUAL', sortOrder: 12 },
  // ── BONUS (thưởng — cộng, cap 100) ──
  { systemKey: 'BONUS_STAR', category: 'BONUS', label: 'Thành viên tiêu biểu tháng', delta: 10, source: 'MANUAL', sortOrder: 50 },
  { systemKey: 'BONUS_SPECIAL', category: 'BONUS', label: 'Đóng góp đặc biệt cho CLB', delta: 10, source: 'MANUAL', sortOrder: 51 },
];

export const SCORE_BASELINE = 100;

/** Xếp loại theo thang template (cố định). */
export function classifyScore(score: number): string {
  if (score >= 95) return 'Xuất sắc';
  if (score >= 85) return 'Tốt';
  if (score >= 70) return 'Đạt';
  if (score >= 50) return 'Cần cải thiện';
  return 'Xem xét tư cách thành viên';
}
