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
  const neg = n < 0
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (neg ? '-' : '') + s + ' đ'
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function buildQuyReportPDF({ jsPDF, fonts, summary, rows, branding }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  /* Nhúng font Việt */
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.regular)
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold)
  doc.addFont('BeVietnamPro-Regular.ttf', 'BVP', 'normal')
  doc.addFont('BeVietnamPro-Bold.ttf', 'BVP', 'bold')

  /* ── helpers vẽ ── */
  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  /** Cắt chữ kèm "…" khi vượt bề rộng cho phép (theo font đang set). */
  const clip = (text, maxW) => {
    if (doc.getTextWidth(text) <= maxW) return text
    let t = text
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
    return t + '…'
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)

  /* Logo CLB (tùy chọn): chip trắng bo góc + ảnh fit-contain, đặt bên trái header.
     branding.logo = { dataUrl, w, h } (w/h = kích thước gốc để giữ tỉ lệ). */
  const drawLogoChip = (x, y, size) => {
    const logo = branding.logo
    if (!logo || !logo.dataUrl) return 0
    try {
      setFill(C.white)
      rrect(x, y, size, size, 1.8, 'F')
      const pad = 1.4
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
    font('bold', big ? 7 : 6.5, C.white)
    doc.setTextColor(255, 255, 255)
    // brand nhỏ phía trên
    doc.text((branding.name || 'PickleFund').toUpperCase(), textX, MARGIN + (big ? 8 : 6.5))
    font('bold', big ? 16.5 : 12, C.white)
    doc.text(title, textX, MARGIN + (big ? 16.5 : 12.5))
    font('normal', big ? 9 : 7.5, C.white)
    doc.text(`${summary.clubName} · ${summary.periodName}`, textX, MARGIN + (big ? 23.5 : 16))
    font('normal', 7.5, C.white)
    if (subRight1) doc.text(subRight1, PAGE_W - MARGIN - 7, MARGIN + (big ? 10 : 8), { align: 'right' })
    if (subRight2) doc.text(subRight2, PAGE_W - MARGIN - 7, MARGIN + (big ? 15 : 12.5), { align: 'right' })
    return MARGIN + h
  }

  const drawFooter = (pageNo, totalPages) => {
    const y = PAGE_H - MARGIN - 4
    setDraw(C.lineSoft)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3)
    font('normal', 6.5, C.grayLight)
    doc.text(`${branding.footer || 'PickleFund'} · ${summary.clubName} · Xuất lúc ${summary.exportedAtText}`, MARGIN, y)
    doc.text(`Trang ${pageNo} / ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' })
  }

  /* ═══════════ TRANG 1 — BÁO CÁO TÀI CHÍNH ═══════════ */
  const unpaidCount = rows.length > 0
    ? rows.filter((r) => !r.contributionPaid).length
    : Math.max(0, summary.memberCount - summary.confirmedCount)
  const chiThuPct = pct(summary.totalExpense, summary.totalIncome)

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
      label: 'SỐ DƯ QUỸ', value: vnd(summary.balance),
      sub: summary.balance < 0 ? 'Quỹ âm – cần bổ sung' : 'Quỹ còn dư',
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
    doc.text(k.value, x + 5, y + 13.5)
    font('normal', 6.5, C.grayLight)
    doc.text(k.sub, x + 5, y + 18.5)
  })
  y += 27

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

  /* 4 chỉ số nhanh */
  const statW = (CONTENT_W - 12) / 4
  const stats = [
    { label: 'Tổng thành viên', value: `${summary.memberCount} người`, color: C.textDark },
    { label: 'Số buổi tập', value: `${summary.sessionCount} buổi`, color: C.textDark },
    { label: 'Đã đóng quỹ', value: `${summary.confirmedCount} / ${summary.memberCount}`, color: C.green },
    { label: 'Chưa đóng quỹ', value: `${unpaidCount} người`, color: unpaidCount > 0 ? C.red : C.green },
  ]
  stats.forEach((s, i) => {
    const x = MARGIN + i * (statW + 4)
    setFill(C.white)
    setDraw(C.border)
    rrect(x, y, statW, 13, 2, 'FD')
    font('normal', 6.5, C.gray)
    doc.text(s.label, x + 4, y + 5)
    font('bold', 9.5, s.color)
    doc.text(s.value, x + 4, y + 10.5)
  })
  y += 19

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
      if (y + ROW_H > bottomLimit) {
        doc.addPage()
        y = drawHeader('BÁO CÁO TÀI CHÍNH (tiếp)', `Xuất ngày ${summary.exportedDateText}`, '', false) + 5
        y = drawTableHeader(y)
      }
      if (idx % 2 === 1) {
        setFill(C.zebra)
        doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F')
      }
      setDraw(C.lineSoft)
      doc.setLineWidth(0.2)
      doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)
      const midY = y + ROW_H / 2 + 1.6
      font('normal', 7, C.grayLight)
      doc.text(String(idx + 1), cellX(0), midY)
      font('bold', 8, C.textDark)
      doc.text(clip(r.memberName, COLS[1].w - 6), cellX(1), midY)
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
      font('bold', 7.5, r.balance >= 0 ? C.green : C.red)
      doc.text((r.balance >= 0 ? '+' : '') + vnd(r.balance), cellX(7), midY, { align: 'right' })
      y += ROW_H
    })
  }

  /* ═══════════ TRANG BILL — 6 thẻ/trang (2 cột × 3 hàng), toạ độ CỐ ĐỊNH ═══════════ */
  const CARD_W = (CONTENT_W - 6) / 2 // 90
  const CARD_H = 76
  const CARD_GAP = 5

  const drawCard = (m, x, yy) => {
    const pos = m.balance >= 0
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
    font('bold', 10, C.white)
    doc.text(clip(m.memberName, CARD_W - 40), x + 5, yy + 6.8)
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
    /* 4 dòng chi phí — mỗi dòng đúng 7mm, label trái / số phải */
    const lines = [
      { label: 'Đã nộp quỹ', note: '', val: vnd(m.amountPaid), color: C.green },
      { label: 'Chi phí sân', note: `(${m.attendedSessions} buổi)`, val: vnd(m.courtCost), color: C.indigo },
      { label: 'Sinh hoạt', note: '(chia đều)', val: vnd(m.livingCost), color: C.cyan },
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
    /* ô số dư */
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
    doc.text((pos ? '+' : '') + vnd(m.balance), x + CARD_W - 8, boxY + 8.2, { align: 'right' })
  }

  if (rows.length > 0) {
    const totalBillPages = Math.ceil(rows.length / 6)
    for (let pg = 0; pg < totalBillPages; pg++) {
      doc.addPage()
      const chunk = rows.slice(pg * 6, pg * 6 + 6)
      const top = drawHeader(
        'BILL CHI TIẾT THÀNH VIÊN',
        `Trang ${pg + 1} / ${totalBillPages}`,
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
   columns = [{ key, label, w, align:'left'|'center'|'right', tone?, bold? }]
     tone ∈ 'win'(xanh) | 'loss'(đỏ) | 'points'(tím đậm) | 'muted'(xám) | 'sign'(theo dấu +/-) | undefined
   rows = [{ [key]: string|number }]   (key 'rank' tự đánh số thứ hạng)
   stats = [{ label, value }]  (dải chỉ số phía trên, tùy chọn)
═══════════════════════════════════════════════════════════════════ */
const RANK_TONE = { win: C.green, loss: C.red, points: C.indigoDark, muted: C.grayLight }

export function buildStandingsReportPDF({ jsPDF, fonts, meta, columns, rows, stats, branding }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.regular)
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold)
  doc.addFont('BeVietnamPro-Regular.ttf', 'BVP', 'normal')
  doc.addFont('BeVietnamPro-Bold.ttf', 'BVP', 'bold')

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const clip = (text, maxW) => {
    let t = String(text ?? '')
    if (doc.getTextWidth(t) <= maxW) return t
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
    return t + '…'
  }

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
        setFill(C.white)
        rrect(MARGIN + 6, MARGIN + 5, 16, 16, 1.8, 'F')
        const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
        let iw = 13.2, ih = 13.2
        if (ratio > 1) ih = 13.2 / ratio
        else iw = 13.2 * ratio
        const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
        doc.addImage(logo.dataUrl, fmt, MARGIN + 6 + 1.4 + (13.2 - iw) / 2, MARGIN + 5 + 1.4 + (13.2 - ih) / 2, iw, ih)
        textX = MARGIN + 6 + 16 + 4
      } catch { /* bỏ logo nếu lỗi */ }
    }
    font('bold', 7, C.white)
    doc.text((branding.name || 'PickleFund').toUpperCase(), textX, MARGIN + 8)
    font('bold', 15, C.white)
    doc.text('BẢNG XẾP HẠNG', textX, MARGIN + 15.5)
    font('normal', 8.5, C.white)
    doc.text(clip(`${meta.sportLabel} · ${meta.tournamentName}`, CONTENT_W - 60), textX, MARGIN + 21.5)
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
    doc.text(`${branding.footer || 'PickleFund'} · ${meta.clubName} · Xuất lúc ${meta.exportedAtText}`, MARGIN, y)
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
  const drawHead = (yy) => {
    setFill(C.indigo)
    doc.rect(MARGIN, yy, CONTENT_W, 8, 'F')
    font('bold', 6.8, C.white)
    columns.forEach((c, i) => doc.text(c.label, cellX(i), yy + 5.3, { align: c.align }))
    return yy + 8
  }

  y = drawHead(y)
  const bottomLimit = PAGE_H - MARGIN - 12
  rows.forEach((r, idx) => {
    if (y + ROW_H > bottomLimit) {
      doc.addPage()
      y = drawHeader(meta.formatLabel) + 5
      y = drawHead(y)
    }
    // Tô nhẹ 3 hạng đầu; các dòng lẻ còn lại zebra.
    if (idx < 3) { setFill(C.greenBg); doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F') }
    else if (idx % 2 === 1) { setFill(C.zebra); doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F') }
    setDraw(C.lineSoft)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)
    const midY = y + ROW_H / 2 + 1.6
    columns.forEach((c, i) => {
      let val = c.key === 'rank' ? String(idx + 1) : String(r[c.key] ?? '')
      let color = C.textDark
      let style = c.bold ? 'bold' : 'normal'
      if (c.tone === 'sign') { color = val.startsWith('-') ? C.red : (val.startsWith('+') ? C.green : C.gray) }
      else if (c.tone && RANK_TONE[c.tone]) { color = RANK_TONE[c.tone] }
      if (c.tone === 'points') style = 'bold'
      if (c.key === 'rank') color = C.grayLight
      font(style, c.key === 'name' ? 8 : 7.5, color)
      doc.text(clip(val, c.w - (c.align === 'left' ? 5 : 4)), cellX(i), midY, { align: c.align })
    })
    y += ROW_H
  })

  /* Ghi chú xếp hạng */
  y += 4
  if (y < bottomLimit) {
    font('normal', 6.8, C.grayLight)
    doc.text(meta.rankNote || '', MARGIN, y)
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
═══════════════════════════════════════════════════════════════════ */
export function buildKnockoutReportPDF({ jsPDF, fonts, meta, rounds, branding }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.regular)
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold)
  doc.addFont('BeVietnamPro-Regular.ttf', 'BVP', 'normal')
  doc.addFont('BeVietnamPro-Bold.ttf', 'BVP', 'bold')

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => { doc.setFont('BVP', style); doc.setFontSize(size); if (color) setText(color) }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const clip = (text, maxW) => {
    let t = String(text ?? '')
    if (doc.getTextWidth(t) <= maxW) return t
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
    return t + '…'
  }

  const PW = 297, PH = 210, M = 12, CW = PW - M * 2

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
      setFill(C.white)
      rrect(M + 6, M + 4.5, 13, 13, 1.6, 'F')
      const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
      let iw = 10.6, ih = 10.6
      if (ratio > 1) ih = 10.6 / ratio; else iw = 10.6 * ratio
      const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
      doc.addImage(logo.dataUrl, fmt, M + 6 + 1.2 + (10.6 - iw) / 2, M + 4.5 + 1.2 + (10.6 - ih) / 2, iw, ih)
      textX = M + 6 + 13 + 4
    } catch { /* bỏ logo nếu lỗi */ }
  }
  font('bold', 7, C.white)
  doc.text((branding.name || 'PickleFund').toUpperCase(), textX, M + 7)
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

  /* Vùng vẽ nhánh */
  const top = M + headH + 8
  const bottom = PH - M - 7
  const areaH = bottom - top
  const R = Math.max(1, rounds.length)
  const colW = CW / R
  const boxW = Math.min(colW - 6, 62)
  const n0 = rounds[0]?.matches.length || 1
  const slot0 = areaH / n0
  const boxH = Math.max(8, Math.min(14, slot0 - 3))

  /* Tâm theo chiều dọc của từng trận mỗi vòng */
  const centers = []
  rounds.forEach((rd, r) => {
    if (r === 0) {
      centers[r] = rd.matches.map((_, i) => top + slot0 * (i + 0.5))
    } else {
      centers[r] = rd.matches.map((_, i) => {
        const a = centers[r - 1][2 * i]
        const b = centers[r - 1][2 * i + 1]
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
    rounds[r].matches.forEach((_, i) => {
      const c1 = centers[r - 1][2 * i]
      const c2 = centers[r - 1][2 * i + 1] ?? c1
      const cy = centers[r][i]
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
  rounds.forEach((rd, r) => {
    const x = M + r * colW
    font('bold', 7, C.indigoDark)
    doc.text(clip(rd.label, boxW), x + boxW / 2, top - 3, { align: 'center' })
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

  /* Footer */
  const fy = PH - M - 3
  setDraw(C.lineSoft); doc.setLineWidth(0.3)
  doc.line(M, fy - 3, PW - M, fy - 3)
  font('normal', 6.5, C.grayLight)
  doc.text(`${branding.footer || 'PickleFund'} · ${meta.clubName} · Xuất lúc ${meta.exportedAtText}`, M, fy)
  doc.text('Trang 1 / 1', PW - M, fy, { align: 'right' })
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.regular)
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold)
  doc.addFont('BeVietnamPro-Regular.ttf', 'BVP', 'normal')
  doc.addFont('BeVietnamPro-Bold.ttf', 'BVP', 'bold')

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const no = String(receipt.receiptNo ?? 1).padStart(4, '0')

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
      setFill([255, 255, 255])
      rrect(MARGIN + 6, MARGIN + 5, 16, 16, 1.8, 'F')
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
  font('bold', 7, [255, 255, 255])
  doc.text((branding.name || 'PickleFund').toUpperCase(), textX, MARGIN + 8)
  font('bold', 15, [255, 255, 255])
  doc.text('PHIẾU THU QUỸ PHỤ', textX, MARGIN + 15.5)
  font('normal', 8.5, [255, 255, 255])
  doc.text(receipt.clubName, textX, MARGIN + 21.5)
  font('bold', 13, [255, 255, 255])
  doc.text(`No. ${no}`, PAGE_W - MARGIN - 7, MARGIN + 11, { align: 'right' })
  font('normal', 7.5, [255, 255, 255])
  doc.text(`Ngày in: ${receipt.printedDateText}`, PAGE_W - MARGIN - 7, MARGIN + 16.5, { align: 'right' })

  /* Khung thông tin */
  let y = MARGIN + headH + 6
  const fields = [
    ['Người nộp', receipt.payerName, C.textDark],
    ['Loại thu', receipt.incomeType, V.violet],
    ['Ngày nộp', receipt.paymentDate, C.textDark],
  ]
  if (receipt.notes) fields.push(['Ghi chú', receipt.notes, C.textDark])
  const boxH = fields.length * 10 + 6
  setFill(C.white)
  setDraw(C.border)
  doc.setLineWidth(0.35)
  rrect(MARGIN, y, CONTENT_W, boxH, 2, 'FD')
  fields.forEach(([label, value, color], i) => {
    const rowY = y + 4 + i * 10
    font('normal', 9, C.gray)
    doc.text(label, MARGIN + 7, rowY + 5)
    font('bold', 9.5, color)
    doc.text(String(value), PAGE_W - MARGIN - 7, rowY + 5, { align: 'right' })
    if (i < fields.length - 1) {
      setDraw(C.lineSoft)
      doc.setLineWidth(0.2)
      doc.line(MARGIN + 7, rowY + 8.6, PAGE_W - MARGIN - 7, rowY + 8.6)
    }
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

  /* Khối chữ ký 2 cột */
  const sigH = 34
  setFill(C.white)
  setDraw(C.border)
  doc.setLineWidth(0.35)
  rrect(MARGIN, y, CONTENT_W, sigH, 2, 'FD')
  doc.line(PAGE_W / 2, y, PAGE_W / 2, y + sigH)
  const sigCol = (cx, title, name) => {
    font('bold', 7, C.gray)
    doc.text(title, cx, y + 7, { align: 'center' })
    setDraw(C.grayLight)
    doc.setLineWidth(0.3)
    doc.setLineDashPattern([1.4, 1.4], 0)
    doc.line(cx - 26, y + 24, cx + 26, y + 24)
    doc.setLineDashPattern([], 0)
    font('normal', 8, C.textDark)
    doc.text(name, cx, y + 29.5, { align: 'center' })
  }
  sigCol(MARGIN + CONTENT_W / 4, 'THỦ QUỸ XÁC NHẬN', '(Ký và ghi rõ họ tên)')
  sigCol(MARGIN + (CONTENT_W * 3) / 4, 'NGƯỜI NỘP', receipt.payerName)
  y += sigH + 5

  /* Ghi chú chân phiếu */
  setFill(V.violetSoft)
  setDraw(C.border)
  rrect(MARGIN, y, CONTENT_W, 11, 2, 'FD')
  font('normal', 7, C.gray)
  doc.text('Phiếu Thu Quỹ Phụ – không tính vào công nợ thành viên Quỹ Chính', MARGIN + 7, y + 6.8)
  doc.text(`${receipt.clubLocation || 'Hà Nội'}, ngày ${receipt.printedDateText}`, PAGE_W - MARGIN - 7, y + 6.8, { align: 'right' })

  /* Footer tài liệu */
  const fy = PAGE_H - MARGIN - 4
  setDraw(C.lineSoft)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, fy - 3, PAGE_W - MARGIN, fy - 3)
  font('normal', 6.5, C.grayLight)
  doc.text(`${branding.footer || 'PickleFund'} · ${receipt.clubName} · Xuất lúc ${receipt.printedAtText}`, MARGIN, fy)
  doc.text('Trang 1 / 1', PAGE_W - MARGIN, fy, { align: 'right' })

  return doc
}

/* ═══════════════════════════════════════════════════════════════════
   BÁO CÁO CHI PHÍ — vector, dùng chung mọi CLB.
   summary = { clubName, periodName, totalAll, totalCommon, totalMini,
               totalApproved, totalPending, count, exportedDateText, exportedAtText }
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.regular)
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold)
  doc.addFont('BeVietnamPro-Regular.ttf', 'BVP', 'normal')
  doc.addFont('BeVietnamPro-Bold.ttf', 'BVP', 'bold')

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2])
  const font = (style, size, color) => {
    doc.setFont('BVP', style)
    doc.setFontSize(size)
    if (color) setText(color)
  }
  const rrect = (x, y, w, h, r, mode) => doc.roundedRect(x, y, w, h, r, r, mode)
  const clip = (text, maxW) => {
    let t = String(text ?? '')
    if (doc.getTextWidth(t) <= maxW) return t
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
    return t + '…'
  }

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
        setFill(C.white)
        rrect(MARGIN + 6, MARGIN + 5, 16, 16, 1.8, 'F')
        const ratio = logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 1
        let iw = 13.2, ih = 13.2
        if (ratio > 1) ih = 13.2 / ratio
        else iw = 13.2 * ratio
        const fmt = /^data:image\/png/i.test(logo.dataUrl) ? 'PNG' : 'JPEG'
        doc.addImage(logo.dataUrl, fmt, MARGIN + 6 + 1.4 + (13.2 - iw) / 2, MARGIN + 5 + 1.4 + (13.2 - ih) / 2, iw, ih)
        textX = MARGIN + 6 + 16 + 4
      } catch { /* bỏ logo nếu lỗi */ }
    }
    font('bold', 7, C.white)
    doc.text((branding.name || 'PickleFund').toUpperCase(), textX, MARGIN + 8)
    font('bold', 15, C.white)
    doc.text('BÁO CÁO CHI PHÍ', textX, MARGIN + 15.5)
    font('normal', 8.5, C.white)
    doc.text(`${summary.clubName} · ${summary.periodName}`, textX, MARGIN + 21.5)
    font('normal', 7.5, C.white)
    doc.text(`Xuất ngày ${summary.exportedDateText}`, PAGE_W - MARGIN - 7, MARGIN + 10, { align: 'right' })
    if (subtitle) doc.text(subtitle, PAGE_W - MARGIN - 7, MARGIN + 15.5, { align: 'right' })
    return MARGIN + h
  }

  const drawFooter = (pageNo, totalPages) => {
    const y = PAGE_H - MARGIN - 4
    setDraw(C.lineSoft)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3)
    font('normal', 6.5, C.grayLight)
    doc.text(`${branding.footer || 'PickleFund'} · ${summary.clubName} · Xuất lúc ${summary.exportedAtText}`, MARGIN, y)
    doc.text(`Trang ${pageNo} / ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' })
  }

  let y = drawHeader(`${summary.count} khoản chi`) + 5

  /* Dải chỉ số: Tổng chi / Quỹ Chính / Quỹ Phụ / Đã duyệt / Chờ duyệt */
  const stats = [
    { label: 'TỔNG CHI', value: vnd(summary.totalAll), color: C.redDark, strong: true },
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
    doc.text(s.label, x + 3, y + 5)
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
    if (y + ROW_H > bottomLimit) {
      doc.addPage()
      y = drawHeader(`${summary.count} khoản chi (tiếp)`) + 5
      y = drawTableHead(y)
    }
    if (idx % 2 === 1) {
      setFill(C.zebra)
      doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F')
    }
    setDraw(C.lineSoft)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H)
    const midY = y + ROW_H / 2 + 1.6
    font('normal', 7, C.grayLight)
    doc.text(String(idx + 1), cellX(0), midY)
    font('normal', 6.2, C.gray)
    doc.text(clip(r.code, COLS[1].w - 4), cellX(1), midY)
    font('bold', 7.4, C.textDark)
    doc.text(clip(r.description, COLS[2].w - 5), cellX(2), midY)
    font('normal', 6.6, C.gray)
    doc.text(clip(r.kindLabel, COLS[3].w - 5), cellX(3), midY)
    doc.text(r.dateText, cellX(4), midY)
    font('bold', 7.4, C.textDark)
    doc.text(vnd(r.amount), cellX(5), midY, { align: 'right' })
    const st = EXP_STATUS[r.statusKey] ?? EXP_STATUS.pending
    font('bold', 6.6, st.color)
    doc.text(st.label, cellX(6), midY, { align: 'center' })
    y += ROW_H
  })

  /* Dòng tổng cộng */
  if (y + ROW_H > bottomLimit) {
    doc.addPage()
    y = drawHeader(`${summary.count} khoản chi (tiếp)`) + 5
    y = drawTableHead(y)
  }
  setFill(C.indigoSoft)
  doc.rect(MARGIN, y, CONTENT_W, ROW_H + 1, 'F')
  font('bold', 7.6, C.indigoDark)
  doc.text('TỔNG CỘNG', colX[1] + 3, y + ROW_H / 2 + 1.8)
  doc.text(vnd(summary.totalAll), cellX(5), y + ROW_H / 2 + 1.8, { align: 'right' })

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }
  return doc
}
