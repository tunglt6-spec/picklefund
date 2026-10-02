import { buildReportHtml, esc } from './executive-report-html';

// Báo cáo tối thiểu đủ trường để buildReportHtml chạy (số liệu không quan trọng ở đây).
function report(clubName: string): any {
  return {
    meta: { clubName, periodName: 'Kỳ 03/2026' },
    summary: {
      clubHealthScore: 78,
      activeMembers: 38,
      totalMembers: 40,
      participationRate: 82,
      outstandingCount: 3,
      completedSessions: 12,
      cancelledSessions: 1,
      tournamentsCount: 2,
    },
    finance: {
      totalIncome: 1000,
      totalExpense: 500,
      balance: 500,
      carryForward: 0,
      clubAssets: 500,
      avgIncomePerMember: 25,
      trends: [{ name: 'T1', thu: 1000, chi: 500 }],
      compare: { incomeDeltaPct: 1, expenseDeltaPct: 2, balanceDeltaPct: null },
    },
    members: {
      avgHealth: 70,
      distribution: { excellent: 1, good: 1, fair: 1, atRisk: 1 },
      all: [],
    },
    dna: { archetype: 'x', traits: [] },
    health: { dimensions: [] },
    ai: {
      hermes: { completed: 1, runs: 1, failed: 0, running: 0 },
      lisa: { answered: 1, reminders: 0 },
      maika: { insights: 1, actions: 0 },
      mitdac: { executed: 1, failed: 0, avgMs: 1 },
      notification: { sent: 1, byChannel: {} },
      automationScore: { score: 50 },
    },
    tournament: { tournamentsCount: 0, teamsCount: 0, matchesCount: 0, topPlayers: [] },
    activity: {
      totalSessions: 1,
      completed: 1,
      cancelled: 0,
      avgPresentPerSession: 1,
      busiest: null,
      emptiest: null,
    },
    forecast: {
      dailyNet: 0,
      note: 'n',
      projected30: 0,
      projected60: 0,
      projected90: 0,
      trendLabel: 'Ổn định',
    },
    timeline: [],
    alerts: [{ message: 'Quỹ âm <script>alert(1)</script> "x" \'y\'' }],
    recommendations: [],
    generatedAt: '2026-03-31',
  };
}

describe('executive-report-html', () => {
  describe('esc', () => {
    it('escape & < > " \'', () => {
      expect(esc(`<a href="x" title='y'>&</a>`)).toBe(
        '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
      );
    });

    it('null/undefined → chuỗi rỗng', () => {
      expect(esc(null)).toBe('');
      expect(esc(undefined)).toBe('');
    });
  });

  describe('buildReportHtml', () => {
    it('nhãn thương hiệu dùng tên CLB (escape), không còn PICKLEFUND cứng', () => {
      const html = buildReportHtml(report('CLB Thăng Long'), 'AI');
      expect(html).toContain('◆ CLB THĂNG LONG');
      expect(html).not.toContain('◆ PICKLEFUND');
    });

    it('thiếu tên CLB → fallback PICKLEFUND', () => {
      const html = buildReportHtml(report(''), 'AI');
      expect(html).toContain('◆ PICKLEFUND');
    });

    it('tên CLB chứa HTML/ngoặc kép bị vô hiệu ở mọi vị trí', () => {
      const html = buildReportHtml(report('<img src=x onerror=alert(1)>"\''), '<script>1</script>');
      expect(html).not.toContain('<img src=x');
      expect(html).not.toContain('<script>1');
      expect(html).not.toContain('<script>alert(1)');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;');
    });
  });
});
