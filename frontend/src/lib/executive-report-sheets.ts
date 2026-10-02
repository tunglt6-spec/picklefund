/* Sheet Excel của "Báo cáo điều hành" — dựng từ ĐÚNG dữ liệu API /aido/executive-report (cùng nguồn với trang + PDF).
   Thuần (không DOM) → test được bằng node. Mục nào không có dữ liệu thì bỏ sheet / ghi rõ, KHÔNG bịa số. */
import type { ExcelSheet } from './export.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = (string | number)[]
type Fmt = (string | undefined)[]

export const EXEC_DOC_TITLE = 'Báo cáo điều hành'
const PCT_INT = '0"%"'
const PCT_DEC = '0.0"%"'

const num = (v: unknown): number | '' => {
  const n = typeof v === 'number' ? v : v == null || v === '' ? NaN : Number(v)
  return Number.isFinite(n) ? n : ''
}
const pctFmt = (v: number | ''): string | undefined => (v === '' ? undefined : Number.isInteger(v) ? PCT_INT : PCT_DEC)
const dmy = (d: unknown): string => {
  const x = d ? new Date(d as string) : null
  if (!x || isNaN(x.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`
}

/** Bảng 4 cột "Nhóm | Chỉ số | Giá trị | Đơn vị / ghi chú" — cột Giá trị CHỈ chứa số thật. */
class Kv {
  rows: Row[] = []
  fmts: Fmt[] = []
  add(group: string, label: string, value: unknown, unit: string, o: { pct?: boolean } = {}) {
    const v = num(value)
    this.rows.push([group, label, v, unit])
    this.fmts.push(['', '', o.pct ? pctFmt(v) : undefined, ''].map(x => x || undefined))
  }
  get empty() { return this.rows.length === 0 }
}

const KV_HEADERS = ['Nhóm', 'Chỉ số', 'Giá trị', 'Đơn vị / ghi chú']

export function buildExecutiveSheets(data: any, ai?: { text?: string; generatedBy?: string } | null): ExcelSheet[] {
  const meta = data?.meta ?? {}
  const s = data?.summary ?? {}
  const f = data?.finance ?? {}
  const scope = `Kỳ ${meta.periodName ?? '—'}`
  const sheets: ExcelSheet[] = []

  /* 1. Tổng quan: sức khỏe + chỉ số điều hành + tài chính kỳ */
  const ov = new Kv()
  ov.add('Sức khỏe CLB', 'Điểm sức khỏe tổng hợp', data?.health?.overall ?? s.clubHealthScore, '/100')
  for (const d of data?.health?.dimensions ?? []) {
    const sc = num(d?.score)
    ov.add('Sức khỏe CLB', String(d?.key ?? ''), sc, sc === '' ? 'chưa đủ dữ liệu' : '/100')
  }
  ov.add('Chỉ số điều hành', 'Thành viên hoạt động', s.activeMembers, `/${s.totalMembers ?? '—'} thành viên`)
  ov.add('Chỉ số điều hành', 'Tỷ lệ tham gia', s.participationRate, 'điểm danh / sĩ số', { pct: true })
  ov.add('Chỉ số điều hành', 'Tổng số buổi chơi', s.totalSessions, 'buổi')
  ov.add('Chỉ số điều hành', 'Buổi hoàn thành', s.completedSessions, 'buổi')
  ov.add('Chỉ số điều hành', 'Buổi bị hủy', s.cancelledSessions, 'buổi')
  ov.add('Chỉ số điều hành', 'Giải / Minigame', s.tournamentsCount, 'trong kỳ')
  ov.add('Chỉ số điều hành', 'Công nợ', s.outstandingCount, 'thành viên chưa đủ đóng')
  ov.add('Tài chính kỳ', 'Tổng thu', f.totalIncome ?? s.totalIncome, 'VNĐ')
  ov.add('Tài chính kỳ', 'Tổng chi', f.totalExpense ?? s.totalExpense, 'VNĐ')
  ov.add('Tài chính kỳ', 'Cân đối kỳ', f.balance ?? s.balance, 'VNĐ')
  ov.add('Tài chính kỳ', 'Quỹ đầu kỳ', f.carryForward ?? s.carryForward, 'VNĐ')
  ov.add('Tài chính kỳ', 'Tổng tài sản (cuối kỳ)', f.clubAssets ?? s.clubAssets, 'VNĐ')
  ov.add('Tài chính kỳ', 'Chi phí sân', f.courtExpenses, 'VNĐ')
  ov.add('Tài chính kỳ', 'Chi sinh hoạt', f.livingExpenses, 'VNĐ')
  ov.add('Tài chính kỳ', 'Thu bình quân / thành viên', f.avgIncomePerMember, 'VNĐ')
  ov.add('Tài chính kỳ', 'Quỹ phụ — thu', f.miniIncome, 'VNĐ')
  ov.add('Tài chính kỳ', 'Quỹ phụ — chi', f.miniExpense, 'VNĐ')
  ov.add('Tài chính kỳ', 'Quỹ phụ — số dư', f.miniBalance, 'VNĐ')
  const cmp = f.compare
  if (cmp) {
    ov.add('So với kỳ trước', 'Thu', cmp.incomeDeltaPct, cmp.incomeDeltaPct == null ? 'không có kỳ trước' : '% thay đổi')
    ov.add('So với kỳ trước', 'Chi', cmp.expenseDeltaPct, cmp.expenseDeltaPct == null ? 'không có kỳ trước' : '% thay đổi')
    ov.add('So với kỳ trước', 'Cân đối', cmp.balanceDeltaPct, cmp.balanceDeltaPct == null ? 'không có kỳ trước' : '% thay đổi')
  }
  sheets.push({ name: 'Tổng quan', headers: KV_HEADERS, rows: ov.rows, cellFormats: ov.fmts, subtitle: scope })

  /* 2. Tài chính theo tháng (kỳ trend) + lũy kế chênh lệch */
  const trends = [...(f.trends ?? [])].sort((a: any, b: any) => String(a?.startDate ?? '').localeCompare(String(b?.startDate ?? '')))
  if (trends.length > 0) {
    let cum = 0, sThu = 0, sChi = 0
    const rows: Row[] = trends.map((t: any) => {
      const thu = Number(t.thu) || 0, chi = Number(t.chi) || 0
      cum += thu - chi; sThu += thu; sChi += chi
      return [String(t.name ?? ''), thu, chi, thu - chi, cum]
    })
    sheets.push({
      name: 'Tài chính',
      headers: ['Kỳ', 'Thu (VNĐ)', 'Chi (VNĐ)', 'Chênh lệch (VNĐ)', 'Lũy kế (VNĐ)'],
      rows,
      footerRows: [['Tổng', sThu, sChi, sThu - sChi, '']],
      subtitle: `${scope} · ${trends.length} kỳ gần nhất · lũy kế = cộng dồn chênh lệch thu − chi`,
    })
  }

  /* 3. Thành viên */
  const members: any[] = data?.members?.all ?? []
  if (members.length > 0) {
    const di = data?.members?.distribution ?? {}
    const sub = `${scope} · sức khỏe TB ${data?.members?.avgHealth ?? '—'}/100 · xuất sắc ${di.excellent ?? 0} · tốt ${di.good ?? 0} · khá ${di.fair ?? 0} · cần quan tâm ${di.atRisk ?? 0}`
    const fm: Fmt[] = []
    const rows: Row[] = members.map((m, i) => {
      const rate = num(m.participationRate)
      fm.push([undefined, undefined, pctFmt(rate)])
      return [
        i + 1, String(m.name ?? ''), rate,
        m.paymentStatus === 'paid' ? 'Đã đóng' : m.paymentStatus === 'debt' ? 'Nợ' : '—',
        num(m.stars), num(m.conductScore), num(m.healthScore),
      ]
    })
    sheets.push({
      name: 'Thành viên',
      headers: ['Hạng', 'Thành viên', 'Tham gia', 'Đóng quỹ', 'Đánh giá (sao)', 'Hạnh kiểm', 'Sức khỏe'],
      rows, cellFormats: fm, subtitle: sub,
    })
  }

  /* 4. Dự báo & Club DNA */
  const fc = data?.forecast
  const dna = data?.dna
  if (fc || dna) {
    const k = new Kv()
    if (fc) {
      k.add('Dự báo quỹ', '+30 ngày', fc.projected30, 'VNĐ')
      k.add('Dự báo quỹ', '+60 ngày', fc.projected60, 'VNĐ')
      k.add('Dự báo quỹ', '+90 ngày', fc.projected90, 'VNĐ')
      k.add('Dự báo quỹ', 'Dòng tiền trung bình', fc.dailyNet, `VNĐ/ngày · ${fc.trendLabel ?? ''}`.replace(/ · $/, ''))
      if (fc.runwayMonths != null) k.add('Dự báo quỹ', 'Quỹ trụ được (nếu tiếp tục âm)', fc.runwayMonths, 'tháng')
      if (fc.note) k.add('Dự báo quỹ', 'Ghi chú', '', String(fc.note))
    }
    if (dna) {
      if (dna.archetype) k.add('Club DNA', 'Phong cách vận hành', '', String(dna.archetype))
      for (const t of dna.traits ?? []) k.add('Club DNA', String(t?.key ?? ''), t?.score, '/100')
      if (dna.note) k.add('Club DNA', 'Ghi chú', '', String(dna.note))
    }
    if (!k.empty) sheets.push({ name: 'Dự báo & DNA', headers: KV_HEADERS, rows: k.rows, cellFormats: k.fmts, subtitle: scope })
  }

  /* 5. Hoạt động, Giải/Minigame & AIDO */
  const act = data?.activity, tour = data?.tournament, ai2 = data?.ai
  const h = new Kv()
  if (act) {
    h.add('Hoạt động', 'Tổng buổi', act.totalSessions, 'buổi')
    h.add('Hoạt động', 'Hoàn thành', act.completed, 'buổi')
    h.add('Hoạt động', 'Bị hủy', act.cancelled, 'buổi')
    h.add('Hoạt động', 'Trung bình người / buổi', act.avgPresentPerSession, 'người')
    if (act.busiest) h.add('Hoạt động', 'Buổi đông nhất', act.busiest.present, `người · ${act.busiest.name ?? ''} ${dmy(act.busiest.date)}`.trim())
    if (act.emptiest) h.add('Hoạt động', 'Buổi ít nhất', act.emptiest.present, `người · ${act.emptiest.name ?? ''} ${dmy(act.emptiest.date)}`.trim())
  }
  if (tour) {
    h.add('Giải / Minigame', 'Số giải', tour.tournamentsCount, 'giải')
    h.add('Giải / Minigame', 'Số trận', tour.matchesCount, 'trận')
    h.add('Giải / Minigame', 'Số đội', tour.teamsCount, 'đội')
    ;(tour.topPlayers ?? []).slice(0, 3).forEach((p: any, i: number) =>
      h.add('Giải / Minigame', `Top ${i + 1}: ${p?.name ?? ''}`, p?.wins, `trận thắng · tỷ lệ thắng ${p?.winRate ?? '—'}%`))
  }
  if (ai2) {
    const g = 'AIDO (văn phòng AI)'
    h.add(g, 'Điểm tự động hóa', ai2.automationScore?.score, ai2.automationScore?.noActivity ? '/100 · chưa dùng AI trong kỳ (không tính là kém)' : '/100')
    if (ai2.hermes) { h.add(g, 'Hermes — workflow hoàn thành', ai2.hermes.completed, `/${ai2.hermes.runs} lượt chạy · ${ai2.hermes.failed} lỗi · ${ai2.hermes.running ?? 0} đang chạy`) }
    if (ai2.lisa) { h.add(g, 'Lisa — hỏi–đáp', ai2.lisa.answered, `${ai2.lisa.reminders} lượt nhắc`) }
    if (ai2.maika) { h.add(g, 'Maika — insight', ai2.maika.insights, `${ai2.maika.actions} đề xuất`) }
    if (ai2.mitdac) { h.add(g, 'Mít Đặc — tác vụ', ai2.mitdac.executed, `${ai2.mitdac.failed} lỗi · TB ${ai2.mitdac.avgMs}ms`) }
    if (ai2.notification) {
      const ch = ai2.notification.byChannel ?? {}
      h.add(g, 'Thông báo đã gửi', ai2.notification.sent, `In-app ${ch.IN_APP ?? 0} · Email ${ch.EMAIL ?? 0} · Telegram ${ch.TELEGRAM ?? 0}`)
    }
  }
  if (!h.empty) sheets.push({ name: 'Hoạt động, Giải & AIDO', headers: KV_HEADERS, rows: h.rows, cellFormats: h.fmts, subtitle: scope })

  /* 6. Sự kiện nổi bật */
  const tl: any[] = data?.timeline ?? []
  sheets.push({
    name: 'Sự kiện',
    headers: ['Ngày', 'Sự kiện', 'Loại', 'Số tiền (VNĐ)'],
    rows: tl.map(t => [dmy(t.date), String(t.label ?? ''), t.type === 'income' ? 'Thu' : t.type === 'expense' ? 'Chi' : 'Khác', num(t.amount)]),
    subtitle: tl.length === 0 ? `${scope} · chưa có sự kiện nổi bật` : `${scope} · ${tl.length} sự kiện nổi bật`,
  })

  /* 7. Cảnh báo & Khuyến nghị */
  const alerts: any[] = data?.alerts ?? []
  const recs: any[] = data?.recommendations ?? []
  const ar: Row[] = [
    ...alerts.map(a => ['Cảnh báo', a.level === 'warning' ? 'Cảnh báo' : 'Thông tin', String(a.message ?? '')] as Row),
    ...recs.map(r => ['Khuyến nghị', String(r.agent ?? ''), String(r.text ?? '')] as Row),
  ]
  if (ar.length === 0) ar.push(['Thông tin', '—', 'Không có cảnh báo hay khuyến nghị — CLB ổn định trong kỳ.'])
  sheets.push({
    name: 'Cảnh báo & Khuyến nghị',
    headers: ['Loại', 'Mức / Nguồn', 'Nội dung'],
    rows: ar,
    subtitle: `${scope} · ${alerts.length} cảnh báo · ${recs.length} khuyến nghị`,
  })

  /* 8. Tóm tắt điều hành (AI) — chỉ khi đã có văn bản */
  const text = String(ai?.text ?? '').trim()
  if (text) {
    sheets.push({
      name: 'Tóm tắt AI',
      headers: ['Tóm tắt điều hành'],
      rows: text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => [l]),
      subtitle: `${scope} · ${ai?.generatedBy === 'ai' ? 'Maika AI viết' : 'Tổng hợp tự động'}`,
    })
  }
  return sheets
}
