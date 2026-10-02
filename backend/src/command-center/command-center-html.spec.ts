import { buildCommandCenterHtml } from './command-center-html';
import { COLORS, MIN_FONT_PT, contrast, makeBrand, makeGlassPalette, washColors } from '../executive-report/export-tokens';

const data: any = {
  range: { key: '30d' },
  clubId: null,
  kpi: { totalClubs: 12, activeClubs: 10, suspendedClubs: 1, totalMembers: 420, activeUsers: 300, logins24h: 88, mrr: 4500000, revenueInRange: 9800000, paidSubscribers: 7, aiRequests: 1200, aiCost: 0.12 },
  business: { revenue: { month: 1, quarter: 2, year: 3, mrr: 4, arr: 5 }, subscription: { paidSubscribers: 7, expiringSoon: 2, expired: 1, upgradesInRange: 1, plans: [{ name: 'Pro', count: 5 }] } },
  operations: { clubs: { new: 2 }, members: { new: 30, registrations: 100, attendance: 80 }, business: { fundPeriods: 12, sessions: 50, minigames: 3, matches: 20, reportsExported: 9 } },
  finance: { totalIncome: 20000000, totalExpense: 15000000, totalBalance: 5000000, pendingExpenses: 2, debt: 1200000, overdueCount: 3, overdueAmount: 900000, onTimeRatio: 82 },
  ai: { agents: { maika: { insights: 10 }, lisa: { messages: 20 }, hermes: { runs: 30 }, mitDac: { executed: 5 }, notification: { sent: 40 } }, totals: { requests: 100, successRate: 97, errors: 3, tokens: 12345, cost: 0.5 } },
  infra: { uptimeSeconds: 99999, cpu: { pct: 20 }, memory: { pct: 55 }, db: { status: 'up' }, disk: { pct: 40 }, storage: { usedMb: 120 }, queue: { pending: 1 }, dbConnections: 5, activeSessions: 12, requestsPerMin: 33, errorRate: 0.2, backup: { success: true } },
  alerts: [{ severity: 'critical', source: 'DB', title: 'Disk gần đầy' }],
  leaderboards: null,
  syslog: { total: 0, byAction: [], recent: [] },
};
const para = 'Ổn định.';
const sections: any = { overview: para, business: para, operations: para, finance: para, ai: para, infra: para, alerts: para, leaderboards: para, syslog: para, conclusion: 'Tốt.\nP1: Gia hạn gói.' };

describe('command-center-html (palette SINH ĐỘNG)', () => {
  const html = buildCommandCenterHtml(data, sections, '02/10/2026 12:59').replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,');

  it('LIQUID GLASS: bìa băng gradient chữ trắng, header bảng kính, wash nền, KPI theo tông', () => {
    expect(contrast('#FFFFFF', makeGlassPalette(makeBrand(null)).mastWorst)).toBeGreaterThanOrEqual(4.5);
    expect(html).toMatch(/\.cover \.cv-panel\{[^}]*background:var\(--mast-bg\);color:#fff/);
    expect(html).toMatch(/\.tbl th\{[^}]*background:linear-gradient\([^}]*var\(--mast-mid\);color:#fff/);
    expect(html).toContain('<div class="wash"></div>');
    expect(html).toContain('class="k tn-pos"><div class="k-l">MRR');
    expect(html).toContain('class="k tn-neg"><div class="k-l">CLB bị khóa');
    expect(html).toContain('class="sev crit"');
  });

  it('chữ ≥ 7pt, không backdrop-filter/emoji, hex thuộc token', () => {
    const sizes = [...html.matchAll(/font-size:\s*([\d.]+)pt/g)].map((x) => parseFloat(x[1]));
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(MIN_FONT_PT);
    expect(html).toMatch(/box-shadow/);
    expect(html).not.toMatch(/backdrop-filter|drop-shadow/);
    expect(html).not.toMatch(/[◆▲▼★⚠✓✨🏓🎮]/u);
    const b = makeBrand(null);
    const allowed = new Set<string>([...Object.values(COLORS), b.brand, b.brandDeep, b.brandInk, b.brandSoft, b.brandBorder, b.badge, '#FFFFFF', ...Object.values(washColors(b)), ...Object.values(makeGlassPalette(b)).filter((v) => v.startsWith('#'))].map((c) => c.toUpperCase()));
    for (const m of html.matchAll(/#[0-9a-fA-F]{6}\b/g)) expect(allowed.has(m[0].toUpperCase())).toBe(true);
  });
});
