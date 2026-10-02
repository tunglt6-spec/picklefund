import {
  COLORS,
  DOC_TITLE,
  FALLBACK_CLUB,
  docCode,
  dateTimeVN,
  footerLeftText,
  vnd,
  vndCompact,
} from './export-tokens';

/**
 * View-model DÙNG CHUNG cho bản Chrome (executive-report-html.ts) và fallback jsPDF
 * (executive-report-pdf.ts): cùng chuỗi, cùng thứ tự mục, cùng quy tắc màu semantic → MỘT ngôn ngữ thiết kế.
 */
export interface Tone {
  text: string; // màu CHỮ (AA)
  fill: string; // màu chấm/thanh
  tint: string; // nền nhấn
  vivid: string; // màu SỐ ĐẬM cỡ lớn (≥ 3:1 trên trắng)
}

/** Điểm sức khỏe → tông semantic (chữ dùng bản đậm AA, KHÔNG dùng màu nhạt làm chữ). */
export function healthTone(v: number): Tone {
  if (v >= 80) return { text: COLORS.pos, fill: COLORS.posFill, tint: COLORS.posTint, vivid: COLORS.posVivid };
  if (v >= 65) return { text: COLORS.info, fill: COLORS.infoFill, tint: COLORS.infoTint, vivid: COLORS.infoFill };
  if (v >= 50) return { text: COLORS.warn, fill: COLORS.warnFill, tint: COLORS.warnTint, vivid: COLORS.orange };
  return { text: COLORS.neg, fill: COLORS.negFill, tint: COLORS.negTint, vivid: COLORS.negVivid };
}

/** Nhóm màu số liệu: pos xanh (thu) / neg đỏ (chi, âm) / brand tím / info cyan / warn cam / ink trung tính. */
export type NumTone = 'pos' | 'neg' | 'brand' | 'info' | 'warn' | 'ink';
/** Số tiền âm ("-80.000 đ") luôn là neg dù tone gốc là gì. */
export const toneOfValue = (v: string, base: NumTone): NumTone => (v.trim().startsWith('-') ? 'neg' : base);
/** Dấu số tiền → tone: âm = neg, 0 = ink, dương = pos. */
export const signTone = (v: string): NumTone => (v.trim().startsWith('-') ? 'neg' : /^[+]?0(\s|$)/.test(v.trim()) ? 'ink' : 'pos');

export const gradeOf = (v: number) =>
  v >= 90 ? 'Xuất sắc' : v >= 80 ? 'Rất tốt' : v >= 65 ? 'Tốt' : v >= 50 ? 'Cần cải thiện' : 'Cần chú ý';

const TITLE_SKIP = /^(clb|câu|lạc|bộ|club)$/i;
/** Monogram từ tên CLB: tối đa 2 chữ cái đầu của các từ có nghĩa (bỏ "CLB", "Câu lạc bộ"). */
export function monogram(clubName: string): string {
  const words = String(clubName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const sig = words.filter((w) => !TITLE_SKIP.test(w));
  const use = (sig.length ? sig : words).slice(0, 2);
  const out = use.map((w) => Array.from(w)[0]?.toUpperCase() ?? '').join('');
  return out || 'C';
}

export interface ExecModel {
  clubName: string;
  brandLabel: string; // IN HOA, fallback PICKLEFUND
  periodName: string;
  code: string;
  exportedAt: string;
  footerLeft: string;
  mono: string;
  health: number;
  grade: string;
  tone: Tone;
  avgHealth: number;
  coverStats: Array<{ l: string; v: string; s: string; tone: NumTone }>;
  dims: Array<{ label: string; score: number | null }>;
  kpis: Array<{ l: string; v: string; s: string; accent?: boolean; tone: NumTone }>;
  aiText: string;
  finRows: Array<{ label: string; value: string; delta?: number | null; tone: NumTone }>;
  trends: Array<{ name: string; label: string; thu: number; chi: number; thuLabel: string; chiLabel: string }>;
  members: Array<{
    rank: number;
    name: string;
    rate: string;
    pay: 'paid' | 'debt' | null;
    stars: number;
    conduct: string;
    health: number;
  }>;
  dist: Array<{ label: string; value: number; fill: string }>;
  forecast: { tiles: Array<{ l: string; v: string; tone: NumTone }>; callout: string; note: string };
  dna: { archetype: string; traits: Array<{ label: string; score: number | null }> };
  activity: {
    kpis: Array<{ l: string; v: string; tone: NumTone }>;
    busiest: string | null;
    emptiest: string | null;
  };
  tournament: { tiles: Array<{ l: string; v: string; tone: NumTone }>; top: Array<{ rank: number; name: string; stat: string }> };
  agentsHeading: string;
  agents: Array<{ name: string; value: string; unit: string; detail: string; accent: string }>;
  timeline: Array<{ date: string; text: string; amount: string | null; fill: string }>;
  alerts: string[];
  recs: Array<{ agent: string; text: string }>;
}

/** Nhãn cột biểu đồ gọn: "B32 - Tháng 06/2026" → "06/2026" (không khớp → giữ nguyên). */
export function shortPeriod(name: string): string {
  const mt = /(\d{1,2})\s*\/\s*(\d{4})/.exec(name);
  return mt ? `${mt[1].padStart(2, '0')}/${mt[2]}` : name;
}

const d2 = (d: any) => {
  const x = new Date(d);
  return isNaN(x.getTime())
    ? ''
    : `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`;
};

export function buildExecModel(
  report: any,
  aiText: string,
  now: Date = new Date(),
  brandFill = '#6D5DFB',
): ExecModel {
  const s = report.summary;
  const fin = report.finance;
  const cmp = fin.compare;
  const ai = report.ai;
  const tour = report.tournament;
  const act = report.activity;
  const fc = report.forecast;
  const health = Number.isFinite(s.clubHealthScore) ? s.clubHealthScore : 0;
  const avgHealth = Number.isFinite(report.members?.avgHealth) ? report.members.avgHealth : 0;
  const clubName = String(report.meta.clubName || '').trim();
  const code = docCode(now);
  const di = report.members.distribution || {};
  const ch = ai.notification.byChannel || {};

  return {
    clubName,
    brandLabel: clubName.toUpperCase() || FALLBACK_CLUB.toUpperCase(),
    periodName: String(report.meta.periodName ?? ''),
    code,
    exportedAt: dateTimeVN(now),
    footerLeft: footerLeftText(clubName, DOC_TITLE, code),
    mono: monogram(clubName),
    health,
    grade: gradeOf(health),
    tone: healthTone(health),
    avgHealth,
    coverStats: [
      { l: 'Sức khỏe CLB', v: `${health}/100`, s: gradeOf(health), tone: health >= 80 ? 'pos' : health >= 65 ? 'info' : health >= 50 ? 'warn' : 'neg' },
      { l: 'Tổng tài sản', v: vndCompact(fin.clubAssets), s: 'quỹ cuối kỳ', tone: toneOfValue(vndCompact(fin.clubAssets), 'brand') },
      { l: 'Thành viên', v: `${s.activeMembers}/${s.totalMembers}`, s: 'đang hoạt động', tone: 'brand' },
    ],
    dims: (report.health.dimensions || []).map((d: any) => ({ label: String(d.key), score: d.score ?? null })),
    kpis: [
      { l: 'Thành viên', v: `${s.activeMembers}/${s.totalMembers}`, s: 'đang hoạt động', tone: 'brand' },
      { l: 'Tỷ lệ tham gia', v: `${s.participationRate}%`, s: 'điểm danh / sĩ số', tone: 'info' },
      { l: 'Buổi chơi', v: String(s.completedSessions), s: `${s.cancelledSessions} hủy`, tone: 'brand' },
      { l: 'Giải / Minigame', v: String(s.tournamentsCount), s: 'trong kỳ', tone: 'warn' },
      { l: 'Tổng thu', v: vnd(fin.totalIncome), s: '', tone: 'pos' },
      { l: 'Tổng chi', v: vnd(fin.totalExpense), s: '', tone: 'neg' },
      { l: 'Tổng tài sản', v: vnd(fin.clubAssets), s: 'quỹ cuối kỳ', accent: true, tone: toneOfValue(vnd(fin.clubAssets), 'brand') },
      { l: 'Công nợ', v: `${s.outstandingCount} TV`, s: 'chưa đủ đóng', tone: Number(s.outstandingCount) > 0 ? 'warn' : 'pos' },
    ],
    aiText: String(aiText || '').trim(),
    finRows: [
      { label: 'Tổng thu', value: vnd(fin.totalIncome), delta: cmp?.incomeDeltaPct, tone: 'pos' },
      { label: 'Tổng chi', value: vnd(fin.totalExpense), delta: cmp?.expenseDeltaPct, tone: 'neg' },
      { label: 'Cân đối kỳ', value: vnd(fin.balance), delta: cmp?.balanceDeltaPct, tone: signTone(vnd(fin.balance)) },
      { label: 'Quỹ đầu kỳ', value: vnd(fin.carryForward), tone: toneOfValue(vnd(fin.carryForward), 'brand') },
      { label: 'Tổng tài sản (cuối kỳ)', value: vnd(fin.clubAssets), tone: toneOfValue(vnd(fin.clubAssets), 'brand') },
      { label: 'Thu bình quân / thành viên', value: vnd(fin.avgIncomePerMember), tone: 'info' },
    ],
    trends: (fin.trends || []).map((t: any) => ({
      name: String(t.name),
      label: shortPeriod(String(t.name)),
      thu: Number(t.thu) || 0,
      chi: Number(t.chi) || 0,
      thuLabel: vndCompact(t.thu, true),
      chiLabel: vndCompact(t.chi, true),
    })),
    members: (report.members.all || []).map((m: any, i: number) => ({
      rank: i + 1,
      name: String(m.name),
      rate: `${m.participationRate}%`,
      pay: m.paymentStatus === 'paid' ? 'paid' : m.paymentStatus === 'debt' ? 'debt' : null,
      stars: Math.max(0, Math.min(5, Math.round(Number(m.stars ?? 0) || 0))),
      conduct: m.conductScore == null ? '—' : String(m.conductScore),
      health: Number(m.healthScore) || 0,
    })),
    dist: [
      { label: 'Xuất sắc (≥90)', value: di.excellent ?? 0, fill: COLORS.posFill },
      { label: 'Tốt (80–89)', value: di.good ?? 0, fill: COLORS.infoFill },
      { label: 'Khá (50–79)', value: di.fair ?? 0, fill: COLORS.warnFill },
      { label: 'Cần quan tâm (<50)', value: di.atRisk ?? 0, fill: COLORS.negFill },
    ],
    forecast: {
      tiles: [
        { l: '+30 ngày', v: vnd(fc.projected30), tone: signTone(vnd(fc.projected30)) },
        { l: '+60 ngày', v: vnd(fc.projected60), tone: signTone(vnd(fc.projected60)) },
        { l: '+90 ngày', v: vnd(fc.projected90), tone: signTone(vnd(fc.projected90)) },
      ],
      callout: `${fc.trendLabel} · dòng tiền khoảng ${vnd(fc.dailyNet)}/ngày.`,
      note: String(fc.note ?? ''),
    },
    dna: {
      archetype: String(report.dna.archetype ?? ''),
      traits: (report.dna.traits || []).map((t: any) => ({ label: String(t.key), score: t.score ?? null })),
    },
    activity: {
      kpis: [
        { l: 'Tổng buổi', v: String(act.totalSessions), tone: 'brand' },
        { l: 'Hoàn thành', v: String(act.completed), tone: 'pos' },
        { l: 'Bị hủy', v: String(act.cancelled), tone: Number(act.cancelled) > 0 ? 'neg' : 'ink' },
        { l: 'TB người / buổi', v: String(act.avgPresentPerSession), tone: 'info' },
      ],
      busiest: act.busiest ? `${act.busiest.name} (${act.busiest.present} người)` : null,
      emptiest: act.emptiest ? `${act.emptiest.name} (${act.emptiest.present} người)` : null,
    },
    tournament: {
      tiles: [
        { l: 'Giải', v: String(tour.tournamentsCount), tone: 'warn' },
        { l: 'Trận', v: String(tour.matchesCount), tone: 'brand' },
        { l: 'Đội', v: String(tour.teamsCount), tone: 'info' },
      ],
      top: (tour.topPlayers || []).slice(0, 3).map((p: any, i: number) => ({
        rank: i + 1,
        name: String(p.name),
        stat: `${p.wins}T · ${p.winRate}%`,
      })),
    },
    agentsHeading: `Trong kỳ · điểm tự động hóa ${ai.automationScore.score}/100`,
    agents: [
      { name: 'Hermes', value: `${ai.hermes.completed}/${ai.hermes.runs}`, unit: 'workflow', detail: `${ai.hermes.failed} lỗi · ${ai.hermes.running ?? 0} đang chạy`, accent: brandFill },
      { name: 'Lisa', value: String(ai.lisa.answered), unit: 'hỏi–đáp', detail: `${ai.lisa.reminders} lượt nhắc`, accent: COLORS.infoFill },
      { name: 'Maika', value: String(ai.maika.insights), unit: 'insight', detail: `${ai.maika.actions} đề xuất`, accent: COLORS.posFill },
      { name: 'Mít Đặc', value: String(ai.mitdac.executed), unit: 'tác vụ', detail: `${ai.mitdac.failed} lỗi · TB ${ai.mitdac.avgMs}ms`, accent: COLORS.orange },
      { name: 'Thông báo', value: String(ai.notification.sent), unit: 'đã gửi', detail: `App ${ch.IN_APP ?? 0} · Mail ${ch.EMAIL ?? 0} · TG ${ch.TELEGRAM ?? 0}`, accent: COLORS.warnFill },
    ],
    timeline: (report.timeline || []).map((t: any) => ({
      date: d2(t.date),
      text: String(t.label ?? ''),
      amount: t.amount != null ? vnd(t.amount) : null,
      fill: t.type === 'income' ? COLORS.posFill : t.type === 'expense' ? COLORS.negFill : brandFill,
    })),
    alerts: (report.alerts || []).map((a: any) => String(a.message)),
    recs: (report.recommendations || []).map((r: any) => ({ agent: String(r.agent), text: String(r.text) })),
  };
}

/** Nhãn delta "+12%" / "-5%" (không glyph ngoài font). */
export const deltaText = (v: number) => `${v >= 0 ? '+' : '-'}${Math.abs(v)}%`;
