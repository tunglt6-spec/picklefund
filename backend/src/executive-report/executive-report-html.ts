import { loadFontsBase64 } from './export-fonts';
import {
  COLORS,
  GLASS,
  PAGE,
  PAGE_CSS,
  SPACE,
  TYPE,
  escHtml,
  glassCss,
  glassTint,
  makeBrand,
  mm,
  pt,
  rgba,
  softShadow,
  vndCompact,
} from './export-tokens';
import { buildExecModel, deltaText, healthTone, parseAiBlocks, toneOfValue, type NumTone } from './executive-report-model';

/**
 * HTML in-ấn A4 cho Báo cáo điều hành — chuẩn "Luxury SaaS" + LIQUID GLASS (nền wash + orb, tấm kính trắng bán trong có viền sáng/highlight/bóng mềm,
 * băng bìa/masthead/header bảng chuyển sắc kính), màu đúng palette app, số xanh/đỏ/tím đậm, chữ ≥ 7pt, tương phản ≥ 4.5:1, không emoji. Render bằng headless Chrome (Puppeteer).
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

/** Tóm tắt AI → HTML: tiêu đề đậm, bullet chấm tròn thụt lề, đoạn thường. MỌI text qua esc(). */
export function aiBlocksHtml(raw: string): string {
  const blocks = parseAiBlocks(raw);
  let html = '';
  let inList = false;
  for (const b of blocks) {
    if (b.kind === 'bullet') {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${esc(b.text)}</li>`;
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    html += b.kind === 'heading' ? `<div class="ah">${esc(b.text)}</div>` : `<p>${esc(b.text)}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

/** Vòng gauge: nét màu theo mức điểm (xanh/cyan/cam/đỏ) trên track hairline (không gradient). */
function ring(score: number, stroke: string, numColor: string, size = 22): string {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return `<svg width="${mm(size)}" height="${mm(size)}" viewBox="0 0 90 90">
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="${COLORS.hairline}" stroke-width="9"/>
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="${stroke}" stroke-width="9"
      stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 45 45)"/>
    <text x="45" y="50" text-anchor="middle" font-size="27" font-weight="700" fill="${numColor}">${score}</text>
    <text x="45" y="64" text-anchor="middle" font-size="11" fill="${COLORS.muted}">/ 100</text>
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

  // Tiền âm ("-80.000 đ") luôn hiển thị tông neg (đỏ) ở MỌI nơi; tone gốc giữ khi dương.
  const tn = (t: NumTone, v = '') => `tn-${toneOfValue(v, t)}`;
  const kpi = (l: string, v: string, s = '', accent = false, t: NumTone = 'ink') =>
    `<div class="kpi ${tn(t, v)}${accent ? ' acc' : ''}"><div class="kl">${esc(l)}</div><div class="kv">${esc(v)}</div>${s ? `<div class="ks">${esc(s)}</div>` : ''}</div>`;
  const tile = (l: string, v: string, t: NumTone = 'ink') =>
    `<div class="tile ${tn(t, v)}"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`;
  const head = (num: string, eyebrow: string, title: string, note = '') =>
    `<div class="shead"><div class="hb"><div class="eyebrow">${esc(num)} · ${esc(eyebrow)}</div><div class="stitle">${esc(title)}</div></div>${note ? `<div class="snote">${esc(note)}</div>` : ''}</div>`;
  const sub = (num: string, eyebrow: string, title: string) =>
    `<div class="hb sb"><div class="eyebrow">${esc(num)} · ${esc(eyebrow)}</div><div class="subh">${esc(title)}</div></div>`;

  const tone = healthTone;

  const dimBar = (label: string, score: number | null) =>
    score == null
      ? `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b class="mut">—</b></div><div class="bar"><i style="width:0"></i></div></div>`
      : `<div class="dim"><div class="dim-h"><span>${esc(label)}</span><b style="color:${tone(score).vivid}">${score}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, score))}%;background-color:${tone(score).fill}"></i></div></div>`;

  const dots = (n: number) =>
    `<span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span><span class="dno">${n}/5</span>`;

  // inverse=true: chỉ số "càng giảm càng tốt" (Tổng chi) → giảm hiện xanh, tăng hiện đỏ.
  const delta = (v: number | null | undefined, inverse = false) =>
    v == null
      ? '<span class="mut">—</span>'
      : `<span class="delta ${(v >= 0) !== inverse ? 'pos' : 'neg'}">${deltaText(v)}</span>`;

  // Biểu đồ cột: toàn bề rộng, lưới ngang mảnh + nhãn trục; cột chiếm tối đa 85% chiều cao để chừa chỗ nhãn giá trị.
  const max = Math.max(1, ...m.trends.flatMap((t) => [t.thu, t.chi]));
  const dense = m.trends.length > 7;
  const chart = m.trends.length
    ? `<div class="cwrap"><div class="chead"><span>Thu · Chi theo kỳ quỹ</span><span class="legend"><span><i style="background:${COLORS.posFill}"></i>Thu</span><span><i style="background:${COLORS.negFill}"></i>Chi</span></span></div>
    <div class="cplot${dense ? ' dense' : ''}">
      <div class="gl" style="bottom:85%"><em>${esc(vndCompact(max, true))}</em></div>
      <div class="gl" style="bottom:42.5%"><em>${esc(vndCompact(max / 2, true))}</em></div>
      <div class="gl gl0"><em>0</em></div>
      <div class="chart">${m.trends
        .map(
          (t) => `<div class="tcol"><div class="tbars">
        <div class="tbwrap"><span class="tval pos">${esc(t.thuLabel)}</span><div class="tb thu" style="height:${(t.thu / max) * 85}%"></div></div>
        <div class="tbwrap"><span class="tval neg">${esc(t.chiLabel)}</span><div class="tb chi" style="height:${(t.chi / max) * 85}%"></div></div>
      </div><div class="tlbl">${esc(t.label)}</div></div>`,
        )
        .join('')}</div>
    </div></div>`
    : '<p class="mut sm">Chưa có dữ liệu kỳ trước.</p>';

  const memberRows = m.members
    .map((r) => {
      const pay =
        r.pay === 'paid'
          ? `<span class="st ok"><i style="background:${COLORS.posFill}"></i>Đã đóng</span>`
          : r.pay === 'debt'
            ? `<span class="st bad"><i style="background:${COLORS.negFill}"></i>Nợ</span>`
            : '<span class="mut">—</span>';
      const t = tone(r.health);
      return `<tr>
      <td class="c"><span class="rank${r.rank <= 3 ? ' top' : ''}">${r.rank}</span></td>
      <td class="nm">${esc(r.name)}</td>
      <td class="r">${esc(r.rate)}</td>
      <td class="c">${pay}</td>
      <td class="c">${dots(r.stars)}</td>
      <td class="r">${esc(r.conduct)}</td>
      <td class="r"><span class="pill" style="background:${rgba(t.fill, GLASS.chipFill)};border:${mm(0.2)} solid ${rgba(t.fill, GLASS.chipBorder)};color:${t.text}">${r.health}</span></td>
    </tr>`;
    })
    .join('');

  const distHtml = `<div class="dist">${m.dist
    .map((d) => `<div class="d"><span><i style="background:${d.fill}"></i>${esc(d.label)}</span><b>${d.value}</b></div>`)
    .join('')}</div>`;

  const agentsHtml = `<div class="aigrid">${m.agents
    .map(
      (a) =>
        `<div class="agent" style="--f:${a.accent}"><div class="an">${esc(a.name)}</div><div class="av" style="color:${a.accent === B.brand ? B.brandInk : a.accent}">${esc(a.value)}<span class="au">${esc(a.unit)}</span></div><div class="ad">${esc(a.detail)}</div></div>`,
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
  const g = (a: number) => `rgba(255,255,255,${a})`;
  const sh = softShadow(B.brandDeep);
  const tnCss = (n: string, f: string, v: string) =>
    `.tn-${n}{--f:${f};--v:${v};--tt:${glassTint(f, GLASS.toneFill)};--tb:${rgba(f, GLASS.toneRing)}}`;
  // Thẻ kính có vạch màu tông phía trên + vòng viền màu tông (số đậm theo tông).
  const toneCard = `background-color:var(--tt);border:var(--g-rim);box-shadow:inset 0 0 0 ${mm(0.2)} var(--tb),inset 0 ${mm(0.9)} 0 var(--f),${sh};border-radius:var(--g-r)`;
  const chip = (c: string, a: number = GLASS.chipFill) => `background:${rgba(c, a)};border:${mm(0.2)} solid ${rgba(c, GLASS.chipBorder)}`;
  const accSh = `inset 0 0 0 ${mm(0.2)} var(--acc-b),inset 0 ${mm(0.35)} 0 ${g(GLASS.highlight)},${sh}`;

  const css = `${fontFace}
*{box-sizing:border-box;margin:0;padding:0}
${PAGE_CSS}
:root{--ink:${COLORS.ink};--ink2:${COLORS.ink2};--muted:${COLORS.muted};--line:${COLORS.hairline};--lineStrong:${COLORS.lineStrong};--surface2:${COLORS.surface2};
  --brand:${B.brand};--brandDeep:${B.brandDeep};--brandInk:${B.brandInk};--brandSoft:${B.brandSoft};--brandBorder:${B.brandBorder};--badge:${B.badge};
  --acc-t:${glassTint(B.brand, GLASS.accentFill)};--acc-b:${rgba(B.brand, GLASS.accentBorder)}}
${glassCss(B)}
${tnCss('pos', COLORS.posFill, COLORS.posVivid)}
${tnCss('neg', COLORS.negFill, COLORS.negVivid)}
${tnCss('warn', COLORS.orange, COLORS.orange)}
${tnCss('info', COLORS.infoFill, COLORS.infoFill)}
${tnCss('brand', B.brand, B.brandInk)}
${tnCss('ink', COLORS.lineStrong, COLORS.ink)}
body{font-family:${fam};color:var(--ink);font-size:${pt(TYPE.body)};line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
b{font-weight:700}
.mut{color:var(--muted)}.sm{font-size:${pt(TYPE.table)}}.okt{color:${COLORS.pos};font-weight:700}
/* Khối: không khung bao */
.sect{margin-bottom:${mm(5)};break-inside:avoid;page-break-inside:avoid}
.sect--flow{break-inside:auto;page-break-inside:auto}
.sect--flow table{break-inside:auto}
.sect--flow thead{display:table-header-group}
tr{break-inside:avoid;page-break-inside:avoid}
.avgcard{break-inside:avoid}
.mhead{break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid}
/* Tiêu đề mục: chữ HOA đậm màu brand + vạch brand bên trái + đường kẻ brandBorder */
.shead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:${mm(SPACE.s2)};padding-bottom:${mm(SPACE.s1)};border-bottom:${mm(PAGE.border)} solid var(--brandBorder)}
.hb{border-left:${mm(1.2)} solid var(--brand);padding-left:${mm(2.5)}}
.sb{margin-bottom:${mm(SPACE.s2)}}
.eyebrow{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.stitle,.subh{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--brandInk);margin-top:${mm(0.3)};line-height:1.25;text-transform:uppercase;letter-spacing:.2pt}
.snote{font-size:${pt(TYPE.caption)};color:var(--muted);text-align:right;max-width:48%}
/* Masthead trang 2+: BĂNG KÍNH chuyển sắc chéo + bóng loáng nửa trên, chip kính chứa kỳ/giờ xuất, gauge trong kính trắng */
.mast{display:flex;align-items:center;justify-content:space-between;padding:${mm(SPACE.s2)} ${mm(SPACE.s3)};margin-bottom:${mm(SPACE.s3)};background:var(--mast-bg);color:#fff;border:var(--mast-rim);box-shadow:var(--mast-sh);border-radius:var(--g-r)}
.mast-l{display:flex;align-items:center;gap:${mm(SPACE.s3)}}
.mast .lab{font-size:${pt(TYPE.label)};letter-spacing:.4pt;font-weight:700;color:#fff;text-transform:uppercase}
.mast h1{font-size:${pt(TYPE.h1)};font-weight:700;line-height:1.2;margin:${mm(0.5)} 0;color:#fff}
.mast .sub{display:inline-block;font-size:${pt(TYPE.body)};color:#fff;background:var(--chip-bg);border:var(--chip-bd);border-radius:${mm(3)};padding:${mm(0.4)} ${mm(2.5)}}
.gauge{display:flex;align-items:center;gap:${mm(SPACE.s2)};background:${g(0.92)};border:${mm(GLASS.rimW)} solid ${g(GLASS.rimOuter)};box-shadow:inset 0 0 0 ${mm(0.2)} ${rgba(B.brand, GLASS.rimInner)},0 ${mm(0.6)} 0 ${rgba(COLORS.ink, 0.1)},0 ${mm(1.2)} 0 ${rgba(COLORS.ink, 0.05)};border-radius:var(--g-r);padding:${mm(1.2)} ${mm(SPACE.s3)} ${mm(1.2)} ${mm(SPACE.s2)}}
.gauge .cls{font-size:${pt(TYPE.table)};font-weight:700;text-transform:uppercase;letter-spacing:.3pt}
/* Logo: vòng kính trắng (nổi trên băng brand) */
.logo{background:${g(0.94)};border:${mm(GLASS.rimW)} solid ${g(GLASS.rimOuter)};box-shadow:0 0 0 ${mm(0.5)} ${g(0.3)},0 ${mm(0.6)} 0 ${rgba(COLORS.ink, 0.12)};border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.logo img{width:86%;height:86%;object-fit:contain}
.logo.mono{color:var(--brandDeep);font-weight:700;letter-spacing:.5pt}
.logo.sm{width:${mm(12)};height:${mm(12)}}.logo.sm.mono{font-size:${pt(TYPE.h2)}}
.logo.md{width:${mm(18)};height:${mm(18)}}.logo.md.mono{font-size:${pt(TYPE.h1)}}
/* Tấm kính dùng chung: nền trắng bán trong + viền ngoài trắng + viền trong brand + highlight cạnh trên + bóng mềm */
.dim,.avgcard,.agent,.cwrap,.cv-doc{background:var(--g-bg);border:var(--g-rim);box-shadow:var(--g-sh);border-radius:var(--g-r)}
.kpi,.tile,.fcell,.cv-st{${toneCard}}
.kpi.acc{background-color:var(--acc-t);box-shadow:inset 0 0 0 ${mm(0.2)} var(--acc-b),inset 0 ${mm(0.9)} 0 var(--f),${sh}}
/* Health dims */
.dims{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s1)} ${mm(SPACE.s3)}}
.dim{padding:${mm(1.1)} ${mm(2.5)}}
.dim-h{display:flex;justify-content:space-between;font-size:${pt(TYPE.table)};margin-bottom:${mm(1)};font-weight:700;color:var(--ink2)}
.dim-h b{font-size:${pt(TYPE.body)}}
.bar{height:${mm(2.2)};background:${rgba(B.brand, GLASS.track)};box-shadow:inset 0 ${mm(0.2)} ${mm(0.4)} ${rgba(B.brandDeep, 0.12)};border-radius:${mm(1.1)};overflow:hidden}
.bar i{display:block;height:100%;border-radius:${mm(1.1)};box-shadow:inset 0 ${mm(0.45)} 0 ${g(0.35)}}
/* KPI / tile: tấm kính, vạch màu tông trên, số ĐẬM theo tông (xanh thu / đỏ chi / tím) */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:${mm(SPACE.s2)} ${mm(SPACE.s2)}}
.kpi,.tile,.fcell{padding:${mm(2.2)} ${mm(2.8)}}
.kl,.tile .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.kv{font-size:${pt(TYPE.kpi)};font-weight:700;color:var(--v);margin-top:${mm(1)};line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.ks{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(0.5)}}
.kpi2{display:grid;grid-template-columns:1fr 1fr;gap:${mm(SPACE.s2)}}
/* AI summary: TẤM NHẤN kính (brand α + viền brand α) + vạch brand trái */
.aibox{background-color:var(--acc-t);border:var(--g-rim);box-shadow:inset ${mm(1.4)} 0 0 var(--brand),${accSh};border-radius:var(--g-r);padding:${mm(SPACE.s2)} ${mm(SPACE.s3)} ${mm(SPACE.s2)} ${mm(SPACE.s3 + 1)}}
.aibox .h{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--brandInk);margin-bottom:${mm(SPACE.s1)};text-transform:uppercase;letter-spacing:.2pt}
.aibox .b{font-size:${pt(TYPE.body)};line-height:1.5;color:var(--ink)}
.aibox .b p{margin:0 0 ${mm(0.8)} 0;white-space:pre-line}
.aibox .b .ah{font-weight:700;color:var(--ink);margin:${mm(1)} 0 ${mm(0.4)} 0}
.aibox .b ul{margin:0 0 ${mm(0.8)} 0;padding:0;list-style:none}
.aibox .b li{position:relative;padding-left:${mm(4)};margin:0 0 ${mm(0.5)} 0}
.aibox .b li::before{content:'';position:absolute;left:${mm(1.2)};top:.62em;width:${mm(1.1)};height:${mm(1.1)};border-radius:50%;background:var(--brand)}
/* Finance: dải KPI 3×2 + biểu đồ trong tấm kính toàn bề rộng */
.fstrip{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)} ${mm(SPACE.s3)};margin-bottom:${mm(SPACE.s3)}}
.fval{display:flex;align-items:baseline;gap:${mm(2)};margin-top:${mm(1)};white-space:nowrap}
.fv{font-size:${pt(TYPE.kpi)};font-weight:700;color:var(--v);line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.cwrap{padding:${mm(SPACE.s2)} ${mm(SPACE.s3)} ${mm(1)}}
.chead{display:flex;justify-content:space-between;align-items:center;font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;color:var(--ink2);margin-bottom:${mm(SPACE.s2)}}
.cplot{position:relative;margin:0 0 ${mm(12)} ${mm(18)};height:${mm(38)}}
.gl{position:absolute;left:0;right:0;border-top:${mm(PAGE.hair)} solid ${rgba(B.brandDeep, 0.16)}}
.gl em{position:absolute;right:100%;margin-right:${mm(2)};transform:translateY(-50%);font-style:normal;font-size:${pt(TYPE.caption)};color:var(--muted);white-space:nowrap}
.gl0{bottom:0;border-top:${mm(PAGE.strong)} solid ${COLORS.lineStrong}}
.chart{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;justify-content:center;align-items:stretch}
.tcol{position:relative;flex:1 1 0;max-width:${mm(34)};height:100%;display:flex;justify-content:center}
.tbars{display:flex;gap:${mm(1.5)};align-items:flex-end;height:100%;width:70%}
.tbwrap{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.tval{font-size:${pt(TYPE.caption)};font-weight:700;color:var(--ink2);margin-bottom:${mm(0.5)};white-space:nowrap}
.tval.pos{color:${COLORS.pos}}.tval.neg{color:${COLORS.neg}}
.dense .tval{display:none}
.tb{width:100%;border-radius:${mm(0.8)} ${mm(0.8)} 0 0;box-shadow:inset ${mm(0.9)} 0 0 ${g(0.28)},inset 0 0 0 ${mm(0.15)} ${g(0.45)}}
.tb.thu{background-color:${COLORS.posFill}}.tb.chi{background-color:${COLORS.negFill}}
.tlbl{position:absolute;top:100%;left:0;right:0;margin-top:${mm(1.5)};font-size:${pt(TYPE.caption)};color:var(--ink2);text-align:center;font-weight:700;white-space:nowrap}
.legend{display:inline-flex;gap:${mm(SPACE.s3)};font-size:${pt(TYPE.caption)};color:var(--ink2);text-transform:none;letter-spacing:0}
.legend i{display:inline-block;width:${mm(2)};height:${mm(2)};border-radius:${mm(0.5)};margin-right:${mm(1)};vertical-align:middle}
.delta{font-size:${pt(TYPE.caption)};font-weight:700;padding:${mm(0.3)} ${mm(1.8)};border-radius:${mm(3)}}
.delta.pos{color:${COLORS.pos};${chip(COLORS.posFill)}}.delta.neg{color:${COLORS.neg};${chip(COLORS.negFill)}}
/* Tiles */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s2)}}
.tile{padding:${mm(SPACE.s2)} ${mm(2.5)}}
.tile .v{font-size:${pt(TYPE.h2)};font-weight:700;color:var(--v);margin-top:${mm(1)};white-space:nowrap;font-variant-numeric:tabular-nums}
/* Bảng: header = dải kính chuyển sắc chữ trắng bo góc; thân hàng bán trong + zebra brand + đường kẻ trắng */
table{width:100%;border-collapse:separate;border-spacing:0}
thead th{background:linear-gradient(180deg,${g(GLASS.gloss)},${g(0)} 60%),var(--mast-mid);color:#fff;font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;font-weight:700;text-align:left;padding:${mm(2.2)} ${mm(2.5)};border-top:${mm(0.25)} solid ${g(GLASS.mastRim)};border-bottom:${mm(0.25)} solid ${g(0.2)}}
thead th:not(:last-child){box-shadow:${mm(0.15)} 0 0 0 var(--mast-mid)}
thead th:first-child{border-radius:${mm(GLASS.radius)} 0 0 ${mm(GLASS.radius)}}thead th:last-child{border-radius:0 ${mm(GLASS.radius)} ${mm(GLASS.radius)} 0}
thead th.r{text-align:right}thead th.c{text-align:center}
tbody td{padding:${mm(1.15)} ${mm(2.5)};border-bottom:${mm(PAGE.hair)} solid ${g(GLASS.rowLine)};font-size:${pt(TYPE.table)};color:var(--ink);background-color:${g(GLASS.rowAlpha)}}
tbody tr:nth-child(even) td{background-color:${glassTint(B.brand, GLASS.zebra + 0.03)}}
td.r{text-align:right;font-variant-numeric:tabular-nums}td.c{text-align:center}td.nm{font-weight:700}
.rank{display:inline-block;min-width:${mm(5)};height:${mm(5)};line-height:${mm(5)};text-align:center;border-radius:50%;font-weight:400;color:var(--muted)}
.rank.top{font-weight:700;color:#fff;background:linear-gradient(180deg,${g(GLASS.gloss)},${g(0)} 60%),var(--mast-mid);box-shadow:inset 0 0 0 ${mm(0.2)} ${g(GLASS.mastRim)}}
.pill{display:inline-block;min-width:${mm(8)};text-align:center;padding:${mm(0.4)} ${mm(2)};border-radius:${mm(3)};font-weight:700;font-size:${pt(TYPE.table)}}
.st{display:inline-flex;align-items:center;font-size:${pt(TYPE.label)};font-weight:700;padding:${mm(0.4)} ${mm(2)};border-radius:${mm(3)}}
.st.ok{color:${COLORS.pos};${chip(COLORS.posFill)}}
.st.bad{color:${COLORS.neg};${chip(COLORS.negFill)}}
.st i{display:inline-block;width:${mm(1.6)};height:${mm(1.6)};border-radius:50%;margin-right:${mm(1.2)}}
.dots{display:inline-flex;gap:${mm(0.6)};vertical-align:middle}.dots i{display:inline-block;width:${mm(1.8)};height:${mm(1.8)};border-radius:50%;background:${rgba(B.brand, 0.16)}}.dots i.on{background:${COLORS.warnFill}}
.dno{font-size:${pt(TYPE.caption)};color:var(--muted);margin-left:${mm(1.2)}}
.avgcard{display:flex;align-items:center;gap:${mm(SPACE.s4)};padding:${mm(SPACE.s2)} ${mm(SPACE.s3)};margin-bottom:${mm(SPACE.s2)};background:var(--acc-bg);box-shadow:var(--acc-ring)}
.avgcard .big{font-size:${pt(TYPE.display)};font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}.avgcard .big small{font-size:${pt(TYPE.body)};color:var(--muted);font-weight:400}
.avgcard .lbl{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.dist{display:grid;grid-template-columns:1fr 1fr;gap:${mm(SPACE.s1)} ${mm(SPACE.s3)};flex:1}
.dist .d{display:flex;justify-content:space-between;font-size:${pt(TYPE.table)};border-bottom:${mm(PAGE.hair)} solid ${g(GLASS.rowLine)};padding:${mm(0.8)} 0;color:var(--ink2)}
.dist .d b{color:var(--ink)}
.dist .d i{width:${mm(2)};height:${mm(2)};border-radius:50%;display:inline-block;margin-right:${mm(1.5)};vertical-align:middle}
/* Hàng 2-3 cột */
.half{display:grid;grid-template-columns:1fr 1fr;gap:${mm(SPACE.s4)}}
.three{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:${mm(SPACE.s3)}}
.callout{font-size:${pt(TYPE.table)};color:var(--ink2);line-height:1.5;margin-top:${mm(SPACE.s1)}}
.callout b{color:var(--ink)}
.pl{display:flex;align-items:center;gap:${mm(SPACE.s2)};font-size:${pt(TYPE.table)};padding:${mm(1)} 0;border-bottom:${mm(PAGE.hair)} solid ${rgba(B.brandDeep, 0.12)}}
.pl:last-child{border-bottom:none}
.plr{font-weight:700;color:var(--brandInk);${chip(B.brand)};border-radius:50%;width:${mm(5)};height:${mm(5)};line-height:${mm(4.6)};text-align:center}
.pln{flex:1;font-weight:700}.plw{color:var(--ink2);font-size:${pt(TYPE.caption)};font-weight:700}
/* AI agents */
.aigrid{display:grid;grid-template-columns:repeat(5,1fr);gap:${mm(SPACE.s2)}}
.agent{box-shadow:var(--g-sh),inset 0 ${mm(1.2)} 0 var(--f);padding:${mm(2)} ${mm(2.5)}}
.an{font-size:${pt(TYPE.table)};font-weight:700;color:var(--ink)}
.av{font-size:${pt(TYPE.kpi)};font-weight:700;margin:${mm(1)} 0;line-height:1.1;font-variant-numeric:tabular-nums}
.au{font-size:${pt(TYPE.caption)};color:var(--muted);font-weight:400;margin-left:${mm(1)}}
.ad{font-size:${pt(TYPE.caption)};color:var(--muted);border-top:${mm(PAGE.hair)} solid ${rgba(B.brandDeep, 0.12)};margin-top:${mm(1.5)};padding-top:${mm(1.5)};line-height:1.4}
/* Timeline / alerts / recs */
.tl{list-style:none;border-left:${mm(PAGE.border)} solid var(--brandBorder);padding-left:${mm(SPACE.s2)};margin-left:${mm(1)}}
.tl li{position:relative;margin-bottom:${mm(2)};font-size:${pt(TYPE.table)}}
.tl li:before{content:'';position:absolute;left:${mm(-5.9)};top:${mm(0.8)};width:${mm(2.4)};height:${mm(2.4)};border-radius:50%;background:var(--dot);box-shadow:0 0 0 ${mm(0.5)} ${g(0.8)}}
.tld{font-weight:700;color:var(--ink);margin-right:${mm(1.5)}}
.alist,.rlist{list-style:none}
.alist li{font-size:${pt(TYPE.table)};color:var(--ink);padding:${mm(1.5)} ${mm(2.5)} ${mm(1.5)} ${mm(3.5)};margin-bottom:${mm(1.5)};background-color:${glassTint(COLORS.warnFill, GLASS.chipFill)};border:var(--g-rim);box-shadow:inset ${mm(1)} 0 0 ${COLORS.warnFill},inset 0 0 0 ${mm(0.2)} ${rgba(COLORS.warnFill, GLASS.chipBorder)},inset 0 ${mm(0.35)} 0 ${g(GLASS.highlight)};border-radius:var(--g-r);line-height:1.5}
.rlist li{font-size:${pt(TYPE.table)};color:var(--ink);padding:${mm(1)} 0;line-height:1.55}
.tag{display:inline-block;color:var(--brandInk);${chip(B.brand)};font-size:${pt(TYPE.label)};font-weight:700;padding:${mm(0.3)} ${mm(2)};border-radius:${mm(3)};margin-right:${mm(1.5)}}
.closing{color:var(--muted);font-size:${pt(TYPE.caption)};border-top:${mm(PAGE.hair)} solid ${rgba(B.brandDeep, 0.16)};padding-top:${mm(1)};margin-top:${mm(2)}}
/* BÌA — băng kính lớn (gradient chéo + bóng loáng + viền trắng) / thẻ chỉ số kính / tấm thông tin tài liệu */
.cover{height:${mm(259)};display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page}
.cv-hero{position:relative;overflow:hidden;background:var(--mast-bg);color:#fff;border:var(--mast-rim);box-shadow:var(--mast-sh);border-radius:${mm(4)};padding:${mm(SPACE.s5)} ${mm(SPACE.s5)} ${mm(SPACE.s6)};height:${mm(150)};display:flex;flex-direction:column;justify-content:space-between}
.cv-hero:after{content:'';position:absolute;right:${mm(-18)};bottom:${mm(-26)};width:${mm(92)};height:${mm(92)};border-radius:50%;background:radial-gradient(circle at 35% 30%,${g(0.14)},${g(0.02)} 70%);border:${mm(0.3)} solid ${g(0.22)}}
.cv-hero>*{position:relative;z-index:1}
.cv-top{display:flex;align-items:center;justify-content:space-between}
.cv-id{display:flex;align-items:center;gap:${mm(SPACE.s3)}}
.cv-brand{font-size:${pt(TYPE.h2)};letter-spacing:.4pt;font-weight:700;color:#fff;text-transform:uppercase}
.cv-tag{font-size:${pt(TYPE.label)};letter-spacing:.4pt;font-weight:700;color:#fff;text-transform:uppercase;background:var(--chip-bg);border:var(--chip-bd);border-radius:${mm(3)};padding:${mm(0.8)} ${mm(3)}}
.cv-eyb{font-size:${pt(TYPE.label)};letter-spacing:.5pt;text-transform:uppercase;font-weight:700;color:#fff}
.cv-title{font-size:${pt(TYPE.cover)};font-weight:700;line-height:1.15;color:#fff;margin:${mm(SPACE.s3)} 0 ${mm(SPACE.s2)}}
.cv-period{font-size:${pt(TYPE.h2)};color:#fff}
.cv-rule{width:${mm(SPACE.s6)};height:${mm(1)};border-radius:${mm(0.5)};background:var(--badge);margin-top:${mm(SPACE.s4)}}
.cv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:${mm(SPACE.s3)}}
.cv-st{padding:${mm(SPACE.s3)}}
.cv-st .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.cv-st .v{font-size:${pt(TYPE.display)};font-weight:700;color:var(--v);margin-top:${mm(SPACE.s1)};line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.cv-st .s{font-size:${pt(TYPE.caption)};color:var(--muted);margin-top:${mm(1)}}
.cv-doc{padding:${mm(SPACE.s2)} ${mm(SPACE.s3)} ${mm(SPACE.s3)}}
.cv-dh{font-size:${pt(TYPE.label)};letter-spacing:.4pt;text-transform:uppercase;font-weight:700;color:var(--brandInk);margin-bottom:${mm(SPACE.s2)}}
.cv-dg{display:grid;grid-template-columns:1.3fr 1.1fr 1.2fr;gap:${mm(SPACE.s3)}}
.cv-dg .l{font-size:${pt(TYPE.label)};letter-spacing:.3pt;text-transform:uppercase;color:var(--muted);font-weight:700}
.cv-dg .v{font-size:${pt(TYPE.table)};color:var(--ink);margin-top:${mm(0.8)}}`;

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
${css}
</style></head><body>
<div class="wash"></div>

<section class="cover">
  <div class="cv-hero">
    <div class="cv-top">
      <div class="cv-id">${logo('md')}<div class="cv-brand">${esc(m.brandLabel)}</div></div>
      <div class="cv-tag">Executive Report</div>
    </div>
    <div>
      <div class="cv-eyb">Báo cáo điều hành · Executive Report</div>
      <h1 class="cv-title">${esc(m.clubName || m.brandLabel)}</h1>
      <div class="cv-period">Kỳ báo cáo: ${esc(m.periodName)}</div>
      <div class="cv-rule"></div>
    </div>
  </div>
  <div class="cv-stats">
    ${m.coverStats.map((c) => `<div class="cv-st ${tn(c.tone, c.v)}"><div class="l">${esc(c.l)}</div><div class="v">${esc(c.v)}</div><div class="s">${esc(c.s)}</div></div>`).join('')}
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
  <div class="gauge">${ring(m.health, m.tone.fill, m.tone.text)}<div class="cls" style="color:${m.tone.text}">${esc(m.grade)}</div></div>
</div>

<div class="sect">
  ${head('01', 'Sức khỏe tổng hợp', 'Điểm sức khỏe CLB', 'Tổng hợp 6 chiều từ số liệu thật của kỳ')}
  <div class="dims">${m.dims.map((d) => dimBar(d.label, d.score)).join('')}</div>
</div>

<div class="sect">
  ${head('02', 'Tổng quan điều hành', 'Các chỉ số chính')}
  <div class="kpis">${m.kpis.map((k) => kpi(k.l, k.v, k.s, k.accent, k.tone)).join('')}</div>
</div>

<div class="sect aibox">
  <div class="h">Tóm tắt điều hành (AI)</div>
  <div class="b">${aiBlocksHtml(m.aiText)}</div>
</div>

<div class="sect">
  ${head('03', 'Tài chính', 'Thu · Chi · Dòng quỹ', 'Số liệu chuẩn theo kỳ quỹ (carry-forward)')}
  <div class="fstrip">${m.finRows
    .map(
      (r) =>
        `<div class="fcell ${tn(r.tone, r.value)}"><div class="kl">${esc(r.label)}</div><div class="fval"><span class="fv">${esc(r.value)}</span>${r.delta !== undefined ? delta(r.delta, r.label === 'Tổng chi') : ''}</div></div>`,
    )
    .join('')}</div>
  ${chart}
</div>

<div class="sect sect--flow">
  <div class="mhead">
    ${head('04', 'Thành viên', 'Bảng xếp hạng sức khỏe', '40% tham gia · 30% đóng quỹ · 30% hạnh kiểm')}
    <div class="avgcard">
      <div><div class="lbl">Điểm sức khỏe TB</div><div class="big" style="color:${tone(m.avgHealth).vivid}">${m.avgHealth}<small> / 100</small></div></div>
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
    <div class="tiles">${m.forecast.tiles.map((t) => tile(t.l, t.v, t.tone)).join('')}</div>
    <p class="callout">${esc(m.forecast.callout)} <i class="mut">${esc(m.forecast.note)}</i></p>
  </div>
  <div>
    ${sub('06', 'Club DNA', m.dna.archetype)}
    <div class="dims" style="grid-template-columns:1fr;gap:${mm(SPACE.s1)}">${dnaTraits}</div>
  </div>
</div>

<div class="sect half">
  <div>
    ${sub('07', 'Hoạt động', 'Vận hành buổi chơi')}
    <div class="kpi2">${m.activity.kpis.map((k) => kpi(k.l, k.v, '', false, k.tone)).join('')}</div>
    <div class="callout">
      ${m.activity.busiest ? `<b>Đông nhất:</b> ${esc(m.activity.busiest)}<br>` : ''}
      ${m.activity.emptiest ? `<b>Ít nhất:</b> ${esc(m.activity.emptiest)}<br>` : ''}
      <i class="mut">Tỷ lệ lấp đầy tính theo sĩ số hoạt động (chưa có sức chứa/buổi).</i>
    </div>
  </div>
  <div>
    ${sub('08', 'Thi đấu', 'Giải & Minigame')}
    <div class="tiles">${m.tournament.tiles.map((t) => tile(t.l, t.v, t.tone)).join('')}</div>
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
