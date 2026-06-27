import type { InfographicReportData } from './infographic.types'
import { fmtVNDFull } from './infographic.utils'

/* ── SVG Pickleball Ball ── */
function PickleballBall({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#F0A500" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
      <path d="M4 20 Q12 6 20 20 Q28 34 36 20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4 20 Q12 34 20 20 Q28 6 36 20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/* ── SVG Racquet ── */
function PickleballRacquet({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 28 40" className={className} aria-hidden="true">
      <ellipse cx="14" cy="14" rx="12" ry="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <line x1="14" y1="26" x2="14" y2="40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="8" y1="10" x2="20" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="8" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="8" y1="18" x2="20" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

/* ── Shared style tokens ── */
const S = {
  /* colours */
  green900: '#064E3B',
  green800: '#065F46',
  green600: '#059669',
  green500: '#10B981',
  amber:    '#F59E0B',
  red:      '#EF4444',
  blue:     '#3B82F6',
  indigo:   '#4F46E5',
  white:    '#FFFFFF',
  slate50:  '#F8FAFC',
  slate100: '#F1F5F9',
  slate400: '#94A3B8',
  slate700: '#334155',
  slate900: '#0F172A',
  /* fonts */
  fontMono: "'SF Mono', 'Fira Mono', monospace",
}

/* ── Member balance badge ── */
function BalanceBadge({ balance }: { balance: number }) {
  if (balance > 0) {
    return (
      <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
        Còn dư
      </span>
    )
  }
  if (balance < 0) {
    return (
      <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
        Cần nộp thêm
      </span>
    )
  }
  return (
    <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
      Đã cân đối
    </span>
  )
}

function PaidBadge({ isPaid }: { isPaid: boolean }) {
  return isPaid
    ? <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Đã đóng</span>
    : <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Chưa đóng</span>
}

/* ── Avatar initials ── */
function Avatar({ name, idx }: { name: string; idx: number }) {
  const colors = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#7C3AED', '#0891B2']
  const bg = colors[idx % colors.length]
  const initials = name.split(' ').slice(-2).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

/* ── Main component ── */
interface InfographicReportProps {
  data: InfographicReportData
  id?: string
}

export function InfographicReport({ data, id = 'infographic-canvas' }: InfographicReportProps) {
  const expRatio = data.expenseIncomeRatio
  const ratioColor = expRatio <= 70 ? S.green600 : expRatio <= 100 ? S.amber : S.red
  const ratioLabel = expRatio <= 70 ? 'Quỹ hoạt động tốt' : expRatio <= 100 ? 'Cần theo dõi' : 'Chi vượt thu'

  const balanceColor = data.fundBalance >= 0 ? S.green600 : S.red

  return (
    <div
      id={id}
      style={{
        width: 540,
        background: S.white,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(145deg, ${S.green900} 0%, ${S.green800} 50%, #047857 100%)`,
        padding: '28px 28px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorative balls */}
        <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.08 }}>
          <PickleballBall size={120} />
        </div>
        <div style={{ position: 'absolute', bottom: -10, right: 60, opacity: 0.06 }}>
          <PickleballBall size={80} />
        </div>

        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <PickleballBall size={22} />
            <span style={{ color: S.white, fontWeight: 900, fontSize: 15, letterSpacing: 1 }}>PICKLEFUND</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <PickleballRacquet size={22} className="" />
          </div>
        </div>

        {/* Title */}
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          {data.reportTitle}
        </div>

        {/* Club name */}
        <div style={{ color: S.white, fontWeight: 900, fontSize: 22, lineHeight: 1.2, marginBottom: 8 }}>
          {data.clubName}
        </div>

        {/* Period */}
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {data.periodLabel}
        </div>

        {/* Export date */}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
          Xuất ngày {data.exportDate} lúc {data.generatedAt}
        </div>

        {/* Decorative line */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #F59E0B, #10B981, transparent)', borderRadius: 2, marginTop: 20 }} />
      </div>

      {/* ── QUICK SUMMARY BAR ── */}
      <div style={{ background: S.slate900, padding: '14px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
          {[
            { icon: '👥', value: data.totalMembers, label: 'Thành viên' },
            { icon: '📅', value: data.totalSessions, label: 'Buổi tập' },
            { icon: '✅', value: data.paidMembers, label: 'Đã đóng' },
            { icon: '⏳', value: data.unpaidMembers, label: 'Chưa đóng' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14 }}>{item.icon}</div>
              <div style={{ color: S.white, fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>{item.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ padding: '20px 20px 0', background: S.slate50 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {/* Tổng thu */}
          <div style={{ background: S.white, borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>💰</span>
            </div>
            <div style={{ color: S.slate400, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Tổng thu</div>
            <div style={{ color: S.green600, fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{fmtVNDFull(data.totalIncome)}</div>
          </div>

          {/* Tổng chi */}
          <div style={{ background: S.white, borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>💸</span>
            </div>
            <div style={{ color: S.slate400, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Tổng chi</div>
            <div style={{ color: S.red, fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{fmtVNDFull(data.totalExpense)}</div>
          </div>

          {/* Số dư */}
          <div style={{ background: S.white, borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: data.fundBalance >= 0 ? '#DBEAFE' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{data.fundBalance >= 0 ? '🏦' : '⚠️'}</span>
            </div>
            <div style={{ color: S.slate400, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Số dư quỹ</div>
            <div style={{ color: balanceColor, fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{fmtVNDFull(data.fundBalance)}</div>
          </div>
        </div>
      </div>

      {/* ── RATIO BAR ── */}
      <div style={{ padding: '16px 20px 0', background: S.slate50 }}>
        <div style={{ background: S.white, borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: S.slate700, fontWeight: 700, fontSize: 12 }}>Tỷ lệ chi / thu</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: ratioColor, fontWeight: 800, fontSize: 15 }}>{expRatio}%</span>
              <span style={{ background: expRatio <= 70 ? '#DCFCE7' : expRatio <= 100 ? '#FEF3C7' : '#FEE2E2', color: ratioColor, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                {ratioLabel}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(expRatio, 100)}%`,
              background: expRatio <= 70
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : expRatio <= 100
                  ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                  : 'linear-gradient(90deg, #EF4444, #F87171)',
              borderRadius: 4,
              transition: 'width 0.5s',
            }} />
          </div>
        </div>
      </div>

      {/* ── SECTION TITLE: THÀNH VIÊN ── */}
      <div style={{ padding: '20px 20px 10px', background: S.slate50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 18, background: `linear-gradient(180deg, ${S.green600}, ${S.green500})`, borderRadius: 2 }} />
          <span style={{ color: S.slate900, fontWeight: 800, fontSize: 14 }}>Chi Tiết Thành Viên</span>
          <span style={{ marginLeft: 'auto', background: S.green900, color: S.white, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
            {data.members.length} thành viên
          </span>
        </div>
      </div>

      {/* ── MEMBER CARDS ── */}
      <div style={{ padding: '0 20px 0', background: S.slate50 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.members.map((m, idx) => (
            <div key={m.id} style={{
              background: S.white,
              borderRadius: 16,
              padding: '12px 14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: `1px solid ${m.balance < 0 ? '#FEE2E2' : m.balance > 0 ? '#DCFCE7' : '#E2E8F0'}`,
            }}>
              {/* Row 1: avatar + name + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ color: S.slate400, fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                  {idx + 1}
                </div>
                <Avatar name={m.name} idx={idx} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: S.slate900, fontWeight: 800, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </div>
                  <div style={{ color: S.slate400, fontSize: 11, marginTop: 1 }}>
                    {m.attendedSessions}/{m.totalSessions} buổi · {m.attendanceRate}% tham gia
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                  <PaidBadge isPaid={m.isPaid} />
                  <BalanceBadge balance={m.balance} />
                </div>
              </div>

              {/* Row 2: financial stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
                {[
                  { label: 'Đã đóng', value: fmtVNDFull(m.paidAmount), color: S.green600 },
                  { label: 'Chi phí sân', value: fmtVNDFull(m.courtFee), color: S.slate700 },
                  { label: 'Sinh hoạt', value: fmtVNDFull(m.livingFee), color: S.slate700 },
                  { label: 'Số dư', value: fmtVNDFull(m.balance), color: m.balance >= 0 ? S.green600 : S.red },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ color: stat.color, fontWeight: 800, fontSize: 11 }}>{stat.value}</div>
                    <div style={{ color: S.slate400, fontSize: 9, marginTop: 1 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        margin: '20px 0 0',
        background: `linear-gradient(145deg, ${S.green900} 0%, ${S.green800} 100%)`,
        padding: '24px 28px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative balls */}
        <div style={{ position: 'absolute', bottom: -20, left: -20, opacity: 0.08 }}>
          <PickleballBall size={100} />
        </div>
        <div style={{ position: 'absolute', top: -10, right: 20, opacity: 0.07 }}>
          <PickleballBall size={70} />
        </div>

        {/* Divider */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)', borderRadius: 1, marginBottom: 18 }} />

        {/* Slogan */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ color: S.amber, fontWeight: 900, fontSize: 15, letterSpacing: 0.5, marginBottom: 4 }}>
            🏆 Chơi hết mình — Đóng quỹ hết ý
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 1.5 }}>
            Cùng nhau xây dựng CLB ngày càng vững mạnh!
          </div>
        </div>

        {/* Brand footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PickleballBall size={16} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700 }}>PICKLEFUND</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'right' }}>
            Dữ liệu tổng hợp tự động<br />từ hệ thống PickleFund
          </div>
        </div>
      </div>
    </div>
  )
}
