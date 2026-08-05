import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Dựng HTML in-ấn (A4) cho Báo cáo điều hành — render bằng headless Chrome (Puppeteer)
 * để PDF GIỐNG giao diện web, chia trang sạch (mỗi khối page-break-inside:avoid), chữ chọn
 * được, file nhẹ. Dùng CHUNG cho email đính kèm và nút "PDF" trên web (1 bản chuẩn duy nhất).
 *
 * Font BeVietnamPro nhúng @font-face base64 → tiếng Việt có dấu chuẩn, không phụ thuộc font
 * hệ thống của container.
 */

let fontCache: { regular: string; bold: string } | null = null;
function loadFontsBase64(): { regular: string; bold: string } | null {
  if (fontCache) return fontCache;
  const dirs = [
    join(__dirname, '..', 'assets', 'fonts'),
    join(__dirname, 'assets', 'fonts'),
    join(process.cwd(), 'dist', 'assets', 'fonts'),
    join(process.cwd(), 'src', 'assets', 'fonts'),
  ];
  for (const d of dirs) {
    const reg = join(d, 'BeVietnamPro-Regular.ttf');
    const bold = join(d, 'BeVietnamPro-Bold.ttf');
    if (existsSync(reg) && existsSync(bold)) {
      fontCache = {
        regular: readFileSync(reg).toString('base64'),
        bold: readFileSync(bold).toString('base64'),
      };
      return fontCache;
    }
  }
  return null;
}

const esc = (x: unknown) =>
  String(x ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const money = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';
const hcolor = (v: number) =>
  v >= 80 ? '#059669' : v >= 65 ? '#0EA5E9' : v >= 50 ? '#F59E0B' : '#E11D48';

function ring(score: number): string {
  const c = hcolor(score);
  const r = 34;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return `<svg width="86" height="86" viewBox="0 0 86 86">
    <circle cx="43" cy="43" r="${r}" fill="none" stroke="#eee" stroke-width="8"/>
    <circle cx="43" cy="43" r="${r}" fill="none" stroke="${c}" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
      transform="rotate(-90 43 43)"/>
    <text x="43" y="47" text-anchor="middle" font-size="24" font-weight="700" fill="${c}">${score}</text>
    <text x="43" y="60" text-anchor="middle" font-size="9" fill="#999">/100</text>
  </svg>`;
}

function dimBar(label: string, score: number | null): string {
  if (score == null)
    return `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b style="color:#999">—</b></div><div class="bar"><i style="width:0"></i></div></div>`;
  const c = hcolor(score);
  return `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b style="color:${c}">${score}</b></div><div class="bar"><i style="width:${score}%;background:${c}"></i></div></div>`;
}

function trendChart(trends: Array<{ name: string; thu: number; chi: number }>): string {
  if (!trends?.length) return '<p class="muted">Chưa có dữ liệu kỳ trước.</p>';
  const max = Math.max(1, ...trends.flatMap((t) => [t.thu, t.chi]));
  const bars = trends
    .map(
      (t) => `<div class="tcol">
      <div class="tbars">
        <div class="tb" style="height:${(t.thu / max) * 100}%;background:#059669" title="Thu ${money(t.thu)}"></div>
        <div class="tb" style="height:${(t.chi / max) * 100}%;background:#E11D48" title="Chi ${money(t.chi)}"></div>
      </div>
      <div class="tlbl">${esc(t.name)}</div>
    </div>`,
    )
    .join('');
  return `<div class="chart">${bars}</div>
    <div class="legend"><span><i style="background:#059669"></i>Thu</span><span><i style="background:#E11D48"></i>Chi</span></div>`;
}

export function buildReportHtml(report: any, aiText: string): string {
  const fonts = loadFontsBase64();
  const fontFace = fonts
    ? `@font-face{font-family:'BVP';font-weight:400;src:url(data:font/ttf;base64,${fonts.regular}) format('truetype');}
       @font-face{font-family:'BVP';font-weight:700;src:url(data:font/ttf;base64,${fonts.bold}) format('truetype');}`
    : '';
  const fam = fonts ? "'BVP','Be Vietnam Pro',Arial,sans-serif" : "Arial,sans-serif";

  const s = report.summary;
  const fin = report.finance;
  const genDate = report.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');
  const cmp = fin.compare;
  const dp = (v: number | null | undefined) =>
    v == null
      ? '<span class="muted">—</span>'
      : `<span style="color:${v >= 0 ? '#059669' : '#E11D48'}">${v >= 0 ? '+' : ''}${v}%</span>`;
  const hc = hcolor(s.clubHealthScore);

  const kpi = (l: string, v: string, sub = '') =>
    `<div class="kpi"><div class="kl">${esc(l)}</div><div class="kv">${esc(v)}</div>${sub ? `<div class="ks">${esc(sub)}</div>` : ''}</div>`;

  const memberRows = (report.members.all || [])
    .map(
      (m: any, i: number) => `<tr>
      <td class="c">${i + 1}</td><td>${esc(m.name)}</td>
      <td class="r">${m.participationRate}%</td>
      <td class="c">${m.paymentStatus === 'paid' ? 'Đã đóng' : m.paymentStatus === 'debt' ? '<span style="color:#E11D48">Nợ</span>' : '—'}</td>
      <td class="r">${m.conductScore ?? '—'}</td>
      <td class="r" style="font-weight:700;color:${hcolor(m.healthScore)}">${m.healthScore}</td>
    </tr>`,
    )
    .join('');

  const dnaTraits = (report.dna.traits || [])
    .map((t: any) => dimBar(t.key, t.score))
    .join('');

  const alerts = report.alerts?.length
    ? `<ul class="list warn">${report.alerts.map((a: any) => `<li>${esc(a.message)}</li>`).join('')}</ul>`
    : '<p class="ok">✓ Không có cảnh báo.</p>';
  const recs = report.recommendations?.length
    ? `<ul class="list">${report.recommendations.map((r: any) => `<li><b>${esc(r.agent)}</b> · ${esc(r.text)}</li>`).join('')}</ul>`
    : '<p class="muted">Không có đề xuất.</p>';

  const tour = report.tournament;
  const ai = report.ai;
  const act = report.activity;
  const fc = report.forecast;

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
${fontFace}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:12mm 11mm}
body{font-family:${fam};color:#111827;font-size:11px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.muted{color:#8a8f98}.ok{color:#059669;font-size:11px}
.sect{border:1px solid #e9e9ef;border-radius:12px;padding:12px 14px;margin-bottom:12px;page-break-inside:avoid;background:#fff}
h2{font-size:12.5px;font-weight:700;margin-bottom:8px;color:#111827;display:flex;align-items:center;gap:6px}
h2 .note{font-weight:400;font-size:10px;color:#8a8f98}
/* Header */
.hero{background:linear-gradient(135deg,#6D5DFB,#5B4BE8);color:#fff;border-radius:14px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.hero .t1{font-size:11px;opacity:.9}.hero .t2{font-size:20px;font-weight:700;margin:2px 0}.hero .t3{font-size:12px;opacity:.9}
.hero .ringbox{background:#fff;border-radius:50%;padding:2px;line-height:0}
/* Health dims */
.dims{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dim-h{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px}
.bar{height:6px;background:#eee;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;border-radius:99px}
/* KPI */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.kpi{border:1px solid #eef;border-radius:10px;padding:9px 11px;background:#fafaff}
.kl{font-size:9.5px;color:#8a8f98}.kv{font-size:16px;font-weight:700;margin-top:2px}.ks{font-size:9px;color:#8a8f98;margin-top:1px}
/* AI box */
.aibox{background:#f5f4ff;border:1px solid #e7e4ff;border-radius:10px;padding:12px 14px}
.aibox .h{font-size:11.5px;font-weight:700;color:#6D5DFB;margin-bottom:5px}
.aibox .b{font-size:11px;line-height:1.6;white-space:pre-line;color:#333}
/* Tables */
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#6D5DFB;color:#fff;font-weight:700;text-align:left;padding:5px 7px}
td{padding:4px 7px;border-bottom:1px solid #f0f0f4}
tr:nth-child(even) td{background:#fafafd}
td.r,th.r{text-align:right}td.c,th.c{text-align:center}
.two{display:grid;grid-template-columns:1.3fr 1fr;gap:12px}
.half{display:grid;grid-template-columns:1fr 1fr;gap:12px}
/* Chart */
.chart{display:flex;align-items:flex-end;gap:14px;height:120px;padding:6px 4px;border-bottom:1px solid #eee}
.tcol{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}
.tbars{display:flex;gap:5px;align-items:flex-end;height:100%}
.tb{width:20px;border-radius:4px 4px 0 0}
.tlbl{font-size:9px;color:#8a8f98;margin-top:4px;text-align:center}
.legend{display:flex;gap:14px;font-size:10px;color:#555;margin-top:6px}.legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:middle}
.finrow{display:flex;justify-content:space-between;font-size:10.5px;padding:3px 0;border-bottom:1px dashed #eee}
.finrow b{font-weight:700}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tile{border:1px solid #eee;border-radius:9px;padding:8px;text-align:center}.tile .l{font-size:9.5px;color:#8a8f98}.tile .v{font-size:13px;font-weight:700}
.list{list-style:none;font-size:10.5px}.list li{padding:2px 0 2px 12px;position:relative}.list li:before{content:'•';position:absolute;left:0;color:#6D5DFB}
.list.warn li:before{color:#F59E0B}
.foot{text-align:center;color:#aaa;font-size:9px;margin-top:6px}
.badge{display:inline-block;background:#efeaff;color:#6D5DFB;font-size:9px;font-weight:700;padding:1px 7px;border-radius:99px}
</style></head><body>

<div class="hero">
  <div><div class="t1">Báo cáo điều hành hằng tháng</div>
  <div class="t2">${esc(report.meta.clubName)}</div>
  <div class="t3">${esc(report.meta.periodName)}</div></div>
  <div class="ringbox">${ring(s.clubHealthScore)}</div>
</div>

<div class="sect">
  <h2>Điểm sức khỏe CLB <span class="note">· tổng hợp 6 chiều từ số liệu thật</span></h2>
  <div class="dims">
    ${(report.health.dimensions || []).map((d: any) => dimBar(d.key, d.score)).join('')}
  </div>
</div>

<div class="sect">
  <h2>Tổng quan điều hành</h2>
  <div class="kpis">
    ${kpi('Thành viên', `${s.activeMembers}/${s.totalMembers}`, 'đang hoạt động')}
    ${kpi('Tỷ lệ tham gia', `${s.participationRate}%`, 'điểm danh/sĩ số')}
    ${kpi('Buổi chơi', String(s.completedSessions), `${s.cancelledSessions} hủy`)}
    ${kpi('Giải/Minigame', String(s.tournamentsCount), 'trong kỳ')}
    ${kpi('Tổng thu', money(fin.totalIncome))}
    ${kpi('Tổng chi', money(fin.totalExpense))}
    ${kpi('Tổng tài sản', money(fin.clubAssets), 'quỹ cuối kỳ')}
    ${kpi('Công nợ', `${s.outstandingCount} TV`, 'chưa đủ đóng')}
  </div>
</div>

<div class="sect aibox">
  <div class="h">✨ Tóm tắt điều hành (AI)</div>
  <div class="b">${esc(aiText)}</div>
</div>

<div class="sect">
  <h2>Tài chính <span class="note">· theo kỳ quỹ (carry-forward)</span></h2>
  <div class="two">
    <div>${trendChart(fin.trends)}</div>
    <div>
      <div class="finrow"><span>Tổng thu</span><span><b>${money(fin.totalIncome)}</b> ${dp(cmp?.incomeDeltaPct)}</span></div>
      <div class="finrow"><span>Tổng chi</span><span><b>${money(fin.totalExpense)}</b> ${dp(cmp?.expenseDeltaPct)}</span></div>
      <div class="finrow"><span>Cân đối kỳ</span><span><b>${money(fin.balance)}</b> ${dp(cmp?.balanceDeltaPct)}</span></div>
      <div class="finrow"><span>Quỹ đầu kỳ</span><b>${money(fin.carryForward)}</b></div>
      <div class="finrow"><span>Tổng tài sản</span><b>${money(fin.clubAssets)}</b></div>
      <div class="finrow"><span>Thu BQ/TV</span><b>${money(fin.avgIncomePerMember)}</b></div>
    </div>
  </div>
</div>

<div class="sect">
  <h2>Thành viên — Health Score <span class="note">· 40% tham gia · 30% đóng quỹ · 30% hạnh kiểm · TB ${report.members.avgHealth}/100</span></h2>
  <table>
    <thead><tr><th class="c">#</th><th>Thành viên</th><th class="r">Tham gia</th><th class="c">Đóng quỹ</th><th class="r">Hạnh kiểm</th><th class="r">Sức khỏe</th></tr></thead>
    <tbody>${memberRows}</tbody>
  </table>
</div>

<div class="sect half">
  <div>
    <h2>Dự báo 30–90 ngày <span class="note">· ước lượng</span></h2>
    <div class="tiles">
      <div class="tile"><div class="l">+30 ngày</div><div class="v">${money(fc.projected30)}</div></div>
      <div class="tile"><div class="l">+60 ngày</div><div class="v">${money(fc.projected60)}</div></div>
      <div class="tile"><div class="l">+90 ngày</div><div class="v">${money(fc.projected90)}</div></div>
    </div>
    <p class="muted" style="margin-top:6px">${esc(fc.trendLabel)} · dòng tiền ~${money(fc.dailyNet)}/ngày. ${esc(fc.note)}</p>
  </div>
  <div>
    <h2>Club DNA <span class="note">· phong cách vận hành</span></h2>
    <p style="font-weight:700;color:#6D5DFB;margin-bottom:6px">${esc(report.dna.archetype)}</p>
    <div class="dims" style="grid-template-columns:1fr">${dnaTraits}</div>
  </div>
</div>

<div class="sect">
  <h2>Vận hành &amp; AI Office <span class="note">· trong kỳ</span></h2>
  <div class="kpis">
    ${kpi('Buổi hoàn thành', String(act.completed), `TB ${act.avgPresentPerSession} người/buổi`)}
    ${kpi('Thi đấu', `${tour.tournamentsCount} giải`, `${tour.matchesCount} trận · ${tour.teamsCount} đội`)}
    ${kpi('Workflow (Hermes)', `${ai.hermes.completed}/${ai.hermes.runs}`, `${ai.hermes.failed} lỗi`)}
    ${kpi('Tự động hóa AI', `${ai.automationScore.score}/100`, `${ai.notification.sent} thông báo`)}
  </div>
</div>

<div class="sect half">
  <div><h2>Cảnh báo</h2>${alerts}</div>
  <div><h2>Gợi ý hành động</h2>${recs}</div>
</div>

<div class="foot">PickleFund · AIDO Executive Report v1.0 · mọi con số từ dữ liệu thật của CLB · xuất ${esc(genDate)}</div>

</body></html>`;
}
