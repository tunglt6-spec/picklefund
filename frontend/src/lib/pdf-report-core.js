/**
 * MẪU BÁO CÁO QUỸ CHUẨN (dùng chung mọi CLB) — PDF VECTOR thuần jsPDF.
 *
 * KHÔNG dùng html2canvas (chụp DOM): cách đó phụ thuộc renderer từng máy, đã gây
 * 3 kiểu lỗi khác nhau (cắt dòng / trôi số / giãn thẻ méo chữ). Ở đây mọi phần tử
 * được VẼ bằng toạ độ mm cố định → mọi máy, mọi lần xuất cho ra pixel GIỐNG HỆT.
 *
 * File là JS thuần (ESM + JSDoc) để tái dùng được cả trong app (export.ts import)
 * lẫn harness Node kiểm chứng ngoài trình duyệt.
 *
 * Font: Be Vietnam Pro (OFL) — đủ glyph tiếng Việt, nhúng thẳng vào PDF.
 */

/* ── Bảng màu thương hiệu (đồng bộ token --pf-primary của app) ── */
const C = {
  indigo: [109, 93, 251], // #6D5DFB
  indigoDark: [79, 70, 229], // #4F46E5
  indigoSoft: [238, 242, 255], // #EEF2FF
  indigoBorder: [199, 210, 254], // #C7D2FE
  badgeOnIndigo: [152, 140, 252], // pill trên nền indigo
  border: [226, 232, 240], // #E2E8F0
  zebra: [248, 250, 252], // #F8FAFC
  lineSoft: [241, 245, 249], // #F1F5F9
  textDark: [30, 41, 59], // #1E293B
  gray: [100, 116, 139], // #64748B
  grayLight: [148, 163, 184], // #94A3B8
  green: [22, 163, 74], // #16A34A
  greenBg: [240, 253, 244],
  greenBorder: [187, 247, 208],
  red: [239, 68, 68], // #EF4444
  redDark: [220, 38, 38],
  redBg: [254, 242, 242],
  redBorder: [254, 202, 202],
  orange: [234, 88, 12], // #EA580C
  cyan: [8, 145, 178], // #0891B2
  amber: [217, 119, 6], // #D97706 (chờ duyệt)
  white: [255, 255, 255],
}

/* ── Khổ giấy & lề (mm) ── */
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 12
const CONTENT_W = PAGE_W - MARGIN * 2 // 186

/** Định dạng tiền deterministic: 1234567 → "1.234.567 đ" (không phụ thuộc ICU). */
function vnd(n) {
  const r = Math.round(Number(n) || 0)
  const s = String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (r < 0 ? '-' : '') + s + ' đ'
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

/* ═══════════ Tiện ích dùng chung cho mọi builder ═══════════ */

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
function cleanPdfText(doc, input) {
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

/** Nhúng font Việt + bọc text/getTextWidth/splitTextToSize qua bộ lọc glyph (mọi chuỗi vẽ ra đều sạch). */
function setupDoc(doc, fonts) {
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
  return doc
}

/** Cắt chữ kèm "…" khi vượt bề rộng cho phép (theo font đang set). */
function clipTo(doc, text, maxW) {
  let t = String(text ?? '')
  if (doc.getTextWidth(t) <= maxW) return t
  while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
  return t + '…'
}

/** Xuống dòng theo bề rộng (font đang set), tối đa `maxLines` dòng; dòng cuối thêm "…" nếu còn dư. */
function wrapTo(doc, text, maxW, maxLines = 3) {
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
function fitText(doc, text, maxW, size, minSize) {
  let s = size
  doc.setFontSize(s)
  while (s > minSize && doc.getTextWidth(String(text ?? '')) > maxW) {
    s -= 0.5
    doc.setFontSize(s)
  }
  return clipTo(doc, text, maxW)
}

const LINE_H = 3.4 // chiều cao 1 dòng khi cell xuống dòng (cỡ chữ ~7-8pt)

export function buildQuyReportPDF({ jsPDF, fonts, summary, rows, expenseRows = [], branding }) {
  const doc = setupDoc(new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }), fonts)

  /* ── helpers vẽ ── */
  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  const clip = (text, maxW) => clipTo(doc, text, maxW)
  const wrap = (text, maxW, maxLines) => wrapTo(doc, text, maxW, maxLines)
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)

  /* Logo CLB (tùy chọn): chip trắng bo góc + ảnh fit-contain, đặt bên trái header.
     branding.logo = { dataUrl, w, h } (w/h = kích thước gốc để giữ tỉ lệ). */
  const drawLogoChip = (x, y, size) => {
    const logo = branding.logo
    if (!logo || !logo.dataUrl) return 0
    try {
      // KHÔNG nền trắng: logo (con-quay trắng) đặt thẳng trên band màu brand.
      const pad = 0.4
      const box = size - pad * 2
      const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
      let iw = box
      let ih = box
      if (ratio > 1) ih = box / ratio
      else iw = box * ratio
      const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
      doc.addImage(logo.dataUrl, fmt, x + pad + (box - iw) / 2, y + pad + (box - ih) / 2, iw, ih)
      return size // bề rộng đã chiếm → chữ dịch phải
    } catch {
      return 0 // ảnh hỏng/không hỗ trợ → bỏ logo, header vẫn nguyên vẹn
    }
  }

  /* Header band của MỌI trang (đậm trang 1, gọn trang bill) */
  const drawHeader = (title, subRight1, subRight2, big) => {
    const h = big ? 30 : 18
    setFill(C.indigoDark)
    rrect(MARGIN, MARGIN, CONTENT_W, h, 2.5, 'F')
    // dải nhấn brand sáng hơn ở đáy band
    setFill(C.indigo)
    doc.rect(MARGIN, MARGIN + h - 1.6, CONTENT_W, 1.6, 'F')
    // logo CLB (nếu có) — chip vuông giữa band, chữ dịch sang phải
    const logoSize = big ? 18 : 11
    const logoW = drawLogoChip(MARGIN + 6, MARGIN + (h - logoSize) / 2 - 0.8, logoSize)
    const textX = MARGIN + 7 + (logoW ? logoW + 4 : 0)
    const rightEdge = PAGE_W - MARGIN - 7
    font('bold', big ? 7 : 6.5, C.white)
    doc.setTextColor(255, 255, 255)
    // brand nhỏ phía trên
    doc.text(clip((branding.name || 'PickleFund').toUpperCase(), 80), textX, MARGIN + (big ? 8 : 6.5))
    font('bold', big ? 16.5 : 12, C.white)
    doc.text(clip(title, rightEdge - textX - (big ? 0 : 62)), textX, MARGIN + (big ? 16.5 : 12.5))
    font('normal', big ? 9 : 7.5, C.white)
    doc.text(clip(`${summary.clubName} · ${summary.periodName}`, rightEdge - textX - (big ? 0 : 62)), textX, MARGIN + (big ? 23.5 : 16))
    font('normal', 7.5, C.white)
    if (subRight1) doc.text(clip(subRight1, 60), rightEdge, MARGIN + (big ? 10 : 8), { align: 'right' })
    if (subRight2) doc.text(clip(subRight2, 60), rightEdge, MARGIN + (big ? 15 : 12.5), { align: 'right' })
    return MARGIN + h
  }

  const drawFooter = (pageNo, totalPages) => {
    const y = PAGE_H - MARGIN - 4
    setDraw(C.lineSoft)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3)
    font('normal', 6.5, C.grayLight)
    doc.text(clip(`${branding.footer || 'PickleFund'} · ${summary.clubName} · Xuất lúc ${summary.exportedAtText}`, CONTENT_W - 25), MARGIN, y)
    doc.text(`Trang ${pageNo} / ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' })
  }

  /* ═══════════ TRANG 1 — BÁO CÁO TÀI CHÍNH ═══════════ */
  // Mẫu số "chưa đóng": có bảng thành viên → số dòng thật (tránh "77 / 40"); không → memberCount.
  const unpaidTotal = rows.length > 0 ? rows.length : summary.memberCount
  const unpaidCount = rows.length > 0
    ? rows.filter((r) => !r.contributionPaid).length
    : Math.max(0, summary.memberCount - summary.confirmedCount)
  const chiThuPct = pct(summary.totalExpense, summary.totalIncome)
  // Có dữ liệu "thẻ dashboard" (Reports truyền) → hiện thêm hàng thẻ LỚN quỹ + lưới chỉ số.
  const hasExtra = [
    summary.miniBalance, summary.carryForward,
    summary.totalAttendance, summary.activeMemberCount,
  ].some((v) => v != null)

  let y = drawHeader(
    'BÁO CÁO TÀI CHÍNH',
    `Xuất ngày ${summary.exportedDateText}`,
    `${summary.memberCount} thành viên · ${summary.sessionCount} buổi tập`,
    true,
  )
  y += 5

  /* KPI: Tổng thu / Tổng chi / Số dư */
  const kpiW = (CONTENT_W - 8) / 3
  const kpis = [
    { label: 'TỔNG THU', value: vnd(summary.totalIncome), sub: `${summary.confirmedCount}/${summary.memberCount} thành viên đóng`, color: C.green },
    { label: 'TỔNG CHI', value: vnd(summary.totalExpense), sub: `Tỷ lệ chi / thu: ${chiThuPct}%`, color: C.redDark },
    {
      // Khi có hàng "QUỸ CHÍNH" (thực có) bên dưới → đổi nhãn để KHÔNG lẫn: đây là kết quả THU−CHI của kỳ.
      label: hasExtra ? 'SỐ DƯ THU − CHI' : 'SỐ DƯ QUỸ', value: vnd(summary.balance),
      sub: hasExtra
        ? 'Thu − Chi trong kỳ'
        : (summary.balance < 0 ? 'Quỹ âm – cần bổ sung' : 'Quỹ còn dư'),
      color: summary.balance < 0 ? C.redDark : C.indigoDark, highlight: true,
    },
  ]
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (kpiW + 4)
    setFill(k.highlight ? C.indigoSoft : C.white)
    setDraw(k.highlight ? C.indigoBorder : C.border)
    doc.setLineWidth(0.35)
    rrect(x, y, kpiW, 22, 2, 'FD')
    font('bold', 7, k.highlight ? C.indigoDark : C.gray)
    doc.text(k.label, x + 5, y + 6.5)
    font('bold', 14, k.color)
    doc.text(clip(k.value, kpiW - 8), x + 5, y + 13.5)
    font('normal', 6.5, C.grayLight)
    doc.text(clip(k.sub, kpiW - 8), x + 5, y + 18.5)
  })
  y += 27

  /* Hàng thẻ LỚN thứ 2 — SỐ DƯ CÁC QUỸ (chỉ khi có dữ liệu dashboard). 4 thẻ:
     Quỹ Chính (thực có, gồm tồn đầu kỳ = clubAssets), Quỹ Phụ, Số dư chuyển kỳ, Tổng tài sản. */
  if (hasExtra) {
    const mainFund = summary.clubAssets != null
      ? Number(summary.clubAssets)
      : Number(summary.balance || 0) + Number(summary.carryForward || 0)
    const totalAssets = mainFund + Number(summary.miniBalance || 0)
    const fundW = (CONTENT_W - 12) / 4
    const fundCards = [
      { label: 'QUỸ CHÍNH', value: vnd(mainFund), sub: 'Số dư thực có (gồm tồn kỳ trước)', neg: mainFund < 0, hl: true },
      { label: 'QUỸ PHỤ', value: vnd(Number(summary.miniBalance || 0)), sub: 'Độc lập Quỹ Chính', neg: Number(summary.miniBalance || 0) < 0 },
      { label: 'SỐ DƯ CHUYỂN KỲ', value: vnd(Number(summary.carryForward || 0)), sub: 'Từ kỳ trước', neg: Number(summary.carryForward || 0) < 0 },
      { label: 'TỔNG TÀI SẢN', value: vnd(totalAssets), sub: 'Quỹ Chính + Quỹ Phụ', neg: totalAssets < 0 },
    ]
    fundCards.forEach((k, i) => {
      const x = MARGIN + i * (fundW + 4)
      setFill(k.hl ? C.indigoSoft : C.white)
      setDraw(k.hl ? C.indigoBorder : C.border)
      doc.setLineWidth(0.35)
      rrect(x, y, fundW, 22, 2, 'FD')
      font('bold', 6.5, k.hl ? C.indigoDark : C.gray)
      doc.text(clip(k.label, fundW - 7), x + 4, y + 6.5)
      font('bold', 11.5, k.neg ? C.redDark : (k.hl ? C.indigoDark : C.textDark))
      doc.text(clip(k.value, fundW - 7), x + 4, y + 13.5)
      font('normal', 6, C.grayLight)
      doc.text(clip(k.sub, fundW - 7), x + 4, y + 18.5)
    })
    y += 27
  }

  /* Thanh Tỷ lệ Chi/Thu */
  setFill(C.white)
  setDraw(C.border)
  rrect(MARGIN, y, CONTENT_W, 17, 2, 'FD')
  font('bold', 8, C.textDark)
  doc.text('Tỷ lệ Chi / Thu', MARGIN + 5, y + 5.5)
  const barX = MARGIN + 5
  const barW = CONTENT_W - 10
  setFill(C.lineSoft)
  rrect(barX, y + 7.5, barW, 2.6, 1.3, 'F')
  const fillW = Math.max(2.6, Math.min(barW, (barW * Math.min(chiThuPct, 100)) / 100))
  setFill(C.indigo)
  rrect(barX, y + 7.5, fillW, 2.6, 1.3, 'F')
  font('normal', 6.5, C.gray)
  doc.text(`Thu: ${vnd(summary.totalIncome)}`, barX, y + 14.5)
  doc.text(`Chi: ${vnd(summary.totalExpense)} (${chiThuPct}%)`, barX + barW, y + 14.5, { align: 'right' })
  y += 22

  /* Chỉ số nhanh (lưới 4 thẻ nhỏ / hàng). Khi có dữ liệu dashboard → 4 thẻ hoạt động/thành viên
     (các thẻ TIỀN đã lên hàng thẻ LỚN ở trên). Không có → giữ nguyên 4 thẻ như cũ. */
  const statW = (CONTENT_W - 12) / 4
  const nfmt = (n) => String(Math.round(Number(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  let statCards
  if (hasExtra) {
    statCards = [
      { label: 'Thành viên hoạt động', text: `${nfmt(summary.activeMemberCount ?? summary.memberCount)} người`, color: C.textDark },
      { label: 'Số buổi tập', text: `${summary.sessionCount} buổi`, color: C.textDark },
      { label: 'Tổng lượt điểm danh', text: `${nfmt(summary.totalAttendance)} lượt`, color: C.textDark },
      { label: 'Chưa đóng quỹ', text: `${unpaidCount} / ${unpaidTotal} người`, color: unpaidCount > 0 ? C.red : C.green },
    ]
  } else {
    statCards = [
      { label: 'Tổng thành viên', text: `${summary.memberCount} người`, color: C.textDark },
      { label: 'Số buổi tập', text: `${summary.sessionCount} buổi`, color: C.textDark },
      { label: 'Đã đóng quỹ', text: `${summary.confirmedCount} / ${summary.memberCount}`, color: C.green },
      { label: 'Chưa đóng quỹ', text: `${unpaidCount} người`, color: unpaidCount > 0 ? C.red : C.green },
    ]
  }
  statCards.forEach((s, i) => {
    const x = MARGIN + (i % 4) * (statW + 4)
    const yy = y + Math.floor(i / 4) * 17
    setFill(C.white)
    setDraw(C.border)
    doc.setLineWidth(0.35)
    rrect(x, yy, statW, 13, 2, 'FD')
    font('normal', 6.5, C.gray)
    doc.text(clip(s.label, statW - 8), x + 4, yy + 5)
    font('bold', 9.5, s.color)
    doc.text(clip(s.text, statW - 8), x + 4, yy + 10.5)
  })
  y += Math.ceil(statCards.length / 4) * 17 + 2

  /* Bảng chi tiết từng thành viên (tự phân trang, lặp header) */
  const COLS = [
    { key: 'idx', label: '#', w: 7, align: 'left' },
    { key: 'name', label: 'THÀNH VIÊN', w: 47, align: 'left' },
    { key: 'sess', label: 'BUỔI', w: 13, align: 'center' },
    { key: 'status', label: 'TRẠNG THÁI', w: 22, align: 'center' },
    { key: 'court', label: 'CHI PHÍ SÂN', w: 25, align: 'right' },
    { key: 'living', label: 'SINH HOẠT', w: 22, align: 'right' },
    { key: 'total', label: 'TỔNG CHI', w: 25, align: 'right' },
    { key: 'bal', label: 'SỐ DƯ', w: 25, align: 'right' },
  ]
  const ROW_H = 7.5
  const colX = []
  {
    let cx = MARGIN
    for (const c of COLS) { colX.push(cx); cx += c.w }
  }
  const cellX = (i) => {
    const c = COLS[i]
    if (c.align === 'right') return colX[i] + c.w - 3
    if (c.align === 'center') return colX[i] + c.w / 2
    return colX[i] + 3
  }

  const drawTableHeader = (yy) => {
    setFill(C.indigo)
    doc.rect(MARGIN, yy, CONTENT_W, 8, 'F')
    font('bold', 7, C.white)
    COLS.forEach((c, i) => doc.text(c.label, cellX(i), yy + 5.3, { align: c.align }))
    return yy + 8
  }

  if (rows.length > 0) {
    font('bold', 8.5, C.indigoDark)
    doc.text('CHI TIẾT TỪNG THÀNH VIÊN', MARGIN, y + 2)
    y += 5
    y = drawTableHeader(y)
    const bottomLimit = PAGE_H - MARGIN - 12
    rows.forEach((r, idx) => {
      // Tên dài xuống tối đa 2 dòng (không cắt cụt) → hàng cao hơn.
      font('bold', 8, C.textDark)
      const nameLines = wrap(r.memberName, COLS[1].w - 6, 2)
      const rowH = nameLines.length > 1 ? ROW_H + 3.4 : ROW_H
      if (y + rowH > bottomLimit) {
        doc.addPage()
        y = drawHeader('BÁO CÁO TÀI CHÍNH (tiếp)', `Xuất ngày ${summary.exportedDateText}`, '', false) + 5
        y = drawTableHeader(y)
      }
      if (idx % 2 === 1) {
        setFill(C.zebra)
        doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
      }
      setDraw(C.lineSoft)
      doc.setLineWidth(0.2)
      doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH)
      const midY = y + rowH / 2 + 1.6
      font('normal', 7, C.grayLight)
      doc.text(String(idx + 1), cellX(0), midY)
      font('bold', 8, C.textDark)
      nameLines.forEach((ln, li) => doc.text(ln, cellX(1), midY - ((nameLines.length - 1) * LINE_H) / 2 + li * LINE_H))
      font('bold', 7.5, C.indigoDark)
      doc.text(`${r.attendedSessions}/${r.totalSessions}`, cellX(2), midY, { align: 'center' })
      // Không dùng ký hiệu ✓/✗ — font Be Vietnam Pro không có glyph này.
      if (r.contributionPaid) {
        font('bold', 7, C.green)
        doc.text('Đã đóng', cellX(3), midY, { align: 'center' })
      } else {
        font('bold', 7, C.red)
        doc.text('Chưa đóng', cellX(3), midY, { align: 'center' })
      }
      font('normal', 7.5, C.textDark)
      doc.text(vnd(r.courtCost), cellX(4), midY, { align: 'right' })
      doc.text(vnd(r.livingCost), cellX(5), midY, { align: 'right' })
      font('bold', 7.5, C.textDark)
      doc.text(vnd(r.totalCost), cellX(6), midY, { align: 'right' })
      const nonNeg = Math.round(Number(r.balance) || 0) >= 0
      font('bold', 7.5, nonNeg ? C.green : C.red)
      doc.text((nonNeg ? '+' : '') + vnd(r.balance), cellX(7), midY, { align: 'right' })
      y += rowH
    })
  }

  /* ═══════════ TRANG KHOẢN CHI — danh sách các khoản chi trong kỳ ═══════════ */
  if (expenseRows.length > 0) {
    const ECOLS = [
      { key: 'idx',    label: '#',          w: 7,  align: 'left' },
      { key: 'date',   label: 'NGÀY',       w: 20, align: 'left' },
      { key: 'desc',   label: 'NỘI DUNG',   w: 54, align: 'left' },
      { key: 'fund',   label: 'NGUỒN',      w: 22, align: 'center' },
      { key: 'kind',   label: 'LOẠI',       w: 27, align: 'left' },
      { key: 'amount', label: 'SỐ TIỀN',    w: 28, align: 'right' },
      { key: 'status', label: 'TRẠNG THÁI', w: 28, align: 'center' },
    ]
    const eColX = []
    { let cx = MARGIN; for (const c of ECOLS) { eColX.push(cx); cx += c.w } }
    const eCellX = (i) => {
      const c = ECOLS[i]
      if (c.align === 'right') return eColX[i] + c.w - 3
      if (c.align === 'center') return eColX[i] + c.w / 2
      return eColX[i] + 3
    }
    const eHead = (yy) => {
      setFill(C.indigo)
      doc.rect(MARGIN, yy, CONTENT_W, 8, 'F')
      font('bold', 7, C.white)
      ECOLS.forEach((c, i) => doc.text(c.label, eCellX(i), yy + 5.3, { align: c.align }))
      return yy + 8
    }
    const stColor = (k) =>
      k === 'approved' || k === 'paid' ? C.green : k === 'rejected' ? C.red : C.grayLight

    doc.addPage()
    let ey = drawHeader(
      'BÁO CÁO TÀI CHÍNH — KHOẢN CHI',
      `Xuất ngày ${summary.exportedDateText}`,
      `${summary.clubName} · ${summary.periodName}`,
      false,
    ) + 5
    font('bold', 8.5, C.indigoDark)
    doc.text('DANH SÁCH KHOẢN CHI (Quỹ Chính & Quỹ Phụ)', MARGIN, ey + 2)
    ey += 5
    ey = eHead(ey)
    const eBottom = PAGE_H - MARGIN - 12
    const ROW_HE = 7.5
    let approvedCommon = 0
    let approvedMini = 0
    expenseRows.forEach((e, idx) => {
      // Nội dung khoản chi dài → xuống tối đa 3 dòng thay vì cắt "…".
      font('bold', 7.5, C.textDark)
      const descLines = wrap(e.description ?? '', ECOLS[2].w - 5, 3)
      const rowH = descLines.length > 1 ? Math.max(ROW_HE, descLines.length * LINE_H + 3.6) : ROW_HE
      if (ey + rowH > eBottom) {
        doc.addPage()
        ey = drawHeader('BÁO CÁO TÀI CHÍNH — KHOẢN CHI (tiếp)', `Xuất ngày ${summary.exportedDateText}`, '', false) + 5
        ey = eHead(ey)
      }
      if (idx % 2 === 1) {
        setFill(C.zebra)
        doc.rect(MARGIN, ey, CONTENT_W, rowH, 'F')
      }
      setDraw(C.lineSoft)
      doc.setLineWidth(0.2)
      doc.line(MARGIN, ey + rowH, PAGE_W - MARGIN, ey + rowH)
      const midY = ey + rowH / 2 + 1.6
      const isMini = e.fundKey === 'MINI'
      font('normal', 7, C.grayLight)
      doc.text(String(idx + 1), eCellX(0), midY)
      font('normal', 7.2, C.textDark)
      doc.text(clip(e.date ?? '', ECOLS[1].w - 4), eCellX(1), midY)
      font('bold', 7.5, C.textDark)
      descLines.forEach((ln, li) => doc.text(ln, eCellX(2), midY - ((descLines.length - 1) * LINE_H) / 2 + li * LINE_H))
      font('bold', 6.6, isMini ? C.cyan : C.indigo)
      doc.text(clip(e.fundLabel ?? (isMini ? 'Quỹ Phụ' : 'Quỹ Chính'), ECOLS[3].w - 3), eCellX(3), midY, { align: 'center' })
      font('normal', 7, C.gray)
      doc.text(clip(e.kindLabel ?? '', ECOLS[4].w - 4), eCellX(4), midY)
      font('bold', 7.5, C.redDark)
      doc.text(vnd(e.amount), eCellX(5), midY, { align: 'right' })
      font('bold', 6.6, stColor(e.statusKey))
      doc.text(clip(e.statusLabel ?? '', ECOLS[6].w - 3), eCellX(6), midY, { align: 'center' })
      if (e.statusKey === 'approved' || e.statusKey === 'paid') {
        if (isMini) approvedMini += e.amount
        else approvedCommon += e.amount
      }
      ey += rowH
    })
    /* Dòng tổng theo NGUỒN — Quỹ Chính khớp "Tổng chi kỳ"; Quỹ Phụ độc lập. Chỉ tính đã duyệt/đã chi. */
    const drawSum = (label, val) => {
      if (ey + 12 > eBottom) {
        doc.addPage()
        ey = drawHeader('BÁO CÁO TÀI CHÍNH — KHOẢN CHI (tiếp)', `Xuất ngày ${summary.exportedDateText}`, '', false) + 5
      }
      ey += 2.5
      setFill(C.indigoSoft)
      setDraw(C.indigoBorder)
      doc.setLineWidth(0.35)
      rrect(MARGIN, ey, CONTENT_W, 10, 2, 'FD')
      font('bold', 8, C.indigoDark)
      doc.text(label, MARGIN + 5, ey + 6.5)
      font('bold', 10.5, C.redDark)
      doc.text(vnd(val), PAGE_W - MARGIN - 5, ey + 6.7, { align: 'right' })
      ey += 10
    }
    const hasCommon = expenseRows.some((e) => e.fundKey !== 'MINI')
    const hasMini = expenseRows.some((e) => e.fundKey === 'MINI')
    if (hasCommon) drawSum('TỔNG CHI QUỸ CHÍNH (đã duyệt / đã chi)', approvedCommon)
    if (hasMini) drawSum('TỔNG CHI QUỸ PHỤ (đã duyệt / đã chi)', approvedMini)
  }

  /* ═══════════ TRANG BILL — 6 thẻ/trang (2 cột × 3 hàng), toạ độ CỐ ĐỊNH ═══════════ */
  const CARD_W = (CONTENT_W - 6) / 2 // 90
  const CARD_H = 76
  const CARD_GAP = 5

  const drawCard = (m, x, yy) => {
    const pos = Math.round(Number(m.balance) || 0) >= 0
    const rate = pct(m.attendedSessions, m.totalSessions)
    /* khung */
    setDraw(C.border)
    doc.setLineWidth(0.35)
    setFill(C.white)
    rrect(x, yy, CARD_W, CARD_H, 2.5, 'FD')
    /* header thẻ */
    setFill(C.indigo)
    rrect(x, yy, CARD_W, 15, 2.5, 'F')
    doc.rect(x, yy + 8, CARD_W, 7, 'F') // vuông hoá đáy header
    // Tên dài: co cỡ chữ (tối thiểu 7pt) trước khi cắt "…" để không mất tên thành viên.
    font('bold', 10, C.white)
    doc.text(fitText(doc, m.memberName, CARD_W - 40, 10, 7), x + 5, yy + 6.8)
    font('normal', 6.8, C.white)
    doc.text(`${m.attendedSessions}/${m.totalSessions} buổi tham gia`, x + 5, yy + 11.8)
    /* badge pill */
    const badgeTxt = m.contributionPaid ? 'Đã đóng quỹ' : 'Chưa đóng quỹ'
    font('bold', 6.2)
    const bw = doc.getTextWidth(badgeTxt) + 5
    setFill(C.badgeOnIndigo)
    rrect(x + CARD_W - 5 - bw, yy + 8.2, bw, 5, 2.5, 'F')
    setText(C.white)
    doc.text(badgeTxt, x + CARD_W - 5 - bw / 2, yy + 11.6, { align: 'center' })
    /* tỷ lệ tham gia */
    let cy = yy + 20.5
    font('bold', 6.3, C.gray)
    doc.text('TỶ LỆ THAM GIA', x + 5, cy)
    font('bold', 9.5, C.indigoDark)
    doc.text(`${m.attendedSessions} / ${m.totalSessions} buổi`, x + CARD_W - 5, cy + 0.6, { align: 'right' })
    cy += 2.6
    setFill(C.border)
    rrect(x + 5, cy, CARD_W - 10, 2, 1, 'F')
    setFill(C.indigo)
    rrect(x + 5, cy, Math.max(2, ((CARD_W - 10) * Math.min(rate, 100)) / 100), 2, 1, 'F')
    cy += 5.4
    font('normal', 6, C.grayLight)
    doc.text(`${rate}% số buổi trong kỳ`, x + CARD_W - 5, cy, { align: 'right' })
    cy += 3.2
    /* 4 dòng chi phí — mỗi dòng đúng 7mm, label trái / số phải.
       Nhãn đúng công thức backend: sân chia đều theo sĩ số; sinh hoạt = chia đều + theo buổi tham dự. */
    const lines = [
      { label: 'Đã nộp quỹ', note: '', val: vnd(m.amountPaid), color: C.green },
      { label: 'Chi phí sân', note: '(chia đều)', val: vnd(m.courtCost), color: C.indigo },
      { label: 'Sinh hoạt', note: '(chia đều + theo buổi)', val: vnd(m.livingCost), color: C.cyan },
      { label: 'Tổng chi phí', note: '', val: vnd(m.totalCost), color: C.orange, total: true },
    ]
    lines.forEach((ln) => {
      const rowMid = cy + 4.6
      if (ln.total) {
        setDraw(C.border)
        doc.setLineWidth(0.3)
        doc.setLineDashPattern([1.2, 1.2], 0)
        doc.line(x + 5, cy + 0.8, x + CARD_W - 5, cy + 0.8)
        doc.setLineDashPattern([], 0)
        font('bold', 7.8, C.textDark)
      } else {
        font('normal', 7.5, C.gray)
      }
      doc.text(ln.label, x + 5, rowMid)
      if (ln.note) {
        const lw = doc.getTextWidth(ln.label)
        font('normal', 6.2, C.grayLight)
        doc.text(' ' + ln.note, x + 5 + lw + 0.5, rowMid)
      }
      font('bold', 8.2, ln.color)
      doc.text(ln.val, x + CARD_W - 5, rowMid, { align: 'right' })
      if (!ln.total) {
        setDraw(C.lineSoft)
        doc.setLineWidth(0.2)
        doc.line(x + 5, cy + 7, x + CARD_W - 5, cy + 7)
      }
      cy += 7
    })
    /* ô số dư — âm: hiện SỐ TIỀN CẦN NỘP (dương), nhãn "Cần nộp thêm" đã nói rõ chiều */
    const boxY = cy + 1.2
    setFill(pos ? C.greenBg : C.redBg)
    setDraw(pos ? C.greenBorder : C.redBorder)
    doc.setLineWidth(0.35)
    rrect(x + 5, boxY, CARD_W - 10, 12.5, 2, 'FD')
    font('bold', 7.5, pos ? C.green : C.red)
    doc.text(pos ? 'Số dư của bạn' : 'Cần nộp thêm', x + 8, boxY + 5.2)
    font('normal', 6, C.grayLight)
    doc.text(pos ? 'Chuyển sang kỳ tiếp theo' : 'Vui lòng nộp bổ sung', x + 8, boxY + 9.4)
    font('bold', 12, pos ? C.green : C.red)
    doc.text(pos ? '+' + vnd(m.balance) : vnd(Math.abs(Number(m.balance) || 0)), x + CARD_W - 8, boxY + 8.2, { align: 'right' })
  }

  if (rows.length > 0) {
    const totalBillPages = Math.ceil(rows.length / 6)
    for (let pg = 0; pg < totalBillPages; pg++) {
      doc.addPage()
      const chunk = rows.slice(pg * 6, pg * 6 + 6)
      const top = drawHeader(
        'BILL CHI TIẾT THÀNH VIÊN',
        `Bill ${pg + 1} / ${totalBillPages}`,
        `${chunk.length} thành viên · Xuất ngày ${summary.exportedDateText}`,
        false,
      ) + 5
      chunk.forEach((m, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        drawCard(m, MARGIN + col * (CARD_W + 6), top + row * (CARD_H + CARD_GAP))
      })
    }
  }

  /* Footer + số trang cho toàn tài liệu */
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }

  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   BẢNG XẾP HẠNG GIẢI ĐẤU — vector, dùng chung mọi bộ môn (bóng đá/rổ/vợt/golf).
   meta = { clubName, tournamentName, sportLabel, formatLabel, exportedDateText, exportedAtText }
   columns = [{ key, label, w, align:'left'|'center'|'right', tone?, bold?, wrap? }]
     tone ∈ 'win'(xanh) | 'loss'(đỏ) | 'points'(tím đậm) | 'muted'(xám) | 'sign'(theo dấu +/-) | undefined
     wrap: true/false — xuống dòng (tăng chiều cao hàng) thay vì cắt "…" (mặc định: cột căn trái, trừ 'rank')
     Tổng bề rộng cột tự co/giãn về đúng 186mm.
   rows = [{ [key]: string|number }]   (key 'rank' tự đánh số thứ hạng)
   stats = [{ label, value }]  (dải chỉ số phía trên, tùy chọn)
   footerRow = { [key]: string|number }  (dòng tổng cuối bảng, tùy chọn)
═══════════════════════════════════════════════════════════════════ */
const RANK_TONE = { win: C.green, loss: C.red, points: C.indigoDark, muted: C.grayLight }

export function buildStandingsReportPDF({ jsPDF, fonts, meta, columns: rawColumns, rows, stats, branding, footerRow }) {
  const doc = setupDoc(new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }), fonts)

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const clip = (text, maxW) => clipTo(doc, text, maxW)
  const wrap = (text, maxW, maxLines) => wrapTo(doc, text, maxW, maxLines)

  // Chuẩn hoá bề rộng cột về đúng CONTENT_W (tránh bảng lệch lề khi caller cộng sai).
  const sumW = rawColumns.reduce((s, c) => s + c.w, 0)
  const scale = sumW > 0 && Math.abs(sumW - CONTENT_W) > 0.5 ? CONTENT_W / sumW : 1
  const columns = rawColumns.map((c) => ({ ...c, w: c.w * scale }))

  const drawHeader = (subtitle) => {
    const h = 26
    setFill(C.indigoDark)
    rrect(MARGIN, MARGIN, CONTENT_W, h, 2.5, 'F')
    setFill(C.indigo)
    doc.rect(MARGIN, MARGIN + h - 1.6, CONTENT_W, 1.6, 'F')
    let textX = MARGIN + 7
    const logo = branding.logo
    if (logo && logo.dataUrl) {
      try {
        // KHÔNG nền trắng: con-quay trắng đặt thẳng trên band màu.
        const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
        let iw = 15.4, ih = 15.4
        if (ratio > 1) ih = 15.4 / ratio
        else iw = 15.4 * ratio
        const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
        doc.addImage(logo.dataUrl, fmt, MARGIN + 6 + (15.4 - iw) / 2, MARGIN + 5 + (15.4 - ih) / 2, iw, ih)
        textX = MARGIN + 6 + 16 + 4
      } catch { /* bỏ logo nếu lỗi */ }
    }
    font('bold', 7, C.white)
    doc.text(clip((branding.name || 'PickleFund').toUpperCase(), 80), textX, MARGIN + 8)
    font('bold', 15, C.white)
    doc.text(clip(meta.title || 'BẢNG XẾP HẠNG', PAGE_W - MARGIN - 7 - textX - 55), textX, MARGIN + 15.5)
    font('normal', 8.5, C.white)
    // Ghép các phần KHÔNG rỗng bằng ' · ' — báo cáo không-giải-đấu (danh sách TV, sổ quỹ…) chỉ
    // truyền 1 phần, tránh treo ' · ' thừa ở đầu/cuối.
    const subLine = [meta.sportLabel, meta.tournamentName].filter((v) => v != null && String(v).trim() !== '').join(' · ')
    if (subLine) doc.text(clip(subLine, CONTENT_W - 60), textX, MARGIN + 21.5)
    font('normal', 7.5, C.white)
    doc.text(`Xuất ngày ${meta.exportedDateText}`, PAGE_W - MARGIN - 7, MARGIN + 10, { align: 'right' })
    if (subtitle) doc.text(clip(subtitle, 70), PAGE_W - MARGIN - 7, MARGIN + 15.5, { align: 'right' })
    return MARGIN + h
  }

  const drawFooter = (pageNo, totalPages) => {
    const y = PAGE_H - MARGIN - 4
    setDraw(C.lineSoft)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3)
    font('normal', 6.5, C.grayLight)
    doc.text(clip(`${branding.footer || 'PickleFund'} · ${meta.clubName} · Xuất lúc ${meta.exportedAtText}`, CONTENT_W - 25), MARGIN, y)
    doc.text(`Trang ${pageNo} / ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' })
  }

  let y = drawHeader(meta.formatLabel) + 5

  /* Dải chỉ số (tùy chọn) */
  const st = stats || []
  if (st.length > 0) {
    const sW = (CONTENT_W - (st.length - 1) * 4) / st.length
    st.forEach((s, i) => {
      const x = MARGIN + i * (sW + 4)
      setFill(i === 0 ? C.indigoSoft : C.white)
      setDraw(i === 0 ? C.indigoBorder : C.border)
      doc.setLineWidth(0.35)
      rrect(x, y, sW, 15, 2, 'FD')
      font('bold', 6, i === 0 ? C.indigoDark : C.gray)
      doc.text(clip(s.label, sW - 6), x + 3.5, y + 5.5)
      font('bold', 11, i === 0 ? C.indigoDark : C.textDark)
      doc.text(clip(String(s.value), sW - 6), x + 3.5, y + 11.5)
    })
    y += 20
  }

  /* Bảng BXH */
  const colX = []
  { let cx = MARGIN; for (const c of columns) { colX.push(cx); cx += c.w } }
  const cellX = (i) => {
    const c = columns[i]
    if (c.align === 'right') return colX[i] + c.w - 3
    if (c.align === 'center') return colX[i] + c.w / 2
    return colX[i] + 3
  }
  const ROW_H = 8
  const MAX_CELL_LINES = 3
  const drawHead = (yy) => {
    setFill(C.indigo)
    doc.rect(MARGIN, yy, CONTENT_W, 8, 'F')
    font('bold', 6.8, C.white)
    columns.forEach((c, i) => doc.text(clip(c.label, c.w - 2), cellX(i), yy + 5.3, { align: c.align }))
    return yy + 8
  }
  const doWrap = (c) => (c.wrap !== undefined ? c.wrap : c.align === 'left' && c.key !== 'rank')

  y = drawHead(y)
  const bottomLimit = PAGE_H - MARGIN - 12
  const newPage = () => {
    doc.addPage()
    y = drawHeader(meta.formatLabel) + 5
    y = drawHead(y)
  }
  // Dòng nhóm (section header): row có khóa `__section` → vẽ dải tiêu đề nhóm (vd theo Kỳ quỹ),
  // KHÔNG tính vào đánh số STT/zebra. `__sectionRight` (tùy chọn) hiện ở mép phải (vd tổng nhóm).
  let dataNo = 0 // đếm riêng cho dòng dữ liệu → STT + zebra bỏ qua dòng nhóm

  /* Style 1 ô theo cột (dùng chung cho dòng dữ liệu và dòng tổng). */
  const cellStyle = (c, val) => {
    let color = C.textDark
    let style = c.bold ? 'bold' : 'normal'
    if (c.tone === 'sign') { color = val.startsWith('-') ? C.red : (val.startsWith('+') ? C.green : C.gray) }
    else if (c.tone && RANK_TONE[c.tone]) { color = RANK_TONE[c.tone] }
    if (c.tone === 'points') style = 'bold'
    if (c.key === 'rank') color = C.grayLight
    return { color, style, size: c.key === 'name' ? 8 : 7.5 }
  }

  /* Chuẩn bị các dòng chữ của 1 hàng: cột wrap → nhiều dòng, còn lại 1 dòng (clip). */
  const layoutRow = (valueOf) => {
    let maxLines = 1
    const cells = columns.map((c) => {
      const val = valueOf(c)
      const sty = cellStyle(c, val)
      font(sty.style, sty.size, sty.color)
      const maxW = c.w - (c.align === 'left' ? 6 : 5)
      const lines = doWrap(c) ? wrap(val, maxW, MAX_CELL_LINES) : [clip(val, c.w - (c.align === 'left' ? 5 : 4))]
      if (lines.length > maxLines) maxLines = lines.length
      return { c, lines, sty }
    })
    return { cells, rowH: maxLines > 1 ? Math.max(ROW_H, maxLines * LINE_H + 3.6) : ROW_H }
  }
  const drawCells = (cells, yy, rowH) => {
    const midY = yy + rowH / 2 + 1.6
    cells.forEach(({ c, lines, sty }, i) => {
      font(sty.style, sty.size, sty.color)
      lines.forEach((ln, li) => doc.text(ln, cellX(i), midY - ((lines.length - 1) * LINE_H) / 2 + li * LINE_H, { align: c.align }))
    })
  }

  rows.forEach((r) => {
    const isSection = r && r.__section !== undefined && r.__section !== null
    if (y + ROW_H > bottomLimit) newPage()
    if (isSection) {
      setFill(C.indigoSoft)
      doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F')
      setDraw(C.indigoBorder)
      doc.setLineWidth(0.3)
      doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)
      const midY = y + ROW_H / 2 + 1.6
      font('bold', 7.5, C.indigoDark)
      doc.text(clip(String(r.__section), CONTENT_W - 62), MARGIN + 3, midY)
      if (r.__sectionRight != null && String(r.__sectionRight) !== '') {
        doc.text(clip(String(r.__sectionRight), 58), PAGE_W - MARGIN - 3, midY, { align: 'right' })
      }
      y += ROW_H
      return
    }
    const idx = dataNo
    dataNo++
    const { cells, rowH } = layoutRow((c) => (c.key === 'rank' ? String(idx + 1) : String(r[c.key] ?? '')))
    // Hàng nhiều dòng có thể không còn vừa trang → sang trang mới trước khi vẽ.
    if (y + rowH > bottomLimit) newPage()
    // Tô nhẹ 3 hạng đầu (tắt cho bảng không xếp hạng, vd Lịch); các dòng lẻ còn lại zebra.
    if (meta.highlightTop3 !== false && idx < 3) { setFill(C.greenBg); doc.rect(MARGIN, y, CONTENT_W, rowH, 'F') }
    else if (idx % 2 === 1) { setFill(C.zebra); doc.rect(MARGIN, y, CONTENT_W, rowH, 'F') }
    setDraw(C.lineSoft)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH)
    drawCells(cells, y, rowH)
    y += rowH
  })

  /* Bảng rỗng → thông điệp thay vì chỉ header trơ trọi */
  if (dataNo === 0) {
    if (y + 14 > bottomLimit) newPage()
    font('normal', 8.5, C.grayLight)
    doc.text(meta.emptyText || 'Không có dữ liệu', PAGE_W / 2, y + 9, { align: 'center' })
    setDraw(C.lineSoft)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + 14, PAGE_W - MARGIN, y + 14)
    y += 14
  }

  /* Dòng tổng cuối bảng (tùy chọn) */
  if (footerRow && typeof footerRow === 'object') {
    const { cells, rowH } = layoutRow((c) => (c.key === 'rank' ? '' : String(footerRow[c.key] ?? '')))
    const h = rowH + 1
    if (y + h > bottomLimit) newPage()
    setFill(C.indigoSoft)
    doc.rect(MARGIN, y, CONTENT_W, h, 'F')
    setDraw(C.indigoBorder)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    doc.line(MARGIN, y + h, PAGE_W - MARGIN, y + h)
    cells.forEach((cell) => { cell.sty = { ...cell.sty, style: 'bold', color: cell.c.tone === 'sign' ? cell.sty.color : C.indigoDark } })
    drawCells(cells, y, h)
    y += h
  }

  /* Ghi chú xếp hạng / tổng: xuống dòng + sang trang khi hết chỗ (không bỏ mất) */
  const note = String(meta.rankNote || '')
  if (note) {
    y += 4
    font('normal', 6.8, C.grayLight)
    const noteLines = wrap(note, CONTENT_W, 8)
    noteLines.forEach((ln) => {
      if (y + 3.4 > bottomLimit) {
        doc.addPage()
        y = drawHeader(meta.formatLabel) + 5
      }
      font('normal', 6.8, C.grayLight)
      doc.text(ln, MARGIN, y)
      y += 3.4
    })
  }

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }
  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   SƠ ĐỒ LOẠI TRỰC TIẾP (knockout bracket) — vector, khổ NGANG A4.
   meta = { clubName, tournamentName, sportLabel, championName?, exportedDateText, exportedAtText }
   rounds = [{ label, matches: [{ teamA, teamB, scoreA, scoreB, winner: 'A'|'B'|null, walkover?:bool }] }]
     round[0] = vòng đầu; mỗi vòng sau số trận = nửa vòng trước (chuẩn single-elimination).
   Vòng đầu > 16 trận → tự CHIA TRANG: mỗi trang 16 trận (cây con tới 1 trận), rồi trang nhánh cuối.
═══════════════════════════════════════════════════════════════════ */
const KO_MAX_PER_PAGE = 16

export function buildKnockoutReportPDF({ jsPDF, fonts, meta, rounds, branding }) {
  const doc = setupDoc(new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }), fonts)

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => { doc.setFont('BVP', style); doc.setFontSize(size); if (color) setText(color) }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const clip = (text, maxW) => clipTo(doc, text, maxW)

  const PW = 297, PH = 210, M = 12, CW = PW - M * 2

  /* ── Chia trang ── */
  const pagesPlan = []
  {
    let from = 0
    const depth = Math.round(Math.log2(KO_MAX_PER_PAGE)) + 1 // 16 → 8 → 4 → 2 → 1 = 5 vòng
    while (from < rounds.length) {
      const n = rounds[from].matches.length
      if (n <= KO_MAX_PER_PAGE) { pagesPlan.push(rounds.slice(from)); break }
      for (let a = 0; a < n; a += KO_MAX_PER_PAGE) {
        const sub = []
        for (let d = 0; d < depth && from + d < rounds.length; d++) {
          const lo = a >> d
          sub.push({ label: rounds[from + d].label, matches: rounds[from + d].matches.slice(lo, lo + (KO_MAX_PER_PAGE >> d)) })
        }
        pagesPlan.push(sub)
      }
      from += depth - 1
    }
  }
  if (pagesPlan.length === 0) pagesPlan.push([])

  const drawPage = (pageRounds, pageIdx) => {
    if (pageIdx > 0) doc.addPage()
    /* Header band */
    const headH = 22
    setFill(C.indigoDark)
    rrect(M, M, CW, headH, 2.5, 'F')
    setFill(C.indigo)
    doc.rect(M, M + headH - 1.6, CW, 1.6, 'F')
    let textX = M + 7
    const logo = branding.logo
    if (logo && logo.dataUrl) {
      try {
        // KHÔNG nền trắng: con-quay trắng đặt thẳng trên band màu.
        const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
        let iw = 10.6, ih = 10.6
        if (ratio > 1) ih = 10.6 / ratio; else iw = 10.6 * ratio
        const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
        doc.addImage(logo.dataUrl, fmt, M + 6 + 1.2 + (10.6 - iw) / 2, M + 4.5 + 1.2 + (10.6 - ih) / 2, iw, ih)
        textX = M + 6 + 13 + 4
      } catch { /* bỏ logo nếu lỗi */ }
    }
    font('bold', 7, C.white)
    doc.text(clip((branding.name || 'PickleFund').toUpperCase(), 80), textX, M + 7)
    font('bold', 14, C.white)
    doc.text('SƠ ĐỒ LOẠI TRỰC TIẾP', textX, M + 13.5)
    font('normal', 8, C.white)
    doc.text(clip(`${meta.sportLabel} · ${meta.tournamentName}`, CW / 2), textX, M + 18.5)
    font('normal', 7, C.white)
    doc.text(`Xuất ngày ${meta.exportedDateText}`, PW - M - 6, M + 7.5, { align: 'right' })
    if (meta.championName) {
      font('bold', 9.5, C.white)
      doc.text(clip(`VÔ ĐỊCH: ${meta.championName}`, CW / 2 - 6), PW - M - 6, M + 15, { align: 'right' })
    }
    if (pagesPlan.length > 1) {
      font('normal', 7, C.white)
      doc.text(`Phần ${pageIdx + 1} / ${pagesPlan.length}`, PW - M - 6, M + 19.5, { align: 'right' })
    }

    /* Vùng vẽ nhánh */
    const top = M + headH + 8
    const bottom = PH - M - 7
    const areaH = bottom - top
    const rs = pageRounds.filter((rd) => rd && rd.matches)
    if (rs.length === 0 || rs[0].matches.length === 0) {
      font('normal', 9, C.grayLight)
      doc.text(meta.emptyText || 'Không có dữ liệu', PW / 2, top + areaH / 2, { align: 'center' })
      return
    }
    const R = Math.max(1, rs.length)
    const colW = CW / R
    const boxW = Math.min(colW - 6, 62)
    const n0 = rs[0].matches.length || 1
    // Khoảng cách dòng (pitch) có GIỚI HẠN để bracket ít đội không bị giãn thưa; mỗi trang tối đa
    // KO_MAX_PER_PAGE trận đầu nên pitch luôn đủ cho boxH (không chồng hộp). Khối được CĂN GIỮA dọc.
    const MAX_PITCH = 46
    const pitch = Math.min(areaH / n0, MAX_PITCH)
    const boxH = Math.max(7, Math.min(13, pitch - 4))
    const startY = top + Math.max(0, (areaH - pitch * n0) / 2)

    /* Tâm theo chiều dọc của từng trận mỗi vòng */
    const centers = []
    rs.forEach((rd, r) => {
      if (r === 0) {
        centers[r] = rd.matches.map((_, i) => startY + pitch * (i + 0.5))
      } else {
        centers[r] = rd.matches.map((_, i) => {
          const a = centers[r - 1][2 * i]
          const b = centers[r - 1][2 * i + 1]
          if (a == null) return b != null ? b : startY + (pitch * n0) / 2
          return b != null ? (a + b) / 2 : a
        })
      }
    })

    /* Đường nối giữa các vòng (vẽ trước, nằm dưới hộp) */
    setDraw(C.indigoBorder)
    doc.setLineWidth(0.3)
    for (let r = 1; r < R; r++) {
      const xPrevR = M + (r - 1) * colW + boxW
      const xR = M + r * colW
      const midX = (xPrevR + xR) / 2
      rs[r].matches.forEach((_, i) => {
        const c1 = centers[r - 1][2 * i]
        const c2 = centers[r - 1][2 * i + 1] ?? c1
        const cy = centers[r][i]
        if (c1 == null || cy == null) return
        doc.line(xPrevR, c1, midX, c1)
        doc.line(xPrevR, c2, midX, c2)
        doc.line(midX, c1, midX, c2)
        doc.line(midX, cy, xR, cy)
      })
    }

    /* Hộp trận */
    const drawSide = (x, y, w, name, score, isWinner, isBye) => {
      if (isWinner) { setFill(C.greenBg); doc.rect(x, y, w, boxH / 2, 'F') }
      font(isWinner ? 'bold' : 'normal', 6.6, isBye ? C.grayLight : (isWinner ? C.green : C.textDark))
      doc.text(clip(name, w - 12), x + 2.5, y + boxH / 4 + 1.4)
      if (score != null && score !== '') {
        font('bold', 6.8, isWinner ? C.green : C.gray)
        doc.text(String(score), x + w - 2.5, y + boxH / 4 + 1.4, { align: 'right' })
      }
    }
    rs.forEach((rd, r) => {
      const x = M + r * colW
      // Nhãn vòng đặt ngay trên hộp đầu tiên của cột (gắn với nội dung, không lơ lửng).
      if (rd.matches.length > 0) {
        font('bold', 7, C.indigoDark)
        doc.text(clip(rd.label, boxW), x + boxW / 2, centers[r][0] - boxH / 2 - 3.5, { align: 'center' })
      }
      rd.matches.forEach((m, i) => {
        const cy = centers[r][i]
        const y = cy - boxH / 2
        setFill(C.white); setDraw(C.border); doc.setLineWidth(0.35)
        rrect(x, y, boxW, boxH, 1.5, 'FD')
        setDraw(C.lineSoft); doc.setLineWidth(0.2)
        doc.line(x, y + boxH / 2, x + boxW, y + boxH / 2)
        drawSide(x, y, boxW, m.teamA || 'Chờ...', m.scoreA, m.winner === 'A', false)
        drawSide(x, y + boxH / 2, boxW, m.walkover ? '(BYE)' : (m.teamB || 'Chờ...'), m.walkover ? '' : m.scoreB, m.winner === 'B', m.walkover)
      })
    })
  }
  pagesPlan.forEach((pr, i) => drawPage(pr, i))

  /* Footer mọi trang */
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const fy = PH - M - 3
    setDraw(C.lineSoft); doc.setLineWidth(0.3)
    doc.line(M, fy - 3, PW - M, fy - 3)
    font('normal', 6.5, C.grayLight)
    doc.text(clip(`${branding.footer || 'PickleFund'} · ${meta.clubName} · Xuất lúc ${meta.exportedAtText}`, CW - 25), M, fy)
    doc.text(`Trang ${p} / ${totalPages}`, PW - M, fy, { align: 'right' })
  }
  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   PHIẾU THU QUỸ PHỤ — vector, theme tím (Quỹ Phụ độc lập Quỹ Chính)
   receipt = { receiptNo?, payerName, incomeType, amount, paymentDate,
               notes?, clubName, clubLocation?, printedDateText, printedAtText }
═══════════════════════════════════════════════════════════════════ */
const V = {
  violet: [124, 58, 237], // #7C3AED
  violetLight: [167, 139, 250], // #A78BFA
  violetSoft: [245, 243, 255], // #F5F3FF
}

export function buildMiniReceiptPDF({ jsPDF, fonts, receipt, branding }) {
  const doc = setupDoc(new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }), fonts)

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const clip = (text, maxW) => clipTo(doc, text, maxW)
  const wrap = (text, maxW, maxLines) => wrapTo(doc, text, maxW, maxLines)
  const hasNo = receipt.receiptNo != null && receipt.receiptNo !== ''
  const no = hasNo ? String(receipt.receiptNo).padStart(4, '0') : ''

  /* Header band tím */
  const headH = 26
  setFill(V.violet)
  rrect(MARGIN, MARGIN, CONTENT_W, headH, 2.5, 'F')
  setFill(V.violetLight)
  doc.rect(MARGIN, MARGIN + headH - 1.6, CONTENT_W, 1.6, 'F')
  // logo CLB (nếu có)
  let textX = MARGIN + 7
  const logo = branding.logo
  if (logo && logo.dataUrl) {
    try {
      // KHÔNG nền trắng: con-quay trắng đặt thẳng trên band màu.
      const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
      let iw = 13.2
      let ih = 13.2
      if (ratio > 1) ih = 13.2 / ratio
      else iw = 13.2 * ratio
      const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
      doc.addImage(logo.dataUrl, fmt, MARGIN + 6 + 1.4 + (13.2 - iw) / 2, MARGIN + 5 + 1.4 + (13.2 - ih) / 2, iw, ih)
      textX = MARGIN + 6 + 16 + 4
    } catch { /* logo hỏng → bỏ qua */ }
  }
  const headRightW = 42 // vùng chữ "No." / "Ngày in" bên phải
  font('bold', 7, [255, 255, 255])
  doc.text(clip((branding.name || 'PickleFund').toUpperCase(), PAGE_W - MARGIN - 7 - headRightW - textX), textX, MARGIN + 8)
  font('bold', 15, [255, 255, 255])
  doc.text('PHIẾU THU QUỸ PHỤ', textX, MARGIN + 15.5)
  font('normal', 8.5, [255, 255, 255])
  doc.text(clip(receipt.clubName, PAGE_W - MARGIN - 7 - headRightW - textX), textX, MARGIN + 21.5)
  if (hasNo) {
    font('bold', 13, [255, 255, 255])
    doc.text(`No. ${no}`, PAGE_W - MARGIN - 7, MARGIN + 11, { align: 'right' })
  }
  font('normal', 7.5, [255, 255, 255])
  doc.text(`Ngày in: ${receipt.printedDateText}`, PAGE_W - MARGIN - 7, MARGIN + 16.5, { align: 'right' })

  /* Khung thông tin — giá trị dài xuống dòng (không tràn lề / đè nhãn) */
  let y = MARGIN + headH + 6
  const fields = [
    ['Người nộp', receipt.payerName, C.textDark, 2],
    ['Loại thu', receipt.incomeType, V.violet, 2],
    ['Ngày nộp', receipt.paymentDate, C.textDark, 1],
  ]
  if (receipt.notes) fields.push(['Ghi chú', receipt.notes, C.textDark, 6])
  const valW = CONTENT_W - 14 - 30 // trừ lề trong + bề rộng cột nhãn
  const FIELD_LH = 4.4
  const laid = fields.map(([label, value, color, maxLines]) => {
    font('bold', 9.5, color)
    const lines = wrap(String(value ?? ''), valW, maxLines)
    return { label, lines, color, h: Math.max(10, lines.length * FIELD_LH + 5.6) }
  })
  const boxH = laid.reduce((s, f) => s + f.h, 0) + 6
  setFill(C.white)
  setDraw(C.border)
  doc.setLineWidth(0.35)
  rrect(MARGIN, y, CONTENT_W, boxH, 2, 'FD')
  let rowY = y + 4
  laid.forEach((f, i) => {
    font('normal', 9, C.gray)
    doc.text(f.label, MARGIN + 7, rowY + 5)
    font('bold', 9.5, f.color)
    f.lines.forEach((ln, li) => doc.text(ln, PAGE_W - MARGIN - 7, rowY + 5 + li * FIELD_LH, { align: 'right' }))
    if (i < laid.length - 1) {
      setDraw(C.lineSoft)
      doc.setLineWidth(0.2)
      doc.line(MARGIN + 7, rowY + f.h - 1.4, PAGE_W - MARGIN - 7, rowY + f.h - 1.4)
    }
    rowY += f.h
  })
  y += boxH + 5

  /* Băng số tiền */
  setFill(V.violet)
  rrect(MARGIN, y, CONTENT_W, 20, 2, 'F')
  font('bold', 8.5, [255, 255, 255])
  doc.text('SỐ TIỀN THU QUỸ PHỤ', MARGIN + 7, y + 12)
  font('bold', 19, [255, 255, 255])
  doc.text(vnd(receipt.amount), PAGE_W - MARGIN - 7, y + 13.5, { align: 'right' })
  y += 25

  /* Khối chữ ký 2 cột — tên người nộp xuống dòng (tối đa 2) trong cột của mình */
  font('normal', 8, C.textDark)
  const payerLines = wrap(receipt.payerName, CONTENT_W / 2 - 14, 2)
  const sigH = 34 + (payerLines.length - 1) * 4
  setFill(C.white)
  setDraw(C.border)
  doc.setLineWidth(0.35)
  rrect(MARGIN, y, CONTENT_W, sigH, 2, 'FD')
  doc.line(PAGE_W / 2, y, PAGE_W / 2, y + sigH)
  const sigCol = (cx, title, nameLines) => {
    font('bold', 7, C.gray)
    doc.text(title, cx, y + 7, { align: 'center' })
    setDraw(C.grayLight)
    doc.setLineWidth(0.3)
    doc.setLineDashPattern([1.4, 1.4], 0)
    doc.line(cx - 26, y + 24, cx + 26, y + 24)
    doc.setLineDashPattern([], 0)
    font('normal', 8, C.textDark)
    nameLines.forEach((ln, li) => doc.text(ln, cx, y + 29.5 + li * 4, { align: 'center' }))
  }
  sigCol(MARGIN + CONTENT_W / 4, 'THỦ QUỸ XÁC NHẬN', ['(Ký và ghi rõ họ tên)'])
  sigCol(MARGIN + (CONTENT_W * 3) / 4, 'NGƯỜI NỘP', payerLines)
  y += sigH + 5

  /* Ghi chú chân phiếu — địa điểm chỉ in khi CLB có cấu hình (không cứng "Hà Nội") */
  setFill(V.violetSoft)
  setDraw(C.border)
  rrect(MARGIN, y, CONTENT_W, 11, 2, 'FD')
  font('normal', 7, C.gray)
  doc.text('Phiếu Thu Quỹ Phụ – không tính vào công nợ thành viên Quỹ Chính', MARGIN + 7, y + 6.8)
  const loc = String(receipt.clubLocation || '').trim()
  doc.text(clip(`${loc ? loc + ', ' : ''}ngày ${receipt.printedDateText}`, 60), PAGE_W - MARGIN - 7, y + 6.8, { align: 'right' })

  /* Footer tài liệu */
  const fy = PAGE_H - MARGIN - 4
  setDraw(C.lineSoft)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, fy - 3, PAGE_W - MARGIN, fy - 3)
  font('normal', 6.5, C.grayLight)
  doc.text(clip(`${branding.footer || 'PickleFund'} · ${receipt.clubName} · Xuất lúc ${receipt.printedAtText}`, CONTENT_W - 25), MARGIN, fy)
  doc.text(`Trang 1 / ${doc.getNumberOfPages()}`, PAGE_W - MARGIN, fy, { align: 'right' })

  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   BÁO CÁO CHI PHÍ — vector, dùng chung mọi CLB.
   summary = { clubName, periodName, totalAll, totalCommon, totalMini,
               totalApproved, totalPending, count, exportedDateText, exportedAtText,
               totalLabel?, totalRowLabel? }
   rows = [{ code, description, kindLabel, dateText, amount, statusKey }]
     statusKey ∈ 'approved' | 'pending' | 'paid' | 'rejected'
═══════════════════════════════════════════════════════════════════ */
const EXP_STATUS = {
  approved: { label: 'Đã duyệt', color: C.green },
  paid: { label: 'Đã chi', color: C.cyan },
  pending: { label: 'Chờ duyệt', color: C.amber },
  rejected: { label: 'Từ chối', color: C.red },
}

export function buildExpenseReportPDF({ jsPDF, fonts, summary, rows, branding }) {
  const doc = setupDoc(new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }), fonts)

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const clip = (text, maxW) => clipTo(doc, text, maxW)
  const wrap = (text, maxW, maxLines) => wrapTo(doc, text, maxW, maxLines)

  const drawHeader = (subtitle) => {
    const h = 26
    setFill(C.indigoDark)
    rrect(MARGIN, MARGIN, CONTENT_W, h, 2.5, 'F')
    setFill(C.indigo)
    doc.rect(MARGIN, MARGIN + h - 1.6, CONTENT_W, 1.6, 'F')
    let textX = MARGIN + 7
    const logo = branding.logo
    if (logo && logo.dataUrl) {
      try {
        // KHÔNG nền trắng: con-quay trắng đặt thẳng trên band màu.
        const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
        let iw = 15.4, ih = 15.4
        if (ratio > 1) ih = 15.4 / ratio
        else iw = 15.4 * ratio
        const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
        doc.addImage(logo.dataUrl, fmt, MARGIN + 6 + (15.4 - iw) / 2, MARGIN + 5 + (15.4 - ih) / 2, iw, ih)
        textX = MARGIN + 6 + 16 + 4
      } catch { /* bỏ logo nếu lỗi */ }
    }
    font('bold', 7, C.white)
    doc.text(clip((branding.name || 'PickleFund').toUpperCase(), 80), textX, MARGIN + 8)
    font('bold', 15, C.white)
    doc.text('BÁO CÁO CHI PHÍ', textX, MARGIN + 15.5)
    font('normal', 8.5, C.white)
    doc.text(clip(`${summary.clubName} · ${summary.periodName}`, PAGE_W - MARGIN - 7 - textX), textX, MARGIN + 21.5)
    font('normal', 7.5, C.white)
    doc.text(`Xuất ngày ${summary.exportedDateText}`, PAGE_W - MARGIN - 7, MARGIN + 10, { align: 'right' })
    if (subtitle) doc.text(clip(subtitle, 60), PAGE_W - MARGIN - 7, MARGIN + 15.5, { align: 'right' })
    return MARGIN + h
  }

  const drawFooter = (pageNo, totalPages) => {
    const y = PAGE_H - MARGIN - 4
    setDraw(C.lineSoft)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3)
    font('normal', 6.5, C.grayLight)
    doc.text(clip(`${branding.footer || 'PickleFund'} · ${summary.clubName} · Xuất lúc ${summary.exportedAtText}`, CONTENT_W - 25), MARGIN, y)
    doc.text(`Trang ${pageNo} / ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' })
  }

  let y = drawHeader(`${summary.count} khoản chi`) + 5

  /* Dải chỉ số: Tổng chi / Quỹ Chính / Quỹ Phụ / Đã duyệt / Chờ duyệt */
  const stats = [
    { label: summary.totalLabel || 'TỔNG CHI', value: vnd(summary.totalAll), color: C.redDark, strong: true },
    { label: 'QUỸ CHÍNH', value: vnd(summary.totalCommon), color: C.indigoDark },
    { label: 'QUỸ PHỤ', value: vnd(summary.totalMini), color: C.cyan },
    { label: 'ĐÃ DUYỆT', value: vnd(summary.totalApproved), color: C.green },
    { label: 'CHỜ DUYỆT', value: vnd(summary.totalPending), color: C.amber },
  ]
  const sW = (CONTENT_W - 4 * 3) / 5
  stats.forEach((s, i) => {
    const x = MARGIN + i * (sW + 3)
    setFill(s.strong ? C.indigoSoft : C.white)
    setDraw(s.strong ? C.indigoBorder : C.border)
    doc.setLineWidth(0.35)
    rrect(x, y, sW, 16, 2, 'FD')
    font('bold', 5.6, s.strong ? C.indigoDark : C.gray)
    doc.text(clip(s.label, sW - 5), x + 3, y + 5)
    font('bold', 8.2, s.color)
    doc.text(clip(s.value, sW - 6), x + 3, y + 11)
  })
  y += 21

  /* Bảng chi tiết — tự phân trang, lặp header */
  const COLS = [
    { key: 'idx', label: '#', w: 8, align: 'left' },
    { key: 'code', label: 'MÃ CHI', w: 29, align: 'left' },
    { key: 'desc', label: 'NỘI DUNG', w: 49, align: 'left' },
    { key: 'kind', label: 'PHÂN BỔ', w: 31, align: 'left' },
    { key: 'date', label: 'NGÀY', w: 19, align: 'left' },
    { key: 'amount', label: 'SỐ TIỀN', w: 26, align: 'right' },
    { key: 'status', label: 'TRẠNG THÁI', w: 24, align: 'center' },
  ]
  const ROW_H = 7.5
  const colX = []
  { let cx = MARGIN; for (const c of COLS) { colX.push(cx); cx += c.w } }
  const cellX = (i) => {
    const c = COLS[i]
    if (c.align === 'right') return colX[i] + c.w - 3
    if (c.align === 'center') return colX[i] + c.w / 2
    return colX[i] + 3
  }
  const drawTableHead = (yy) => {
    setFill(C.indigo)
    doc.rect(MARGIN, yy, CONTENT_W, 8, 'F')
    font('bold', 6.6, C.white)
    COLS.forEach((c, i) => doc.text(c.label, cellX(i), yy + 5.3, { align: c.align }))
    return yy + 8
  }

  y = drawTableHead(y)
  const bottomLimit = PAGE_H - MARGIN - 12
  rows.forEach((r, idx) => {
    // Nội dung + phân bổ dài → xuống dòng (tối đa 3) thay vì cắt "…".
    font('bold', 7.4, C.textDark)
    const descLines = wrap(r.description, COLS[2].w - 5, 3)
    font('normal', 6.6, C.gray)
    const kindLines = wrap(r.kindLabel, COLS[3].w - 5, 2)
    const nLines = Math.max(descLines.length, kindLines.length)
    const rowH = nLines > 1 ? Math.max(ROW_H, nLines * LINE_H + 3.6) : ROW_H
    if (y + rowH > bottomLimit) {
      doc.addPage()
      y = drawHeader(`${summary.count} khoản chi (tiếp)`) + 5
      y = drawTableHead(y)
    }
    if (idx % 2 === 1) {
      setFill(C.zebra)
      doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
    }
    setDraw(C.lineSoft)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH)
    const midY = y + rowH / 2 + 1.6
    font('normal', 7, C.grayLight)
    doc.text(String(idx + 1), cellX(0), midY)
    font('normal', 6.2, C.gray)
    doc.text(clip(r.code, COLS[1].w - 4), cellX(1), midY)
    font('bold', 7.4, C.textDark)
    descLines.forEach((ln, li) => doc.text(ln, cellX(2), midY - ((descLines.length - 1) * LINE_H) / 2 + li * LINE_H))
    font('normal', 6.6, C.gray)
    kindLines.forEach((ln, li) => doc.text(ln, cellX(3), midY - ((kindLines.length - 1) * LINE_H) / 2 + li * LINE_H))
    doc.text(clip(r.dateText, COLS[4].w - 3), cellX(4), midY)
    font('bold', 7.4, C.textDark)
    doc.text(vnd(r.amount), cellX(5), midY, { align: 'right' })
    const st = EXP_STATUS[r.statusKey] ?? EXP_STATUS.pending
    font('bold', 6.6, st.color)
    doc.text(st.label, cellX(6), midY, { align: 'center' })
    y += rowH
  })

  /* Bảng rỗng */
  if (rows.length === 0) {
    font('normal', 8.5, C.grayLight)
    doc.text('Không có dữ liệu', PAGE_W / 2, y + 9, { align: 'center' })
    y += 14
  }

  /* Dòng tổng cộng */
  if (y + ROW_H > bottomLimit) {
    doc.addPage()
    y = drawHeader(`${summary.count} khoản chi (tiếp)`) + 5
    y = drawTableHead(y)
  }
  setFill(C.indigoSoft)
  doc.rect(MARGIN, y, CONTENT_W, ROW_H + 1, 'F')
  font('bold', 7.6, C.indigoDark)
  doc.text(summary.totalRowLabel || 'TỔNG CỘNG', colX[1] + 3, y + ROW_H / 2 + 1.8)
  doc.text(vnd(summary.totalAll), cellX(5), y + ROW_H / 2 + 1.8, { align: 'right' })

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }
  return doc
}
