export interface ClubSnapshot {
  clubId: string;
  clubName: string;
  activeMembers: number;
  totalMembers: number;
  unpaidCount: number;
  // Số liệu tài chính lấy TRỰC TIẾP từ Finance Engine (FundPeriodsService.summary) khi có kỳ
  // đang mở — KHÔNG tự tính (finance isolation). Mỗi field khớp đúng 1 KPI trên Dashboard/Reports:
  commonBalance: number; // Quỹ Chính kỳ hiện tại — khớp KPI "Số dư Quỹ Chính"
  miniBalance: number; // Quỹ Phụ (độc lập) — khớp KPI "Quỹ Phụ"
  totalAssets: number; // Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ (KHÔNG cộng Quỹ Phụ) — khớp "Tổng tài sản CLB"
  commonIncome: number; // Tổng thu kỳ (Quỹ Chính)
  commonExpense: number; // Tổng chi kỳ (Quỹ Chính)
  currentPeriodName: string | null;
  currentPeriodSessions: number;
  recentAnomalies: AnomalyResult['anomalies'];
}

export interface DailyBrief {
  date: string;
  summary: string;
  fundBalance: string;
  debtAlert: string | null;
  upcomingEvents: string | null;
  recommendations: string[];
  healthScore: number;
}

export interface WeeklyReport {
  weekOf: string;
  summary: string;
  highlights: string[];
  memberStats: string;
  financialStats: string;
  recommendations: string[];
}

export interface AnomalyResult {
  found: boolean;
  anomalies: {
    type: string;
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

export interface HealthScoreResult {
  score: number;
  breakdown: {
    financial: number;
    engagement: number;
    activity: number;
    goals: number;
    issues: number;
  };
  interpretation: string;
  recommendations: string[];
}
