import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * HTML in-ấn A4 cho Báo cáo điều hành — thiết kế chuẩn ELITE SaaS 2026, render bằng
 * headless Chrome (Puppeteer). Dùng CHUNG cho email đính kèm và nút "PDF" trên web.
 * Font BeVietnamPro nhúng @font-face base64 (tiếng Việt chuẩn). Mỗi khối page-break-inside:avoid.
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
const compact = (n: number) => {
  const a = Math.abs(n || 0);
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (a >= 1e3) return Math.round(n / 1e3) + 'k';
  return String(Math.round(n || 0));
};
const hcolor = (v: number) =>
  v >= 80 ? '#10B981' : v >= 65 ? '#0EA5E9' : v >= 50 ? '#F59E0B' : '#F43F5E';
const grade = (v: number) =>
  v >= 90
    ? 'Xuất sắc'
    : v >= 80
      ? 'Rất tốt'
      : v >= 65
        ? 'Tốt'
        : v >= 50
          ? 'Cần cải thiện'
          : 'Cần chú ý';

/** Vòng gauge trắng (đặt trên nền tím của masthead). */
function ring(score: number): string {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return `<svg width="90" height="90" viewBox="0 0 90 90">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.55"/>
    </linearGradient></defs>
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="7"/>
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="url(#rg)" stroke-width="7"
      stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 45 45)"/>
    <text x="45" y="49" text-anchor="middle" font-size="27" font-weight="800" fill="#ffffff">${score}</text>
    <text x="45" y="62" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.85)">/ 100</text>
  </svg>`;
}

function dimBar(label: string, score: number | null): string {
  if (score == null)
    return `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b class="mut">—</b></div><div class="bar"><i style="width:0"></i></div></div>`;
  const c = hcolor(score);
  return `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b style="color:${c}">${score}</b></div><div class="bar"><i style="width:${score}%;background:linear-gradient(90deg,${c},${c}bb)"></i></div></div>`;
}

function trendChart(
  trends: Array<{ name: string; thu: number; chi: number }>,
): string {
  if (!trends?.length) return '<p class="mut sm">Chưa có dữ liệu kỳ trước.</p>';
  const max = Math.max(1, ...trends.flatMap((t) => [t.thu, t.chi]));
  const bars = trends
    .map(
      (t) => `<div class="tcol">
      <div class="tbars">
        <div class="tbwrap"><span class="tval" style="color:#059669">${compact(t.thu)}</span><div class="tb thu" style="height:${(t.thu / max) * 100}%"></div></div>
        <div class="tbwrap"><span class="tval" style="color:#E11D48">${compact(t.chi)}</span><div class="tb chi" style="height:${(t.chi / max) * 100}%"></div></div>
      </div>
      <div class="tlbl">${esc(t.name)}</div>
    </div>`,
    )
    .join('');
  return `<div class="chart">${bars}</div>
    <div class="legend"><span><i style="background:#059669"></i>Thu</span><span><i style="background:#E11D48"></i>Chi</span></div>`;
}

const stars = (n: number) => {
  const k = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); // clamp 0..5 (tránh repeat âm → crash)
  return k <= 0
    ? '<span style="color:#F43F5E">⚠</span>'
    : `<span style="color:#F59E0B;letter-spacing:-1px">${'★'.repeat(k)}</span><span style="color:#E2E8F0;letter-spacing:-1px">${'★'.repeat(5 - k)}</span>`;
};

export function buildReportHtml(
  report: any,
  aiText: string,
  logoDataUri?: string | null,
): string {
  const fonts = loadFontsBase64();
  const fontFace = fonts
    ? `@font-face{font-family:'BVP';font-weight:400;src:url(data:font/ttf;base64,${fonts.regular}) format('truetype');}
       @font-face{font-family:'BVP';font-weight:700;src:url(data:font/ttf;base64,${fonts.bold}) format('truetype');}`
    : '';
  const fam = fonts ? "'BVP','Be Vietnam Pro',Arial,sans-serif" : 'Arial,sans-serif';

  const s = report.summary;
  const fin = report.finance;
  const cmp = fin.compare;
  const healthScore = Number.isFinite(s.clubHealthScore)
    ? s.clubHealthScore
    : 0;
  const avgHealth = Number.isFinite(report.members?.avgHealth)
    ? report.members.avgHealth
    : 0;
  const hc = hcolor(healthScore);
  // Thời gian XUẤT báo cáo = thời gian THỰC lúc render (giờ VN), KHÔNG phải mốc cuối kỳ quỹ.
  // (report.generatedAt = cuối kỳ = dùng cho "Kỳ", không dùng cho ngày xuất.)
  const exportedAt = new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const dp = (v: number | null | undefined) =>
    v == null
      ? '<span class="mut">—</span>'
      : `<span class="delta" style="color:${v >= 0 ? '#059669' : '#E11D48'};background:${v >= 0 ? '#ECFDF5' : '#FFF1F2'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v)}%</span>`;

  // Logo CLB (data URI) hoặc monogram chữ cái đầu (khi CLB chưa có logo).
  const mono = esc((report.meta.clubName || 'C').trim().charAt(0).toUpperCase());
  // Chỉ nhúng khi là data:image URI hợp lệ (chống inject vào src); nếu không → monogram.
  const safeLogo =
    typeof logoDataUri === 'string' && /^data:image\/[a-z+]+;base64,/i.test(logoDataUri)
      ? logoDataUri
      : null;
  const logoLg = safeLogo
    ? `<div class="logo lg"><img src="${safeLogo}" alt=""/></div>`
    : `<div class="logo lg mono">${mono}</div>`;
  const logoSm = safeLogo
    ? `<div class="logo sm"><img src="${safeLogo}" alt=""/></div>`
    : `<div class="logo sm mono">${mono}</div>`;

  // KPI tile với accent trái
  const kpi = (l: string, v: string, sub = '', accent = '#CBD5E1') =>
    `<div class="kpi" style="border-left-color:${accent}"><div class="kl">${esc(l)}</div><div class="kv">${esc(v)}</div>${sub ? `<div class="ks">${esc(sub)}</div>` : ''}</div>`;

  const head = (num: string, eyebrow: string, title: string, note = '') =>
    `<div class="shead"><div><div class="eyebrow">${esc(num)} · ${esc(eyebrow)}</div><div class="stitle">${esc(title)}</div></div>${note ? `<div class="snote">${esc(note)}</div>` : ''}</div>`;

  const memberRows = (report.members.all || [])
    .map((m: any, i: number) => {
      const pay =
        m.paymentStatus === 'paid'
          ? '<span class="chip ok">Đã đóng</span>'
          : m.paymentStatus === 'debt'
            ? '<span class="chip bad">Nợ</span>'
            : '<span class="mut">—</span>';
      const c = hcolor(m.healthScore);
      return `<tr>
      <td class="c"><span class="rank">${i + 1}</span></td>
      <td class="nm">${esc(m.name)}</td>
      <td class="r">${m.participationRate}%</td>
      <td class="c">${pay}</td>
      <td class="c">${stars(m.stars ?? 0)}</td>
      <td class="r">${m.conductScore ?? '—'}</td>
      <td class="r"><span class="pill" style="background:${c}1a;color:${c}">${m.healthScore}</span></td>
    </tr>`;
    })
    .join('');

  const dnaTraits = (report.dna.traits || [])
    .map((t: any) => dimBar(t.key, t.score))
    .join('');

  const di = report.members.distribution || {};
  const distItem = (label: string, val: number, color: string) =>
    `<div class="d"><span><i style="background:${color}"></i>${label}</span><b>${val ?? 0}</b></div>`;
  const distHtml = `<div class="dist">
    ${distItem('Xuất sắc (≥90)', di.excellent, '#10B981')}
    ${distItem('Tốt (80–89)', di.good, '#0EA5E9')}
    ${distItem('Khá (50–79)', di.fair, '#F59E0B')}
    ${distItem('Cần quan tâm (&lt;50)', di.atRisk, '#F43F5E')}
  </div>`;

  const ai = report.ai;
  const agent = (
    color: string,
    name: string,
    v: string,
    u: string,
    d: string,
  ) =>
    `<div class="agent" style="--ac:${color}"><div class="an">${esc(name)}</div><div class="av">${esc(v)}<span class="au">${esc(u)}</span></div><div class="ad">${esc(d)}</div></div>`;
  const agentsHtml = `<div class="aigrid">
    ${agent('#6D5DFB', 'Hermes', `${ai.hermes.completed}/${ai.hermes.runs}`, 'workflow', `${ai.hermes.failed} lỗi · ${ai.hermes.running ?? 0} đang chạy`)}
    ${agent('#0EA5E9', 'Lisa', String(ai.lisa.answered), 'hỏi–đáp', `${ai.lisa.reminders} lượt nhắc`)}
    ${agent('#DB2777', 'Maika', String(ai.maika.insights), 'insight', `${ai.maika.actions} đề xuất`)}
    ${agent('#EA580C', 'Mít Đặc', String(ai.mitdac.executed), 'tác vụ', `${ai.mitdac.failed} lỗi · TB ${ai.mitdac.avgMs}ms`)}
    ${agent('#C026D3', 'Thông báo', String(ai.notification.sent), 'đã gửi', `App ${ai.notification.byChannel.IN_APP} · Mail ${ai.notification.byChannel.EMAIL} · TG ${ai.notification.byChannel.TELEGRAM}`)}
  </div>`;

  const tour = report.tournament;
  const act = report.activity;
  const fc = report.forecast;
  const topPlayers = (tour.topPlayers || [])
    .slice(0, 3)
    .map(
      (p: any, i: number) =>
        `<div class="pl"><span class="plr">${i + 1}</span><span class="pln">${esc(p.name)}</span><span class="plw">${p.wins}T · ${p.winRate}%</span></div>`,
    )
    .join('');

  const d2 = (d: any) => {
    const x = new Date(d);
    return isNaN(x.getTime())
      ? ''
      : `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`;
  };
  const tlColor = (t: string) =>
    t === 'income' ? '#10B981' : t === 'expense' ? '#F43F5E' : '#6D5DFB';
  const timelineHtml = report.timeline?.length
    ? `<ul class="tl">${report.timeline
        .map(
          (t: any) =>
            `<li style="--dot:${tlColor(t.type)}"><span class="tld">${d2(t.date)}</span><span class="tlx">${esc(t.label)}${t.amount != null ? ` <b>${money(t.amount)}</b>` : ''}</span></li>`,
        )
        .join('')}</ul>`
    : '<p class="mut sm">Chưa có sự kiện nổi bật.</p>';

  const alerts = report.alerts?.length
    ? `<ul class="alist">${report.alerts.map((a: any) => `<li>${esc(a.message)}</li>`).join('')}</ul>`
    : '<p class="ok sm">✓ Không có cảnh báo — CLB ổn định.</p>';
  const recs = report.recommendations?.length
    ? `<ul class="rlist">${report.recommendations.map((r: any) => `<li><span class="tag">${esc(r.agent)}</span>${esc(r.text)}</li>`).join('')}</ul>`
    : '<p class="mut sm">Không có đề xuất.</p>';

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
${fontFace}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:0}
body{font-family:${fam};color:#334155;font-size:10.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.mut{color:#64748B}.sm{font-size:10px}.ok{color:#059669}
b{font-weight:700}
/* Section shell */
.sect{border:1px solid #EAEEF3;border-radius:16px;padding:15px 17px;margin-bottom:14px;page-break-inside:avoid;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.03),0 4px 12px rgba(15,23,42,.03)}
/* Section được phép NGẮT TRANG (bảng thành viên dài) — header lặp lại, không cắt giữa dòng */
.sect--flow{page-break-inside:auto}
.sect--flow table{page-break-inside:auto}
.sect--flow thead{display:table-header-group}
.sect--flow tr{page-break-inside:avoid}
.sect--flow .avgcard{page-break-inside:avoid}
/* Cụm tiêu đề+điểm-TB của mục Thành viên: KHÔNG tách, KHÔNG mồ côi ở đáy trang (đè footer) */
.mhead{page-break-inside:avoid;break-inside:avoid;page-break-after:avoid;break-after:avoid}
.shead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px}
.eyebrow{font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#A9B4C4;font-weight:700}
.stitle{font-size:15px;font-weight:800;color:#0F172A;letter-spacing:-.01em;margin-top:2px}
.snote{font-size:9px;color:#94A3B8;text-align:right;max-width:48%}
/* Masthead */
.hero{position:relative;overflow:hidden;border-radius:18px;padding:22px 24px;margin-bottom:16px;color:#fff;
  background:radial-gradient(120% 140% at 88% 8%,rgba(255,255,255,.20),transparent 42%),radial-gradient(120% 130% at 6% 100%,rgba(139,92,246,.55),transparent 46%),linear-gradient(125deg,#6D5DFB 0%,#7C3AED 100%);
  display:flex;justify-content:space-between;align-items:center}
.hero .eyb{font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;opacity:.85;font-weight:700}
.hero h1{font-size:27px;font-weight:800;letter-spacing:-.02em;margin:5px 0 4px}
.hero .sub{font-size:11px;opacity:.9}
.hero .brand{position:absolute;top:16px;right:24px;font-size:9px;letter-spacing:.08em;opacity:.8;font-weight:700}
.hero-l{display:flex;align-items:center;gap:14px}
.gauge{display:flex;flex-direction:column;align-items:center;gap:6px}
.gauge .cls{font-size:10px;font-weight:700;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);padding:2px 12px;border-radius:99px;letter-spacing:.02em}
/* Health dims */
.dims{display:grid;grid-template-columns:repeat(3,1fr);gap:11px 16px}
.dim-h{display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px;font-weight:700;color:#475569}
.dim-h b{font-size:11px}
.bar{height:7px;background:#EEF2F7;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;border-radius:99px}
/* KPI */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpi{background:#fff;border:1px solid #EAEEF3;border-left:3px solid #CBD5E1;border-radius:12px;padding:11px 13px;box-shadow:0 1px 2px rgba(15,23,42,.03)}
.kl{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;font-weight:700}
.kv{font-size:19px;font-weight:800;color:#0F172A;letter-spacing:-.02em;margin-top:3px;font-variant-numeric:tabular-nums}
.ks{font-size:9px;color:#94A3B8;margin-top:1px}
.kpi2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
/* AI summary */
.aibox{background:linear-gradient(180deg,#F7F6FF,#FBFAFF);border:1px solid #E9E5FF}
.aibox .h{font-size:11px;font-weight:800;color:#6D5DFB;margin-bottom:6px;letter-spacing:.01em}
.aibox .b{font-size:11px;line-height:1.7;white-space:pre-line;color:#3F3F5A}
/* Finance */
.two{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;align-items:center}
.chart{display:flex;align-items:flex-end;gap:16px;height:130px;padding:4px 4px 0;border-bottom:1px solid #EEF2F7}
.tcol{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}
.tbars{display:flex;gap:7px;align-items:flex-end;height:100%}
.tbwrap{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.tval{font-size:8px;font-weight:700;margin-bottom:3px}
.tb{width:22px;border-radius:5px 5px 0 0}
.tb.thu{background:linear-gradient(180deg,#34D399,#059669)}.tb.chi{background:linear-gradient(180deg,#FB7185,#E11D48)}
.tlbl{font-size:9px;color:#94A3B8;margin-top:6px;text-align:center;font-weight:600}
.legend{display:flex;gap:16px;font-size:9.5px;color:#64748B;margin-top:8px}.legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:middle}
.frow{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;padding:6px 0;border-bottom:1px solid #F1F5F9}
.frow:last-child{border-bottom:none}
.frow .fl{color:#64748B}.frow .fv{font-weight:800;color:#0F172A;font-variant-numeric:tabular-nums}
.delta{font-size:8px;font-weight:700;padding:1px 6px;border-radius:99px;margin-left:6px}
/* Tiles */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.tile{border:1px solid #EAEEF3;border-radius:11px;padding:9px;text-align:center;background:#FBFCFE}
.tile .l{font-size:8px;letter-spacing:.06em;text-transform:uppercase;color:#94A3B8;font-weight:700}
.tile .v{font-size:16px;font-weight:800;color:#0F172A;margin-top:2px}
/* Member table */
table{width:100%;border-collapse:collapse}
thead th{background:#F8FAFC;color:#64748B;font-size:8px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;text-align:left;padding:8px 9px;border-bottom:2px solid #E5EAF1}
thead th.r{text-align:right}thead th.c{text-align:center}
tbody td{padding:6px 9px;border-bottom:1px solid #F1F5F9;font-size:10px;color:#334155}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even) td{background:#FCFDFE}
td.r{text-align:right}td.c{text-align:center}td.nm{font-weight:600;color:#0F172A}
.rank{display:inline-flex;width:19px;height:19px;border-radius:50%;background:#F1F5F9;color:#64748B;font-size:9px;font-weight:800;align-items:center;justify-content:center}
.pill{display:inline-block;min-width:28px;text-align:center;padding:2px 8px;border-radius:99px;font-weight:800;font-size:10px}
.chip{display:inline-block;font-size:8.5px;font-weight:700;padding:2px 8px;border-radius:99px}
.chip.ok{background:#ECFDF5;color:#059669}.chip.bad{background:#FFF1F2;color:#E11D48}
.avgcard{display:flex;align-items:center;gap:18px;border:1px solid #EAEEF3;background:#FBFCFE;border-radius:12px;padding:11px 14px;margin-bottom:11px}
.avgcard .big{font-size:30px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.avgcard .big small{font-size:12px;color:#94A3B8;font-weight:600}
.avgcard .lbl{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;font-weight:700}
.dist{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:1}
.dist .d{display:flex;justify-content:space-between;font-size:9.5px;border:1px solid #EEF2F7;border-radius:8px;padding:5px 9px;background:#fff}
.dist .d b{font-weight:800;color:#0F172A}
.dist .d i{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}
/* Two-card row */
.half{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.three{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:14px}
.subh{font-size:12px;font-weight:800;color:#0F172A;margin-bottom:9px}
.callout{font-size:9.5px;color:#64748B;line-height:1.7;margin-top:8px}
.callout b{color:#0F172A}
.pl{display:flex;align-items:center;gap:9px;font-size:10px;padding:4px 0;border-bottom:1px solid #F5F7FA}
.pl:last-child{border-bottom:none}
.plr{width:18px;height:18px;border-radius:50%;background:#FEF3C7;color:#B45309;font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}
.pln{flex:1;font-weight:600;color:#0F172A}.plw{color:#64748B;font-size:9.5px}
/* AI agents */
.aigrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.agent{border:1px solid #EAEEF3;border-top:3px solid var(--ac);border-radius:12px;padding:11px 12px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.03)}
.an{font-size:10.5px;font-weight:800;color:var(--ac)}
.av{font-size:20px;font-weight:800;color:#0F172A;letter-spacing:-.02em;margin:3px 0;font-variant-numeric:tabular-nums}
.au{font-size:9px;color:#94A3B8;font-weight:600;margin-left:3px}
.ad{font-size:8.5px;color:#94A3B8;border-top:1px solid #F1F5F9;margin-top:6px;padding-top:6px;line-height:1.5}
/* Timeline / alerts / recs */
.tl{list-style:none;border-left:2px solid #EDF1F6;padding-left:14px;margin-left:3px}
.tl li{position:relative;margin-bottom:9px;font-size:9.5px}
.tl li:before{content:'';position:absolute;left:-20px;top:2px;width:8px;height:8px;border-radius:50%;background:var(--dot);box-shadow:0 0 0 2px #fff}
.tld{font-weight:800;color:#0F172A;margin-right:5px}.tlx b{color:#334155}
.alist,.rlist{list-style:none}
.alist li{font-size:9.5px;color:#334155;padding:4px 0 4px 16px;position:relative;line-height:1.5}
.alist li:before{content:'•';position:absolute;left:0;color:#F59E0B;font-weight:700}
.rlist li{font-size:9.5px;color:#334155;padding:5px 0;line-height:1.6}
.tag{display:inline-block;background:#EEF0FF;color:#6D5DFB;font-size:8px;font-weight:800;padding:1px 7px;border-radius:99px;margin-right:6px}
.foot{text-align:center;color:#B4BCC8;font-size:8.5px;margin-top:4px}
/* Logo badge */
.logo{background:#fff;border-radius:15px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 6px 18px rgba(15,23,42,.18)}
.logo img{width:100%;height:100%;object-fit:contain}
.logo.mono{color:#6D5DFB;font-weight:800}
.logo.lg{width:76px;height:76px}.logo.lg.mono{font-size:38px}
.logo.sm{width:44px;height:44px;border-radius:12px;box-shadow:0 3px 10px rgba(15,23,42,.16)}.logo.sm.mono{font-size:22px}
/* COVER PAGE */
.cover{position:relative;overflow:hidden;height:263mm;border-radius:22px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:26mm 22mm;page-break-after:always;box-shadow:0 10px 30px rgba(91,75,232,.25);
  background:radial-gradient(120% 90% at 90% 4%,rgba(255,255,255,.16),transparent 40%),radial-gradient(130% 120% at 0% 100%,rgba(167,139,250,.5),transparent 46%),linear-gradient(150deg,#5B4BE8 0%,#7C3AED 55%,#6D28D9 100%)}
.cover .cv-top{display:flex;align-items:center;gap:14px}
.cover .cv-brand{font-size:11px;letter-spacing:.22em;font-weight:700;opacity:.9}
.cover .cv-eyb{font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:700;opacity:.85}
.cover .cv-title{font-size:44px;font-weight:800;letter-spacing:-.02em;line-height:1.05;margin:12px 0 10px}
.cover .cv-period{font-size:14px;opacity:.92}
.cover .cv-rule{width:64px;height:4px;border-radius:9px;background:rgba(255,255,255,.75);margin:20px 0}
.cover .cv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:150mm}
.cover .gcard{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);border-radius:16px;padding:14px 16px}
.cover .gcard .l{font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.8;font-weight:700}
.cover .gcard .v{font-size:24px;font-weight:800;letter-spacing:-.02em;margin-top:5px;font-variant-numeric:tabular-nums}
.cover .gcard .s{font-size:9.5px;opacity:.85;margin-top:2px}
.cover .cv-foot{display:flex;justify-content:space-between;font-size:10px;opacity:.85;border-top:1px solid rgba(255,255,255,.25);padding-top:14px}
</style></head><body>

<section class="cover">
  <div class="cv-top">${logoLg}<div class="cv-brand">◆ PICKLEFUND</div></div>
  <div>
    <div class="cv-eyb">Báo cáo điều hành · Executive Report</div>
    <h1 class="cv-title">${esc(report.meta.clubName)}</h1>
    <div class="cv-period">Kỳ báo cáo: ${esc(report.meta.periodName)}</div>
    <div class="cv-rule"></div>
    <div class="cv-stats">
      <div class="gcard"><div class="l">Sức khỏe CLB</div><div class="v">${healthScore}/100</div><div class="s">${grade(healthScore)}</div></div>
      <div class="gcard"><div class="l">Tổng tài sản</div><div class="v">${compact(fin.clubAssets)}đ</div><div class="s">quỹ cuối kỳ</div></div>
      <div class="gcard"><div class="l">Thành viên</div><div class="v">${s.activeMembers}/${s.totalMembers}</div><div class="s">đang hoạt động</div></div>
    </div>
  </div>
  <div class="cv-foot"><span>Xuất lúc ${esc(exportedAt)}</span><span>Tài liệu nội bộ · Ban quản trị CLB</span></div>
</section>

<div class="hero">
  <div class="brand">◆ PICKLEFUND</div>
  <div class="hero-l">
    ${logoSm}
    <div>
      <div class="eyb">Báo cáo điều hành · Executive Report</div>
      <h1>${esc(report.meta.clubName)}</h1>
      <div class="sub">Kỳ: ${esc(report.meta.periodName)} · Xuất lúc ${esc(exportedAt)}</div>
    </div>
  </div>
  <div class="gauge">${ring(healthScore)}<div class="cls">${grade(healthScore)}</div></div>
</div>

<div class="sect">
  ${head('01', 'Sức khỏe tổng hợp', 'Điểm sức khỏe CLB', 'Tổng hợp 6 chiều từ số liệu thật của kỳ')}
  <div class="dims">${(report.health.dimensions || []).map((d: any) => dimBar(d.key, d.score)).join('')}</div>
</div>

<div class="sect">
  ${head('02', 'Tổng quan điều hành', 'Các chỉ số chính')}
  <div class="kpis">
    ${kpi('Thành viên', `${s.activeMembers}/${s.totalMembers}`, 'đang hoạt động', '#6366F1')}
    ${kpi('Tỷ lệ tham gia', `${s.participationRate}%`, 'điểm danh / sĩ số', '#0EA5E9')}
    ${kpi('Buổi chơi', String(s.completedSessions), `${s.cancelledSessions} hủy`, '#14B8A6')}
    ${kpi('Giải / Minigame', String(s.tournamentsCount), 'trong kỳ', '#F59E0B')}
    ${kpi('Tổng thu', money(fin.totalIncome), '', '#10B981')}
    ${kpi('Tổng chi', money(fin.totalExpense), '', '#F43F5E')}
    ${kpi('Tổng tài sản', money(fin.clubAssets), 'quỹ cuối kỳ', '#7C3AED')}
    ${kpi('Công nợ', `${s.outstandingCount} TV`, 'chưa đủ đóng', s.outstandingCount > 0 ? '#F43F5E' : '#94A3B8')}
  </div>
</div>

<div class="sect aibox">
  <div class="h">Tóm tắt điều hành (AI)</div>
  <div class="b">${esc(aiText)}</div>
</div>

<div class="sect">
  ${head('03', 'Tài chính', 'Thu · Chi · Dòng quỹ', 'Số liệu chuẩn theo kỳ quỹ (carry-forward)')}
  <div class="two">
    <div>${trendChart(fin.trends)}</div>
    <div>
      <div class="frow"><span class="fl">Tổng thu</span><span><span class="fv">${money(fin.totalIncome)}</span>${dp(cmp?.incomeDeltaPct)}</span></div>
      <div class="frow"><span class="fl">Tổng chi</span><span><span class="fv">${money(fin.totalExpense)}</span>${dp(cmp?.expenseDeltaPct)}</span></div>
      <div class="frow"><span class="fl">Cân đối kỳ</span><span><span class="fv">${money(fin.balance)}</span>${dp(cmp?.balanceDeltaPct)}</span></div>
      <div class="frow"><span class="fl">Quỹ đầu kỳ</span><span class="fv">${money(fin.carryForward)}</span></div>
      <div class="frow"><span class="fl">Tổng tài sản (cuối kỳ)</span><span class="fv">${money(fin.clubAssets)}</span></div>
      <div class="frow"><span class="fl">Thu bình quân / thành viên</span><span class="fv">${money(fin.avgIncomePerMember)}</span></div>
    </div>
  </div>
</div>

<div class="sect sect--flow">
  <div class="mhead">
    ${head('04', 'Thành viên', 'Bảng xếp hạng sức khỏe', '40% tham gia · 30% đóng quỹ · 30% hạnh kiểm')}
    <div class="avgcard">
      <div><div class="lbl">Điểm sức khỏe TB</div><div class="big" style="color:${hcolor(avgHealth)}">${avgHealth}<small>/100</small></div></div>
      ${distHtml}
    </div>
  </div>
  <table>
    <thead><tr><th class="c">#</th><th>Thành viên</th><th class="r">Tham gia</th><th class="c">Đóng quỹ</th><th class="c">Đánh giá</th><th class="r">Hạnh kiểm</th><th class="r">Sức khỏe</th></tr></thead>
    <tbody>${memberRows || '<tr><td colspan="7" class="c mut" style="padding:14px">Chưa có thành viên.</td></tr>'}</tbody>
  </table>
</div>

<div class="sect half">
  <div>
    <div class="eyebrow">05 · Dự báo</div><div class="subh">Xu hướng 30–90 ngày</div>
    <div class="tiles">
      <div class="tile"><div class="l">+30 ngày</div><div class="v">${money(fc.projected30)}</div></div>
      <div class="tile"><div class="l">+60 ngày</div><div class="v">${money(fc.projected60)}</div></div>
      <div class="tile"><div class="l">+90 ngày</div><div class="v">${money(fc.projected90)}</div></div>
    </div>
    <p class="callout">${esc(fc.trendLabel)} · dòng tiền ~${money(fc.dailyNet)}/ngày. <i class="mut">${esc(fc.note)}</i></p>
  </div>
  <div>
    <div class="eyebrow">06 · Club DNA</div><div class="subh">${esc(report.dna.archetype)}</div>
    <div class="dims" style="grid-template-columns:1fr;gap:8px">${dnaTraits}</div>
  </div>
</div>

<div class="sect half">
  <div>
    <div class="eyebrow">07 · Hoạt động</div><div class="subh">Vận hành buổi chơi</div>
    <div class="kpi2">
      ${kpi('Tổng buổi', String(act.totalSessions), '', '#14B8A6')}
      ${kpi('Hoàn thành', String(act.completed), '', '#10B981')}
      ${kpi('Bị hủy', String(act.cancelled), '', '#F43F5E')}
      ${kpi('TB người / buổi', String(act.avgPresentPerSession), '', '#0EA5E9')}
    </div>
    <div class="callout">
      ${act.busiest ? `<b style="color:#F59E0B">Đông nhất:</b> <b>${esc(act.busiest.name)}</b> (${act.busiest.present} người)<br>` : ''}
      ${act.emptiest ? `<b style="color:#94A3B8">Ít nhất:</b> ${esc(act.emptiest.name)} (${act.emptiest.present} người)<br>` : ''}
      <i class="mut">Tỷ lệ lấp đầy tính theo sĩ số hoạt động (chưa có sức chứa/buổi).</i>
    </div>
  </div>
  <div>
    <div class="eyebrow">08 · Thi đấu</div><div class="subh">Giải &amp; Minigame</div>
    <div class="tiles">
      <div class="tile"><div class="l">Giải</div><div class="v">${tour.tournamentsCount}</div></div>
      <div class="tile"><div class="l">Trận</div><div class="v">${tour.matchesCount}</div></div>
      <div class="tile"><div class="l">Đội</div><div class="v">${tour.teamsCount}</div></div>
    </div>
    ${topPlayers ? `<div style="margin-top:9px">${topPlayers}<p class="callout"><i class="mut">Người dẫn đầu BXH (chưa có giải MVP chính thức).</i></p></div>` : '<p class="callout mut">Chưa có giải/minigame trong kỳ.</p>'}
  </div>
</div>

<div class="sect">
  ${head('09', 'Văn phòng AI (AIDO)', 'Hiệu suất tự động hóa', `Trong kỳ · điểm tự động hóa ${ai.automationScore.score}/100`)}
  ${agentsHtml}
</div>

<div class="sect three">
  <div><div class="eyebrow">10 · Dòng thời gian</div><div class="subh">Sự kiện nổi bật</div>${timelineHtml}</div>
  <div><div class="eyebrow">11 · Cảnh báo</div><div class="subh">Rủi ro cần lưu ý</div>${alerts}</div>
  <div><div class="eyebrow">12 · Khuyến nghị</div><div class="subh">Gợi ý hành động</div>${recs}</div>
</div>

<div class="foot">AIDO Executive Report v1.0 · mọi con số từ dữ liệu thật của CLB · ${esc(report.meta.clubName)} · xuất lúc ${esc(exportedAt)}</div>

</body></html>`;
}
