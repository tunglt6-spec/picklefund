/**
 * HTML in-ấn A4 cho "Trung tâm điều hành PickleFund" (Command Center) — render bằng headless
 * Chrome (Puppeteer). Có TRANG BÌA riêng + mỗi khối page-break-inside:avoid (không cắt chữ, co
 * gọn trong trang A4). Kèm ô "Maika nhận định" cho từng mục. Font BeVietnamPro base64 (tiếng Việt).
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let fontCache: { regular: string; bold: string } | null = null;
function loadFontsBase64(): { regular: string; bold: string } | null {
  if (fontCache) return fontCache;
  const dirs = [
    join(__dirname, '..', 'assets', 'fonts'),
    join(process.cwd(), 'dist', 'assets', 'fonts'),
    join(process.cwd(), 'src', 'assets', 'fonts'),
  ];
  for (const d of dirs) {
    const reg = join(d, 'BeVietnamPro-Regular.ttf');
    const bold = join(d, 'BeVietnamPro-Bold.ttf');
    if (existsSync(reg) && existsSync(bold)) {
      fontCache = { regular: readFileSync(reg).toString('base64'), bold: readFileSync(bold).toString('base64') };
      return fontCache;
    }
  }
  return null;
}

const esc = (x: unknown) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n: number | null | undefined) => (n == null ? '—' : new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + 'đ');
const num = (n: number | null | undefined) => (n == null ? '—' : new Intl.NumberFormat('vi-VN').format(Number(n) || 0));
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n}%`);
const RANGE_LABEL: Record<string, string> = { today: 'Hôm nay', '7d': '7 ngày', '30d': '30 ngày', quarter: 'Quý', year: 'Năm', custom: 'Tùy chỉnh' };

type Sections = Record<'overview' | 'business' | 'operations' | 'finance' | 'ai' | 'infra' | 'alerts' | 'leaderboards' | 'syslog', string>;

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

export function buildCommandCenterHtml(data: any, sections: Sections, exportedAt: string): string {
  const fonts = loadFontsBase64();
  const fontFace = fonts
    ? `@font-face{font-family:'BVP';font-weight:400;src:url(data:font/ttf;base64,${fonts.regular}) format('truetype');}
       @font-face{font-family:'BVP';font-weight:700;src:url(data:font/ttf;base64,${fonts.bold}) format('truetype');}`
    : '';
  const fam = fonts ? "'BVP','Be Vietnam Pro',Arial,sans-serif" : 'Arial,sans-serif';

  const k = data.kpi, biz = data.business, ops = data.operations, fin = data.finance, ai = data.ai, infra = data.infra, lb = data.leaderboards;
  const rangeLabel = RANGE_LABEL[data.range?.key] ?? '';

  // Cover — full-width vừa khít khung in đối xứng (không full-bleed lệch).
  const cover = `<section class="cover">
    <div class="cv-glow"></div>
    <div class="cv-head">
      <span class="cv-brand"><span class="cv-mark">◆</span>PICKLEFUND</span>
      <span class="cv-tag">Command Center</span>
    </div>
    <div class="cv-mid">
      <div class="cv-eyb">Trung tâm điều hành · Báo cáo định kỳ</div>
      <h1 class="cv-title">Báo cáo điều hành<br/>toàn hệ thống</h1>
      <div class="cv-rule"></div>
      <div class="cv-period">Phạm vi dữ liệu: ${esc(rangeLabel)}${data.clubId ? ' · 1 CLB' : ' · Toàn hệ thống'}</div>
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
@page{size:A4}
html,body{font-family:${fam};color:#334155;font-size:10.5px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
p{orphans:3;widows:3}
.mut{color:#94A3B8}.r{text-align:right}
/* ===== TRANG BÌA — full-width vừa khít khung in đối xứng ===== */
.cover{position:relative;overflow:hidden;height:262mm;color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:22mm 18mm;page-break-after:always;background:radial-gradient(130% 90% at 100% 0%,rgba(124,109,251,.55) 0%,rgba(124,109,251,0) 52%),linear-gradient(135deg,#1E1B4B 0%,#312E81 38%,#4338CA 74%,#6D5DFB 100%)}
.cover .cv-glow{position:absolute;right:-80px;bottom:-100px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(139,123,255,.38),rgba(139,123,255,0) 70%)}
.cover .cv-head{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
.cover .cv-brand{font-size:12px;letter-spacing:.24em;font-weight:800;display:flex;align-items:center;gap:8px}
.cover .cv-mark{font-size:12px;opacity:.9}
.cover .cv-tag{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;opacity:.85;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:5px 12px}
.cover .cv-mid{position:relative;z-index:1}
.cover .cv-eyb{font-size:11px;letter-spacing:.3em;text-transform:uppercase;font-weight:700;opacity:.9}
.cover .cv-title{font-size:46px;font-weight:800;letter-spacing:-.025em;line-height:1.04;margin:14px 0 0}
.cover .cv-rule{width:72px;height:4px;border-radius:9px;background:rgba(255,255,255,.8);margin:22px 0}
.cover .cv-period{font-size:14px;opacity:.94}
.cover .cv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:30px}
.cover .gcard{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.3);border-radius:16px;padding:15px 17px;backdrop-filter:blur(2px)}
.cover .gcard .l{font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;font-weight:700}
.cover .gcard .v{font-size:23px;font-weight:800;letter-spacing:-.02em;margin-top:6px}
.cover .gcard .s{font-size:9.5px;opacity:.88;margin-top:3px}
.cover .cv-foot{display:flex;justify-content:space-between;font-size:10px;opacity:.9;border-top:1px solid rgba(255,255,255,.28);padding-top:14px;position:relative;z-index:1}
/* ===== MỤC LỤC (trang 2) ===== */
.toc{margin:0 14mm}
.toc-eyb{font-size:10px;letter-spacing:.28em;text-transform:uppercase;font-weight:700;color:#6D5DFB;margin-bottom:6px}
.toc-h{font-size:30px;font-weight:800;letter-spacing:-.02em;color:#1E293B;margin-bottom:6px}
.toc-sub{font-size:11px;color:#94A3B8;margin-bottom:22px}
.toc-list{list-style:none;counter-reset:toc}
.toc-item{display:flex;align-items:flex-start;gap:14px;padding:13px 0;border-bottom:1px solid #EEF1F6;page-break-inside:avoid}
.toc-item:last-child{border-bottom:none}
.toc-n{flex:none;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#4338CA,#6D5DFB);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;letter-spacing:-.01em}
.toc-tx{flex:1}
.toc-t{font-size:13px;font-weight:800;color:#1E293B;letter-spacing:-.01em}
.toc-d{font-size:10px;color:#94A3B8;margin-top:2px}
/* ===== SECTION — mỗi mục bắt đầu ở trang mới; nội dung dài vẫn chảy mượt qua trang ===== */
.sect{padding:0;margin:0 14mm;page-break-inside:auto;page-break-before:always;break-before:page}
.sect h2{font-size:14px;font-weight:800;color:#1E293B;letter-spacing:-.01em;margin-bottom:12px;padding-left:11px;border-left:4px solid #6D5DFB;page-break-after:avoid;break-after:avoid}
/* Đơn vị nhỏ giữ nguyên khối, không tách qua trang. */
.k,.rank,.tbl thead,.tbl tr,.grid4,.grid3,.grid2{page-break-inside:avoid;break-inside:avoid}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.chip{font-size:9px;font-weight:700;color:#475569;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:999px;padding:3px 9px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}
.k{border:1px solid #ECEFF6;border-radius:11px;padding:9px 11px;background:linear-gradient(180deg,#FEFEFF,#F7F8FE)}
.k-l{font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:#94A3B8;font-weight:700}
.k-v{font-size:15px;font-weight:800;color:#1E293B;margin-top:4px}
.k-s{font-size:8.5px;color:#94A3B8;margin-top:2px}
.tbl{width:100%;border-collapse:collapse;margin-top:11px;font-size:10px}
.tbl th{text-align:left;color:#94A3B8;font-weight:700;text-transform:uppercase;font-size:8.5px;padding:7px 9px;border-bottom:1.5px solid #E7EBF2}
.tbl td{padding:7px 9px;border-bottom:1px solid #F1F5F9;color:#334155;vertical-align:top}
.tbl.sm td{padding:5px 7px}
.rank-t{font-size:10px;font-weight:800;color:#475569;margin-bottom:3px}
/* ===== Ô Maika — nhiều đoạn <p> block, ngắt trang an toàn ===== */
.maika{margin-top:12px;border-left:4px solid #6D5DFB;border-radius:0 12px 12px 0;padding:12px 16px;background:linear-gradient(180deg,#F8F6FF,#F3F0FF);page-break-inside:auto}
.maika-h{font-size:9.5px;font-weight:800;color:#6D5DFB;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;gap:7px;margin-bottom:7px;page-break-after:avoid}
.maika-dot{width:7px;height:7px;border-radius:50%;background:#6D5DFB;display:inline-block}
.maika-body p{font-size:10.5px;color:#42526E;line-height:1.62;margin-bottom:7px}
.maika-body p:last-child{margin-bottom:0}
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
</body></html>`;
}
