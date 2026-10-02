/**
 * HTML in-ấn A4 cho "Trung tâm điều hành PickleFund" (Command Center) — render bằng headless
 * Chrome (Puppeteer). Có TRANG BÌA riêng + mỗi khối page-break-inside:avoid (không cắt chữ, co
 * gọn trong trang A4). Kèm ô "Maika nhận định" cho từng mục. Font BeVietnamPro base64 (tiếng Việt).
 */
import { loadFontsBase64 } from '../executive-report/export-fonts';
import { COLORS, PAGE, PAGE_CSS, SPACE, TYPE, escHtml, makeBrand, mm, pt, vnd } from '../executive-report/export-tokens';

export const esc = escHtml;
const money = (n: number | null | undefined) => (n == null ? '—' : vnd(n));
const num = (n: number | null | undefined) => (n == null ? '—' : new Intl.NumberFormat('vi-VN').format(Number(n) || 0));
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n}%`);
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
function kpi(label: string, value: string, sub?: string): string {
  return `<div class="k"><div class="k-l">${esc(label)}</div><div class="k-v">${esc(value)}</div>${sub ? `<div class="k-s">${esc(sub)}</div>` : ''}</div>`;
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

  // Cover — sạch, nằm trong lề in; 1 panel đặc (brandDeep) duy nhất; không glyph ngoài font.
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
        <div class="gcard"><div class="l">Tổng CLB</div><div class="v">${num(k.totalClubs)}</div><div class="s">${num(k.activeClubs)} hoạt động</div></div>
        <div class="gcard"><div class="l">Thành viên</div><div class="v">${num(k.totalMembers)}</div><div class="s">${num(k.logins24h)} đăng nhập 24h</div></div>
        <div class="gcard"><div class="l">MRR</div><div class="v">${money(k.mrr)}</div><div class="s">${num(k.paidSubscribers)} CLB trả phí</div></div>
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

  // 1. Tổng quan (KPI)
  const overviewBody = `<div class="grid4">
    ${kpi('Tổng CLB', num(k.totalClubs))}${kpi('CLB hoạt động', num(k.activeClubs))}${kpi('CLB bị khóa', num(k.suspendedClubs))}${kpi('Tổng thành viên', num(k.totalMembers))}
    ${kpi('Người dùng hoạt động', num(k.activeUsers))}${kpi('Đăng nhập 24h', num(k.logins24h))}${kpi('MRR', money(k.mrr))}${kpi(`Doanh thu (${rangeLabel})`, money(k.revenueInRange))}
    ${kpi('Thuê bao trả phí', num(k.paidSubscribers))}${kpi('AI Request', num(k.aiRequests))}${kpi('Chi phí AI', k.aiCost != null ? `$${Number(k.aiCost).toFixed(4)}` : '—')}${kpi('Uptime (giây)', num(infra.uptimeSeconds))}
  </div>`;

  // 2. Kinh doanh
  const plansRows = (biz.subscription.plans ?? []).map((p: any) => `<tr><td>${esc(p.name)}</td><td class="r">${num(p.count)}</td></tr>`).join('');
  const businessBody = `<div class="grid3">
    ${kpi('Doanh thu tháng', money(biz.revenue.month))}${kpi('Doanh thu quý', money(biz.revenue.quarter))}${kpi('Doanh thu năm', money(biz.revenue.year))}
    ${kpi('MRR', money(biz.revenue.mrr))}${kpi('ARR', money(biz.revenue.arr))}${kpi('Thuê bao trả phí', num(biz.subscription.paidSubscribers))}
    ${kpi('Sắp hết hạn', num(biz.subscription.expiringSoon))}${kpi('Đã hết hạn', num(biz.subscription.expired))}${kpi('Nâng cấp trong kỳ', num(biz.subscription.upgradesInRange))}
  </div>
  <table class="tbl"><thead><tr><th>Gói dịch vụ</th><th class="r">Số CLB</th></tr></thead><tbody>${plansRows}</tbody></table>`;

  // 3. Hoạt động
  const operationsBody = `<div class="grid4">
    ${kpi('CLB mới', num(ops.clubs.new))}${kpi('Thành viên mới', num(ops.members.new))}${kpi('Lượt đăng ký buổi', num(ops.members.registrations))}${kpi('Lượt điểm danh', num(ops.members.attendance))}
    ${kpi('Kỳ quỹ', num(ops.business.fundPeriods))}${kpi('Buổi chơi', num(ops.business.sessions))}${kpi('Giải đấu/Minigame', num(ops.business.minigames))}${kpi('Trận đấu', num(ops.business.matches))}
    ${kpi('Báo cáo đã xuất', num(ops.business.reportsExported))}
  </div>`;

  // 4. Tài chính
  const financeBody = `<div class="grid4">
    ${kpi('Tổng thu ghi nhận', money(fin.totalIncome))}${kpi('Tổng chi ghi nhận', money(fin.totalExpense))}${kpi('Tổng số dư quỹ', money(fin.totalBalance))}${kpi('Chi chờ duyệt', num(fin.pendingExpenses))}
    ${kpi('Tổng công nợ', money(fin.debt))}${kpi('Quá hạn', `${num(fin.overdueCount)}${fin.overdueAmount ? ` · ${money(fin.overdueAmount)}` : ''}`)}${kpi('Thu đúng hạn', fin.onTimeRatio != null ? pct(fin.onTimeRatio) : '—')}
  </div>`;

  // 5. AI Operations
  const ag = ai.agents;
  const aiBody = `<div class="grid4">
    ${kpi('Maika · Insight', num(ag.maika.insights))}${kpi('Lisa · Tin nhắn', num(ag.lisa.messages))}${kpi('Hermes · Chạy', num(ag.hermes.runs))}${kpi('Mít Đặc · Đã chạy', num(ag.mitDac.executed))}
    ${kpi('Notification · Gửi', num(ag.notification.sent))}${kpi('Tổng request', num(ai.totals.requests))}${kpi('Tỷ lệ thành công', ai.totals.successRate != null ? pct(ai.totals.successRate) : '—')}${kpi('Lỗi AI', num(ai.totals.errors))}
    ${kpi('Token AI', num(ai.totals.tokens))}${kpi('Chi phí AI (ước tính)', ai.totals.cost != null ? `$${Number(ai.totals.cost).toFixed(4)}` : '—')}
  </div>`;

  // 6. Hạ tầng
  const infraBody = `<div class="grid4">
    ${kpi('CPU', pct(infra.cpu?.pct))}${kpi('RAM', pct(infra.memory?.pct))}${kpi('Database', infra.db?.status === 'up' ? 'Bình thường' : 'Lỗi')}${kpi('Disk', infra.disk ? pct(infra.disk.pct) : '—')}
    ${kpi('Storage', infra.storage ? `${infra.storage.usedMb} MB` : '—')}${kpi('Hàng đợi việc', num(infra.queue?.pending))}${kpi('Kết nối DB', num(infra.dbConnections))}${kpi('Phiên đăng nhập', num(infra.activeSessions))}
    ${kpi('Req/phút', num(infra.requestsPerMin))}${kpi('Lỗi 5xx', infra.errorRate != null ? pct(infra.errorRate) : '—')}${kpi('Backup', infra.backup ? (infra.backup.success ? 'Bình thường' : 'Lỗi') : (infra.backupEnabled ? 'Chờ chạy' : 'Chưa bật'))}
  </div>`;

  // 7. Cảnh báo
  const alertRows = (data.alerts ?? []).length
    ? (data.alerts as any[]).map((a) => `<tr><td>${esc(a.severity === 'critical' ? 'Critical' : a.severity === 'high' ? 'High' : 'Medium')}</td><td>${esc(a.source)}</td><td>${esc(a.title)}</td></tr>`).join('')
    : `<tr><td colspan="3" class="mut">Không có cảnh báo — hệ thống ổn định.</td></tr>`;
  const alertsBody = `<table class="tbl"><thead><tr><th>Mức độ</th><th>Nguồn</th><th>Nội dung</th></tr></thead><tbody>${alertRows}</tbody></table>`;

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

  // 9. Nhật ký kiểm toán (audit) — dữ liệu thật cho Chuyên gia Bảo mật phân tích.
  const sys = data.syslog ?? { total: 0, byAction: [], recent: [] };
  const sysChips = (sys.byAction ?? []).map((a: any) => `<span class="chip">${esc(a.action)}: ${num(a.count)}</span>`).join('') || '<span class="chip">—</span>';
  const sysRows = (sys.recent ?? []).length
    ? (sys.recent as any[]).map((r) => `<tr><td>${esc(new Date(r.at).toLocaleString('vi-VN'))}</td><td>${esc(r.action)}</td><td>${esc(r.resource)}${r.detail ? ' — ' + esc(r.detail) : ''}</td><td>${esc(r.user ?? '—')}</td></tr>`).join('')
    : '<tr><td colspan="4" class="mut">Chưa có nhật ký trong kỳ.</td></tr>';
  const syslogBody = `<p class="mut" style="margin:0 0 4px">Tổng ${num(sys.total)} bản ghi kiểm toán trong kỳ. Phân bố theo hành động:</p>
    <div class="chips">${sysChips}</div>
    <table class="tbl"><thead><tr><th>Thời gian</th><th>Hành động</th><th>Nội dung</th><th>Người thực hiện</th></tr></thead><tbody>${sysRows}</tbody></table>`;

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><style>
${fontFace}
*{margin:0;padding:0;box-sizing:border-box}
${PAGE_CSS}
:root{--ink:${COLORS.ink};--ink2:${COLORS.ink2};--muted:${COLORS.muted};--line:${COLORS.hairline};--brand:${B.brand};--brandDeep:${B.brandDeep};--brandInk:${B.brandInk};--brandSoft:${B.brandSoft}}
html,body{font-family:${fam};color:var(--ink);font-size:${pt(TYPE.body)};line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
p{orphans:3;widows:3}
.mut{color:var(--muted)}.r{text-align:right}
/* ===== TRANG BÌA — trong lề in, 1 panel đặc brandDeep ===== */
.cover{height:${mm(250)};display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page}
.cover .cv-head{display:flex;justify-content:space-between;align-items:center}
.cover .cv-brand{font-size:${pt(TYPE.label)};letter-spacing:.3pt;font-weight:700;color:var(--brandInk)}
.cover .cv-tag{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:var(--brandInk);border:${mm(PAGE.border)} solid var(--brand);border-radius:${mm(PAGE.radius)};padding:${mm(1)} ${mm(SPACE.s2)}}
.cover .cv-panel{background:var(--brandDeep);color:#fff;border-radius:${mm(PAGE.radius)};padding:${mm(SPACE.s6)} ${mm(SPACE.s5)}}
.cover .cv-eyb{font-size:${pt(TYPE.label)};letter-spacing:.4pt;text-transform:uppercase;font-weight:700}
.cover .cv-title{font-size:${pt(TYPE.cover)};font-weight:700;line-height:1.12;margin:${mm(SPACE.s3)} 0 0}
.cover .cv-rule{width:${mm(SPACE.s6)};height:${mm(0.6)};background:#fff;margin:${mm(SPACE.s4)} 0}
.cover .cv-period{font-size:${pt(TYPE.h2)}}
.cover .cv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)};margin-top:${mm(SPACE.s3)}}
.cover .gcard{border:${mm(PAGE.hair)} solid var(--line);border-radius:${mm(PAGE.radius)};padding:${mm(SPACE.s3)} ${mm(SPACE.s2)};background:#fff}
.cover .gcard .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.cover .gcard .v{font-size:${pt(TYPE.kpi)};font-weight:700;color:var(--ink);margin-top:${mm(SPACE.s1)};white-space:nowrap}
.cover .gcard .s{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(1)}}
.cover .cv-foot{display:flex;justify-content:space-between;font-size:${pt(TYPE.caption)};color:var(--muted);border-top:${mm(PAGE.hair)} solid var(--line);padding-top:${mm(SPACE.s2)}}
/* ===== MỤC LỤC (trang 2) ===== */
.toc{page-break-after:always;break-after:page}
.toc-eyb{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:var(--brandInk);margin-bottom:${mm(1)}}
.toc-h{font-size:${pt(TYPE.h1)};font-weight:700;color:var(--ink);margin-bottom:${mm(1)}}
.toc-sub{font-size:${pt(TYPE.table)};color:var(--muted);margin-bottom:${mm(SPACE.s5)}}
.toc-list{list-style:none}
.toc-item{display:flex;align-items:flex-start;gap:${mm(SPACE.s3)};padding:${mm(SPACE.s2)} 0;border-bottom:${mm(PAGE.hair)} solid var(--line);page-break-inside:avoid}
.toc-item:last-child{border-bottom:none}
.toc-n{flex:none;width:${mm(9)};height:${mm(9)};border-radius:${mm(PAGE.radius)};background:var(--brandSoft);color:var(--brandInk);font-size:${pt(TYPE.h2)};font-weight:700;display:flex;align-items:center;justify-content:center}
.toc-tx{flex:1}
.toc-t{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--ink)}
.toc-d{font-size:${pt(TYPE.table)};color:var(--muted);margin-top:${mm(0.5)}}
/* ===== SECTION — nội dung chảy liền ===== */
.sect{padding:0;margin:0 0 ${mm(SPACE.s3)};page-break-inside:auto}
.sect h2{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--ink);margin-bottom:${mm(SPACE.s2)};padding-bottom:${mm(SPACE.s1)};border-bottom:${mm(PAGE.hair)} solid var(--line);page-break-after:avoid;break-after:avoid}
.k,.rank,.tbl thead,.tbl tr,.grid4,.grid3,.grid2{page-break-inside:avoid;break-inside:avoid}
.chips{display:flex;flex-wrap:wrap;gap:${mm(SPACE.s1)};margin:${mm(SPACE.s2)} 0}
.chip{font-size:${pt(TYPE.label)};font-weight:700;color:var(--ink2);background:${COLORS.surface2};border:${mm(PAGE.hair)} solid var(--line);border-radius:${mm(PAGE.radius)};padding:${mm(0.6)} ${mm(2)}}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:${mm(SPACE.s2)}}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)}}
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:${mm(SPACE.s3)}}
.k{border:${mm(PAGE.hair)} solid var(--line);border-radius:${mm(PAGE.radius)};padding:${mm(SPACE.s2)};background:#fff}
.k-l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.k-v{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--ink);margin-top:${mm(1)}}
.k-s{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(0.5)}}
.tbl{width:100%;border-collapse:collapse;margin-top:${mm(SPACE.s2)};font-size:${pt(TYPE.table)}}
.tbl th{text-align:left;background:var(--brandSoft);color:var(--brandInk);font-weight:700;text-transform:uppercase;letter-spacing:.3pt;font-size:${pt(TYPE.label)};padding:${mm(2)} ${mm(2.5)};border-bottom:${mm(PAGE.strong)} solid var(--brand)}
.tbl td{padding:${mm(1.5)} ${mm(2.5)};border-bottom:${mm(PAGE.hair)} solid var(--line);color:var(--ink);vertical-align:top}
.tbl th.r{text-align:right}
.tbl.sm td{padding:${mm(1)} ${mm(2)}}
.rank-t{font-size:${pt(TYPE.table)};font-weight:700;color:var(--ink2);margin-bottom:${mm(1)}}
/* ===== Ô Maika ===== */
.maika{margin-top:${mm(SPACE.s3)};border-left:${mm(1)} solid var(--brand);padding:${mm(SPACE.s2)} ${mm(SPACE.s3)};background:var(--brandSoft);border-radius:0 ${mm(PAGE.radius)} ${mm(PAGE.radius)} 0;page-break-inside:auto}
.maika-h{font-size:${pt(TYPE.label)};font-weight:700;color:var(--brandInk);text-transform:uppercase;letter-spacing:.3pt;display:flex;align-items:center;gap:${mm(SPACE.s1)};margin-bottom:${mm(SPACE.s1)};page-break-after:avoid}
.maika-dot{width:${mm(1.6)};height:${mm(1.6)};border-radius:50%;background:var(--brand);display:inline-block}
.maika-body p{font-size:${pt(TYPE.body)};color:var(--ink);line-height:1.6;margin-bottom:${mm(SPACE.s1)}}
.maika-body p:last-child{margin-bottom:0}
/* ===== TRANG KẾT ===== */
.concl{page-break-before:always;break-before:page}
.concl-eyb{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:var(--brandInk);margin-bottom:${mm(1)}}
.concl-h{font-size:${pt(TYPE.h1)};font-weight:700;color:var(--ink);margin-bottom:${mm(SPACE.s3)}}
.concl-intro{border-left:${mm(1)} solid var(--brand);background:var(--brandSoft);border-radius:0 ${mm(PAGE.radius)} ${mm(PAGE.radius)} 0;padding:${mm(SPACE.s2)} ${mm(SPACE.s3)};margin-bottom:${mm(SPACE.s4)};page-break-inside:auto}
.concl-intro p{font-size:${pt(TYPE.body)};color:var(--ink);line-height:1.6;margin-bottom:${mm(SPACE.s1)}}
.concl-intro p:last-child{margin-bottom:0}
.concl-recs-t{font-size:${pt(TYPE.label)};font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.3pt;margin-bottom:${mm(SPACE.s2)}}
.rec{display:flex;align-items:flex-start;gap:${mm(SPACE.s3)};padding:${mm(SPACE.s2)} 0;border-bottom:${mm(PAGE.hair)} solid var(--line);page-break-inside:avoid}
.rec:last-child{border-bottom:none}
.rec-p{flex:none;width:${mm(9)};height:${mm(6)};border-radius:${mm(PAGE.radius)};background:var(--brandDeep);color:#fff;font-size:${pt(TYPE.label)};font-weight:700;display:flex;align-items:center;justify-content:center}
.rec-tx{flex:1;font-size:${pt(TYPE.body)};color:var(--ink);line-height:1.55}
</style></head><body>
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
