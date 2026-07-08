import { ScoringCategory, ScoringSource } from '@prisma/client';

export interface DefaultScoringRule {
  category: ScoringCategory;
  label: string;
  delta: number;
  source: ScoringSource;
  sortOrder: number;
}

/** Thang điểm mặc định (seed từ bảng chấm điểm 100đ trong Club Memory template). */
export const DEFAULT_SCORING_RULES: DefaultScoringRule[] = [
  // Tham gia
  { category: 'PARTICIPATION', label: 'Tham gia đúng giờ', delta: 2, source: 'AUTO_ATTENDANCE', sortOrder: 10 },
  { category: 'PARTICIPATION', label: 'Đi muộn', delta: -2, source: 'MANUAL', sortOrder: 11 },
  { category: 'PARTICIPATION', label: 'Vắng không phép', delta: -5, source: 'MANUAL', sortOrder: 12 },
  { category: 'PARTICIPATION', label: 'Vắng ≥3 buổi liên tiếp không phép', delta: -10, source: 'MANUAL', sortOrder: 13 },
  // Văn hóa ứng xử
  { category: 'CONDUCT', label: 'Tôn trọng, Fair Play', delta: 3, source: 'MANUAL', sortOrder: 20 },
  { category: 'CONDUCT', label: 'Hỗ trợ đồng đội, thành viên mới', delta: 2, source: 'MANUAL', sortOrder: 21 },
  { category: 'CONDUCT', label: 'Chửi tục, ứng xử thiếu văn minh', delta: -5, source: 'MANUAL', sortOrder: 22 },
  { category: 'CONDUCT', label: 'Cãi vã, xúc phạm người khác', delta: -10, source: 'MANUAL', sortOrder: 23 },
  { category: 'CONDUCT', label: 'Gây gổ, đánh nhau', delta: -30, source: 'MANUAL', sortOrder: 24 },
  // Đóng góp
  { category: 'CONTRIBUTION', label: 'Hỗ trợ tổ chức hoạt động', delta: 5, source: 'MANUAL', sortOrder: 30 },
  { category: 'CONTRIBUTION', label: 'Giới thiệu thành viên mới', delta: 5, source: 'MANUAL', sortOrder: 31 },
  { category: 'CONTRIBUTION', label: 'Đề xuất sáng kiến hữu ích', delta: 3, source: 'MANUAL', sortOrder: 32 },
  // Kỷ luật
  { category: 'DISCIPLINE', label: 'Chấp hành tốt nội quy', delta: 2, source: 'MANUAL', sortOrder: 40 },
  { category: 'DISCIPLINE', label: 'Gian lận thi đấu', delta: -10, source: 'MANUAL', sortOrder: 41 },
  { category: 'DISCIPLINE', label: 'Làm ảnh hưởng uy tín CLB', delta: -15, source: 'MANUAL', sortOrder: 42 },
  { category: 'DISCIPLINE', label: 'Phá hoại tài sản CLB', delta: -20, source: 'MANUAL', sortOrder: 43 },
  // Tài chính (auto)
  { category: 'FINANCE', label: 'Đóng quỹ đúng hạn', delta: 2, source: 'AUTO_FINANCE', sortOrder: 50 },
  { category: 'FINANCE', label: 'Đóng quỹ trễ hạn', delta: -5, source: 'AUTO_FINANCE', sortOrder: 51 },
  { category: 'FINANCE', label: 'Nợ quỹ quá hạn', delta: -10, source: 'AUTO_FINANCE', sortOrder: 52 },
  // Thưởng đặc biệt
  { category: 'BONUS', label: 'Thành viên tiêu biểu tháng', delta: 10, source: 'MANUAL', sortOrder: 60 },
  { category: 'BONUS', label: 'Đóng góp đặc biệt cho CLB', delta: 10, source: 'MANUAL', sortOrder: 61 },
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
