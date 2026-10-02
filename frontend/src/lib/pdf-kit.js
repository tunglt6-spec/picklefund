/**
 * PDF KIT "Luxury SaaS" — bộ vẽ dùng chung cho MỌI PDF vector (báo cáo, bảng, sơ đồ, phiếu).
 * Thay 5 bản drawHeader + 5 bản footer + 5 bản helper font/clip/wrap trước đây bằng:
 *   setupDoc · createKit(doc, branding) · kit.masthead · drawFooterAll · kit.kpiCard ·
 *   drawTable · kit.signatures · kit.kvList · kit.emptyState · kit.hero · kit.tag
 *
 * Mọi màu/cỡ chữ/khoảng cách đọc từ THEME (export-theme.js); sàn cỡ chữ MIN_PT bị ÉP ở cấp doc
 * (setFontSize) nên không builder nào vẽ được chữ < 7pt.
 */
import { THEME, MIN_PT, makeBrand, fmt } from './export-theme.js'

export const EMPTY_TEXT = 'Chưa có dữ liệu trong phạm vi này'

/* ═══════════ Tiện ích glyph / font (chuyển từ pdf-report-core) ═══════════ */

/* Ký tự thay thế khi font KHÔNG có glyph (key = code point). Ký tự không có glyph và không có
   thay thế (emoji, ✓, ⏳, CJK…) bị loại bỏ để PDF không ra ô vuông. */
const GLYPH_FALLBACK = new Map([
  [0x2192, '›'], [0x21d2, '›'], [0x27f6, '›'], [0x2190, '‹'], [0x21d0, '‹'],
  [0x2194, '-'], [0x2191, '^'], [0x2193, 'v'],
  [0x2264, '<='], [0x2265, '>='], [0x2260, '!='],
  [0x2018, "'"], [0x2019, "'"], [0x201c, '"'], [0x201d, '"'],
  [0x2022, '-'], [0x2212, '-'],
  [0x00a0, ' '], [0x2002, ' '], [0x2003, ' '], [0x2007, ' '], [0x2009, ' '], [0x200a, ' '], [0x202f, ' '],
])

/** Lọc chuỗi theo bảng glyph (cmap) của font hiện hành trong doc. Chuỗi ASCII đi đường tắt. */
export function cleanPdfText(doc, input) {
  if (typeof input !== 'string') return input
  if (/^[\x20-\x7E]*$/.test(input)) return input
  let codeMap = null
  try { codeMap = doc.getFont().metadata.cmap.unicode.codeMap } catch { codeMap = null }
  const has = codeMap
    ? (cp) => codeMap[cp] !== undefined
    : (cp) => cp < 0x250 || (cp >= 0x1e00 && cp <= 0x1eff) || (cp >= 0x2010 && cp <= 0x2027) || cp === 0x20ab
  let out = ''
  let changed = false
  for (const ch of input.normalize('NFC')) {
    const cp = ch.codePointAt(0)
    if (ch === '\n') { out += ch; continue }
    if (cp < 0x20 || cp === 0x7f) { changed = true; if (cp === 9) out += ' '; continue }
    if (has(cp)) { out += ch; continue }
    changed = true
    const fb = GLYPH_FALLBACK.get(cp)
    if (fb !== undefined) out += fb
    else if (cp >= 0x2190 && cp <= 0x21ff) out += '›'
  }
  return changed ? out.replace(/ {2,}/g, ' ').trim() : out
}

/** Nhúng font Việt + bọc text/getTextWidth/splitTextToSize qua bộ lọc glyph + ÉP sàn cỡ chữ MIN_PT. */
export function setupDoc(doc, fonts) {
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.regular)
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold)
  doc.addFont('BeVietnamPro-Regular.ttf', 'BVP', 'normal')
  doc.addFont('BeVietnamPro-Bold.ttf', 'BVP', 'bold')
  doc.setFont('BVP', 'normal')
  const rawText = doc.text.bind(doc)
  doc.text = (t, ...rest) => rawText(Array.isArray(t) ? t.map((x) => cleanPdfText(doc, x)) : cleanPdfText(doc, t), ...rest)
  const rawWidth = doc.getTextWidth.bind(doc)
  doc.getTextWidth = (t) => rawWidth(cleanPdfText(doc, t))
  const rawSplit = doc.splitTextToSize.bind(doc)
  doc.splitTextToSize = (t, w, o) => rawSplit(cleanPdfText(doc, t), w, o)
  const rawSize = doc.setFontSize.bind(doc)
  doc.setFontSize = (s, ...r) => rawSize(Math.max(MIN_PT, Number(s) || MIN_PT), ...r)
  return doc
}

/** Cắt chữ kèm "…" khi vượt bề rộng cho phép (theo font đang set). Phương án CUỐI CÙNG. */
export function clipTo(doc, text, maxW) {
  let t = String(text ?? '')
  if (doc.getTextWidth(t) <= maxW) return t
  while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
  return t + '…'
}

/** Xuống dòng theo bề rộng (font đang set), tối đa `maxLines` dòng; dòng cuối thêm "…" nếu còn dư. */
export function wrapTo(doc, text, maxW, maxLines = 3) {
  const t = String(text ?? '')
  if (t === '') return ['']
  let lines = doc.splitTextToSize(t, maxW)
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    let last = lines[maxLines - 1]
    while (last.length > 1 && doc.getTextWidth(last + '…') > maxW) last = last.slice(0, -1)
    lines[maxLines - 1] = last + '…'
  }
  return lines
}

/** Co cỡ chữ (không nhỏ hơn minSize) cho vừa maxW; vẫn dài thì cắt "…". Để lại cỡ chữ đã chọn. */
export function fitText(doc, text, maxW, size, minSize = MIN_PT) {
  let s = size
  doc.setFontSize(s)
  while (s > minSize && doc.getTextWidth(String(text ?? '')) > maxW) {
    s -= 0.5
    doc.setFontSize(s)
  }
  return clipTo(doc, text, maxW)
}

/* ═══════════ Kit ═══════════ */

/** Phân loại trạng thái theo nhãn → 'pos' | 'neg' | 'warn' | 'muted'. */
function statusKind(text) {
  const t = String(text ?? '').trim().toLowerCase()
  if (/^(chưa|từ chối|quá hạn|hủy|đã hủy|bị từ chối|thất bại)/.test(t)) return 'neg'
  if (/^(đã|hoạt động|hoàn thành|xác nhận|thành công)/.test(t)) return 'pos'
  if (/^(chờ|tạm|đang chờ)/.test(t)) return 'warn'
  return 'muted'
}

/**
 * Tạo kit vẽ cho 1 doc. branding = { name, footer, logo?, primaryColor? }.
 * logo = { dataUrl, w, h, onDark? } — onDark: logo trắng (mặc định PickleFund) → vẽ thẳng trên băng brandDark;
 * logo màu → đặt trên chip trắng.
 */
export function createKit(doc, branding = {}) {
  const T = THEME
  const C = T.color
  const B = makeBrand(branding.primaryColor)
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = T.page.margin
  const CW = W - M * 2
  const kit = { doc, T, C, B, W, H, M, CW, branding, bottom: H - T.page.bottomPad }

  /* Màu SINH ĐỘNG chỉ cho chữ ĐẬM ≥ 8.5pt; còn lại dùng bản AA tương ứng. */
  const AA = new Map([[C.pos, C.posText], [C.neg, C.negText], [C.cyan, C.info], [C.orange, C.warn], [C.amber, C.warn]])
  kit.vividOk = (bold, size) => bold && size >= T.type.body
  kit.semText = (vivid, bold, size) => (kit.vividOk(bold, size) ? vivid : AA.get(vivid) ?? vivid)

  kit.fill = (c) => doc.setFillColor(c[0], c[1], c[2])
  kit.stroke = (c) => doc.setDrawColor(c[0], c[1], c[2])
  kit.color = (c) => doc.setTextColor(c[0], c[1], c[2])
  kit.lw = (w) => doc.setLineWidth(w)
  kit.font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) kit.color(color)
  }
  kit.rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  kit.clip = (t, w) => clipTo(doc, t, w)
  kit.wrap = (t, w, n) => wrapTo(doc, t, w, n)
  kit.fit = (t, w, size, min) => fitText(doc, t, w, size, min)
  kit.hline = (x1, x2, y, color, w) => { kit.stroke(color); kit.lw(w); doc.line(x1, y, x2, y) }

  /** Nhãn IN HOA + tracking +0.3pt (7pt bold). Vẽ căn trái từ x đã tính (tracking không lệch khi căn phải). Trả bề rộng. */
  kit.tracked = (text, x, y, o = {}) => {
    const cs = o.cs ?? 0.3
    kit.font(o.style ?? 'bold', o.size ?? T.type.label, o.color ?? C.muted)
    let s = String(text ?? '').toUpperCase()
    const tw = (str) => doc.getTextWidth(str) + cs * Math.max(0, str.length - 1)
    if (o.maxW != null && tw(s) > o.maxW) {
      while (s.length > 1 && tw(s + '…') > o.maxW) s = s.slice(0, -1)
      s = s.trimEnd() + '…'
    }
    const w = tw(s)
    const x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x
    doc.text(s, x0, y, { charSpace: cs })
    return w
  }
  kit.trackedWidth = (text, o = {}) => {
    const cs = o.cs ?? 0.3
    kit.font(o.style ?? 'bold', o.size ?? T.type.label)
    const s = String(text ?? '').toUpperCase()
    return doc.getTextWidth(s) + cs * Math.max(0, s.length - 1)
  }

  /** Thẻ chữ nhỏ TRÊN BĂNG ĐẶC (pill trắng + chữ brandDark). Trả bề rộng đã chiếm. */
  kit.tag = (text, x, y, o = {}) => {
    const h = 4.8
    const tw = kit.trackedWidth(text)
    const w = tw + 5
    kit.fill(o.soft ?? C.white)
    kit.rrect(x, y, w, h, h / 2, 'F')
    kit.tracked(text, x + 2.5, y + 3.3, { color: o.color ?? B.brandDark })
    return w
  }

  /** Logo CLB trong ô size×size TRÊN BĂNG brandDark: logo trắng vẽ thẳng; logo màu → chip trắng; không logo → vòng tròn trắng + chữ cái đầu. */
  kit.logo = (x, y, size) => {
    const logo = branding.logo
    if (logo && logo.dataUrl) {
      try {
        const chip = !logo.onDark
        const pad = chip ? size * 0.12 : size * 0.04
        const box = size - pad * 2
        const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
        let iw = box
        let ih = box
        if (ratio > 1) ih = box / ratio
        else iw = box * ratio
        const f = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
        if (chip) { kit.fill(C.white); kit.rrect(x, y, size, size, 2, 'F') }
        doc.addImage(logo.dataUrl, f, x + pad + (box - iw) / 2, y + pad + (box - ih) / 2, iw, ih)
        return size
      } catch { /* ảnh hỏng → rơi về chữ cái đầu */ }
    }
    const nm = String(branding.name || 'PickleFund').trim().replace(/^(CLB|Câu lạc bộ)\s+/i, '')
    const ch = (Array.from(nm)[0] || 'P').toUpperCase()
    kit.fill(C.white)
    doc.circle(x + size / 2, y + size / 2, size / 2, 'F')
    kit.font('bold', size >= 10 ? T.type.h1 : T.type.body, B.brandDark)
    doc.text(ch, x + size / 2, y + size / 2 + (size >= 10 ? 2.1 : 1.1), { align: 'center' })
    return size
  }

  /** Băng màu ĐẶC bo góc (brandDark) + dải nhấn brand ở đáy (không gradient/bóng). Trả y đáy băng. */
  kit.solidBand = (y, h, strip) => {
    kit.fill(B.brand)
    kit.rrect(M, y, CW, h, 2.5, 'F')
    kit.fill(B.brandDark)
    kit.rrect(M, y, CW, h - strip, 2.5, 'F')
    doc.rect(M, y + h - strip - 3, CW, 3, 'F')
    return y + h
  }

  /**
   * MASTHEAD chuẩn = BĂNG MÀU ĐẶC bo góc (brandDark, chữ trắng): trang 1 cao 30mm; trang tiếp 16mm.
   * o = { club, title, subtitle, docCode, exportedText, right: string[], tag, first, section, number }
   * Trả y bắt đầu nội dung.
   */
  kit.masthead = (o) => {
    const club = o.club || branding.name || 'PickleFund'
    const white = C.white
    if (o.first !== false) {
      const h = 30
      kit.solidBand(M, h, 1.6)
      const logoS = 16
      kit.logo(M + 6, M + (h - 1.6 - logoS) / 2, logoS)
      kit.fill(B.brandDark)
      const textX = M + 6 + logoS + 5
      const rightW = 62
      const rightX = W - M - 7
      const lines = [o.docCode ? `Mã TL: ${o.docCode}` : '', o.exportedText ? `Xuất ${o.exportedText}` : '', ...(o.right || [])].filter(Boolean)
      let ry0 = M + 8.4
      if (o.number) {
        kit.font('bold', T.type.body, white)
        doc.text(kit.clip(o.number, rightW), rightX, ry0, { align: 'right' })
        ry0 += 4.8
      }
      kit.font('normal', T.type.caption, white)
      lines.slice(0, o.number ? 3 : 4).forEach((ln, i) => doc.text(kit.clip(ln, rightW), rightX, ry0 + i * 4.2, { align: 'right' }))
      const textMaxW = rightX - rightW - 4 - textX
      kit.tracked(club, textX, M + 8.6, { color: white, maxW: textMaxW })
      const tagW = o.tag ? kit.trackedWidth(o.tag) + 5 + 3 : 0
      kit.font('bold', T.type.h1, white)
      const titleTxt = kit.fit(o.title, textMaxW - tagW, T.type.h1, T.type.h2)
      doc.text(titleTxt, textX, M + 16.6)
      if (o.tag) {
        const tw = doc.getTextWidth(titleTxt)
        kit.tag(o.tag, textX + tw + 3, M + 16.6 - 4)
        kit.fill(B.brandDark)
      }
      if (o.subtitle) {
        kit.font('normal', T.type.body, white)
        doc.text(kit.clip(o.subtitle, textMaxW), textX, M + 23.2)
      }
      return M + h + 6
    }
    // trang tiếp: băng thấp hơn, đủ chỗ để nội dung KHÔNG dính chữ header
    const h = 16
    kit.solidBand(M, h, 1.2)
    kit.logo(M + 5, M + 2.2, 9)
    kit.fill(B.brandDark)
    const textX = M + 5 + 9 + 4
    const right = (o.right || [])[0]
    kit.tracked(club, textX, M + 5.4, { color: white, maxW: 90 })
    kit.font('bold', T.type.h2, white)
    const txt = `${o.title}${o.section ? ' · ' + o.section : ''} (tiếp)`
    doc.text(kit.clip(txt, W - M - 7 - textX - (right ? 40 : 0)), textX, M + 11.4)
    if (right) {
      kit.font('normal', T.type.caption, white)
      doc.text(kit.clip(right, 38), W - M - 7, M + 8, { align: 'right' })
    }
    return M + h + 6
  }

  /**
   * THẺ KPI: nhãn (7 hoa) / giá trị (14 bold, co ≥ 10) / chú thích (7). Cao 20 (có chú thích), 16 (không), 14 (compact).
   * Thẻ trắng viền border; thẻ nhấn nền brandSoft viền brandBorder, chữ brandDark.
   * tone: 'pos' xanh sinh động · 'neg' đỏ sinh động (số lớn đậm — dùng màu sinh động).
   */
  kit.kpiCard = ({ x, y, w, label, value, caption, tone, accent, compact }) => {
    const h = compact ? 14 : caption != null && caption !== '' ? 20 : 16
    kit.fill(accent ? B.brandSoft : C.white)
    kit.stroke(accent ? B.brandEdge : C.line)
    kit.lw(T.line.border)
    kit.rrect(x, y, w, h, T.radius.card, 'FD')
    kit.tracked(label, x + 4, y + 5.2, { color: accent ? B.brandDark : C.muted, maxW: w - 8 })
    const text = String(value ?? '')
    const vColor = tone === 'neg' || /^-\s*\d/.test(text) ? C.neg : tone === 'pos' ? C.pos : tone === 'warn' ? C.amber : accent || tone === 'brand' ? B.brandDark : C.ink
    kit.font('bold', compact ? T.type.h2 : T.type.kpi, vColor)
    const shown = kit.fit(text, w - 8, compact ? T.type.h2 : T.type.kpi, compact ? 8.5 : 10)
    doc.text(shown, x + 4, y + (compact ? 10.8 : 12.2))
    if (caption != null && caption !== '' && !compact) {
      kit.font('normal', T.type.caption, accent ? C.ink2 : C.muted)
      doc.text(kit.clip(caption, w - 8), x + 4, y + 17)
    }
    return h
  }

  /** Số thẻ / hàng lớn nhất (≤ max) mà mọi nhãn + giá trị còn vừa (không phải cắt). */
  kit.pickPerRow = (items, max = 4, gap = 4) => {
    const n = items.length
    for (let per = Math.min(n, max); per >= 2; per--) {
      const w = (CW - (per - 1) * gap) / per
      const ok = items.every((it) => {
        const lw = kit.trackedWidth(it.label)
        kit.font('bold', T.type.kpi)
        return lw <= w - 8 && doc.getTextWidth(String(it.value ?? '')) <= w - 8 - 2
      })
      if (ok) return per
    }
    return Math.min(n, 2) || 1
  }

  /** Vẽ lưới thẻ KPI (nhiều hàng nếu cần); thẻ ĐẦU là thẻ nhấn. Trả y sau lưới (+ khoảng cách `after`). */
  kit.kpiGrid = (items, y, o = {}) => {
    if (!items.length) return y
    const gap = 4
    const per = o.perRow ?? Math.max(kit.pickPerRow(items, o.max ?? 4, gap), 3)
    const w = (CW - (per - 1) * gap) / per
    let rowY = y
    let rowH = 0
    items.forEach((it, i) => {
      const col = i % per
      if (col === 0 && i > 0) { rowY += rowH + gap; rowH = 0 }
      const h = kit.kpiCard({ x: M + col * (w + gap), y: rowY, w, accent: o.accent !== false && i === 0, compact: o.compact, ...it })
      rowH = Math.max(rowH, h)
    })
    return rowY + rowH + (o.after ?? T.space.m)
  }

  /** Tiêu đề mục: CHỮ HOA đậm brandDark (h2 11) — trả y sau tiêu đề. */
  kit.sectionTitle = (text, y, o = {}) => {
    kit.font('bold', T.type.h2, o.color ?? B.brandDark)
    doc.text(kit.clip(String(text ?? '').toUpperCase(), CW), M, y + 3.5)
    return y + 7
  }

  /** Trạng thái rỗng chuẩn: header bảng vẫn có, 1 hàng cao 16 căn giữa + hairline. Trả y sau. */
  kit.emptyState = (y, text) => {
    kit.font('normal', T.type.body, C.muted)
    doc.text(kit.clip(text || EMPTY_TEXT, CW - 8), W / 2, y + 9.6, { align: 'center' })
    kit.hline(M, W - M, y + 16, C.line, T.line.hair)
    return y + 16
  }

  /**
   * Danh sách khoá–giá trị (hairline giữa các dòng, tối thiểu 8mm/dòng).
   * rows = [{ k, v, tone?: 'pos'|'neg'|'brand', bold?: bool, lines?: maxLines, total?: bool }]
   * Dòng total: nền brandSoft + viền brandBorder, nhãn brandDark.
   */
  kit.kvList = (rows, y, o = {}) => {
    const { B } = kit
    const x1 = M
    const x2 = W - M
    let yy = y
    rows.forEach((r) => {
      kit.font('normal', T.type.body, C.muted)
      const kw = Math.min(doc.getTextWidth(r.k) + 6, CW * 0.45)
      const vMax = x2 - x1 - kw - 2 - (r.total ? 6 : 0)
      const style = r.bold === false ? 'normal' : 'bold'
      const vSize = 9
      const color = r.tone === 'pos' ? kit.semText(C.pos, style === 'bold', vSize)
        : r.tone === 'neg' ? kit.semText(C.neg, style === 'bold', vSize)
          : r.tone === 'brand' || r.total ? B.brandDark : C.ink
      kit.font(style, vSize, color)
      const lines = kit.wrap(String(r.v ?? ''), vMax, r.lines ?? 3)
      const baseH = o.rowH ?? T.row.h
      const rowH = lines.length > 1 ? lines.length * 4.4 + 3.6 : baseH
      const pad = r.total ? 3 : 0
      if (r.total) {
        kit.fill(B.brandSoft)
        kit.stroke(B.brandEdge)
        kit.lw(T.line.border)
        kit.rrect(x1, yy, x2 - x1, rowH, T.radius.card, 'FD')
      }
      kit.font(r.total ? 'bold' : 'normal', T.type.body, r.total ? B.brandDark : C.muted)
      doc.text(r.k, x1 + pad, yy + rowH / 2 + (lines.length > 1 ? -((lines.length - 1) * 4.4) / 2 : 0) + 1.5)
      kit.font(style, vSize, color)
      lines.forEach((ln, li) => doc.text(ln, x2 - pad, yy + rowH / 2 + 1.5 - ((lines.length - 1) * 4.4) / 2 + li * 4.4, { align: 'right' }))
      yy += rowH
      if (!o.noRule && !r.total) kit.hline(x1, x2, yy, C.lineSoft, T.line.hair)
    })
    return yy
  }

  /** Khối số tiền HERO: thẻ nhấn brandSoft (nhãn brandDark / số display 22 đậm xanh|đỏ|brandDark / chú thích) + chip trạng thái. Trả y sau. */
  kit.hero = ({ y, label, value, caption, tone, status }) => {
    const h = 25
    kit.fill(B.brandSoft)
    kit.stroke(B.brandEdge)
    kit.lw(T.line.border)
    kit.rrect(M, y, CW, h, T.radius.card + 1, 'FD')
    kit.tracked(label, M + 5, y + 6.2, { color: B.brandDark })
    const color = tone === 'neg' ? C.neg : tone === 'ink' ? C.ink : tone === 'brand' ? B.brandDark : C.pos
    kit.font('bold', T.type.display, color)
    const shown = kit.fit(value, CW * 0.6, T.type.display, T.type.h1)
    doc.text(shown, M + 5, y + 16.4)
    if (caption) {
      kit.font('normal', T.type.caption, C.ink2)
      doc.text(kit.clip(caption, CW * 0.6), M + 5, y + 21.4)
    }
    if (status) {
      kit.font('bold', T.type.body, C.ink)
      const sw = doc.getTextWidth(status.text)
      const isNeg = status.dot === C.negFill
      const isWarn = status.dot === C.warnFill
      const tint = isNeg ? C.negTint : isWarn ? C.warnTint : C.posTint
      const edge = isNeg ? C.negEdge : isWarn ? C.warnEdge : C.posEdge
      const bw = sw + 9
      kit.fill(tint)
      kit.stroke(edge)
      kit.lw(T.line.border)
      kit.rrect(W - M - 5 - bw, y + 8.2, bw, 7, 3.5, 'FD')
      kit.fill(status.dot)
      doc.circle(W - M - 5 - bw + 3.4, y + 11.7, 1, 'F')
      kit.font('bold', T.type.body, isNeg ? C.negText : isWarn ? C.warn : C.posText)
      doc.text(status.text, W - M - 5 - 2.6, y + 12.9, { align: 'right' })
    }
    return y + h + T.space.m
  }

  /**
   * Khối chữ ký 2–3 cột, ô ký 24mm. items = [{ title, name, sub }]. Trả y sau khối.
   */
  kit.signatures = (items, y) => {
    const n = items.length
    const colW = CW / n
    let maxLines = 1
    items.forEach((it, i) => {
      const cx = M + colW * (i + 0.5)
      kit.tracked(it.title, cx, y + 3, { color: B.brandDark, align: 'center', maxW: colW - 8 })
      const ly = y + 3 + 24
      kit.stroke(C.lineStrong)
      kit.lw(T.line.border)
      doc.setLineDashPattern([1.4, 1.4], 0)
      doc.line(cx - Math.min(28, colW / 2 - 6), ly, cx + Math.min(28, colW / 2 - 6), ly)
      doc.setLineDashPattern([], 0)
      kit.font('normal', T.type.body, C.ink)
      const nl = kit.wrap(it.name || '', colW - 14, 2)
      maxLines = Math.max(maxLines, nl.length)
      nl.forEach((ln, li) => doc.text(ln, cx, ly + 5 + li * 4, { align: 'center' }))
      if (it.sub) {
        kit.font('normal', T.type.caption, C.muted)
        doc.text(kit.clip(it.sub, colW - 10), cx, ly + 5 + nl.length * 4 + 0.6, { align: 'center' })
      }
    })
    return y + 3 + 24 + 5 + maxLines * 4 + 6
  }

  return kit
}

/** FOOTER mọi trang (gọi 1 lần cuối): "CLB · Tên TL · Mã TL" trái, "Trang x / y" phải. */
export function drawFooterAll(kit, { club, title, docCode }) {
  const { doc, T, C, M, W, H, CW } = kit
  const total = doc.getNumberOfPages()
  const branding = kit.branding || {}
  // Tiền tố: dòng footer CLB tự đặt (địa chỉ/SĐT) + tên CLB nếu footer chưa chứa tên đó. Không lặp "A · A".
  let prefix = String(branding.footer || '').trim()
  const nm = String(club || branding.name || '').trim()
  if (!prefix) prefix = nm
  else if (nm && !prefix.includes(nm)) prefix = `${nm} · ${prefix}`
  const fixed = ` · ${title} · ${docCode}`
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    kit.hline(M, W - M, H - T.page.footerLine, C.line, T.line.hair)
    kit.font('normal', T.type.caption, C.muted)
    const pageTxt = `Trang ${p} / ${total}`
    const pageW = doc.getTextWidth(pageTxt)
    const fixedW = doc.getTextWidth(fixed)
    const pre = kit.clip(prefix, Math.max(20, CW - pageW - fixedW - 6))
    doc.text(kit.clip(pre + fixed, CW - pageW - 4), M, H - T.page.footerText)
    doc.text(pageTxt, W - M, H - T.page.footerText, { align: 'right' })
  }
}

/** Chuẩn hoá bề rộng cột về đúng CW của kit (tránh bảng lệch lề khi caller cộng sai). */
export function normalizeCols(kit, rawColumns) {
  const sumW = rawColumns.reduce((s, c) => s + c.w, 0)
  const scale = sumW > 0 && Math.abs(sumW - kit.CW) > 0.5 ? kit.CW / sumW : 1
  return rawColumns.map((c) => ({ ...c, w: c.w * scale }))
}

/**
 * ENGINE BẢNG "sinh động" — header nền brandMid ĐẶC chữ trắng đậm, thân zebra nhạt, số căn phải,
 * trạng thái = chip nền nhạt (xanh/đỏ/amber) chữ đậm, số âm đỏ / dương xanh, hàng nhóm, HÀNG TỔNG
 * (nền brandSoft viền brandBorder, nhãn brandDark), empty-state, tự phân trang (lặp header).
 *
 * o = { columns, rows, y, onNewPage: () => y, footerRows?, emptyText?, top3?, zebra?, rowH? }
 *  - column: { key, label, w, align, tone?, bold?, wrap? }
 *    tone: win|pos · loss|neg · warn · info · points (brandDark đậm) · brand · muted · ink2 · sign · status (chip)
 *  - row: { [key]: string|number | { t, tone?, bold?, dot? } }  · dòng nhóm: { __section, __sectionRight? }
 *    key 'rank' tự đánh số nếu row không có giá trị
 *  - footerRow: { [key]: ..., __label?: string, __span?: số cột đầu gộp cho nhãn }
 * Chữ màu SINH ĐỘNG luôn ĐẬM ≥ 8.5pt; nếu buộc phải co nhỏ hơn thì tự đổi sang bản AA.
 * Trả { y, dataNo }.
 */
export function drawTable(kit, o) {
  const { doc, T, C, B, M, W, CW } = kit
  const columns = o.columns
  const padX = T.row.padX
  const ROW_H = o.rowH ?? T.row.h
  const LH = T.row.lineH
  const MAX_LINES = 3
  const colX = []
  { let cx = M; for (const c of columns) { colX.push(cx); cx += c.w } }
  const padOf = (c) => (c.key === 'idx' || c.key === 'rank' ? 2 : padX)
  const cellX = (i) => {
    const c = columns[i]
    if (c.align === 'right') return colX[i] + c.w - padOf(c)
    if (c.align === 'center') return colX[i] + c.w / 2
    return colX[i] + padOf(c)
  }
  let y = o.y
  const bottom = o.bottom ?? kit.bottom
  const CHIP_PAD = 3

  /* ── header: nền brandMid đặc, chữ trắng đậm ── */
  const headLines = (c) => {
    const lbl = String(c.label ?? '').toUpperCase()
    const maxW = c.w - 2 * padX + 1
    const tw = kit.trackedWidth(lbl)
    if (tw <= maxW || !/\s/.test(lbl)) return [lbl]
    kit.font('bold', T.type.label)
    return kit.wrap(lbl, maxW - lbl.length * 0.12, 2)
  }
  const drawHead = (yy) => {
    const lines = columns.map(headLines)
    const n = Math.max(...lines.map((l) => l.length))
    const h = n > 1 ? 11 : ROW_H + 1
    kit.fill(B.brandMid)
    kit.rrect(M, yy, CW, h, 1.5, 'F')
    columns.forEach((c, i) => {
      lines[i].forEach((ln, li) => {
        const by = yy + (n > 1 ? 4.6 + li * 3.4 : 5.5)
        kit.tracked(ln, cellX(i), by, { color: C.white, align: c.align, maxW: c.w - 1 })
      })
    })
    return yy + h
  }

  /* ── cell style / layout ── */
  const kindOfDot = (dot) => (dot === C.posFill ? 'pos' : dot === C.negFill ? 'neg' : dot === C.warnFill ? 'warn' : null)
  const KIND = {
    pos: { color: C.pos, tint: C.posTint, edge: C.posEdge },
    neg: { color: C.neg, tint: C.negTint, edge: C.negEdge },
    warn: { color: C.warn, tint: C.warnTint, edge: C.warnEdge },
    muted: { color: C.ink2, tint: C.lineSoft, edge: C.line },
  }
  const specOf = (raw) => (raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw, t: String(raw.t ?? '') } : { t: String(raw ?? '') })
  const styleOf = (c, spec, idx, isTotal) => {
    const tone = spec.tone ?? c.tone
    let bold = !!(c.bold || spec.bold || isTotal)
    let color = C.ink
    let chip = null
    let big = false
    const vivid = (col) => { color = col; bold = true; big = true }
    switch (tone) {
      case 'win': case 'pos': vivid(C.pos); break
      case 'loss': case 'neg': vivid(C.neg); break
      case 'warn': vivid(C.amber); break
      case 'info': vivid(C.cyan); break
      case 'points': case 'brand': color = B.brandDark; bold = true; break
      case 'muted': color = C.muted; break
      case 'ink2': color = C.ink2; break
      case 'sign': {
        const t = String(spec.t)
        if (t.startsWith('-')) vivid(C.neg)
        else if (t.startsWith('+')) vivid(C.pos)
        else color = C.ink2
        break
      }
      case 'status': {
        const k = kindOfDot(spec.dot) || statusKind(spec.t)
        chip = KIND[k]
        color = chip.color
        bold = true
        big = true
        break
      }
      default:
        if (c.align === 'right' && /^-\s*\d/.test(spec.t)) vivid(C.neg)
    }
    if ((c.key === 'rank' || c.key === 'idx') && !isTotal) {
      if (o.top3 && c.key === 'rank' && idx != null && idx < 3) { color = B.brandDark; bold = true }
      else { color = C.muted; bold = false }
      chip = null
      big = false
    }
    const size = big ? T.type.body : T.type.cell
    return { color, style: bold ? 'bold' : 'normal', size, chip }
  }
  const layout = (valueOf, idx, isTotal) => {
    let maxLines = 1
    const cells = columns.map((c, i) => {
      const spec = specOf(valueOf(c, i))
      const sty = styleOf(c, spec, idx, isTotal)
      kit.font(sty.style, sty.size, sty.color)
      const chipW = sty.chip ? 1 : 0
      const maxW = sty.chip ? c.w - 2 * CHIP_PAD - 2 : c.w - 2 * padOf(c)
      const wrapOk = c.wrap !== undefined ? c.wrap : c.align !== 'right' && c.key !== 'rank' && c.key !== 'idx' && !sty.chip
      let lines
      let size = sty.size
      if (doc.getTextWidth(spec.t) <= maxW) lines = [spec.t]
      else if (wrapOk && /\s/.test(spec.t)) lines = kit.wrap(spec.t, maxW, MAX_LINES)
      else {
        lines = [kit.fit(spec.t, maxW, sty.size, MIN_PT)]
        size = doc.getFontSize()
        // Cột hẹp (vd ngày dd/MM/yyyy): trước khi cắt "…" thử dùng cả bề rộng cột trừ lề tối thiểu.
        if (lines[0].endsWith('…')) {
          const wide = c.w - 2 - (sty.chip ? 2 * CHIP_PAD : 0)
          const t2 = kit.fit(spec.t, wide, sty.size, MIN_PT)
          if (!t2.endsWith('…')) { lines = [t2]; size = doc.getFontSize() }
        }
      }
      if (lines.length > maxLines) maxLines = lines.length
      // chữ sinh động bị co dưới 8.5pt → đổi sang bản AA
      const color = kit.semText(sty.color, sty.style === 'bold', size)
      return { c, lines, sty: { ...sty, color, size }, chipW }
    })
    return { cells, rowH: maxLines > 1 ? Math.max(ROW_H, maxLines * LH + 3.6) : ROW_H }
  }
  const drawCells = (cells, yy, rowH, skipFrom = 0) => {
    const midY = yy + rowH / 2 + 1.5
    cells.forEach(({ c, lines, sty, chipW }, i) => {
      if (i < skipFrom) return
      kit.font(sty.style, sty.size, sty.color)
      const n = lines.length
      const textW = Math.max(...lines.map((l) => doc.getTextWidth(l)))
      const base = cellX(i)
      if (sty.chip && n === 1) {
        const bw = textW + CHIP_PAD * 2
        const bxx = c.align === 'right' ? base - bw + 0.5 : c.align === 'center' ? base - bw / 2 : base - 0.5
        kit.fill(sty.chip.tint)
        kit.stroke(sty.chip.edge)
        kit.lw(T.line.hair)
        kit.rrect(bxx, midY - 4.1, bw, 5.8, 2.9, 'FD')
        kit.font(sty.style, sty.size, sty.color)
        doc.text(lines[0], bxx + CHIP_PAD, midY, { align: 'left' })
        return
      }
      lines.forEach((ln, li) => doc.text(ln, base, midY - ((n - 1) * LH) / 2 + li * LH, { align: c.align }))
    })
  }

  y = drawHead(y)
  const newPage = () => { y = drawHead(o.onNewPage()) }

  let dataNo = 0
  const dataCount = o.rows.filter((r) => !(r && r.__section !== undefined && r.__section !== null)).length
  const zebra = o.zebra ?? dataCount > 1
  const TOP_TINT = [C.goldTint, C.silverTint, C.bronzeTint]

  o.rows.forEach((r) => {
    if (y + ROW_H > bottom) newPage()
    const isSection = r && r.__section !== undefined && r.__section !== null
    if (isSection) {
      // Nhóm: nền brandSoft + vạch trái 1mm brand; nhãn dài/ghi chú phải tự xuống dòng (không cắt "…").
      const rightTxt = r.__sectionRight != null ? String(r.__sectionRight) : ''
      kit.font('normal', T.type.caption)
      const rightW = rightTxt ? Math.min(doc.getTextWidth(rightTxt), CW * 0.55) : 0
      kit.font('bold', T.type.cell)
      const leftMax = CW - 8 - (rightW ? rightW + 4 : 0)
      const leftLines = kit.wrap(String(r.__section), leftMax, 2)
      kit.font('normal', T.type.caption)
      const rightLines = rightTxt ? kit.wrap(rightTxt, rightW + 0.5, 2) : []
      const n = Math.max(leftLines.length, rightLines.length, 1)
      const h = n > 1 ? Math.max(ROW_H, n * LH + 3.6) : ROW_H
      if (y + h > bottom) newPage()
      kit.fill(B.brandSoft)
      doc.rect(M, y, CW, h, 'F')
      kit.fill(B.brand)
      doc.rect(M, y, 1.2, h, 'F')
      kit.hline(M, W - M, y + h, B.brandEdge, T.line.hair)
      const midY = y + h / 2 + 1.5
      kit.font('bold', T.type.cell, B.brandDark)
      leftLines.forEach((ln, li) => doc.text(ln, M + 4, midY - ((leftLines.length - 1) * LH) / 2 + li * LH))
      kit.font('normal', T.type.caption, C.ink2)
      rightLines.forEach((ln, li) => doc.text(ln, W - M - 3, midY - ((rightLines.length - 1) * LH) / 2 + li * LH, { align: 'right' }))
      y += h
      return
    }
    const idx = dataNo
    dataNo++
    const { cells, rowH } = layout((c) => (c.key === 'rank' && r[c.key] === undefined ? String(idx + 1) : r[c.key]), idx, false)
    if (y + rowH > bottom) newPage()
    if (o.top3 && idx < 3) { kit.fill(TOP_TINT[idx]); doc.rect(M, y, CW, rowH, 'F') }
    else if (zebra && idx % 2 === 1) { kit.fill(C.surface2); doc.rect(M, y, CW, rowH, 'F') }
    kit.hline(M, W - M, y + rowH, C.lineSoft, T.line.hair)
    drawCells(cells, y, rowH)
    y += rowH
  })

  if (dataNo === 0) {
    if (y + 16 > bottom) newPage()
    y = kit.emptyState(y, o.emptyText)
  }

  /* ── hàng tổng (một hoặc nhiều): thanh brandSoft viền brandBorder bo góc ── */
  const foots = o.footerRows || []
  if (foots.length) y += 1.5
  foots.forEach((fr) => {
    const span = fr.__label ? Math.max(1, fr.__span ?? 1) : 0
    const { cells, rowH } = layout((c, i) => {
      if (span && i < span) return i === 0 ? fr.__label : ''
      return c.key === 'rank' || c.key === 'idx' ? '' : fr[c.key] ?? ''
    }, null, true)
    // Nhãn gộp nhiều cột: dựng lại các dòng theo bề rộng gộp
    let h = rowH + 1.5
    let li0 = 0 // cột chứa nhãn tổng (brandDark đậm)
    if (span) {
      kit.font('bold', T.type.cell, B.brandDark)
      const spanW = columns.slice(0, span).reduce((s, c) => s + c.w, 0) - 2 * padX
      const ll = kit.wrap(String(fr.__label), spanW, 2)
      cells[0].lines = ll
      cells[0].c = { ...cells[0].c, w: spanW + 2 * padX, align: 'left' }
      cells[0].sty = { ...cells[0].sty, size: T.type.cell, color: B.brandDark, style: 'bold' }
      const n = Math.max(ll.length, ...cells.slice(span).map((x) => x.lines.length))
      h = Math.max(ROW_H, n * LH + 3.6) + (n > 1 ? 0 : 2)
    } else {
      // không có __label: ô đầu tiên có chữ là nhãn
      li0 = cells.findIndex((x) => x.lines.some((l) => String(l).trim() !== ''))
      if (li0 >= 0 && cells[li0].c.align !== 'right') cells[li0].sty = { ...cells[li0].sty, color: B.brandDark, style: 'bold' }
      h += 1
    }
    if (y + h > bottom) newPage()
    kit.fill(B.brandSoft)
    kit.stroke(B.brandEdge)
    kit.lw(T.line.border)
    kit.rrect(M, y, CW, h, T.radius.card, 'FD')
    drawCells(cells, y, h)
    y += h + 1.5
  })

  return { y: foots.length ? y - 1.5 : y, dataNo }
}

/** Đoạn ghi chú caption (7pt muted), xuống dòng + sang trang khi hết chỗ (không bỏ mất). */
export function drawNote(kit, text, y, onNewPage) {
  const note = String(text || '').trim()
  if (!note) return y
  const { doc, T, C, M } = kit
  y += T.space.s
  kit.font('normal', T.type.caption, C.muted)
  const lines = kit.wrap(note, kit.CW, 8)
  lines.forEach((ln) => {
    if (y + 3.6 > kit.bottom) y = onNewPage()
    kit.font('normal', T.type.caption, C.muted)
    doc.text(ln, M, y)
    y += 3.6
  })
  return y
}

export { fmt }

/* ── Tên hàm theo spec (mỏng, gọi qua kit) ── */
export const drawMasthead = (kit, opts) => kit.masthead(opts)
export const drawKpiCard = (kit, opts) => kit.kpiCard(opts)
export const drawSignatureBlock = (kit, items, y) => kit.signatures(items, y)
export const drawEmptyState = (kit, y, text) => kit.emptyState(y, text)
