import React from 'react'
import type { InfographicReportData } from './infographic.types'
import { makeInfographicPalette, monogramOf, type InfographicPalette } from './infographic.utils'

const VND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(Math.abs(n))) + ' đ'
const FONT = "'Inter', Arial, sans-serif"

function T({ top, left, width, height, children, style }: {
  top: number; left: number; width: number; height: number
  children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={{
      position: 'absolute', top, left, width, height,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      lineHeight: `${height}px`,
      ...style,
    }}>{children}</div>
  )
}

interface Props {
  data: InfographicReportData
  id?: string
  backgroundUrl?: string
  /** Màu chủ đạo CLB (branding.primaryColor); thiếu/sai → mặc định. */
  brand?: string | null
}

/* Poster 1080x1920 — bố cục FROZEN; chỉ đổi MÀU theo màu app (SINH ĐỘNG): nền đặc = màu CLB đậm (mặc định tím #4F46E5),
   số lớn xanh/đỏ/tím đậm, chữ nhỏ bản AA (≥ 4.5:1), cỡ chữ ≥ 14px; không emoji/gradient/bóng. */
export function InfographicOverlayA({ data, id = 'infographic-canvas-a', backgroundUrl, brand }: Props) {
  const P: InfographicPalette = makeInfographicPalette(brand)
  const balPos = data.fundBalance >= 0
  const expRatio = Math.min(100, Math.round(data.expenseIncomeRatio * 100))
  const paidPct = data.totalMembers > 0 ? Math.round(data.paidMembers / data.totalMembers * 100) : 0
  const balColor = balPos ? P.pos : P.neg
  const balVivid = balPos ? P.posVivid : P.negVivid
  const label: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 1 }
  const sub: React.CSSProperties = { fontSize: 14, color: P.muted }
  const statLabel: React.CSSProperties = { fontSize: 14, color: P.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }
  const rowLabel: React.CSSProperties = { fontSize: 18, color: P.onDarkMuted, fontWeight: 600 }

  const kpiCard = (top: number, left: number, border: string, bar: string, bg: string = 'white') => (
    <div style={{ position: 'absolute', top, left, width: 490, height: 156,
      background: bg, borderRadius: 20, border: `1px solid ${border}`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 5, background: bar }}/>
    </div>
  )
  const statBox = (top: number, left: number, w: number, bg: string = P.soft, border: string = P.softBorder) => (
    <div style={{ position: 'absolute', top, left, width: w, height: 136,
      background: bg, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}/>
  )
  const divider = (top: number, alpha: number) => (
    <div style={{ position: 'absolute', top, left: 60, width: 960, height: 1, background: `rgba(255,255,255,${alpha})` }}/>
  )

  return (
    <div id={id} style={{
      width: 1080,
      height: 1920,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: FONT,
      background: backgroundUrl ? `url(${backgroundUrl}) center/cover no-repeat` : 'transparent',
    }}>

      {/* ── PLACEHOLDER BACKGROUND (hidden when backgroundUrl provided) ── */}
      {!backgroundUrl && (
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 1080 1920"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Header zone — màu CLB (đã tối cho chữ trắng AA) */}
          <rect x="0" y="0" width="1080" height="340" fill={P.deep}/>
          {/* Court line accents in header */}
          <rect x="40" y="20" width="1000" height="300" fill="none" stroke="white" strokeWidth="2" opacity="0.07"/>
          <line x1="540" y1="20" x2="540" y2="320" stroke="white" strokeWidth="1.5" opacity="0.05"/>
          <line x1="40" y1="180" x2="1040" y2="180" stroke="white" strokeWidth="3" opacity="0.07" strokeDasharray="16 10"/>

          {/* Decorative ball */}
          <circle cx="980" cy="80" r="58" fill="none" stroke="white" strokeWidth="3" opacity="0.13"/>
          <circle cx="980" cy="80" r="42" fill="none" stroke="white" strokeWidth="1.5" opacity="0.1"/>
          <line x1="938" y1="80" x2="1022" y2="80" stroke="white" strokeWidth="1.5" opacity="0.1"/>
          <line x1="980" y1="38" x2="980" y2="122" stroke="white" strokeWidth="1.5" opacity="0.1"/>

          {/* KPI card zone */}
          <rect x="0" y="340" width="1080" height="380" fill={P.surface2}/>
          <rect x="32" y="368" width="490" height="156" rx="20" fill="white"/>
          <rect x="558" y="368" width="490" height="156" rx="20" fill="white"/>
          <rect x="32" y="548" width="490" height="156" rx="20" fill="white"/>
          <rect x="558" y="548" width="490" height="156" rx="20" fill="white"/>

          {/* Ratio zone */}
          <rect x="0" y="720" width="1080" height="200" fill={P.soft}/>

          {/* Stats zone */}
          <rect x="0" y="920" width="1080" height="400" fill="white"/>
          <rect x="32" y="948" width="310" height="136" rx="16" fill={P.surface2}/>
          <rect x="386" y="948" width="310" height="136" rx="16" fill={P.surface2}/>
          <rect x="740" y="948" width="308" height="136" rx="16" fill={P.surface2}/>
          <rect x="32" y="1108" width="310" height="136" rx="16" fill={P.surface2}/>
          <rect x="386" y="1108" width="310" height="136" rx="16" fill={P.surface2}/>
          <rect x="740" y="1108" width="308" height="136" rx="16" fill={P.surface2}/>

          {/* Summary zone — tối từ màu CLB */}
          <rect x="0" y="1320" width="1080" height="440" fill={P.dark}/>
          <line x1="0" y1="1420" x2="1080" y2="1420" stroke="white" strokeWidth="1" opacity="0.04"/>
          <line x1="0" y1="1520" x2="1080" y2="1520" stroke="white" strokeWidth="1" opacity="0.04"/>
          <line x1="0" y1="1620" x2="1080" y2="1620" stroke="white" strokeWidth="1" opacity="0.04"/>

          {/* Footer */}
          <rect x="0" y="1760" width="1080" height="160" fill={P.darker}/>

          {/* Bottom bar */}
          <rect x="0" y="1864" width="1080" height="56" fill={P.darkest}/>
        </svg>
      )}

      {/* ═══════════ SECTION 1: HEADER (top 0 → 340) ═══════════ */}

      {/* Paddle SVG */}
      <svg width="64" height="128" viewBox="0 0 52 104" style={{ position: 'absolute', top: 80, left: 44, opacity: 0.18 }}>
        <ellipse cx="26" cy="38" rx="24" ry="36" fill="white"/>
        <rect x="22" y="72" width="8" height="30" rx="4" fill="white"/>
      </svg>

      {/* Huy hiệu: khiên trắng + chữ cái đầu tên CLB (monogram) */}
      <svg width="56" height="62" viewBox="0 0 56 62" style={{ position: 'absolute', top: 138, left: 116 }}>
        <path d="M28 2 L54 14 L54 38 C54 52 28 62 28 62 C28 62 2 52 2 38 L2 14 Z" fill="white"/>
        <text x="28" y="38" textAnchor="middle" fill={P.deep} fontSize={monogramOf(data.clubName).length > 1 ? 17 : 22} fontWeight={800} fontFamily="Arial">
          {monogramOf(data.clubName)}
        </text>
      </svg>

      <T top={46} left={190} width={680} height={22}
        style={{ fontSize: 14, fontWeight: 800, letterSpacing: 5, color: P.onDark, textTransform: 'uppercase' }}>
        BÁO CÁO TÀI CHÍNH
      </T>

      {/* Club name — 2 lines allowed */}
      <div style={{
        position: 'absolute', top: 72, left: 190, width: 700, height: 88,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        fontSize: 52, fontWeight: 950, color: P.onDark,
        letterSpacing: -2, lineHeight: 1.1,
      }}>
        {data.clubName}
      </div>

      {/* Period pill */}
      <div style={{ position: 'absolute', top: 175, left: 190, width: 600, height: 36, overflow: 'hidden' }}>
        <span style={{
          display: 'inline-block', background: P.pill,
          border: '1px solid rgba(255,255,255,0.5)', borderRadius: 99,
          padding: '5px 18px', fontSize: 14, color: P.onDark, fontWeight: 700,
          whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {data.periodLabel}
        </span>
      </div>

      {/* Export date — top right */}
      <T top={56} left={840} width={208} height={18}
        style={{ fontSize: 14, color: P.onDark, textAlign: 'right' }}>
        Xuất ngày
      </T>
      <T top={78} left={810} width={238} height={28}
        style={{ fontSize: 20, fontWeight: 900, color: P.onDark, textAlign: 'right' }}>
        {data.exportDate}
      </T>

      {/* Report title — bottom of header */}
      <T top={268} left={0} width={1080} height={60}
        style={{ fontSize: 42, fontWeight: 950, color: P.onDark, textAlign: 'center', letterSpacing: -1 }}>
        {data.reportTitle}
      </T>

      {/* ═══════════ SECTION 2: KPI CARDS (top 340 → 720) ═══════════ */}

      {/* Card 1 — Tổng thu */}
      {kpiCard(368, 32, P.posBorder, P.posFill, P.posTint)}
      <T top={384} left={56} width={300} height={18} style={label}>TỔNG THU</T>
      <T top={408} left={56} width={440} height={52}
        style={{ fontSize: 38, fontWeight: 950, color: P.posVivid, letterSpacing: -1 }}>
        {VND(data.totalIncome)}
      </T>
      <T top={470} left={56} width={440} height={24} style={sub}>
        {data.totalMembers} thành viên · {data.totalSessions} buổi
      </T>

      {/* Card 2 — Tổng chi */}
      {kpiCard(368, 558, P.negBorder, P.negFill, P.negTint)}
      <T top={384} left={582} width={300} height={18} style={label}>TỔNG CHI</T>
      <T top={408} left={582} width={440} height={52}
        style={{ fontSize: 38, fontWeight: 950, color: P.negVivid, letterSpacing: -1 }}>
        {VND(data.totalExpense)}
      </T>
      <T top={470} left={582} width={440} height={24} style={sub}>
        Tỷ lệ chi / thu: {expRatio}%
      </T>

      {/* Card 3 — Số dư */}
      {kpiCard(548, 32, balPos ? P.posBorder : P.negBorder, balPos ? P.posFill : P.negFill, balPos ? P.posTint : P.negTint)}
      <T top={564} left={56} width={300} height={18} style={label}>SỐ DƯ QUỸ</T>
      <T top={588} left={56} width={440} height={52}
        style={{ fontSize: 38, fontWeight: 950, color: balVivid, letterSpacing: -1 }}>
        {balPos ? '+' : '-'}{VND(data.fundBalance)}
      </T>
      <T top={650} left={56} width={440} height={24}
        style={{ fontSize: 14, color: balColor, fontWeight: 600 }}>
        {balPos ? 'Quỹ dương — ổn định' : 'Quỹ âm — cần bổ sung'}
      </T>

      {/* Card 4 — Đóng quỹ */}
      {kpiCard(548, 558, P.softBorder, P.brand, P.soft)}
      <T top={564} left={582} width={300} height={18} style={label}>ĐÓNG QUỸ</T>
      <T top={588} left={582} width={440} height={52}
        style={{ fontSize: 38, fontWeight: 950, color: P.ink, letterSpacing: -1 }}>
        {data.paidMembers}/{data.totalMembers}
      </T>
      <T top={650} left={582} width={440} height={24} style={sub}>
        {paidPct}% đã hoàn thành · {data.unpaidMembers} chưa đóng
      </T>

      {/* ═══════════ SECTION 3: EXPENSE RATIO BAR (top 720 → 920) ═══════════ */}

      <T top={740} left={40} width={600} height={32}
        style={{ fontSize: 20, fontWeight: 900, color: P.text }}>
        Tỷ lệ Chi / Thu
      </T>
      <T top={740} left={700} width={340} height={32}
        style={{ fontSize: 22, fontWeight: 950, color: balVivid, textAlign: 'right' }}>
        {expRatio}%
      </T>

      <div style={{ position: 'absolute', top: 784, left: 40, width: 1000, height: 28,
        background: P.line, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${Math.max(4, expRatio)}%`,
          background: expRatio >= 90 ? P.negFill : expRatio >= 70 ? P.warnFill : P.posFill,
          borderRadius: 14,
        }}/>
      </div>

      <T top={824} left={40} width={300} height={20} style={sub}>
        0đ
      </T>
      <T top={824} left={740} width={300} height={20} style={{ ...sub, textAlign: 'right' }}>
        {VND(data.totalIncome)}
      </T>

      <T top={860} left={0} width={1080} height={52}
        style={{ fontSize: 36, fontWeight: 950, color: P.text, textAlign: 'center' }}>
        THỐNG KÊ CHI TIẾT
      </T>

      {/* ═══════════ SECTION 4: STAT BOXES (top 920 → 1320) ═══════════ */}

      {statBox(948, 32, 310)}
      <T top={966} left={52} width={270} height={18} style={statLabel}>Tổng buổi</T>
      <T top={990} left={52} width={270} height={56} style={{ fontSize: 44, fontWeight: 950, color: P.ink }}>
        {data.totalSessions}
      </T>
      <T top={1052} left={52} width={270} height={20} style={sub}>buổi tập trong kỳ</T>

      {statBox(948, 386, 310)}
      <T top={966} left={406} width={270} height={18} style={statLabel}>Thành viên</T>
      <T top={990} left={406} width={270} height={56} style={{ fontSize: 44, fontWeight: 950, color: P.cyan }}>
        {data.totalMembers}
      </T>
      <T top={1052} left={406} width={270} height={20} style={sub}>người tham gia kỳ</T>

      {statBox(948, 740, 308, P.posTint, P.posBorder)}
      <T top={966} left={760} width={268} height={18} style={statLabel}>Đã đóng quỹ</T>
      <T top={990} left={760} width={268} height={56} style={{ fontSize: 44, fontWeight: 950, color: P.posVivid }}>
        {data.paidMembers}
      </T>
      <T top={1052} left={760} width={268} height={20} style={sub}>/ {data.totalMembers} thành viên</T>

      {statBox(1108, 32, 310, P.negTint, P.negBorder)}
      <T top={1126} left={52} width={270} height={18} style={statLabel}>Chưa đóng</T>
      <T top={1150} left={52} width={270} height={56} style={{ fontSize: 44, fontWeight: 950, color: P.negVivid }}>
        {data.unpaidMembers}
      </T>
      <T top={1212} left={52} width={270} height={20} style={sub}>thành viên nợ quỹ</T>

      {statBox(1108, 386, 310)}
      <T top={1126} left={406} width={270} height={18} style={statLabel}>Phí sân TB</T>
      <T top={1150} left={406} width={270} height={44} style={{ fontSize: 30, fontWeight: 950, color: P.orange }}>
        {data.totalSessions > 0
          ? VND(Math.round(data.totalExpense / data.totalSessions))
          : '—'}
      </T>
      <T top={1208} left={406} width={270} height={20} style={sub}>mỗi buổi</T>

      {statBox(1108, 740, 308)}
      <T top={1126} left={760} width={268} height={18} style={statLabel}>Tỷ lệ đóng</T>
      <T top={1150} left={760} width={268} height={44} style={{ fontSize: 30, fontWeight: 950, color: P.ink }}>
        {paidPct}%
      </T>
      <T top={1208} left={760} width={268} height={20} style={sub}>hoàn thành kỳ</T>

      {/* ═══════════ SECTION 5: DARK SUMMARY (top 1320 → 1760) ═══════════ */}

      <T top={1356} left={0} width={1080} height={48}
        style={{ fontSize: 34, fontWeight: 950, color: P.onDark, textAlign: 'center', letterSpacing: 1 }}>
        TỔNG KẾT KỲ
      </T>
      <T top={1404} left={0} width={1080} height={26}
        style={{ fontSize: 16, color: P.onDarkMuted, textAlign: 'center' }}>
        {data.periodLabel}
      </T>

      {divider(1446, 0.07)}

      <T top={1464} left={60} width={520} height={28} style={rowLabel}>Tổng thu nhập kỳ</T>
      <T top={1464} left={580} width={440} height={28}
        style={{ fontSize: 20, fontWeight: 900, color: P.posOnDark, textAlign: 'right' }}>
        + {VND(data.totalIncome)}
      </T>

      {divider(1500, 0.05)}

      <T top={1512} left={60} width={520} height={28} style={rowLabel}>Tổng chi phí kỳ</T>
      <T top={1512} left={580} width={440} height={28}
        style={{ fontSize: 20, fontWeight: 900, color: P.negOnDark, textAlign: 'right' }}>
        - {VND(data.totalExpense)}
      </T>

      {divider(1548, 0.05)}

      <T top={1560} left={60} width={520} height={28} style={rowLabel}>Tổng số buổi</T>
      <T top={1560} left={580} width={440} height={28}
        style={{ fontSize: 20, fontWeight: 900, color: P.onDark, textAlign: 'right' }}>
        {data.totalSessions} buổi
      </T>

      {divider(1596, 0.05)}

      <T top={1608} left={60} width={520} height={28} style={rowLabel}>Thành viên tham gia</T>
      <T top={1608} left={580} width={440} height={28}
        style={{ fontSize: 20, fontWeight: 900, color: P.onDark, textAlign: 'right' }}>
        {data.totalMembers} người
      </T>

      {divider(1644, 0.05)}

      <T top={1656} left={60} width={520} height={28} style={rowLabel}>Đã đóng quỹ</T>
      <T top={1656} left={580} width={440} height={28}
        style={{ fontSize: 20, fontWeight: 900, color: P.posOnDark, textAlign: 'right' }}>
        {data.paidMembers}/{data.totalMembers} ({paidPct}%)
      </T>

      {/* Highlighted balance row */}
      <div style={{ position: 'absolute', top: 1706, left: 60, width: 960, height: 52,
        background: balPos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        borderRadius: 14, border: `1px solid ${balPos ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}/>
      <T top={1720} left={80} width={500} height={26}
        style={{ fontSize: 18, fontWeight: 800, color: balPos ? P.posOnDark : P.negOnDark }}>
        {balPos ? 'Số dư dương — Quỹ ổn định' : 'Số dư âm — Cần bổ sung'}
      </T>
      <T top={1718} left={540} width={480} height={30}
        style={{ fontSize: 22, fontWeight: 950, color: balPos ? P.posOnDark : P.negOnDark, textAlign: 'right' }}>
        {balPos ? '+' : '-'}{VND(data.fundBalance)}
      </T>

      {/* ═══════════ SECTION 6: FOOTER (top 1760 → 1864) ═══════════ */}

      <svg width="80" height="110" viewBox="0 0 72 110" style={{ position: 'absolute', bottom: 56, left: 30, opacity: 0.16 }}>
        <ellipse cx="36" cy="14" rx="12" ry="12" fill="white"/>
        <rect x="24" y="28" width="24" height="44" rx="8" fill="white"/>
        <rect x="8" y="32" width="18" height="10" rx="5" fill="white" transform="rotate(-15 8 32)"/>
        <rect x="26" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(-4 26 72)"/>
        <rect x="38" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(4 38 72)"/>
      </svg>
      <svg width="80" height="110" viewBox="0 0 72 110" style={{ position: 'absolute', bottom: 56, right: 30, opacity: 0.16, transform: 'scaleX(-1)' }}>
        <ellipse cx="36" cy="14" rx="12" ry="12" fill="white"/>
        <rect x="24" y="28" width="24" height="44" rx="8" fill="white"/>
        <rect x="8" y="32" width="18" height="10" rx="5" fill="white" transform="rotate(-15 8 32)"/>
        <rect x="26" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(-4 26 72)"/>
        <rect x="38" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(4 38 72)"/>
      </svg>

      <T top={1780} left={0} width={1080} height={46}
        style={{ fontSize: 30, fontWeight: 950, color: P.onDark, letterSpacing: 3, textAlign: 'center' }}>
        CHƠI HẾT MÌNH · ĐÓNG QUỸ HẾT Ý
      </T>
      <T top={1830} left={0} width={1080} height={26}
        style={{ fontSize: 15, color: P.onDarkMuted, textAlign: 'center' }}>
        {data.clubName} · PickleFund
      </T>

      {/* ═══════════ SECTION 7: BOTTOM BAR (top 1864 → 1920) ═══════════ */}

      <T top={1880} left={36} width={220} height={24}
        style={{ fontSize: 15, fontWeight: 900, color: P.onDark }}>
        PickleFund
      </T>
      <T top={1880} left={256} width={568} height={24}
        style={{ fontSize: 14, color: P.onDarkMuted, textAlign: 'center' }}>
        Quản lý quỹ câu lạc bộ thể thao
      </T>
      <T top={1882} left={820} width={224} height={20}
        style={{ fontSize: 14, color: P.onDarkMuted, textAlign: 'right' }}>
        {data.exportDate}
      </T>
    </div>
  )
}
