import { loadFontsBase64 } from './export-fonts';
import {
  COLORS,
  PAGE,
  PAGE_CSS,
  SPACE,
  TYPE,
  escHtml,
  makeBrand,
  mm,
  pt,
  vndCompact,
} from './export-tokens';
import { buildExecModel, deltaText, healthTone } from './executive-report-model';

/**
 * HTML in-ấn A4 cho Báo cáo điều hành — chuẩn "Luxury SaaS": 1 màu chủ đạo (màu CLB), chữ ≥ 7pt,
 * tương phản ≥ 4.5:1, không gradient/đổ bóng/emoji. Render bằng headless Chrome (Puppeteer).
 * Dùng CHUNG cho email đính kèm và nút "PDF" trên web. Token + chuỗi hiển thị lấy từ
 * export-tokens.ts / executive-report-model.ts (cùng nguồn với fallback jsPDF).
 * Font BeVietnamPro nhúng @font-face base64. Lề @page KHỚP lề page.pdf() (nếu lệch, Chrome bỏ lề và footer đè nội dung).
 */

export const esc = escHtml;

export interface ReportHtmlOpts {
  /** Màu chủ đạo CLB (#RRGGBB); sai/rỗng → mặc định. */
  brandColor?: string | null;
  /** Thời điểm xuất (để mã TL + giờ xuất khớp footer). */
  now?: Date;
}

/** Vòng gauge: nét màu brand trên track hairline (không gradient). 26mm; font sinh từ token. */
function ring(score: number, stroke: string): string {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return `<svg width="${mm(26)}" height="${mm(26)}" viewBox="0 0 90 90">
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="${COLORS.hairline}" stroke-width="7"/>
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="${stroke}" stroke-width="7"
      stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 45 45)"/>
    <text x="45" y="50" text-anchor="middle" font-size="27" font-weight="700" fill="${COLORS.ink}">${score}</text>
    <text x="45" y="63" text-anchor="middle" font-size="9" fill="${COLORS.muted}">/ 100</text>
  </svg>`;
}

export function buildReportHtml(
  report: any,
  aiText: string,
  logoDataUri?: string | null,
  opts: ReportHtmlOpts = {},
): string {
  const fonts = loadFontsBase64();
  const fontFace = fonts
    ? `@font-face{font-family:'BVP';font-weight:400;src:url(data:font/ttf;base64,${fonts.regular}) format('truetype');}
@font-face{font-family:'BVP';font-weight:700;src:url(data:font/ttf;base64,${fonts.bold}) format('truetype');}`
    : '';
  const fam = fonts ? "'BVP','Be Vietnam Pro',Arial,sans-serif" : "'Be Vietnam Pro',Arial,sans-serif";

  const B = makeBrand(opts.brandColor);
  const m = buildExecModel(report, aiText, opts.now ?? new Date(), B.brand);

  // Chỉ nhúng khi là data:image URI hợp lệ (chống inject vào src); nếu không → monogram từ tên CLB.
  const safeLogo =
    typeof logoDataUri === 'string' && /^data:image\/[a-z+]+;base64,/i.test(logoDataUri) ? logoDataUri : null;
  const logo = (cls: 'md' | 'sm') =>
    safeLogo
      ? `<div class="logo ${cls}"><img src="${safeLogo}" alt=""/></div>`
      : `<div class="logo ${cls} mono">${esc(m.mono)}</div>`;

  // Tiền âm ("-80.000 đ") luôn hiển thị màu neg (AA) ở MỌI nơi.
  const negCls = (v: string) => (v.trim().startsWith('-') ? ' neg' : '');
  const kpi = (l: string, v: string, s = '', accent = false) =>
    `<div class="kpi${accent ? ' acc' : ''}"><div class="kl">${esc(l)}</div><div class="kv${negCls(v)}">${esc(v)}</div>${s ? `<div class="ks">${esc(s)}</div>` : ''}</div>`;
  const tile = (l: string, v: string) =>
    `<div class="tile"><div class="l">${esc(l)}</div><div class="v${negCls(v)}">${esc(v)}</div></div>`;
  const head = (num: string, eyebrow: string, title: string, note = '') =>
    `<div class="shead"><div><div class="eyebrow">${esc(num)} · ${esc(eyebrow)}</div><div class="stitle">${esc(title)}</div></div>${note ? `<div class="snote">${esc(note)}</div>` : ''}</div>`;
  const sub = (num: string, eyebrow: string, title: string) =>
    `<div class="eyebrow">${esc(num)} · ${esc(eyebrow)}</div><div class="subh">${esc(title)}</div>`;

  const tone = healthTone;

  const dimBar = (label: string, score: number | null) =>
    score == null
      ? `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b class="mut">—</b></div><div class="bar"><i style="width:0"></i></div></div>`
      : `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b style="color:${tone(score).text}">${score}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, score))}%;background:${tone(score).fill}"></i></div></div>`;

  const dots = (n: number) =>
    `<span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span><span class="dno">${n}/5</span>`;

  const delta = (v: number | null | undefined) =>
    v == null
      ? '<span class="mut">—</span>'
      : `<span class="delta ${v >= 0 ? 'pos' : 'neg'}">${deltaText(v)}</span>`;

  // Biểu đồ cột: toàn bề rộng, lưới ngang mảnh + nhãn trục; cột chiếm tối đa 85% chiều cao để chừa chỗ nhãn giá trị.
  const max = Math.max(1, ...m.trends.flatMap((t) => [t.thu, t.chi]));
  const dense = m.trends.length > 7;
  const chart = m.trends.length
    ? `<div class="chead"><span>Thu · Chi theo kỳ quỹ</span><span class="legend"><span><i style="background:${COLORS.posFill}"></i>Thu</span><span><i style="background:${COLORS.negFill}"></i>Chi</span></span></div>
    <div class="cplot${dense ? ' dense' : ''}">
      <div class="gl" style="bottom:85%"><em>${esc(vndCompact(max, true))}</em></div>
      <div class="gl" style="bottom:42.5%"><em>${esc(vndCompact(max / 2, true))}</em></div>
      <div class="gl gl0"><em>0</em></div>
      <div class="chart">${m.trends
        .map(
          (t) => `<div class="tcol"><div class="tbars">
        <div class="tbwrap"><span class="tval">${esc(t.thuLabel)}</span><div class="tb thu" style="height:${(t.thu / max) * 85}%"></div></div>
        <div class="tbwrap"><span class="tval">${esc(t.chiLabel)}</span><div class="tb chi" style="height:${(t.chi / max) * 85}%"></div></div>
      </div><div class="tlbl">${esc(t.label)}</div></div>`,
        )
        .join('')}</div>
    </div>`
    : '<p class="mut sm">Chưa có dữ liệu kỳ trước.</p>';

  const memberRows = m.members
    .map((r) => {
      const pay =
        r.pay === 'paid'
          ? `<span class="st"><i style="background:${COLORS.posFill}"></i>Đã đóng</span>`
          : r.pay === 'debt'
            ? `<span class="st"><i style="background:${COLORS.negFill}"></i>Nợ</span>`
            : '<span class="mut">—</span>';
      const t = tone(r.health);
      return `<tr>
      <td class="c"><span class="rank${r.rank <= 3 ? ' top' : ''}">${r.rank}</span></td>
      <td class="nm">${esc(r.name)}</td>
      <td class="r">${esc(r.rate)}</td>
      <td class="c">${pay}</td>
      <td class="c">${dots(r.stars)}</td>
      <td class="r">${esc(r.conduct)}</td>
      <td class="r"><span class="pill" style="background:${t.tint};color:${t.text}">${r.health}</span></td>
    </tr>`;
    })
    .join('');

  const distHtml = `<div class="dist">${m.dist
    .map((d) => `<div class="d"><span><i style="background:${d.fill}"></i>${esc(d.label)}</span><b>${d.value}</b></div>`)
    .join('')}</div>`;

  const agentsHtml = `<div class="aigrid">${m.agents
    .map(
      (a) =>
        `<div class="agent"><div class="an">${esc(a.name)}</div><div class="av">${esc(a.value)}<span class="au">${esc(a.unit)}</span></div><div class="ad">${esc(a.detail)}</div></div>`,
    )
    .join('')}</div>`;

  const topPlayers = m.tournament.top
    .map((p) => `<div class="pl"><span class="plr">${p.rank}</span><span class="pln">${esc(p.name)}</span><span class="plw">${esc(p.stat)}</span></div>`)
    .join('');

  const timelineHtml = m.timeline.length
    ? `<ul class="tl">${m.timeline
        .map(
          (t) =>
            `<li style="--dot:${t.fill}"><span class="tld">${esc(t.date)}</span><span class="tlx">${esc(t.text)}${t.amount ? ` <b style="white-space:nowrap">${esc(t.amount)}</b>` : ''}</span></li>`,
        )
        .join('')}</ul>`
    : '<p class="mut sm">Chưa có sự kiện nổi bật.</p>';
  const alerts = m.alerts.length
    ? `<ul class="alist">${m.alerts.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`
    : '<p class="okt sm">Không có cảnh báo — CLB ổn định.</p>';
  const recs = m.recs.length
    ? `<ul class="rlist">${m.recs.map((r) => `<li><span class="tag">${esc(r.agent)}</span>${esc(r.text)}</li>`).join('')}</ul>`
    : '<p class="mut sm">Không có đề xuất.</p>';

  const dnaTraits = m.dna.traits.map((t) => dimBar(t.label, t.score)).join('');

  const css = `${fontFace}
*{box-sizing:border-box;margin:0;padding:0}
${PAGE_CSS}
:root{--ink:${COLORS.ink};--ink2:${COLORS.ink2};--muted:${COLORS.muted};--line:${COLORS.hairline};--lineStrong:${COLORS.lineStrong};--surface2:${COLORS.surface2};
  --brand:${B.brand};--brandDeep:${B.brandDeep};--brandInk:${B.brandInk};--brandSoft:${B.brandSoft}}
body{font-family:${fam};color:var(--ink);font-size:${pt(TYPE.body)};line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
b{font-weight:700}
.mut{color:var(--muted)}.sm{font-size:${pt(TYPE.table)}}.okt{color:${COLORS.pos}}
/* Khối: không khung bao, chỉ hairline dưới tiêu đề */
.sect{margin-bottom:${mm(SPACE.s3)};break-inside:avoid;page-break-inside:avoid}
.sect--flow{break-inside:auto;page-break-inside:auto}
.sect--flow table{break-inside:auto}
.sect--flow thead{display:table-header-group}
tr{break-inside:avoid;page-break-inside:avoid}
.avgcard{break-inside:avoid}
.mhead{break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid}
.shead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:${mm(SPACE.s2)};padding-bottom:${mm(SPACE.s1)};border-bottom:${mm(PAGE.hair)} solid var(--line)}
.eyebrow{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--brandInk);font-weight:700}
.stitle{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--ink);margin-top:${mm(0.5)};line-height:1.25}
.snote{font-size:${pt(TYPE.caption)};color:var(--muted);text-align:right;max-width:48%}
.subh{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--ink);margin:${mm(0.5)} 0 ${mm(SPACE.s2)};line-height:1.25}
/* Masthead trang 2+ */
.mast{display:flex;align-items:center;justify-content:space-between;padding-bottom:${mm(SPACE.s2)};margin-bottom:${mm(SPACE.s3)};border-bottom:${mm(0.6)} solid var(--brand)}
.mast-l{display:flex;align-items:center;gap:${mm(SPACE.s2)}}
.mast .lab{font-size:${pt(TYPE.label)};letter-spacing:.3pt;font-weight:700;color:var(--brandInk);text-transform:uppercase}
.mast h1{font-size:${pt(TYPE.h1)};font-weight:700;line-height:1.2;margin:${mm(0.5)} 0}
.mast .sub{font-size:${pt(TYPE.body)};color:var(--ink2)}
.gauge{display:flex;align-items:center;gap:${mm(SPACE.s2)}}
.gauge .cls{font-size:${pt(TYPE.label)};font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.3pt}
/* Logo */
.logo{background:#fff;border:${mm(PAGE.hair)} solid var(--line);border-radius:${mm(PAGE.radius)};display:flex;align-items:center;justify-content:center;overflow:hidden}
.logo img{width:100%;height:100%;object-fit:contain}
.logo.mono{color:var(--brandInk);background:var(--brandSoft);border-color:var(--brand);font-weight:700;letter-spacing:.5pt;border-radius:50%}
.logo.sm{width:${mm(12)};height:${mm(12)}}.logo.sm.mono{font-size:${pt(TYPE.h2)}}
.logo.md{width:${mm(16)};height:${mm(16)}}.logo.md.mono{font-size:${pt(TYPE.h1)}}
/* Health dims */
.dims{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)} ${mm(SPACE.s3)}}
.dim-h{display:flex;justify-content:space-between;font-size:${pt(TYPE.table)};margin-bottom:${mm(1)};font-weight:700;color:var(--ink2)}
.bar{height:${mm(1.8)};background:var(--line);border-radius:${mm(0.9)};overflow:hidden}.bar i{display:block;height:100%;border-radius:${mm(0.9)}}
/* KPI: lưới hairline, không hộp viền */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:${mm(SPACE.s3)} ${mm(SPACE.s4)}}
.kpi{border-top:${mm(PAGE.border)} solid var(--line);padding-top:${mm(SPACE.s2)}}
.kpi.acc{border-top:${mm(0.8)} solid var(--brand)}
.kl{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.kv{font-size:${pt(TYPE.kpi)};font-weight:700;color:var(--ink);margin-top:${mm(1)};line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.kpi.acc .kv{color:var(--brandInk)}
.kv.neg,.fv.neg,.v.neg{color:${COLORS.neg}!important}
.ks{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(0.5)}}
.kpi2{display:grid;grid-template-columns:1fr 1fr;gap:${mm(SPACE.s2)} ${mm(SPACE.s3)}}
/* AI summary: nền rất nhạt + vạch brand trái */
.aibox{background:var(--surface2);border-left:${mm(1)} solid var(--brand);padding:${mm(SPACE.s3)} ${mm(SPACE.s3)}}
.aibox .h{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--brandInk);margin-bottom:${mm(SPACE.s1)}}
.aibox .b{font-size:${pt(TYPE.body)};line-height:1.6;white-space:pre-line;color:var(--ink)}
/* Finance: dải KPI ngang + biểu đồ toàn bề rộng */
.fstrip{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s3)} ${mm(SPACE.s4)};margin-bottom:${mm(SPACE.s4)}}
.fcell{border-top:${mm(PAGE.border)} solid var(--line);padding-top:${mm(SPACE.s1)}}
.fval{display:flex;align-items:baseline;gap:${mm(2)};margin-top:${mm(1)};white-space:nowrap}
.fv{font-size:${pt(TYPE.kpi)};font-weight:700;color:var(--ink);line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.chead{display:flex;justify-content:space-between;align-items:center;font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:var(--muted);margin-bottom:${mm(SPACE.s2)}}
.cplot{position:relative;margin:0 0 ${mm(12)} ${mm(18)};height:${mm(44)}}
.gl{position:absolute;left:0;right:0;border-top:${mm(PAGE.hair)} solid var(--line)}
.gl em{position:absolute;right:100%;margin-right:${mm(2)};transform:translateY(-50%);font-style:normal;font-size:${pt(TYPE.caption)};color:var(--muted);white-space:nowrap}
.gl0{bottom:0;border-top:${mm(PAGE.strong)} solid ${COLORS.lineStrong}}
.chart{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;justify-content:center;align-items:stretch}
.tcol{position:relative;flex:1 1 0;max-width:${mm(34)};height:100%;display:flex;justify-content:center}
.tbars{display:flex;gap:${mm(1.5)};align-items:flex-end;height:100%;width:70%}
.tbwrap{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.tval{font-size:${pt(TYPE.caption)};font-weight:700;color:var(--ink2);margin-bottom:${mm(0.5)};white-space:nowrap}
.dense .tval{display:none}
.tb{width:100%;border-radius:${mm(0.8)} ${mm(0.8)} 0 0}
.tb.thu{background:${COLORS.posFill}}.tb.chi{background:${COLORS.negFill}}
.tlbl{position:absolute;top:100%;left:0;right:0;margin-top:${mm(1.5)};font-size:${pt(TYPE.caption)};color:var(--muted);text-align:center;font-weight:700;white-space:nowrap}
.legend{display:inline-flex;gap:${mm(SPACE.s3)};font-size:${pt(TYPE.caption)};color:var(--ink2);text-transform:none;letter-spacing:0}
.legend i{display:inline-block;width:${mm(1.6)};height:${mm(1.6)};border-radius:50%;margin-right:${mm(1)};vertical-align:middle}
.delta{font-size:${pt(TYPE.caption)};font-weight:700;padding:${mm(0.2)} ${mm(1.6)};border-radius:${mm(PAGE.radius)}}
.delta.pos{color:${COLORS.pos};background:${COLORS.posTint}}.delta.neg{color:${COLORS.neg};background:${COLORS.negTint}}
/* Tiles: ô hairline, không hộp viền */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)}}
.tile{border-top:${mm(PAGE.border)} solid var(--line);padding-top:${mm(SPACE.s1)}}
.tile .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.tile .v{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--ink);margin-top:${mm(1)};white-space:nowrap;font-variant-numeric:tabular-nums}
.tile .v.neg{color:${COLORS.neg}}
/* Bảng */
table{width:100%;border-collapse:collapse}
thead th{background:var(--brandSoft);color:var(--brandInk);font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;text-align:left;padding:${mm(2)} ${mm(2.5)};border-bottom:${mm(PAGE.strong)} solid var(--brand)}
thead th.r{text-align:right}thead th.c{text-align:center}
tbody td{padding:${mm(1.5)} ${mm(2.5)};border-bottom:${mm(PAGE.hair)} solid var(--line);font-size:${pt(TYPE.table)};color:var(--ink)}
td.r{text-align:right;font-variant-numeric:tabular-nums}td.c{text-align:center}td.nm{font-weight:700}
.rank{font-weight:400;color:var(--muted)}.rank.top{font-weight:700;color:var(--brandInk)}
.pill{display:inline-block;min-width:${mm(8)};text-align:center;padding:${mm(0.3)} ${mm(2)};border-radius:${mm(PAGE.radius)};font-weight:700;font-size:${pt(TYPE.table)}}
.st{display:inline-flex;align-items:center;font-size:${pt(TYPE.label)};font-weight:700;color:var(--ink2)}
.st i{display:inline-block;width:${mm(1.6)};height:${mm(1.6)};border-radius:50%;margin-right:${mm(1.2)}}
.dots{display:inline-flex;gap:${mm(0.6)};vertical-align:middle}.dots i{display:inline-block;width:${mm(1.6)};height:${mm(1.6)};border-radius:50%;background:var(--line)}.dots i.on{background:var(--brand)}
.dno{font-size:${pt(TYPE.caption)};color:var(--muted);margin-left:${mm(1.2)}}
.avgcard{display:flex;align-items:center;gap:${mm(SPACE.s4)};padding:${mm(SPACE.s1)} 0 ${mm(SPACE.s2)};margin-bottom:${mm(SPACE.s2)}}
.avgcard .big{font-size:${pt(TYPE.display)};font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}.avgcard .big small{font-size:${pt(TYPE.body)};color:var(--muted);font-weight:400}
.avgcard .lbl{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.dist{display:grid;grid-template-columns:1fr 1fr;gap:${mm(SPACE.s1)} ${mm(SPACE.s2)};flex:1}
.dist .d{display:flex;justify-content:space-between;font-size:${pt(TYPE.table)};border-bottom:${mm(PAGE.hair)} solid var(--line);padding:${mm(0.8)} 0;color:var(--ink2)}
.dist .d b{color:var(--ink)}
.dist .d i{width:${mm(1.6)};height:${mm(1.6)};border-radius:50%;display:inline-block;margin-right:${mm(1.5)};vertical-align:middle}
/* Hàng 2-3 cột */
.half{display:grid;grid-template-columns:1fr 1fr;gap:${mm(SPACE.s4)}}
.three{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:${mm(SPACE.s3)}}
.callout{font-size:${pt(TYPE.table)};color:var(--ink2);line-height:1.6;margin-top:${mm(SPACE.s2)}}
.callout b{color:var(--ink)}
.pl{display:flex;align-items:center;gap:${mm(SPACE.s2)};font-size:${pt(TYPE.table)};padding:${mm(1)} 0;border-bottom:${mm(PAGE.hair)} solid var(--line)}
.pl:last-child{border-bottom:none}
.plr{font-weight:700;color:var(--brandInk);width:${mm(4)}}
.pln{flex:1;font-weight:700}.plw{color:var(--ink2);font-size:${pt(TYPE.caption)}}
/* AI agents */
.aigrid{display:grid;grid-template-columns:repeat(5,1fr);gap:${mm(SPACE.s2)}}
.agent{border-top:${mm(0.8)} solid var(--brand);padding:${mm(SPACE.s2)} 0 0}
.an{font-size:${pt(TYPE.table)};font-weight:700;color:var(--brandInk)}
.av{font-size:${pt(TYPE.kpi)};font-weight:700;color:var(--ink);margin:${mm(1)} 0;line-height:1.1;font-variant-numeric:tabular-nums}
.au{font-size:${pt(TYPE.caption)};color:var(--muted);font-weight:400;margin-left:${mm(1)}}
.ad{font-size:${pt(TYPE.caption)};color:var(--muted);border-top:${mm(PAGE.hair)} solid var(--line);margin-top:${mm(1.5)};padding-top:${mm(1.5)};line-height:1.4}
/* Timeline / alerts / recs */
.tl{list-style:none;border-left:${mm(PAGE.border)} solid var(--line);padding-left:${mm(SPACE.s2)};margin-left:${mm(1)}}
.tl li{position:relative;margin-bottom:${mm(3)};font-size:${pt(TYPE.table)}}
.tl li:before{content:'';position:absolute;left:${mm(-5.5)};top:${mm(1)};width:${mm(2)};height:${mm(2)};border-radius:50%;background:var(--dot)}
.tld{font-weight:700;color:var(--ink);margin-right:${mm(1.5)}}
.alist,.rlist{list-style:none}
.alist li{font-size:${pt(TYPE.table)};color:var(--ink);padding:${mm(1)} 0 ${mm(1)} ${mm(4)};position:relative;line-height:1.5}
.alist li:before{content:'';position:absolute;left:0;top:${mm(2.2)};width:${mm(1.8)};height:${mm(1.8)};border-radius:50%;background:${COLORS.warnFill}}
.rlist li{font-size:${pt(TYPE.table)};color:var(--ink);padding:${mm(1.2)} 0;line-height:1.55}
.tag{display:inline-block;background:var(--brandSoft);color:var(--brandInk);font-size:${pt(TYPE.label)};font-weight:700;padding:${mm(0.2)} ${mm(2)};border-radius:${mm(PAGE.radius)};margin-right:${mm(1.5)}}
.closing{color:var(--muted);font-size:${pt(TYPE.caption)};border-top:${mm(PAGE.hair)} solid var(--line);padding-top:${mm(SPACE.s1)};margin-top:${mm(SPACE.s2)}}
/* BÌA — cân đối trên / giữa / dưới; nền trắng, vạch brand, panel brandSoft nhạt; không lặp footer Chrome */
.cover{height:${mm(259)};display:flex;flex-direction:column;justify-content:space-between;border-top:${mm(1.6)} solid var(--brand);padding-top:${mm(SPACE.s5)};page-break-after:always;break-after:page}
.cv-top{display:flex;align-items:center;justify-content:space-between}
.cv-id{display:flex;align-items:center;gap:${mm(SPACE.s3)}}
.cv-brand{font-size:${pt(TYPE.h2)};letter-spacing:.4pt;font-weight:700;color:var(--ink);text-transform:uppercase}
.cv-tag{font-size:${pt(TYPE.label)};letter-spacing:.4pt;font-weight:700;color:var(--muted);text-transform:uppercase}
.cv-mid{background:var(--brandSoft);border-left:${mm(1.6)} solid var(--brand);padding:${mm(SPACE.s6)} ${mm(SPACE.s5)} ${mm(SPACE.s5)}}
.cv-eyb{font-size:${pt(TYPE.label)};letter-spacing:.5pt;text-transform:uppercase;font-weight:700;color:var(--brandInk)}
.cv-title{font-size:${pt(TYPE.cover)};font-weight:700;line-height:1.15;color:var(--ink);margin:${mm(SPACE.s3)} 0 ${mm(SPACE.s2)}}
.cv-period{font-size:${pt(TYPE.h2)};color:var(--ink2)}
.cv-rule{width:${mm(SPACE.s6)};height:${mm(0.8)};background:var(--brand);margin:${mm(SPACE.s5)} 0 ${mm(SPACE.s4)}}
.cv-stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:${mm(PAGE.border)} solid var(--lineStrong)}
.cv-st{padding:${mm(SPACE.s3)} ${mm(SPACE.s3)} 0 0}
.cv-st+.cv-st{padding-left:${mm(SPACE.s3)};border-left:${mm(PAGE.hair)} solid var(--lineStrong)}
.cv-st .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.cv-st .v{font-size:${pt(TYPE.display)};font-weight:700;color:var(--ink);margin-top:${mm(SPACE.s1)};line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.cv-st .s{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(1)}}
.cv-doc{border-top:${mm(PAGE.strong)} solid var(--ink);padding-top:${mm(SPACE.s2)}}
.cv-dh{font-size:${pt(TYPE.label)};letter-spacing:.4pt;text-transform:uppercase;font-weight:700;color:var(--brandInk);margin-bottom:${mm(SPACE.s2)}}
.cv-dg{display:grid;grid-template-columns:1.3fr 1.1fr 1.2fr;gap:${mm(SPACE.s3)}}
.cv-dg .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.cv-dg .v{font-size:${pt(TYPE.table)};color:var(--ink);margin-top:${mm(0.8)}}`;

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
${css}
</style></head><body>

<section class="cover">
  <div class="cv-top">
    <div class="cv-id">${logo('md')}<div class="cv-brand">${esc(m.brandLabel)}</div></div>
  </div>
  <div>
    <div class="cv-mid">
      <div class="cv-eyb">Báo cáo điều hành · Executive Report</div>
      <h1 class="cv-title">${esc(m.clubName || m.brandLabel)}</h1>
      <div class="cv-period">Kỳ báo cáo: ${esc(m.periodName)}</div>
      <div class="cv-rule"></div>
      <div class="cv-stats">
        ${m.coverStats.map((c) => `<div class="cv-st"><div class="l">${esc(c.l)}</div><div class="v${negCls(c.v)}">${esc(c.v)}</div><div class="s">${esc(c.s)}</div></div>`).join('')}
      </div>
    </div>
  </div>
  <div class="cv-doc">
    <div class="cv-dh">Thông tin tài liệu</div>
    <div class="cv-dg">
      <div><div class="l">Mã tài liệu</div><div class="v">${esc(m.code)}</div></div>
      <div><div class="l">Ngày xuất</div><div class="v">${esc(m.exportedAt)}</div></div>
      <div><div class="l">Phân loại</div><div class="v">Tài liệu nội bộ · Ban quản trị CLB</div></div>
    </div>
  </div>
</section>

<div class="mast">
  <div class="mast-l">
    ${logo('sm')}
    <div>
      <div class="lab">${esc(m.brandLabel)}</div>
      <h1>Báo cáo điều hành</h1>
      <div class="sub">Kỳ: ${esc(m.periodName)} · Xuất lúc ${esc(m.exportedAt)}</div>
    </div>
  </div>
  <div class="gauge">${ring(m.health, B.brand)}<div class="cls">${esc(m.grade)}</div></div>
</div>

<div class="sect">
  ${head('01', 'Sức khỏe tổng hợp', 'Điểm sức khỏe CLB', 'Tổng hợp 6 chiều từ số liệu thật của kỳ')}
  <div class="dims">${m.dims.map((d) => dimBar(d.label, d.score)).join('')}</div>
</div>

<div class="sect">
  ${head('02', 'Tổng quan điều hành', 'Các chỉ số chính')}
  <div class="kpis">${m.kpis.map((k) => kpi(k.l, k.v, k.s, k.accent)).join('')}</div>
</div>

<div class="sect aibox">
  <div class="h">Tóm tắt điều hành (AI)</div>
  <div class="b">${esc(m.aiText)}</div>
</div>

<div class="sect">
  ${head('03', 'Tài chính', 'Thu · Chi · Dòng quỹ', 'Số liệu chuẩn theo kỳ quỹ (carry-forward)')}
  <div class="fstrip">${m.finRows
    .map(
      (r) =>
        `<div class="fcell"><div class="kl">${esc(r.label)}</div><div class="fval"><span class="fv${negCls(r.value)}">${esc(r.value)}</span>${r.delta !== undefined ? delta(r.delta) : ''}</div></div>`,
    )
    .join('')}</div>
  ${chart}
</div>

<div class="sect sect--flow">
  <div class="mhead">
    ${head('04', 'Thành viên', 'Bảng xếp hạng sức khỏe', '40% tham gia · 30% đóng quỹ · 30% hạnh kiểm')}
    <div class="avgcard">
      <div><div class="lbl">Điểm sức khỏe TB</div><div class="big" style="color:${tone(m.avgHealth).text}">${m.avgHealth}<small> / 100</small></div></div>
      ${distHtml}
    </div>
  </div>
  <table>
    <thead><tr><th class="c">#</th><th>Thành viên</th><th class="r">Tham gia</th><th class="c">Đóng quỹ</th><th class="c">Đánh giá</th><th class="r">Hạnh kiểm</th><th class="r">Sức khỏe</th></tr></thead>
    <tbody>${memberRows || '<tr><td colspan="7" class="c mut" style="padding:' + mm(SPACE.s4) + '">Chưa có thành viên trong kỳ này.</td></tr>'}</tbody>
  </table>
</div>

<div class="sect half">
  <div>
    ${sub('05', 'Dự báo', 'Xu hướng 30–90 ngày')}
    <div class="tiles">${m.forecast.tiles.map((t) => tile(t.l, t.v)).join('')}</div>
    <p class="callout">${esc(m.forecast.callout)} <i class="mut">${esc(m.forecast.note)}</i></p>
  </div>
  <div>
    ${sub('06', 'Club DNA', m.dna.archetype)}
    <div class="dims" style="grid-template-columns:1fr;gap:${mm(SPACE.s2)}">${dnaTraits}</div>
  </div>
</div>

<div class="sect half">
  <div>
    ${sub('07', 'Hoạt động', 'Vận hành buổi chơi')}
    <div class="kpi2">${m.activity.kpis.map((k) => kpi(k.l, k.v)).join('')}</div>
    <div class="callout">
      ${m.activity.busiest ? `<b>Đông nhất:</b> ${esc(m.activity.busiest)}<br>` : ''}
      ${m.activity.emptiest ? `<b>Ít nhất:</b> ${esc(m.activity.emptiest)}<br>` : ''}
      <i class="mut">Tỷ lệ lấp đầy tính theo sĩ số hoạt động (chưa có sức chứa/buổi).</i>
    </div>
  </div>
  <div>
    ${sub('08', 'Thi đấu', 'Giải & Minigame')}
    <div class="tiles">${m.tournament.tiles.map((t) => tile(t.l, t.v)).join('')}</div>
    ${topPlayers ? `<div style="margin-top:${mm(SPACE.s2)}">${topPlayers}<p class="callout"><i class="mut">Người dẫn đầu BXH (chưa có giải MVP chính thức).</i></p></div>` : '<p class="callout mut">Chưa có giải/minigame trong kỳ.</p>'}
  </div>
</div>

<div class="sect">
  ${head('09', 'Văn phòng AI (AIDO)', 'Hiệu suất tự động hóa', m.agentsHeading)}
  ${agentsHtml}
</div>

<div class="sect three" style="margin-bottom:0">
  <div>${sub('10', 'Dòng thời gian', 'Sự kiện nổi bật')}${timelineHtml}</div>
  <div>${sub('11', 'Cảnh báo', 'Rủi ro cần lưu ý')}${alerts}</div>
  <div>${sub('12', 'Khuyến nghị', 'Gợi ý hành động')}${recs}</div>
</div>

<div class="closing">Ghi chú: AIDO Executive Report · mọi con số được lấy từ dữ liệu thật của CLB.</div>

</body></html>`;
}

