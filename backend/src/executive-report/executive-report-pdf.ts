import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadFontsBase64 } from './export-fonts';
import {
  COLORS,
  CONTENT_W,
  PAGE,
  SPACE,
  TYPE,
  hexToRgb,
  makeBrand,
} from './export-tokens';
import { buildExecModel, deltaText, healthTone } from './executive-report-model';

/**
 * Fallback jsPDF của Báo cáo điều hành (khi không có Chromium). CÙNG ngôn ngữ thiết kế với bản Chrome:
 * dùng chung token (export-tokens.ts) + view-model (executive-report-model.ts) → cùng bìa, masthead,
 * thứ tự mục 01–12, màu semantic AA, chữ ≥ 7pt, footer "CLB · Tên TL · Mã TL" | "Trang x / y".
 * Font BeVietnamPro (tiếng Việt có dấu). Trả Buffer, hoặc null nếu không có font.
 */
export interface ExecPdfOpts {
  logoDataUri?: string | null;
  brandColor?: string | null;
  now?: Date;
}

const L = PAGE.left;
const R = PAGE.w - PAGE.right;
const LIMIT_Y = PAGE.h - PAGE.bottom; // vùng nội dung kết thúc (chừa footer)

export function buildExecutiveReportPdf(
  report: any,
  aiText: string,
  opts: ExecPdfOpts = {},
): Buffer | null {
  const fonts = loadFontsBase64();
  if (!fonts) return null;

  const B = makeBrand(opts.brandColor);
  const m = buildExecModel(report, aiText, opts.now ?? new Date(), B.brand);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('BVP-Regular.ttf', fonts.regular);
  doc.addFileToVFS('BVP-Bold.ttf', fonts.bold);
  doc.addFont('BVP-Regular.ttf', 'BVP', 'normal');
  doc.addFont('BVP-Bold.ttf', 'BVP', 'bold');

  // ── helper vẽ (đọc token, không hard-code màu/cỡ) ────────────────────
  const fill = (hex: string) => doc.setFillColor(...hexToRgb(hex));
  const stroke = (hex: string) => doc.setDrawColor(...hexToRgb(hex));
  const ink = (hex: string) => doc.setTextColor(...hexToRgb(hex));
  const font = (size: number, bold = false, color: string = COLORS.ink) => {
    doc.setFont('BVP', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    ink(color);
  };
  const rrect = (x: number, y: number, w: number, h: number, style: 'F' | 'S' | 'FD', r: number = PAGE.radius) =>
    doc.roundedRect(x, y, w, h, r, r, style);
  const hline = (x1: number, x2: number, y: number, hex: string = COLORS.hairline, w: number = PAGE.hair) => {
    stroke(hex);
    doc.setLineWidth(w);
    doc.line(x1, y, x2, y);
  };
  const dot = (cx: number, cy: number, r: number, hex: string) => {
    fill(hex);
    doc.circle(cx, cy, r, 'F');
  };
  const up = (s: string) => s.toUpperCase();
  let y = PAGE.top;
  const ensure = (h: number) => {
    if (y + h > LIMIT_Y) {
      doc.addPage();
      y = PAGE.top;
    }
  };

  // ── logo / monogram ────────────────────────────────────────────────
  const drawLogo = (x: number, yy: number, size: number) => {
    const uri = opts.logoDataUri;
    const fmt = typeof uri === 'string' ? /^data:image\/(png|jpe?g);base64,/i.exec(uri) : null;
    if (uri && fmt) {
      try {
        const props = doc.getImageProperties(uri);
        const pad = size * 0.06;
        const box = size - pad * 2;
        const k = Math.min(box / props.width, box / props.height);
        const w = props.width * k;
        const h = props.height * k;
        fill(COLORS.surface);
        stroke(COLORS.hairline);
        doc.setLineWidth(PAGE.hair);
        rrect(x, yy, size, size, 'FD');
        doc.addImage(uri, fmt[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG', x + (size - w) / 2, yy + (size - h) / 2, w, h);
        return;
      } catch {
        /* rơi xuống monogram */
      }
    }
    fill(B.brandSoft);
    stroke(B.brand);
    doc.setLineWidth(PAGE.border);
    doc.circle(x + size / 2, yy + size / 2, size / 2 - 0.2, 'FD');
    font(size >= 20 ? TYPE.h1 : TYPE.h2, true, B.brandInk);
    doc.text(m.mono, x + size / 2, yy + size / 2 + (size >= 20 ? 2.2 : 1.4), { align: 'center' });
  };

  // ── 1. BÌA (cùng bố cục bản Chrome: logo + nhãn, panel brandDeep, 3 thẻ, chân bìa) ──
  drawLogo(L, y, 22);
  font(TYPE.label, true, B.brandInk);
  doc.text(m.brandLabel, L + 22 + SPACE.s3, y + 11.8);
  const panelY = y + 22 + SPACE.s6 + 36;
  const titleLines: string[] = (() => {
    font(TYPE.cover, true, '#FFFFFF');
    return doc.splitTextToSize(m.clubName || m.brandLabel, CONTENT_W - SPACE.s5 * 2);
  })();
  const titleH = titleLines.length * (TYPE.cover * 0.3528 * 1.12);
  const panelH = SPACE.s6 + 4 + SPACE.s3 + titleH + SPACE.s2 + 5 + SPACE.s5 + 0.6 + SPACE.s6;
  fill(B.brandDeep);
  rrect(L, panelY, CONTENT_W, panelH, 'F');
  let py = panelY + SPACE.s6;
  font(TYPE.label, true, '#FFFFFF');
  doc.text(up('Báo cáo điều hành · Executive Report'), L + SPACE.s5, py);
  py += SPACE.s3 + 6;
  font(TYPE.cover, true, '#FFFFFF');
  doc.text(titleLines, L + SPACE.s5, py);
  py += titleH + SPACE.s2 - 2;
  font(TYPE.h2, false, '#FFFFFF');
  doc.text(`Kỳ báo cáo: ${m.periodName}`, L + SPACE.s5, py + 3);
  fill('#FFFFFF');
  doc.rect(L + SPACE.s5, py + 3 + SPACE.s5, SPACE.s6, 0.6, 'F');
  // 3 thẻ số liệu
  const cardW = (CONTENT_W - SPACE.s2 * 2) / 3;
  const cardY = panelY + panelH + SPACE.s3;
  m.coverStats.forEach((c, i) => {
    const cx = L + i * (cardW + SPACE.s2);
    fill(COLORS.surface);
    stroke(COLORS.hairline);
    doc.setLineWidth(PAGE.hair);
    rrect(cx, cardY, cardW, 28, 'FD');
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(c.l), cx + SPACE.s2, cardY + SPACE.s3);
    font(TYPE.display, true, COLORS.ink);
    doc.text(c.v, cx + SPACE.s2, cardY + SPACE.s3 + 9);
    font(TYPE.caption, false, COLORS.muted);
    doc.text(c.s, cx + SPACE.s2, cardY + SPACE.s3 + 14.5);
  });
  // chân bìa
  const footY = PAGE.top + 250 - 6;
  hline(L, R, footY);
  font(TYPE.caption, false, COLORS.muted);
  doc.text(`Xuất lúc ${m.exportedAt} · Mã TL ${m.code}`, L, footY + SPACE.s2 + 1);
  doc.text('Tài liệu nội bộ · Ban quản trị CLB', R, footY + SPACE.s2 + 1, { align: 'right' });

  // ── 2. MASTHEAD trang 2 ────────────────────────────────────────────
  doc.addPage();
  y = PAGE.top;
  drawLogo(L, y, 12);
  font(TYPE.label, true, B.brandInk);
  doc.text(m.brandLabel, L + 12 + SPACE.s2, y + 3);
  font(TYPE.h1, true, COLORS.ink);
  doc.text('Báo cáo điều hành', L + 12 + SPACE.s2, y + 8.6);
  font(TYPE.body, false, COLORS.ink2);
  doc.text(`Kỳ: ${m.periodName} · Xuất lúc ${m.exportedAt}`, L + 12 + SPACE.s2, y + 12.6);
  // gauge: track hairline + cung brand
  const gcx = R - 30;
  const gcy = y + 7;
  const gr = 9;
  stroke(COLORS.hairline);
  doc.setLineWidth(2);
  doc.circle(gcx, gcy, gr, 'S');
  const frac = Math.max(0, Math.min(100, m.health)) / 100;
  if (frac > 0) {
    stroke(B.brand);
    doc.setLineCap('round');
    const steps = Math.max(2, Math.round(60 * frac));
    let prev: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * frac * (i / steps);
      const pt: [number, number] = [gcx + gr * Math.cos(a), gcy + gr * Math.sin(a)];
      if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
      prev = pt;
    }
    doc.setLineCap('butt');
  }
  font(TYPE.display, true, COLORS.ink);
  doc.text(String(m.health), gcx, gcy + 1.6, { align: 'center' });
  font(TYPE.caption, false, COLORS.muted);
  doc.text('/ 100', gcx, gcy + 5.4, { align: 'center' });
  font(TYPE.label, true, COLORS.ink2);
  doc.text(up(m.grade), gcx + gr + 3, gcy + 1, { align: 'left' });
  y += 16;
  hline(L, R, y, B.brand, 0.6);
  y += SPACE.s3;

  // ── helper khối ────────────────────────────────────────────────────
  const sectionHead = (num: string, eyebrow: string, title: string, note = '') => {
    font(TYPE.label, true, B.brandInk);
    doc.text(up(`${num} · ${eyebrow}`), L, y + 2);
    font(TYPE.h2, true, COLORS.ink);
    doc.text(title, L, y + 7);
    if (note) {
      font(TYPE.caption, false, COLORS.muted);
      doc.text(note, R, y + 7, { align: 'right' });
    }
    y += 9;
    hline(L, R, y);
    y += SPACE.s2;
  };
  const subHead = (x: number, yy: number, num: string, eyebrow: string, title: string, dry: boolean) => {
    if (!dry) {
      font(TYPE.label, true, B.brandInk);
      doc.text(up(`${num} · ${eyebrow}`), x, yy + 2);
      font(TYPE.h2, true, COLORS.ink);
      doc.text(title, x, yy + 7);
    }
    return 10;
  };
  const bar = (x: number, yy: number, w: number, score: number | null, label: string) => {
    const t = score == null ? null : healthTone(score);
    font(TYPE.table, true, COLORS.ink2);
    doc.text(label, x, yy + 2.6);
    font(TYPE.table, true, t ? t.text : COLORS.muted);
    doc.text(score == null ? '—' : String(score), x + w, yy + 2.6, { align: 'right' });
    fill(COLORS.hairline);
    rrect(x, yy + 4, w, 1.8, 'F', 0.9);
    if (t && score! > 0) {
      fill(t.fill);
      rrect(x, yy + 4, Math.max(1.8, (w * Math.min(100, score!)) / 100), 1.8, 'F', 0.9);
    }
    return 9;
  };
  const card = (x: number, yy: number, w: number, h: number, accent = false) => {
    if (accent) {
      fill(B.brandSoft);
      stroke(B.brand);
      doc.setLineWidth(PAGE.border);
    } else {
      fill(COLORS.surface);
      stroke(COLORS.hairline);
      doc.setLineWidth(PAGE.hair);
    }
    rrect(x, yy, w, h, 'FD');
  };
  const kpiCard = (x: number, yy: number, w: number, k: { l: string; v: string; s?: string; accent?: boolean }, h = 18) => {
    card(x, yy, w, h, k.accent);
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(k.l), x + SPACE.s2, yy + 5);
    let size: number = TYPE.kpi;
    font(size, true, k.accent ? B.brandInk : COLORS.ink);
    while (size > 10 && doc.getTextWidth(k.v) > w - SPACE.s2 * 2) {
      size -= 0.5;
      doc.setFontSize(size);
    }
    doc.text(k.v, x + SPACE.s2, yy + 11);
    if (k.s) {
      font(TYPE.caption, false, COLORS.muted);
      doc.text(k.s, x + SPACE.s2, yy + 15);
    }
  };
  const tileCard = (x: number, yy: number, w: number, t: { l: string; v: string }) => {
    card(x, yy, w, 13);
    font(TYPE.label, true, COLORS.muted);
    doc.text(up(t.l), x + w / 2, yy + 4.6, { align: 'center' });
    let size: number = TYPE.body;
    font(size, true, COLORS.ink);
    while (size > TYPE.label && doc.getTextWidth(t.v) > w - 3) {
      size -= 0.25;
      doc.setFontSize(size);
    }
    doc.text(t.v, x + w / 2, yy + 9.6, { align: 'center' });
  };

  // 01 sức khỏe
  ensure(9 + SPACE.s2 + Math.ceil(m.dims.length / 3) * 9 + SPACE.s3);
  sectionHead('01', 'Sức khỏe tổng hợp', 'Điểm sức khỏe CLB', 'Tổng hợp 6 chiều từ số liệu thật của kỳ');
  {
    const w = (CONTENT_W - SPACE.s3 * 2) / 3;
    m.dims.forEach((d, i) => bar(L + (i % 3) * (w + SPACE.s3), y + Math.floor(i / 3) * 9, w, d.score, d.label));
    y += Math.max(1, Math.ceil(m.dims.length / 3)) * 9 + SPACE.s3 - 2;
  }

  // 02 KPI
  ensure(9 + SPACE.s2 + 18 * 2 + SPACE.s2 + SPACE.s3);
  sectionHead('02', 'Tổng quan điều hành', 'Các chỉ số chính');
  {
    const w = (CONTENT_W - SPACE.s2 * 3) / 4;
    m.kpis.forEach((k, i) =>
      kpiCard(L + (i % 4) * (w + SPACE.s2), y + Math.floor(i / 4) * (18 + SPACE.s2), w, k),
    );
    y += Math.ceil(m.kpis.length / 4) * (18 + SPACE.s2) + SPACE.s1;
  }

  // AI summary
  {
    font(TYPE.body, false, COLORS.ink);
    const lines: string[] = doc.splitTextToSize(m.aiText, CONTENT_W - SPACE.s2 * 2);
    const h = SPACE.s2 + 5 + lines.length * 4.4 + SPACE.s2;
    ensure(h + SPACE.s3);
    card(L, y, CONTENT_W, h, true);
    font(TYPE.h2, true, B.brandInk);
    doc.text('Tóm tắt điều hành (AI)', L + SPACE.s2, y + SPACE.s2 + 3);
    font(TYPE.body, false, COLORS.ink);
    doc.text(lines, L + SPACE.s2, y + SPACE.s2 + 9);
    y += h + SPACE.s3;
  }

  // 03 tài chính
  {
    const chartH = 36;
    const rowsH = m.finRows.length * 7;
    ensure(9 + SPACE.s2 + Math.max(chartH + 8, rowsH) + SPACE.s3);
    sectionHead('03', 'Tài chính', 'Thu · Chi · Dòng quỹ', 'Số liệu chuẩn theo kỳ quỹ (carry-forward)');
    const leftW = 76;
    const baseY = y + chartH;
    const max = Math.max(1, ...m.trends.flatMap((t) => [t.thu, t.chi]));
    if (!m.trends.length) {
      font(TYPE.table, false, COLORS.muted);
      doc.text('Chưa có dữ liệu kỳ trước.', L, y + 6);
    } else {
      const colW = Math.min(26, leftW / m.trends.length);
      const startX = L + (leftW - colW * m.trends.length) / 2;
      m.trends.forEach((t, i) => {
        const cx = startX + i * colW + colW / 2;
        const barW = 8;
        const hThu = Math.max(0.6, (t.thu / max) * (chartH - 8));
        const hChi = Math.max(0.6, (t.chi / max) * (chartH - 8));
        fill(COLORS.posFill);
        doc.rect(cx - barW - 1, baseY - hThu, barW, hThu, 'F');
        fill(COLORS.negFill);
        doc.rect(cx + 1, baseY - hChi, barW, hChi, 'F');
        font(TYPE.caption, true, COLORS.ink2);
        doc.text(t.thuLabel, cx - barW / 2 - 1, baseY - hThu - 1, { align: 'center' });
        doc.text(t.chiLabel, cx + barW / 2 + 1, baseY - hChi - 1, { align: 'center' });
        font(TYPE.caption, true, COLORS.muted);
        doc.text(t.name, cx, baseY + 3.6, { align: 'center' });
      });
      hline(L, L + leftW, baseY);
      dot(L + leftW / 2 - 8, baseY + 7.2, 0.8, COLORS.posFill);
      font(TYPE.caption, false, COLORS.ink2);
      doc.text('Thu', L + leftW / 2 - 6.4, baseY + 8);
      dot(L + leftW / 2 + 2, baseY + 7.2, 0.8, COLORS.negFill);
      doc.text('Chi', L + leftW / 2 + 3.6, baseY + 8);
    }
    const rx = L + leftW + SPACE.s4;
    let ry = y;
    m.finRows.forEach((r) => {
      font(TYPE.body, false, COLORS.ink2);
      doc.text(r.label, rx, ry + 4.4);
      font(TYPE.body, true, COLORS.ink);
      let vx = R;
      if (r.delta !== undefined) {
        if (r.delta == null) {
          font(TYPE.caption, false, COLORS.muted);
          doc.text('—', R, ry + 4.4, { align: 'right' });
          vx = R - 5;
        } else {
          const txt = deltaText(r.delta);
          font(TYPE.caption, true, r.delta >= 0 ? COLORS.pos : COLORS.neg);
          const tw = doc.getTextWidth(txt) + 3.2;
          fill(r.delta >= 0 ? COLORS.posTint : COLORS.negTint);
          rrect(R - tw, ry + 1.2, tw, 4.4, 'F');
          ink(r.delta >= 0 ? COLORS.pos : COLORS.neg);
          doc.text(txt, R - tw / 2, ry + 4.3, { align: 'center' });
          vx = R - tw - 1.5;
        }
        font(TYPE.body, true, COLORS.ink);
      }
      doc.text(r.value, vx, ry + 4.4, { align: 'right' });
      ry += 7;
      hline(rx, R, ry - 0.8);
    });
    y += Math.max(chartH + 10, rowsH) + SPACE.s3;
  }

  // 04 thành viên
  {
    ensure(9 + SPACE.s2 + 24 + 8 + 14);
    sectionHead('04', 'Thành viên', 'Bảng xếp hạng sức khỏe', '40% tham gia · 30% đóng quỹ · 30% hạnh kiểm');
    const at = healthTone(m.avgHealth);
    card(L, y, CONTENT_W, 20);
    font(TYPE.label, true, COLORS.muted);
    doc.text(up('Điểm sức khỏe TB'), L + SPACE.s2, y + 5);
    font(TYPE.display, true, at.text);
    doc.text(String(m.avgHealth), L + SPACE.s2, y + 13.5);
    const bw = doc.getTextWidth(String(m.avgHealth));
    font(TYPE.body, false, COLORS.muted);
    doc.text('/ 100', L + SPACE.s2 + bw + 1.5, y + 13.5);
    const dx0 = L + 50;
    const dw = (R - SPACE.s2 - dx0 - SPACE.s2) / 2;
    m.dist.forEach((d, i) => {
      const dx = dx0 + (i % 2) * (dw + SPACE.s2);
      const dy = y + 4 + Math.floor(i / 2) * 8;
      dot(dx + 0.8, dy + 1.4, 0.8, d.fill);
      font(TYPE.table, false, COLORS.ink2);
      doc.text(d.label, dx + 3, dy + 2.4);
      font(TYPE.table, true, COLORS.ink);
      doc.text(String(d.value), dx + dw, dy + 2.4, { align: 'right' });
      hline(dx, dx + dw, dy + 4.2);
    });
    y += 20 + SPACE.s2;

    const colW = [8, 52, 21, 24, 27, 24, 22];
    const body = m.members.length
      ? m.members.map((r) => [String(r.rank), r.name, r.rate, '', '', r.conduct, ''])
      : [[{ content: 'Chưa có thành viên trong kỳ này.', colSpan: 7, styles: { halign: 'center', textColor: hexToRgb(COLORS.muted), cellPadding: 6 } }]];
    autoTable(doc, {
      startY: y,
      margin: { left: L, right: PAGE.right, top: PAGE.top, bottom: PAGE.bottom },
      tableWidth: CONTENT_W,
      theme: 'plain',
      showHead: 'everyPage',
      head: [['#', 'Thành viên', 'Tham gia', 'Đóng quỹ', 'Đánh giá', 'Hạnh kiểm', 'Sức khỏe'].map(up)],
      body: body as any,
      styles: { font: 'BVP', fontStyle: 'normal', fontSize: TYPE.table, cellPadding: { top: 1.9, bottom: 1.9, left: 2.5, right: 2.5 }, textColor: hexToRgb(COLORS.ink), lineWidth: 0, valign: 'middle' },
      headStyles: { font: 'BVP', fontStyle: 'bold', fontSize: TYPE.label, fillColor: hexToRgb(B.brandSoft), textColor: hexToRgb(B.brandInk), cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 } },
      columnStyles: {
        0: { halign: 'center', cellWidth: colW[0], textColor: hexToRgb(COLORS.muted) },
        1: { cellWidth: colW[1], fontStyle: 'bold' },
        2: { halign: 'right', cellWidth: colW[2] },
        3: { halign: 'center', cellWidth: colW[3] },
        4: { halign: 'center', cellWidth: colW[4] },
        5: { halign: 'right', cellWidth: colW[5] },
        6: { halign: 'right', cellWidth: colW[6] },
      },
      didParseCell: (d) => {
        if (d.section === 'head') {
          const ha = [ 'center', 'left', 'right', 'center', 'center', 'right', 'right' ][d.column.index] as any;
          d.cell.styles.halign = ha;
        } else if (d.section === 'body' && d.column.index === 0 && m.members[d.row.index]?.rank <= 3) {
          d.cell.styles.textColor = hexToRgb(B.brandInk);
          d.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawCell: (d) => {
        const c = d.cell;
        if (d.section === 'head') {
          hline(c.x, c.x + c.width, c.y + c.height, B.brand, PAGE.strong);
          return;
        }
        if (d.section !== 'body') return;
        hline(c.x, c.x + c.width, c.y + c.height);
        const r = m.members[d.row.index];
        if (!r) return;
        const cx = c.x + c.width / 2;
        const cy = c.y + c.height / 2;
        if (d.column.index === 3) {
          if (r.pay) {
            const txt = r.pay === 'paid' ? 'Đã đóng' : 'Nợ';
            font(TYPE.label, true, COLORS.ink2);
            const tw = doc.getTextWidth(txt);
            dot(cx - tw / 2 - 1.6, cy, 0.8, r.pay === 'paid' ? COLORS.posFill : COLORS.negFill);
            doc.text(txt, cx - tw / 2 + 0.4, cy + 0.9);
          } else {
            font(TYPE.table, false, COLORS.muted);
            doc.text('—', cx, cy + 1, { align: 'center' });
          }
        } else if (d.column.index === 4) {
          font(TYPE.caption, false, COLORS.muted);
          const txt = `${r.stars}/5`;
          const gw = 5 * 1.6 + 4 * 0.6 + 1.6 + doc.getTextWidth(txt);
          let sx = cx - gw / 2;
          for (let i = 1; i <= 5; i++) {
            dot(sx + 0.8, cy, 0.8, i <= r.stars ? B.brand : COLORS.hairline);
            sx += 2.2;
          }
          doc.text(txt, sx + 0.4, cy + 0.9);
        } else if (d.column.index === 6) {
          const t = healthTone(r.health);
          const txt = String(r.health);
          font(TYPE.table, true, t.text);
          const pw = Math.max(8, doc.getTextWidth(txt) + 4);
          const px = c.x + c.width - 2.5 - pw;
          fill(t.tint);
          rrect(px, cy - 2.1, pw, 4.2, 'F');
          ink(t.text);
          doc.text(txt, px + pw / 2, cy + 1, { align: 'center' });
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + SPACE.s3;
  }

  // helper: 2 cột (đo trước để không tách trang)
  const twoCols = (left: (x: number, yy: number, w: number, dry: boolean) => number, right: (x: number, yy: number, w: number, dry: boolean) => number) => {
    const w = (CONTENT_W - SPACE.s4) / 2;
    const h = Math.max(left(L, 0, w, true), right(L + w + SPACE.s4, 0, w, true));
    ensure(h + SPACE.s3);
    left(L, y, w, false);
    right(L + w + SPACE.s4, y, w, false);
    y += h + SPACE.s3;
  };

  // 05 dự báo | 06 Club DNA
  twoCols(
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '05', 'Dự báo', 'Xu hướng 30–90 ngày', dry);
      const tw = (w - SPACE.s2 * 2) / 3;
      if (!dry) m.forecast.tiles.forEach((t, i) => tileCard(x + i * (tw + SPACE.s2), yy + h, tw, t));
      h += 13 + SPACE.s2;
      font(TYPE.table, false, COLORS.ink2);
      const lines: string[] = doc.splitTextToSize(`${m.forecast.callout} ${m.forecast.note}`, w);
      if (!dry) doc.text(lines, x, yy + h + 3);
      return h + lines.length * 4.3 + 1;
    },
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '06', 'Club DNA', m.dna.archetype, dry);
      m.dna.traits.forEach((t) => {
        if (!dry) bar(x, yy + h, w, t.score, t.label);
        h += 9;
      });
      return h;
    },
  );

  // 07 hoạt động | 08 thi đấu
  twoCols(
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '07', 'Hoạt động', 'Vận hành buổi chơi', dry);
      const kw = (w - SPACE.s2) / 2;
      if (!dry) m.activity.kpis.forEach((k, i) => kpiCard(x + (i % 2) * (kw + SPACE.s2), yy + h + Math.floor(i / 2) * 15, kw, k, 13));
      h += 15 * 2;
      font(TYPE.table, false, COLORS.ink2);
      const txt = [m.activity.busiest ? `Đông nhất: ${m.activity.busiest}` : '', m.activity.emptiest ? `Ít nhất: ${m.activity.emptiest}` : '', 'Tỷ lệ lấp đầy tính theo sĩ số hoạt động (chưa có sức chứa/buổi).'].filter(Boolean);
      const lines: string[] = doc.splitTextToSize(txt.join('\n'), w);
      if (!dry) doc.text(lines, x, yy + h + 3);
      return h + lines.length * 4.3 + 1;
    },
    (x, yy, w, dry) => {
      let h = subHead(x, yy, '08', 'Thi đấu', 'Giải & Minigame', dry);
      const tw = (w - SPACE.s2 * 2) / 3;
      if (!dry) m.tournament.tiles.forEach((t, i) => tileCard(x + i * (tw + SPACE.s2), yy + h, tw, t));
      h += 13 + SPACE.s2;
      if (!m.tournament.top.length) {
        if (!dry) {
          font(TYPE.table, false, COLORS.muted);
          doc.text('Chưa có giải/minigame trong kỳ.', x, yy + h + 3);
        }
        return h + 5;
      }
      m.tournament.top.forEach((p) => {
        if (!dry) {
          font(TYPE.table, true, B.brandInk);
          doc.text(String(p.rank), x, yy + h + 3);
          font(TYPE.table, true, COLORS.ink);
          doc.text(p.name, x + 6, yy + h + 3);
          font(TYPE.caption, false, COLORS.ink2);
          doc.text(p.stat, x + w, yy + h + 3, { align: 'right' });
          hline(x, x + w, yy + h + 5);
        }
        h += 6;
      });
      return h + 6;
    },
  );

  // 09 AI
  {
    ensure(9 + SPACE.s2 + 24 + SPACE.s3);
    sectionHead('09', 'Văn phòng AI (AIDO)', 'Hiệu suất tự động hóa', m.agentsHeading);
    const w = (CONTENT_W - SPACE.s2 * 4) / 5;
    m.agents.forEach((a, i) => {
      const ax = L + i * (w + SPACE.s2);
      card(ax, y, w, 24);
      fill(B.brand);
      doc.rect(ax + 0.3, y, w - 0.6, 0.6, 'F');
      font(TYPE.table, true, B.brandInk);
      doc.text(a.name, ax + 2.8, y + 5.4);
      font(TYPE.kpi, true, COLORS.ink);
      doc.text(a.value, ax + 2.8, y + 11.4);
      const vw = doc.getTextWidth(a.value);
      font(TYPE.caption, false, COLORS.muted);
      doc.text(a.unit, ax + 2.8 + vw + 1, y + 11.4);
      hline(ax + 2.8, ax + w - 2.8, y + 13.4);
      font(TYPE.caption, false, COLORS.muted);
      doc.text(doc.splitTextToSize(a.detail, w - 5.6) as string[], ax + 2.8, y + 17);
    });
    y += 24 + SPACE.s3;
  }

  // 10 dòng thời gian | 11 cảnh báo | 12 khuyến nghị
  {
    const unit = (CONTENT_W - SPACE.s3 * 2) / 3.1;
    const cw = [unit * 1.1, unit, unit];
    const xs = [L, L + cw[0] + SPACE.s3, L + cw[0] + cw[1] + SPACE.s3 * 2];
    const col = (idx: number, dry: boolean) => {
      const x = xs[idx];
      const w = cw[idx];
      const yy = dry ? 0 : y;
      let h = 0;
      if (idx === 0) {
        h = subHead(x, yy, '10', 'Dòng thời gian', 'Sự kiện nổi bật', dry);
        if (!m.timeline.length) {
          if (!dry) { font(TYPE.table, false, COLORS.muted); doc.text('Chưa có sự kiện nổi bật.', x, yy + h + 3); }
          return h + 5;
        }
        m.timeline.forEach((t) => {
          font(TYPE.table, false, COLORS.ink);
          const lines: string[] = doc.splitTextToSize(`${t.date}  ${t.text}${t.amount ? ' ' + t.amount : ''}`, w - 5);
          if (!dry) {
            dot(x + 1, yy + h + 2.4, 1, t.fill);
            font(TYPE.table, true, COLORS.ink);
            doc.text(t.date, x + 4, yy + h + 3.2);
            const dw = doc.getTextWidth(t.date + '  ');
            font(TYPE.table, false, COLORS.ink);
            const rest: string[] = doc.splitTextToSize(`${t.text}${t.amount ? ' ' + t.amount : ''}`, w - 5 - dw);
            doc.text(rest, x + 4 + dw, yy + h + 3.2);
            h += Math.max(1, rest.length) * 4 + 2;
          } else {
            h += Math.max(1, lines.length) * 4 + 2;
          }
        });
        return h;
      }
      if (idx === 1) {
        h = subHead(x, yy, '11', 'Cảnh báo', 'Rủi ro cần lưu ý', dry);
        if (!m.alerts.length) {
          if (!dry) { font(TYPE.table, false, COLORS.pos); doc.text('Không có cảnh báo — CLB ổn định.', x, yy + h + 3); }
          return h + 5;
        }
        font(TYPE.table, false, COLORS.ink);
        m.alerts.forEach((a) => {
          const lines: string[] = doc.splitTextToSize(a, w - 4);
          if (!dry) {
            dot(x + 0.9, yy + h + 2.4, 0.9, COLORS.warnFill);
            font(TYPE.table, false, COLORS.ink);
            doc.text(lines, x + 3.6, yy + h + 3.2);
          }
          h += lines.length * 4 + 2;
        });
        return h;
      }
      h = subHead(x, yy, '12', 'Khuyến nghị', 'Gợi ý hành động', dry);
      if (!m.recs.length) {
        if (!dry) { font(TYPE.table, false, COLORS.muted); doc.text('Không có đề xuất.', x, yy + h + 3); }
        return h + 5;
      }
      m.recs.forEach((r) => {
        font(TYPE.label, true, B.brandInk);
        const tw = doc.getTextWidth(r.agent) + 4;
        font(TYPE.table, false, COLORS.ink);
        const lines: string[] = doc.splitTextToSize(r.text, w);
        if (!dry) {
          fill(B.brandSoft);
          rrect(x, yy + h, tw, 4.2, 'F');
          font(TYPE.label, true, B.brandInk);
          doc.text(r.agent, x + tw / 2, yy + h + 3, { align: 'center' });
          font(TYPE.table, false, COLORS.ink);
          doc.text(lines, x, yy + h + 8);
        }
        h += 5 + lines.length * 4 + 2.5;
      });
      return h;
    };
    const h = Math.max(col(0, true), col(1, true), col(2, true));
    ensure(h + SPACE.s3);
    col(0, false);
    col(1, false);
    col(2, false);
    y += h + SPACE.s3;
  }
  font(TYPE.caption, false, COLORS.muted);
  ensure(5);
  doc.text('AIDO Executive Report · mọi con số từ dữ liệu thật của CLB', PAGE.w / 2, y + 2, { align: 'center' });

  // ── Footer mọi trang: cùng chuỗi bản Chrome ─────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = PAGE.h - PAGE.bottom + SPACE.s1;
    hline(L, R, fy);
    font(TYPE.caption, false, COLORS.muted);
    doc.text(m.footerLeft, L, fy + 4);
    doc.text(`Trang ${p} / ${pageCount}`, R, fy + 4, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
