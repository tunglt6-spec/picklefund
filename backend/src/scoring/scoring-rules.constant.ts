import { ScoringCategory, ScoringSource } from '@prisma/client';

export interface DefaultScoringRule {
  /** Khóa hệ thống BẤT BIẾN — auto-scoring khớp rule qua key này (không phụ thuộc label
   *  admin có thể sửa). Rule do CLB tự tạo có systemKey = null. */
  systemKey: string;
  category: ScoringCategory;
  label: string;
  delta: number;
  source: ScoringSource;
  sortOrder: number;
}

/** systemKey của các rule AUTO — dùng trong runAutoScoring để khớp bền vững. */
export const RULE_KEY = {
  ATTENDANCE_ON_TIME: 'PARTICIPATION_ON_TIME',
  FINANCE_ON_TIME: 'FINANCE_ON_TIME',
  FINANCE_LATE: 'FINANCE_LATE',
  FINANCE_OVERDUE: 'FINANCE_OVERDUE',
} as const;

/** Thang điểm mặc định (seed từ bảng chấm điểm 100đ trong Club Memory template). */
export const DEFAULT_SCORING_RULES: DefaultScoringRule[] = [
  // Tham gia
  { systemKey: 'PARTICIPATION_ON_TIME', category: 'PARTICIPATION', label: 'Tham gia đúng giờ', delta: 2, source: 'AUTO_ATTENDANCE', sortOrder: 10 },
  { systemKey: 'PARTICIPATION_LATE', category: 'PARTICIPATION', label: 'Đi muộn', delta: -2, source: 'MANUAL', sortOrder: 11 },
  { systemKey: 'PARTICIPATION_ABSENT_UNEXCUSED', category: 'PARTICIPATION', label: 'Vắng không phép', delta: -5, source: 'MANUAL', sortOrder: 12 },
  { systemKey: 'PARTICIPATION_ABSENT_STREAK', category: 'PARTICIPATION', label: 'Vắng ≥3 buổi liên tiếp không phép', delta: -10, source: 'MANUAL', sortOrder: 13 },
  // Văn hóa ứng xử
  { systemKey: 'CONDUCT_FAIRPLAY', category: 'CONDUCT', label: 'Tôn trọng, Fair Play', delta: 3, source: 'MANUAL', sortOrder: 20 },
  { systemKey: 'CONDUCT_SUPPORT', category: 'CONDUCT', label: 'Hỗ trợ đồng đội, thành viên mới', delta: 2, source: 'MANUAL', sortOrder: 21 },
  { systemKey: 'CONDUCT_RUDE', category: 'CONDUCT', label: 'Chửi tục, ứng xử thiếu văn minh', delta: -5, source: 'MANUAL', sortOrder: 22 },
  { systemKey: 'CONDUCT_INSULT', category: 'CONDUCT', label: 'Cãi vã, xúc phạm người khác', delta: -10, source: 'MANUAL', sortOrder: 23 },
  { systemKey: 'CONDUCT_FIGHT', category: 'CONDUCT', label: 'Gây gổ, đánh nhau', delta: -30, source: 'MANUAL', sortOrder: 24 },
  // Đóng góp
  { systemKey: 'CONTRIBUTION_ORGANIZE', category: 'CONTRIBUTION', label: 'Hỗ trợ tổ chức hoạt động', delta: 5, source: 'MANUAL', sortOrder: 30 },
  { systemKey: 'CONTRIBUTION_REFER', category: 'CONTRIBUTION', label: 'Giới thiệu thành viên mới', delta: 5, source: 'MANUAL', sortOrder: 31 },
  { systemKey: 'CONTRIBUTION_IDEA', category: 'CONTRIBUTION', label: 'Đề xuất sáng kiến hữu ích', delta: 3, source: 'MANUAL', sortOrder: 32 },
  // Kỷ luật
  { systemKey: 'DISCIPLINE_COMPLY', category: 'DISCIPLINE', label: 'Chấp hành tốt nội quy', delta: 2, source: 'MANUAL', sortOrder: 40 },
  { systemKey: 'DISCIPLINE_CHEAT', category: 'DISCIPLINE', label: 'Gian lận thi đấu', delta: -10, source: 'MANUAL', sortOrder: 41 },
  { systemKey: 'DISCIPLINE_REPUTATION', category: 'DISCIPLINE', label: 'Làm ảnh hưởng uy tín CLB', delta: -15, source: 'MANUAL', sortOrder: 42 },
  { systemKey: 'DISCIPLINE_VANDALISM', category: 'DISCIPLINE', label: 'Phá hoại tài sản CLB', delta: -20, source: 'MANUAL', sortOrder: 43 },
  // Tài chính (auto)
  { systemKey: 'FINANCE_ON_TIME', category: 'FINANCE', label: 'Đóng quỹ đúng hạn', delta: 2, source: 'AUTO_FINANCE', sortOrder: 50 },
  { systemKey: 'FINANCE_LATE', category: 'FINANCE', label: 'Đóng quỹ trễ hạn', delta: -5, source: 'AUTO_FINANCE', sortOrder: 51 },
  { systemKey: 'FINANCE_OVERDUE', category: 'FINANCE', label: 'Nợ quỹ quá hạn', delta: -10, source: 'AUTO_FINANCE', sortOrder: 52 },
  // Thưởng đặc biệt
  { systemKey: 'BONUS_STAR', category: 'BONUS', label: 'Thành viên tiêu biểu tháng', delta: 10, source: 'MANUAL', sortOrder: 60 },
  { systemKey: 'BONUS_SPECIAL', category: 'BONUS', label: 'Đóng góp đặc biệt cho CLB', delta: 10, source: 'MANUAL', sortOrder: 61 },
];

export const SCORE_BASELINE = 100;

/** Xếp loại theo thang template (cố định Phase 1). */
export function classifyScore(score: number): string {
  if (score >= 95) return 'Xuất sắc';
  if (score >= 85) return 'Tốt';
  if (score >= 70) return 'Đạt';
  if (score >= 50) return 'Cần cải thiện';
  return 'Xem xét tư cách thành viên';
}
