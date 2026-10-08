/**
 * HTML in-ấn A4 cho "Trung tâm điều hành PickleFund" (Command Center) — chuẩn LIQUID GLASS (nền wash + orb, tấm kính, băng bìa gradient),
 * render bằng headless Chrome (Puppeteer). Có TRANG BÌA riêng + mỗi khối page-break-inside:avoid (không cắt chữ, co
 * gọn trong trang A4). Kèm ô "Maika nhận định" cho từng mục. Font BeVietnamPro base64 (tiếng Việt).
 */
import { loadFontsBase64 } from '../executive-report/export-fonts';
import { COLORS, GLASS, PAGE, PAGE_CSS, SPACE, TYPE, escHtml, glassCss, glassTint, makeBrand, mm, pt, rgba, softShadow, vnd } from '../executive-report/export-tokens';

export const esc = escHtml;
const money = (n: number | null | undefined) => (n == null ? '—' : vnd(n));
const num = (n: number | null | undefined) => (n == null ? '—' : new Intl.NumberFormat('vi-VN').format(Number(n) || 0));
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n}%`);
const fmtUptime = (sec?: number | null) => {
  if (sec == null) return '—';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const RANGE_LABEL: Record<string, string> = { today: 'Hôm nay', '7d': '7 ngày', '30d': '30 ngày', quarter: 'Quý', year: 'Năm', custom: 'Tùy chỉnh' };

type Sections = Record<'overview' | 'business' | 'operations' | 'finance' | 'ai' | 'infra' | 'alerts' | 'leaderboards' | 'syslog' | 'conclusion', string>;

/** Ô nhận định của Maika (AI). Tách thành nhiều đoạn <p> block để ngắt trang an toàn (không đè dòng). */
function maikaBox(text: string): string {
  if (!text) return '';
  const paras = String(text)
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `<div class="maika"><div class="maika-h"><span class="maika-dot"></span>Maika nhận định</div><div class="maika-body">${paras || `<p>${esc(text)}</p>`}</div></div>`;
}
/** Tông số liệu theo ngữ nghĩa nhãn: thu/thành công = xanh, chi/lỗi/nợ = đỏ, chờ/sắp hết hạn = cam, AI = cyan, còn lại = tím. */
type Tone = 'pos' | 'neg' | 'warn' | 'info' | 'brand';
function toneOf(label: string, value: string): Tone {
  if (value.trim().startsWith('-')) return 'neg';
  if (/lỗi|công nợ|quá hạn|đã hết hạn|bị khóa|5xx|chi phí|tổng chi/i.test(label)) return 'neg';
  if (/sắp hết hạn|chờ duyệt|hàng đợi|chờ/i.test(label)) return 'warn';
  if (/thu|doanh thu|mrr|arr|thành công|nâng cấp|uptime|trả phí/i.test(label)) return 'pos';
  if (/ai|token|request|maika|lisa|hermes|mít đặc|notification/i.test(label)) return 'info';
  return 'brand';
}
function kpi(label: string, value: string, sub?: string): string {
  return `<div class="k tn-${toneOf(label, value)}"><div class="k-l">${esc(label)}</div><div class="k-v">${esc(value)}</div>${sub ? `<div class="k-s">${esc(sub)}</div>` : ''}</div>`;
}
function section(title: string, bodyHtml: string, narrative: string): string {
  return `<div class="sect"><h2>${esc(title)}</h2>${bodyHtml}${maikaBox(narrative)}</div>`;
}

/** Trang kết: tách phần mở đầu (prose) và các dòng khuyến nghị "P1:/P2:…" thành danh sách ưu tiên. */
function buildConclusion(text: string): string {
  if (!text) return '';
  const lines = String(text).split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const intro: string[] = [];
  const recs: Array<{ p: string; body: string }> = [];
  const pRe = /^P\s*(\d+)\s*[:.\-)]\s*(.*)$/i;
  for (const line of lines) {
    const m = line.match(pRe);
    if (m && m[2]) recs.push({ p: `P${m[1]}`, body: m[2] });
    else if (!recs.length) intro.push(line);
  }
  const introHtml = intro.map((p) => `<p>${esc(p)}</p>`).join('') || `<p>${esc(text)}</p>`;
  const recsHtml = recs
    .map((r) => `<div class="rec"><span class="rec-p">${esc(r.p)}</span><div class="rec-tx">${esc(r.body)}</div></div>`)
    .join('');
  return `<section class="concl">
    <div class="concl-eyb">Tổng kết</div>
    <div class="concl-h">Kết luận &amp; Khuyến nghị ưu tiên</div>
    <div class="concl-intro">${introHtml}</div>
    ${recs.length ? `<div class="concl-recs-t">Khuyến nghị ưu tiên</div>${recsHtml}` : ''}
  </section>`;
}

export function buildCommandCenterHtml(data: any, sections: Sections, exportedAt: string): string {
  const fonts = loadFontsBase64();
  const B = makeBrand(null); // Command Center = báo cáo nền tảng → màu thương hiệu mặc định
  const fontFace = fonts
    ? `@font-face{font-family:'BVP';font-weight:400;src:url(data:font/ttf;base64,${fonts.regular}) format('truetype');}
       @font-face{font-family:'BVP';font-weight:700;src:url(data:font/ttf;base64,${fonts.bold}) format('truetype');}`
    : '';
  const fam = fonts ? "'BVP','Be Vietnam Pro',Arial,sans-serif" : "'Be Vietnam Pro',Arial,sans-serif";

  const k = data.kpi, biz = data.business, ops = data.operations, fin = data.finance, ai = data.ai, infra = data.infra, lb = data.leaderboards;
  const rangeLabel = RANGE_LABEL[data.range?.key] ?? '';

  // Cover — sạch, nằm trong lề in; 1 băng kính gradient duy nhất; không glyph ngoài font.
  const cover = `<section class="cover">
    <div class="cv-head">
      <span class="cv-brand">PICKLEFUND</span>
      <span class="cv-tag">Command Center</span>
    </div>
    <div class="cv-mid">
      <div class="cv-panel">
        <div class="cv-eyb">Trung tâm điều hành · Báo cáo định kỳ</div>
        <h1 class="cv-title">Báo cáo điều hành<br/>toàn hệ thống</h1>
        <div class="cv-rule"></div>
        <div class="cv-period">Phạm vi dữ liệu: ${esc(rangeLabel)}${data.clubId ? ' · 1 CLB' : ' · Toàn hệ thống'}</div>
      </div>
      <div class="cv-stats">
        <div class="gcard tn-brand"><div class="l">Tổng CLB</div><div class="v">${num(k.totalClubs)}</div><div class="s">${num(k.activeClubs)} hoạt động</div></div>
        <div class="gcard tn-info"><div class="l">Thành viên</div><div class="v">${num(k.totalMembers)}</div><div class="s">${num(k.logins24h)} đăng nhập 24h</div></div>
        <div class="gcard tn-pos"><div class="l">MRR</div><div class="v">${money(k.mrr)}</div><div class="s">${num(k.paidSubscribers)} CLB trả phí</div></div>
      </div>
    </div>
    <div class="cv-foot"><span>Tổng quan kinh doanh · vận hành · AI · hạ tầng</span><span>Xuất: ${esc(exportedAt)}</span></div>
  </section>`;

  // Mục lục (trang 2)
  const tocItems: Array<[string, string]> = [
    ['Tổng quan hệ thống', 'Chỉ số KPI toàn nền tảng'],
    ['Kinh doanh & Thuê bao', 'Doanh thu, MRR/ARR, cơ cấu gói dịch vụ'],
    ['Hoạt động toàn hệ thống', 'CLB, thành viên, buổi chơi, giải đấu'],
    ['Tổng hợp tài chính toàn nền tảng', 'Thu/chi, số dư quỹ, công nợ'],
    ['AIDO AI Operations', 'Hoạt động & chi phí các trợ lý AI'],
    ['Sức khỏe hạ tầng', 'CPU, RAM, database, disk, hàng đợi, backup'],
    ['Cảnh báo điều hành', 'Rủi ro & việc cần xử lý trong kỳ'],
    ['Bảng xếp hạng điều hành', 'Top CLB theo nhiều tiêu chí'],
    ['Nhật ký hệ thống & Kiểm toán', 'Audit log & phân tích an toàn hệ thống'],
  ];
  const toc = `<section class="toc">
    <div class="toc-eyb">Nội dung báo cáo</div>
    <div class="toc-h">Mục lục</div>
    <div class="toc-sub">Phạm vi dữ liệu: ${esc(rangeLabel)}${data.clubId ? ' · 1 CLB' : ' · Toàn hệ thống'} · Xuất ${esc(exportedAt)}</div>
    <ol class="toc-list">
      ${tocItems.map(([t, d], i) => `<li class="toc-item"><span class="toc-n">${String(i + 1).padStart(2, '0')}</span><span class="toc-tx"><div class="toc-t">${esc(t)}</div><div class="toc-d">${esc(d)}</div></span></li>`).join('')}
    </ol>
  </section>`;

  // 1. Tổng quan (KPI) + AIDO Executive Summary (đồng bộ với màn hình)
  const sm = data.summary;
  const smList = (items: string[]) => `<ul>${(items ?? []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  const execSummary = sm
    ? `<div class="exec"><div class="exec-t">AIDO Executive Summary</div><div class="grid3">
        <div class="ec tn-brand"><div class="ec-h">Hiện trạng</div>${smList(sm.status)}</div>
        <div class="ec tn-warn"><div class="ec-h">Rủi ro</div>${(sm.risks ?? []).length ? smList(sm.risks) : '<p class="mut">Không có rủi ro đáng kể.</p>'}</div>
        <div class="ec tn-pos"><div class="ec-h">Ưu tiên</div>${smList(sm.priorities)}</div>
      </div></div>`
    : '';
  const overviewBody = `<div class="grid4">
    ${kpi('Tổng CLB', num(k.totalClubs))}${kpi('CLB hoạt động', num(k.activeClubs))}${kpi('CLB bị khóa', num(k.suspendedClubs))}${kpi('Tổng thành viên', num(k.totalMembers))}
    ${kpi('Người dùng hoạt động', num(k.activeUsers))}${kpi('Đăng nhập 24h', num(k.logins24h))}${kpi('MRR', money(k.mrr))}${kpi(`Doanh thu (${rangeLabel})`, money(k.revenueInRange))}
    ${kpi('Thuê bao trả phí', num(k.paidSubscribers))}${kpi('AI Request', num(k.aiRequests))}${kpi('Chi phí AI', k.aiCost != null ? `$${Number(k.aiCost).toFixed(4)}` : '—')}${kpi('Uptime', fmtUptime(infra.uptimeSeconds))}
  </div>${execSummary}`;

  // 2. Kinh doanh — KPI + xu hướng 6 tháng + cơ cấu thuê bao (như màn hình)
  const trend: any[] = fin.trend ?? [];
  const tMax = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense, t.revenue].map((v) => Number(v) || 0)));
  const bar = (v: number, c: string) => `<i style="height:${Math.max(1, Math.round(((Number(v) || 0) / tMax) * 100))}%;background:${c}"></i>`;
  const trendChart = trend.length
    ? `<div class="chart"><div class="chart-t">Doanh thu &amp; thu/chi 6 tháng</div>
        <div class="bars">${trend.map((t) => `<div class="bgp"><div class="bb">${bar(t.revenue, B.brand)}${bar(t.income, COLORS.infoFill)}${bar(t.expense, COLORS.warnFill)}</div><div class="bl">${esc(t.label)}</div></div>`).join('')}</div>
        <div class="legend"><span><b style="background:${B.brand}"></b>Doanh thu</span><span><b style="background:${COLORS.infoFill}"></b>Thu quỹ</span><span><b style="background:${COLORS.warnFill}"></b>Chi</span></div></div>`
    : '';
  const plans: any[] = biz.subscription.plans ?? [];
  const planTotal = plans.reduce((a, x) => a + (Number(x.count) || 0), 0) || 1;
  const plansBlock = `<div class="chart"><div class="chart-t">Cơ cấu gói · ${num(biz.subscription.paidSubscribers)} CLB trả phí</div>
    ${plans.map((p) => { const w = Math.round(((Number(p.count) || 0) / planTotal) * 100); return `<div class="pl"><div class="pl-h"><span>${esc(p.name)}</span><span>${num(p.count)} · ${w}%</span></div><div class="pl-b"><i style="width:${w}%"></i></div></div>`; }).join('')}</div>`;
  const businessBody = `<div class="grid4">
    ${kpi('Doanh thu hôm nay', money(biz.revenue.today))}${kpi('Doanh thu tháng', money(biz.revenue.month))}${kpi('Doanh thu quý', money(biz.revenue.quarter))}${kpi('Doanh thu năm', money(biz.revenue.year))}
    ${kpi('MRR', money(biz.revenue.mrr))}${kpi('ARR', money(biz.revenue.arr))}${kpi('Thuê bao trả phí', num(biz.subscription.paidSubscribers))}${kpi('Nâng cấp trong kỳ', num(biz.subscription.upgradesInRange))}
    ${kpi('Sắp hết hạn', num(biz.subscription.expiringSoon))}${kpi('Đã hết hạn', num(biz.subscription.expired))}${kpi('Hủy trong kỳ', num(biz.subscription.cancellationsInRange))}
  </div>
  <div class="grid2 gap-top">${trendChart}${plansBlock}</div>`;

  // 3. Hoạt động
  const operationsBody = `<div class="grid4">
    ${kpi('CLB mới', num(ops.clubs.new))}${kpi('Thành viên mới', num(ops.members.new))}${kpi('Lượt đăng ký buổi', num(ops.members.registrations))}${kpi('Lượt điểm danh', num(ops.members.attendance))}
    ${kpi('Kỳ quỹ', num(ops.business.fundPeriods))}${kpi('Buổi chơi', num(ops.business.sessions))}${kpi('Giải đấu/Minigame', num(ops.business.minigames))}${kpi('Trận đấu', num(ops.business.matches))}
    ${kpi('Báo cáo đã xuất', num(ops.business.reportsExported))}
  </div>`;

  // 4. Tài chính
  const trendRows = trend.map((t) => `<tr><td>${esc(t.label)}</td><td class="r">${money(t.revenue)}</td><td class="r">${money(t.income)}</td><td class="r">${money(t.expense)}</td></tr>`).join('');
  const financeBody = `<div class="grid4">
    ${kpi('Tổng thu ghi nhận', money(fin.totalIncome))}${kpi('Tổng chi ghi nhận', money(fin.totalExpense))}${kpi('Tổng số dư quỹ', money(fin.totalBalance))}${kpi('Chi chờ duyệt', num(fin.pendingExpenses))}
    ${kpi('Thu trong kỳ', money(fin.incomeInRange))}${kpi('Chi trong kỳ', money(fin.expenseInRange))}${kpi('Tổng công nợ', money(fin.debt), fin.overdueCount > 0 ? `${num(fin.overdueCount)} quá hạn · ${money(fin.overdueAmount)}` : 'Không có quá hạn')}${kpi('Thu đúng hạn', fin.onTimeRatio != null ? pct(fin.onTimeRatio) : '—', fin.onTimeRatio == null ? 'Chưa kỳ nào đặt hạn đóng' : undefined)}
  </div>
  ${trendRows ? `<table class="tbl keep"><thead><tr><th>Tháng</th><th class="r">Doanh thu</th><th class="r">Thu quỹ</th><th class="r">Chi</th></tr></thead><tbody>${trendRows}</tbody></table>` : ''}`;

  // 5. AI Operations — thẻ từng agent + chỉ số tổng (như màn hình)
  const ag = ai.agents;
  const ch = ag.notification.byChannel ?? {};
  const agent = (name: string, role: string, rows: Array<[string, any]>) =>
    `<div class="ag"><div class="ag-n">${esc(name)}</div><div class="ag-r">${esc(role)}</div>${rows.map(([l, v]) => `<div class="ag-row"><span>${esc(l)}</span><b>${typeof v === 'number' ? num(v) : esc(String(v ?? '—'))}</b></div>`).join('')}</div>`;
  const aiBody = `<div class="grid5">
    ${agent('Maika', 'Phân tích & Khuyến nghị', [['Insight', ag.maika.insights], ['Action', ag.maika.actions]])}
    ${agent('Lisa', 'Hội thoại & Hỏi đáp', [['Tin nhắn', ag.lisa.messages]])}
    ${agent('Hermes', 'Workflow & Điều phối', [['Chạy', ag.hermes.runs], ['Hoàn tất', ag.hermes.completed], ['Chờ duyệt', ag.hermes.waiting], ['Lỗi', ag.hermes.failed]])}
    ${agent('Mít Đặc', 'Thực thi tác vụ', [['Đã chạy', ag.mitDac.executed], ['Thất bại', ag.mitDac.failed], ['TB (ms)', ag.mitDac.avgMs ?? '—']])}
    ${agent('Notification', 'Thông báo', [['In-app', ch.IN_APP ?? 0], ['Email', ch.EMAIL ?? 0], ['Telegram', ch.TELEGRAM ?? 0], ['Lỗi', ag.notification.failed]])}
  </div>
  <div class="grid3 gap-top">
    ${kpi('Tổng request', num(ai.totals.requests))}${kpi('Tỷ lệ thành công', ai.totals.successRate != null ? pct(ai.totals.successRate) : '—')}${kpi('TG thực thi TB', ai.totals.avgActionMs != null ? `${num(ai.totals.avgActionMs)} ms` : '—')}
    ${kpi('Lỗi AI', num(ai.totals.errors))}${kpi('Token AI', ai.totals.tokens != null ? num(ai.totals.tokens) : '—', ai.totals.cost != null ? `~$${Number(ai.totals.cost).toFixed(4)}` : undefined)}${kpi('Provider AI', ai.totals.provider ?? '—', ai.totals.provider ? `${num(ai.totals.fallbacks)} fallback${ai.totals.avgLatencyMs != null ? ` · ${num(ai.totals.avgLatencyMs)} ms` : ''}` : undefined)}
  </div>`;

  // 6. Hạ tầng
  const infraBody = `<div class="grid4">
    ${kpi('CPU', pct(infra.cpu?.pct), `load ${infra.cpu?.load1} · ${infra.cpu?.cores} core`)}${kpi('RAM', pct(infra.memory?.pct), `${num(infra.memory?.usedMb)}/${num(infra.memory?.totalMb)} MB`)}${kpi('Uptime', fmtUptime(infra.uptimeSeconds))}${kpi('Database', infra.db?.status === 'up' ? 'Bình thường' : 'Lỗi', infra.db?.latencyMs != null ? `${infra.db.latencyMs} ms` : undefined)}
    ${kpi('Backup', infra.backup ? (infra.backup.success ? 'Bình thường' : 'Lỗi') : (infra.backupEnabled ? 'Chờ chạy' : 'Chưa bật'), infra.backup ? `${new Date(infra.backup.at).toLocaleString('vi-VN')}${infra.backup.sizeMb != null ? ` · ${infra.backup.sizeMb} MB` : ''}` : undefined)}${kpi('Disk', infra.disk ? pct(infra.disk.pct) : '—', infra.disk ? `${infra.disk.usedGb}/${infra.disk.totalGb} GB` : undefined)}${kpi('Storage', infra.storage ? `${infra.storage.usedMb} MB` : '—')}${kpi('Hàng đợi việc', num(infra.queue?.pending), infra.queue ? `wf ${infra.queue.workflows} · ai ${infra.queue.aiActions}${infra.queue.notificationsFailed ? ` · noti lỗi ${infra.queue.notificationsFailed}` : ''}` : undefined)}
    ${kpi('Kết nối DB', num(infra.dbConnections))}${kpi('Phiên đăng nhập', num(infra.activeSessions), 'còn hiệu lực')}${kpi('Req/phút', num(infra.requestsPerMin), 'TB 5 phút')}${kpi('Lỗi 5xx', infra.errorRate != null ? pct(infra.errorRate) : '—')}
  </div>`;

  // 7. Cảnh báo
  const alertRows = (data.alerts ?? []).length
    ? (data.alerts as any[]).map((a) => `<tr><td><span class="sev ${a.severity === 'critical' ? 'crit' : a.severity === 'high' ? 'high' : 'med'}">${esc(a.severity === 'critical' ? 'Critical' : a.severity === 'high' ? 'High' : 'Medium')}</span></td><td>${esc(a.source)}${a.clubName ? ' · ' + esc(a.clubName) : ''}</td><td>${esc(a.title)}</td><td class="nw">${a.time ? esc(new Date(a.time).toLocaleString('vi-VN')) : ''}</td></tr>`).join('')
    : `<tr><td colspan="4" class="mut">Không có cảnh báo — hệ thống ổn định.</td></tr>`;
  const alertsBody = `<table class="tbl keep"><thead><tr><th>Mức độ</th><th>Nguồn</th><th>Nội dung</th><th>Thời gian</th></tr></thead><tbody>${alertRows}</tbody></table>`;

  // 8. Bảng xếp hạng
  const rankBlock = (title: string, rows: any[], money2 = false) => {
    if (!rows?.length) return '';
    const items = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td class="r">${money2 ? money(r.value) : num(r.value)}</td></tr>`).join('');
    return `<div class="rank"><div class="rank-t">${esc(title)}</div><table class="tbl sm"><tbody>${items}</tbody></table></div>`;
  };
  const leaderboardsBody = lb
    ? `<div class="grid2">
        ${rankBlock('Thành viên nhiều nhất', lb.topByMembers)}${rankBlock('Hoạt động tích cực nhất', lb.topByActivity)}
        ${rankBlock('Doanh thu cao nhất', lb.topByRevenue, true)}${rankBlock('Tổ chức nhiều giải nhất', lb.topByTournaments)}
        ${rankBlock('Dùng AI nhiều nhất', lb.topByAiUsage)}
      </div>`
    : `<p class="mut">Đang lọc theo 1 CLB — bảng xếp hạng chỉ hiển thị ở chế độ toàn hệ thống.</p>`;

  // 9. Nhật ký kiểm toán (audit)
  const sys = data.syslog ?? { total: 0, byAction: [], recent: [] };
  const sysChips = (sys.byAction ?? []).map((a: any) => `<span class="chip">${esc(a.action)}: ${num(a.count)}</span>`).join('') || '<span class="chip">—</span>';
  const sysRows = (sys.recent ?? []).length
    ? (sys.recent as any[]).map((r) => `<tr><td class="nw">${esc(new Date(r.at).toLocaleString('vi-VN'))}</td><td>${esc(r.action)}</td><td>${esc(r.resource)}${r.detail ? ' — ' + esc(r.detail) : ''}</td><td>${esc(r.user ?? '—')}${r.club ? ' · ' + esc(r.club) : ''}</td></tr>`).join('')
    : '<tr><td colspan="4" class="mut">Chưa có nhật ký trong kỳ.</td></tr>';
  const syslogBody = `<p class="mut" style="margin:0 0 4px">Tổng ${num(sys.total)} bản ghi kiểm toán trong kỳ. Phân bố theo hành động:</p>
    <div class="chips">${sysChips}</div>
    <table class="tbl"><thead><tr><th>Thời gian</th><th>Hành động</th><th>Nội dung</th><th>Người thực hiện</th></tr></thead><tbody>${sysRows}</tbody></table>`;

  const g = (a: number) => `rgba(255,255,255,${a})`;
  const sh = softShadow(B.brandDeep);
  const tnCss = (n: string, f: string, v: string) =>
    `.tn-${n}{--f:${f};--v:${v};--tt:${glassTint(f, GLASS.toneFill)};--tb:${rgba(f, GLASS.toneRing)}}`;
  const chip = (c: string, a: number = GLASS.chipFill) => `background:${rgba(c, a)};border:${mm(0.2)} solid ${rgba(c, GLASS.chipBorder)}`;
  const toneCard = `background-color:var(--tt);border:var(--g-rim);box-shadow:inset 0 0 0 ${mm(0.2)} var(--tb),inset 0 ${mm(0.9)} 0 var(--f),${sh};border-radius:var(--g-r)`;
  const accSh = `inset 0 0 0 ${mm(0.2)} var(--acc-b),inset 0 ${mm(0.35)} 0 ${g(GLASS.highlight)},${sh}`;
  const hdrBg = `linear-gradient(180deg,${g(GLASS.gloss)},${g(0)} 60%),var(--mast-mid)`;

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><style>
${fontFace}
*{margin:0;padding:0;box-sizing:border-box}
${PAGE_CSS}
:root{--ink:${COLORS.ink};--ink2:${COLORS.ink2};--muted:${COLORS.muted};--line:${COLORS.hairline};--brand:${B.brand};--brandDeep:${B.brandDeep};--brandInk:${B.brandInk};--brandSoft:${B.brandSoft};--brandBorder:${B.brandBorder};--badge:${B.badge};
  --acc-t:${glassTint(B.brand, GLASS.accentFill)};--acc-b:${rgba(B.brand, GLASS.accentBorder)}}
${glassCss(B)}
${tnCss('pos', COLORS.posFill, COLORS.posVivid)}
${tnCss('neg', COLORS.negFill, COLORS.negVivid)}
${tnCss('warn', COLORS.orange, COLORS.orange)}
${tnCss('info', COLORS.infoFill, COLORS.infoFill)}
${tnCss('brand', B.brand, B.brandInk)}
html,body{font-family:${fam};color:var(--ink);font-size:${pt(TYPE.body)};line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
p{orphans:3;widows:3}
.mut{color:var(--muted)}.r{text-align:right}
/* ===== TRANG BÌA — băng kính lớn (gradient chéo + bóng loáng + viền trắng) + thẻ chỉ số kính ===== */
.cover{height:${mm(250)};display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page}
.cover .cv-head{display:flex;justify-content:space-between;align-items:center}
.cover .cv-brand{font-size:${pt(TYPE.h2)};letter-spacing:.4pt;font-weight:700;color:var(--brandInk)}
.cover .cv-tag{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:#fff;background:var(--mast-bg);border:var(--mast-rim);box-shadow:var(--mast-sh);border-radius:${mm(3)};padding:${mm(1)} ${mm(SPACE.s3)}}
.cover .cv-panel{position:relative;overflow:hidden;background:var(--mast-bg);color:#fff;border:var(--mast-rim);box-shadow:var(--mast-sh);border-radius:${mm(4)};padding:${mm(SPACE.s6)} ${mm(SPACE.s5)}}
.cover .cv-panel:after{content:'';position:absolute;right:${mm(-16)};bottom:${mm(-24)};width:${mm(80)};height:${mm(80)};border-radius:50%;background:radial-gradient(circle at 35% 30%,${g(0.14)},${g(0.02)} 70%);border:${mm(0.3)} solid ${g(0.22)}}
.cover .cv-panel>*{position:relative;z-index:1}
.cover .cv-eyb{font-size:${pt(TYPE.label)};letter-spacing:.4pt;text-transform:uppercase;font-weight:700}
.cover .cv-title{font-size:${pt(TYPE.cover)};font-weight:700;line-height:1.12;margin:${mm(SPACE.s3)} 0 0}
.cover .cv-rule{width:${mm(SPACE.s6)};height:${mm(1)};border-radius:${mm(0.5)};background:var(--badge);margin:${mm(SPACE.s4)} 0}
.cover .cv-period{font-size:${pt(TYPE.h2)}}
.cover .cv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)};margin-top:${mm(SPACE.s3)}}
.cover .gcard{${toneCard};padding:${mm(SPACE.s3)} ${mm(SPACE.s3)}}
.cover .gcard .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.cover .gcard .v{font-size:${pt(TYPE.display)};font-weight:700;color:var(--v);margin-top:${mm(SPACE.s1)};white-space:nowrap}
.cover .gcard .s{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(1)}}
.cover .cv-foot{display:flex;justify-content:space-between;font-size:${pt(TYPE.caption)};color:var(--muted);border-top:${mm(PAGE.border)} solid ${rgba(B.brandDeep, 0.3)};padding-top:${mm(SPACE.s2)}}
/* ===== MỤC LỤC (trang 2) ===== */
.toc{margin-bottom:${mm(SPACE.s4)};page-break-after:always;break-after:page}
.toc-eyb{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:var(--brandInk);margin-bottom:${mm(1)}}
.toc-h{font-size:${pt(TYPE.h1)};font-weight:700;color:var(--brandInk);margin-bottom:${mm(1)}}
.toc-sub{font-size:${pt(TYPE.table)};color:var(--muted);margin-bottom:${mm(SPACE.s3)}}
.toc-list{list-style:none}
.toc-item{display:flex;align-items:center;gap:${mm(SPACE.s3)};padding:${mm(1.5)} ${mm(SPACE.s3)};margin-bottom:${mm(1.5)};background:var(--g-bg);border:var(--g-rim);box-shadow:var(--g-sh);border-radius:var(--g-r);page-break-inside:avoid}
.toc-n{flex:none;width:${mm(8)};height:${mm(8)};border-radius:${mm(2.4)};background:${hdrBg};box-shadow:inset 0 0 0 ${mm(0.2)} ${g(GLASS.mastRim)};color:#fff;font-size:${pt(TYPE.h2)};font-weight:700;display:flex;align-items:center;justify-content:center}
.toc-tx{flex:1}
.toc-t{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--ink)}
.toc-d{font-size:${pt(TYPE.table)};color:var(--muted);margin-top:${mm(0.5)}}
/* ===== SECTION — nội dung chảy liền ===== */
.sect{padding:0;margin:0 0 ${mm(SPACE.s3)};page-break-inside:auto;page-break-before:always;break-before:page}
.sect h2+*{break-before:avoid}
.sect h2{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--brandInk);text-transform:uppercase;letter-spacing:.2pt;margin-bottom:${mm(SPACE.s2)};padding:${mm(0.6)} 0 ${mm(SPACE.s1)} ${mm(2.5)};border-left:${mm(1.2)} solid var(--brand);border-bottom:${mm(PAGE.border)} solid var(--brandBorder);page-break-after:avoid;break-after:avoid}
.k,.rank,.tbl thead,.tbl tr,.grid4,.grid3,.grid2,.grid5{page-break-inside:avoid;break-inside:avoid}
.tbl thead{display:table-header-group}
.chips{display:flex;flex-wrap:wrap;gap:${mm(SPACE.s1)};margin:${mm(SPACE.s2)} 0}
.chip{font-size:${pt(TYPE.label)};font-weight:700;color:var(--brandInk);${chip(B.brand)};border-radius:${mm(3)};padding:${mm(0.6)} ${mm(2.5)}}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:${mm(SPACE.s2)}}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)}}
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:${mm(SPACE.s3)}}
.k{${toneCard};padding:${mm(SPACE.s2)}}
.k-l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.k-v{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--v);margin-top:${mm(1)}}
.k-s{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(0.5)}}
.grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:${mm(SPACE.s2)}}
.gap-top{margin-top:${mm(SPACE.s2)}}
.nw{white-space:nowrap}
.tbl.keep,.k,.ec,.ag,.chart,.exec{break-inside:avoid;page-break-inside:avoid}
.exec{margin-top:${mm(SPACE.s2)}}
.exec-t{font-size:${pt(TYPE.label)};font-weight:700;color:var(--brandInk);text-transform:uppercase;letter-spacing:.3pt;margin-bottom:${mm(1.5)}}
.ec{${toneCard};padding:${mm(SPACE.s2)}}
.ec-h{font-size:${pt(TYPE.label)};font-weight:700;text-transform:uppercase;letter-spacing:.3pt;color:var(--v);margin-bottom:${mm(1)}}
.ec ul{list-style:none}
.ec li{font-size:${pt(TYPE.table)};line-height:1.45;color:var(--ink);padding-left:${mm(2.8)};position:relative;margin-bottom:${mm(1)}}
.ec li:before{content:'';position:absolute;left:0;top:${mm(1.4)};width:${mm(1)};height:${mm(1)};border-radius:50%;background:var(--v)}
.ec p{font-size:${pt(TYPE.table)}}
.chart{${toneCard};--f:${B.brand};--tt:${glassTint(B.brand, GLASS.toneFill)};--tb:${rgba(B.brand, GLASS.toneRing)};padding:${mm(SPACE.s2)}}
.chart-t{font-size:${pt(TYPE.label)};font-weight:700;text-transform:uppercase;letter-spacing:.3pt;color:var(--brandInk);margin-bottom:${mm(SPACE.s2)}}
.bars{display:flex;gap:${mm(2)};align-items:stretch;height:${mm(34)}}
.bgp{flex:1;display:flex;flex-direction:column;align-items:center}
.bb{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:${mm(0.6)};border-bottom:${mm(PAGE.hair)} solid ${rgba(B.brand, 0.35)}}
.bb i{display:block;width:28%;border-radius:${mm(0.5)} ${mm(0.5)} 0 0}
.bl{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(1)}}
.legend{display:flex;gap:${mm(SPACE.s3)};justify-content:center;margin-top:${mm(SPACE.s2)};font-size:${pt(TYPE.caption)};color:var(--muted)}
.legend span{display:inline-flex;align-items:center;gap:${mm(1)}}
.legend b{display:inline-block;width:${mm(2.4)};height:${mm(2.4)};border-radius:${mm(0.6)}}
.pl{margin-bottom:${mm(SPACE.s2)}}
.pl-h{display:flex;justify-content:space-between;font-size:${pt(TYPE.table)};font-weight:700;color:var(--ink);margin-bottom:${mm(1)}}
.pl-h span:last-child{font-weight:400;color:var(--muted)}
.pl-b{height:${mm(2.2)};border-radius:${mm(1.1)};background:${glassTint(B.brand, 0.14)}}
.pl-b i{display:block;height:100%;border-radius:${mm(1.1)};background:var(--brand)}
.ag{${toneCard};--f:${COLORS.infoFill};--tt:${glassTint(COLORS.infoFill, GLASS.toneFill)};--tb:${rgba(COLORS.infoFill, GLASS.toneRing)};padding:${mm(SPACE.s2)}}
.ag-n{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--brandInk)}
.ag-r{font-size:${pt(TYPE.caption)};color:var(--muted);margin:${mm(0.5)} 0 ${mm(SPACE.s1)}}
.ag-row{display:flex;justify-content:space-between;font-size:${pt(TYPE.table)};padding:${mm(0.5)} 0;border-top:${mm(PAGE.hair)} solid ${rgba(B.brand, 0.18)}}
.ag-row span{color:var(--muted)}
.ag-row b{color:var(--ink)}
.tbl{width:100%;border-collapse:separate;border-spacing:0;margin-top:${mm(SPACE.s2)};font-size:${pt(TYPE.table)}}
.tbl th{text-align:left;background:${hdrBg};color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:.3pt;font-size:${pt(TYPE.label)};padding:${mm(2)} ${mm(2.5)};border-top:${mm(0.25)} solid ${g(GLASS.mastRim)};border-bottom:${mm(0.25)} solid ${g(0.2)}}
.tbl th:not(:last-child){box-shadow:${mm(0.15)} 0 0 0 var(--mast-mid)}
.tbl th:first-child{border-radius:${mm(GLASS.radius)} 0 0 ${mm(GLASS.radius)}}.tbl th:last-child{border-radius:0 ${mm(GLASS.radius)} ${mm(GLASS.radius)} 0}
.tbl tbody tr:nth-child(even) td{background-color:${glassTint(B.brand, GLASS.zebra + 0.03)}}
.sev{display:inline-block;font-weight:700;font-size:${pt(TYPE.label)};padding:${mm(0.3)} ${mm(2)};border-radius:${mm(3)}}
.sev.crit{color:${COLORS.neg};${chip(COLORS.negFill)}}
.sev.high{color:${COLORS.warn};${chip(COLORS.warnFill)}}
.sev.med{color:${COLORS.info};${chip(COLORS.infoFill)}}
.tbl td{padding:${mm(1.5)} ${mm(2.5)};border-bottom:${mm(PAGE.hair)} solid ${g(GLASS.rowLine)};color:var(--ink);vertical-align:top;background-color:${g(GLASS.rowAlpha)}}
.tbl th.r{text-align:right}
.tbl.sm td{padding:${mm(1)} ${mm(2)}}
.rank-t{font-size:${pt(TYPE.table)};font-weight:700;color:var(--brandInk);margin-bottom:${mm(1)}}
/* ===== Ô Maika — TẤM NHẤN kính ===== */
.maika{margin-top:${mm(SPACE.s3)};background-color:var(--acc-t);border:var(--g-rim);box-shadow:inset ${mm(1.4)} 0 0 var(--brand),${accSh};padding:${mm(SPACE.s2)} ${mm(SPACE.s3)} ${mm(SPACE.s2)} ${mm(SPACE.s3 + 1)};border-radius:var(--g-r);page-break-inside:auto}
.maika-h{font-size:${pt(TYPE.label)};font-weight:700;color:var(--brandInk);text-transform:uppercase;letter-spacing:.3pt;display:flex;align-items:center;gap:${mm(SPACE.s1)};margin-bottom:${mm(SPACE.s1)};page-break-after:avoid}
.maika-dot{width:${mm(1.6)};height:${mm(1.6)};border-radius:50%;background:var(--brand);box-shadow:0 0 0 ${mm(0.4)} ${g(0.8)};display:inline-block}
.maika-body p{font-size:${pt(TYPE.body)};color:var(--ink);line-height:1.6;margin-bottom:${mm(SPACE.s1)};break-inside:avoid;page-break-inside:avoid}
.maika-body p:last-child{margin-bottom:0}
/* ===== TRANG KẾT ===== */
.concl{margin-top:${mm(SPACE.s4)};page-break-before:always;break-before:page}
.concl-eyb{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:var(--muted);margin-bottom:${mm(1)}}
.concl-h{font-size:${pt(TYPE.h1)};font-weight:700;color:var(--brandInk);margin-bottom:${mm(SPACE.s3)}}
.concl-intro{background-color:var(--acc-t);border:var(--g-rim);box-shadow:inset ${mm(1.4)} 0 0 var(--brand),${accSh};border-radius:var(--g-r);padding:${mm(SPACE.s2)} ${mm(SPACE.s3)} ${mm(SPACE.s2)} ${mm(SPACE.s3 + 1)};margin-bottom:${mm(SPACE.s4)};page-break-inside:auto}
.concl-intro p{font-size:${pt(TYPE.body)};color:var(--ink);line-height:1.6;margin-bottom:${mm(SPACE.s1)};break-inside:avoid;page-break-inside:avoid}
.concl-intro p:last-child{margin-bottom:0}
.concl-recs-t{font-size:${pt(TYPE.label)};font-weight:700;color:var(--brandInk);text-transform:uppercase;letter-spacing:.3pt;margin-bottom:${mm(SPACE.s2)}}
.rec{display:flex;align-items:flex-start;gap:${mm(SPACE.s3)};padding:${mm(SPACE.s2)} ${mm(SPACE.s3)};margin-bottom:${mm(SPACE.s2)};background:var(--g-bg);border:var(--g-rim);box-shadow:var(--g-sh);border-radius:var(--g-r);page-break-inside:avoid}
.rec-p{flex:none;width:${mm(9)};height:${mm(6)};border-radius:${mm(3)};background:${hdrBg};box-shadow:inset 0 0 0 ${mm(0.2)} ${g(GLASS.mastRim)};color:#fff;font-size:${pt(TYPE.label)};font-weight:700;display:flex;align-items:center;justify-content:center}
.rec-tx{flex:1;font-size:${pt(TYPE.body)};color:var(--ink);line-height:1.55}
</style></head><body>
<div class="wash"></div>
${cover}
${toc}
${section('1 · Tổng quan hệ thống', overviewBody, sections.overview)}
${section('2 · Kinh doanh & Thuê bao', businessBody, sections.business)}
${section('3 · Hoạt động toàn hệ thống', operationsBody, sections.operations)}
${section('4 · Tổng hợp tài chính toàn nền tảng', financeBody, sections.finance)}
${section('5 · AIDO AI Operations', aiBody, sections.ai)}
${section('6 · Sức khỏe hạ tầng', infraBody, sections.infra)}
${section('7 · Cảnh báo điều hành', alertsBody, sections.alerts)}
${section('8 · Bảng xếp hạng điều hành', leaderboardsBody, sections.leaderboards)}
${section('9 · Nhật ký hệ thống & Kiểm toán', syslogBody, sections.syslog)}
${buildConclusion(sections.conclusion)}
</body></html>`;
}
