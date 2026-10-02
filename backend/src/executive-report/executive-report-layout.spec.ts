import { buildReportHtml } from './executive-report-html';
import { buildExecutiveReportPdf } from './executive-report-pdf';
import { buildCommandCenterHtml } from '../command-center/command-center-html';

/** Dữ liệu mẫu giống báo cáo thật của user: CLB B32, kỳ "B32 - Tháng 10/2026", 8 TV, thu 2.100.000 / chi 2.180.000 / tài sản -80.000. */
const names = ['Mr HảiPM', 'Mr Tân Trung', 'TungLT6', 'Mrs Hằng', 'Mr Khoa', 'Mrs Hiền', 'Tít Mít', 'Mr Đức'];
const thu = [1500000, 3100000, 2400000, 2500000, 2100000];
const chi = [1500000, 3100000, 2400000, 2500000, 2180000];
function b32Report(): any {
  return {
    meta: { clubName: 'CLB B32', periodName: 'B32 - Tháng 10/2026' },
    summary: { clubHealthScore: 83, activeMembers: 8, totalMembers: 8, participationRate: 100, outstandingCount: 1, completedSessions: 1, cancelledSessions: 0, tournamentsCount: 1 },
    finance: {
      totalIncome: 2100000, totalExpense: 2180000, balance: -80000, carryForward: 0, clubAssets: -80000, avgIncomePerMember: 262500,
      trends: ['06', '07', '08', '09', '10'].map((x, i) => ({ name: `B32 - Tháng ${x}/2026`, thu: thu[i], chi: chi[i] })),
      compare: { incomeDeltaPct: -16, expenseDeltaPct: -12.8, balanceDeltaPct: null },
    },
    members: { avgHealth: 96, distribution: { excellent: 7, good: 0, fair: 1, atRisk: 0 }, all: names.map((n, i) => ({ name: n, participationRate: 100, paymentStatus: i === 7 ? 'debt' : 'paid', stars: i === 7 ? 3 : 5, conductScore: 100, healthScore: i === 7 ? 70 : 100 })) },
    dna: { archetype: 'CLB Năng động — chơi đều, lịch dày', traits: [{ key: 'Năng động', score: 100 }, { key: 'Máu lửa thi đấu', score: 100 }, { key: 'Vận hành hiện đại (AI)', score: 100 }, { key: 'Gắn kết thành viên', score: 96 }, { key: 'Kỷ luật tài chính', score: 58 }] },
    health: { dimensions: [{ key: 'Tài chính', score: 65 }, { key: 'Thành viên', score: 96 }, { key: 'Hoạt động', score: 100 }, { key: 'Minh bạch', score: 50 }, { key: 'AI', score: 100 }, { key: 'Thi đấu', score: 100 }] },
    ai: { hermes: { completed: 20, runs: 20, failed: 0, running: 0 }, lisa: { answered: 0, reminders: 0 }, maika: { insights: 5, actions: 0 }, mitdac: { executed: 3, failed: 0, avgMs: 34.9 }, notification: { sent: 37, byChannel: { IN_APP: 36, EMAIL: 1, TELEGRAM: 0 } }, automationScore: { score: 100 } },
    tournament: { tournamentsCount: 1, teamsCount: 4, matchesCount: 6, topPlayers: [{ name: 'Mr HảiPM', wins: 3, winRate: 100 }, { name: 'TungLT6', wins: 3, winRate: 100 }, { name: 'Mr Khoa', wins: 2, winRate: 66.7 }] },
    activity: { totalSessions: 5, completed: 1, cancelled: 0, avgPresentPerSession: 8, busiest: { name: 'Sân B32', present: 8 }, emptiest: null },
    forecast: { dailyNet: -571, note: 'Ước lượng tuyến tính theo xu hướng thu-chi gần đây — không phải cam kết.', projected30: -97143, projected60: -114286, projected90: -131429, trendLabel: 'xu hướng giảm' },
    timeline: [
      { type: 'expense', date: '2026-09-28', label: 'Tiền sân B32 tháng 102026', amount: 1900000 },
      { type: 'income', date: '2026-09-28', label: 'Thu quỹ', amount: 300000 },
      { type: 'income', date: '2026-09-28', label: 'Thu quỹ', amount: 300000 },
      { type: 'income', date: '2026-09-28', label: 'Thu quỹ', amount: 300000 },
      { type: 'expense', date: '2026-10-01', label: 'Tiền nước và thêm giờ', amount: 280000 },
      { type: 'x', date: '2026-10-01', label: 'B32 Giải đấu chào mùa Thu' },
      { type: 'x', date: '2026-10-02', label: 'B32 Minigame Tuần' },
    ],
    alerts: [{ message: '1 thành viên chưa/không đủ đóng quỹ' }, { message: 'Cân đối thu-chi kỳ này đang âm' }, { message: 'Tổng quỹ hiện đang thấp hơn 1 kỳ chi — nguy cơ thiếu quỹ' }],
    recommendations: [{ agent: 'Lisa', text: 'Nhắc 1 thành viên đóng quỹ.' }, { agent: 'Hermes', text: 'Bật workflow tự động nhắc quỹ định kỳ.' }],
    generatedAt: '2026-10-02',
  };
}
const B32_AI = `Thưa Ban quản trị, trong tháng 10/2026, CLB B32 duy trì sức khỏe tốt với điểm số 83/100 nhờ hoạt động phong trào gắn kết cao, dù đang chịu áp lực tài chính ngắn hạn.

Điểm nổi bật:
* Hoạt động xuất sắc: Đạt tỷ lệ tham gia 100% (8/8 thành viên hoạt động), tổ chức 5 buổi chơi (hoàn thành 1) và 1 giải/minigame.
* Tài chính thu - chi: Thu đạt 2.100.000đ (giảm 16% so với kỳ trước) và chi 2.180.000đ (giảm 12.8%).

Rủi ro cần chú ý:
* Thâm hụt tài chính: Cân đối và tổng tài sản âm 80.000đ; dự báo tài sản 90 ngày tới tiếp tục giảm xuống -131.429đ.
* Rủi ro thanh khoản: Có 1 thành viên chưa đóng đủ quỹ.

Khuyến nghị ưu tiên:
* Thu hồi dứt điểm công nợ từ 1 thành viên chưa hoàn thành đóng quỹ.
* Cân đối lại thu chi để bù đắp khoản thâm hụt 80.000đ.`;

const NOW = new Date('2026-10-02T05:59:00Z');
const FORCED_BREAK = /break-before:page|page-break-before:always|break-after:page|page-break-after:always/;

describe('Báo cáo điều hành — bố cục cân bằng (dữ liệu mẫu B32)', () => {
  it('HTML: không break-before/after cưỡng bức giữa các mục; chỉ break-inside:avoid cho khối nhỏ', () => {
    const h = buildReportHtml(b32Report(), B32_AI, null, { now: NOW });
    expect(h).not.toMatch(FORCED_BREAK);
    expect(h).toContain('break-inside:avoid');
    expect(h).not.toMatch(/\.cover\{[^}]*height:/); // bìa nén: không chiếm nguyên trang
  });

  it('fallback jsPDF: 5–6 trang, trang giữa lấp ≥ 85%, trang cuối ≥ 40%', () => {
    const metrics: { pages: number[] } = { pages: [] };
    const buf = buildExecutiveReportPdf(b32Report(), B32_AI, { now: NOW, metrics });
    expect(buf).not.toBeNull();
    const pages = metrics.pages;
    expect(pages.length).toBeGreaterThanOrEqual(5);
    expect(pages.length).toBeLessThanOrEqual(6);
    pages.slice(1, -1).forEach((p) => expect(p).toBeGreaterThanOrEqual(85));
    expect(pages[pages.length - 1]).toBeGreaterThanOrEqual(40);
  });

  it('Command Center HTML: không ép ngắt trang giữa các mục (bìa/mục lục/kết luận chảy liên tục)', () => {
    const k: any = { totalClubs: 1, activeClubs: 1, suspendedClubs: 0, totalMembers: 2, activeUsers: 1, logins24h: 1, mrr: 0, revenueInRange: 0, paidSubscribers: 0, aiRequests: 0, aiCost: 0 };
    const data: any = {
      range: { key: '30d' }, clubId: null, kpi: k,
      business: { revenue: { month: 0, quarter: 0, year: 0, mrr: 0, arr: 0 }, subscription: { paidSubscribers: 0, expiringSoon: 0, expired: 0, upgradesInRange: 0, plans: [] } },
      operations: { clubs: { new: 0 }, members: { new: 0, registrations: 0, attendance: 0 }, business: { fundPeriods: 0, sessions: 0, minigames: 0, matches: 0, reportsExported: 0 } },
      finance: { totalIncome: 0, totalExpense: 0, totalBalance: 0, pendingExpenses: 0, debt: 0, overdueCount: 0, overdueAmount: 0, onTimeRatio: 0 },
      ai: { agents: { maika: { insights: 0 }, lisa: { messages: 0 }, hermes: { runs: 0 }, mitDac: { executed: 0 }, notification: { sent: 0 } }, totals: { requests: 0, successRate: 0, errors: 0, tokens: 0, cost: 0 } },
      infra: { uptimeSeconds: 1, cpu: { pct: 1 }, memory: { pct: 1 }, db: { status: 'up' }, disk: { pct: 1 }, storage: { usedMb: 1 }, queue: { pending: 0 }, dbConnections: 1, activeSessions: 1, requestsPerMin: 1, errorRate: 0, backup: { success: true } },
      alerts: [], leaderboards: null, syslog: { total: 0, byAction: [], recent: [] },
    };
    const t = 'x';
    const h = buildCommandCenterHtml(data, { overview: t, business: t, operations: t, finance: t, ai: t, infra: t, alerts: t, leaderboards: t, syslog: t, conclusion: t }, '02/10/2026 12:59');
    expect(h).not.toMatch(FORCED_BREAK);
  });
});
