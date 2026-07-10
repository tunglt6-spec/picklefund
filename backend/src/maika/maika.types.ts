export interface ClubSnapshot {
  clubId: string;
  clubName: string;
  activeMembers: number;
  totalMembers: number;
  unpaidCount: number;
  commonBalance: number;
  miniBalance: number;
  totalAssets: number;
  commonIncome: number;
  commonExpense: number;
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
