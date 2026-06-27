import type { InfographicReportData } from './infographic.types'

const VND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(Math.abs(n))) + ' đ'

const AVATAR_COLORS = ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#EC4899','#06B6D4','#F97316']
function getAvatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  const w = name.trim().split(/\s+/)
  return w.length >= 2 ? (w[w.length - 2][0] + w[w.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

function MemberCard({ member, index }: { member: InfographicReportData['members'][number]; index: number }) {
  const pct = member.totalSessions ? Math.round(member.attendedSessions / member.totalSessions * 100) : 0
  const mBalPos = member.balance >= 0
  const avatarColor = getAvatarColor(member.name)

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 24,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      breakInside: 'avoid',
    }}>
      {/* Top color strip */}
      <div style={{ height: 5, background: avatarColor }} />

      {/* Card body */}
      <div style={{ padding: '20px 22px 22px' }}>

        {/* Row 1 — Player header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          {/* Jersey number */}
          <div style={{
            fontSize: 44,
            fontWeight: 950,
            color: avatarColor,
            opacity: 0.12,
            lineHeight: 1,
            minWidth: 52,
            userSelect: 'none',
          }}>
            #{String(index + 1).padStart(2, '0')}
          </div>

          {/* Avatar circle */}
          <div style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: avatarColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 17 }}>{getInitials(member.name)}</span>
          </div>

          {/* Name + badge column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#0F172A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              WebkitLineClamp: 2,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical' as const,
              lineHeight: 1.3,
            }}>
              {member.name}
            </div>
            <div style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 99,
              background: member.isPaid ? '#DCFCE7' : '#FFF7ED',
              color: member.isPaid ? '#059669' : '#D97706',
              border: `1px solid ${member.isPaid ? '#86EFAC' : '#FCD34D'}`,
              alignSelf: 'flex-start',
              whiteSpace: 'nowrap',
            }}>
              {member.isPaid ? '✓ Đã đóng quỹ' : '⏳ Chưa đóng'}
            </div>
          </div>
        </div>

        {/* Row 2 — Attendance */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Tham gia buổi tập</span>
            <span style={{ fontWeight: 800, color: '#0F172A' }}>{member.attendedSessions}/{member.totalSessions} buổi</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 99,
              background: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444',
            }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{pct}%</div>
        </div>

        {/* Row 3 — Finance box */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '14px 16px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px dashed #E2E8F0' }}>
            <span style={{ color: '#64748B', fontSize: 12 }}>Phí sân</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{VND(member.courtFee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px dashed #E2E8F0', paddingTop: 10 }}>
            <span style={{ color: '#64748B', fontSize: 12 }}>Sinh hoạt</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{VND(member.livingFee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0B2A4A' }}>Tổng chi phí</span>
            <span style={{ fontSize: 16, fontWeight: 950, color: '#0B2A4A' }}>{VND(member.totalCost)}</span>
          </div>
        </div>

        {/* Row 4 — Balance highlight */}
        <div style={{
          borderRadius: 14,
          padding: '12px 16px',
          background: mBalPos ? '#ECFDF5' : '#FFF1F2',
          border: `1px solid ${mBalPos ? '#BBF7D0' : '#FECACA'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: mBalPos ? '#059669' : '#EF4444' }}>
            {mBalPos ? '💚' : '⚠️'} {mBalPos ? 'Số dư còn lại' : 'Cần nộp thêm'}
          </span>
          <span style={{ fontSize: 18, fontWeight: 950, color: mBalPos ? '#059669' : '#EF4444' }}>
            {member.balance >= 0 ? '+' : ''}{VND(member.balance)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function InfographicTemplateB({ data, id = 'infographic-canvas-b' }: { data: InfographicReportData; id?: string }) {
  const fundBalance = data.totalIncome - data.totalExpense

  return (
    <div id={id} style={{ width: 1080, background: '#F0FDF4', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* HEADER */}
      <div style={{ height: 200, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #059669 0%, #0B2A4A 100%)' }}>
        {/* Court lines SVG */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 1080 200"
          preserveAspectRatio="none"
        >
          <rect x="40" y="15" width="1000" height="170" fill="none" stroke="white" strokeWidth="2" opacity="0.15" />
          <line x1="540" y1="15" x2="540" y2="185" stroke="white" strokeWidth="1.5" opacity="0.1" />
          <line x1="40" y1="100" x2="1040" y2="100" stroke="white" strokeWidth="3" opacity="0.12" strokeDasharray="10 8" />
        </svg>

        {/* Header content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '32px 48px', display: 'flex', alignItems: 'center', gap: 32, height: '100%', boxSizing: 'border-box' }}>
          {/* Paddle SVG */}
          <svg width="56" height="110" viewBox="0 0 56 110" style={{ opacity: 0.25, flexShrink: 0 }}>
            <ellipse cx="28" cy="38" rx="26" ry="36" fill="white" />
            <rect x="24" y="72" width="8" height="34" rx="4" fill="white" />
          </svg>

          {/* Center */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 4, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
              BILL CHI TIẾT THÀNH VIÊN
            </div>
            <div style={{ fontSize: 52, fontWeight: 950, color: 'white', letterSpacing: -2, lineHeight: 1.1, margin: '4px 0' }}>
              PickleFund
            </div>
            <div style={{
              background: 'rgba(250,204,21,0.18)',
              border: '1px solid rgba(250,204,21,0.4)',
              borderRadius: 99,
              padding: '5px 16px',
              fontSize: 13,
              color: '#FACC15',
              fontWeight: 700,
              display: 'inline-block',
              marginTop: 8,
            }}>
              {data.periodLabel}
            </div>
          </div>

          {/* Right */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Xuất ngày</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'white', display: 'block', marginTop: 2 }}>{data.exportDate}</span>
            <div style={{
              marginTop: 10,
              display: 'inline-block',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 8,
              padding: '4px 12px',
              fontSize: 12,
              color: 'rgba(255,255,255,0.75)',
            }}>
              {data.totalSessions} buổi | {data.totalMembers} thành viên
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div style={{ height: 80, background: '#022C22', display: 'flex' }}>
        {/* Col 1 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>💰 TỔNG THU</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#10B981', marginTop: 4 }}>{VND(data.totalIncome)}</span>
        </div>
        {/* Col 2 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>📤 TỔNG CHI</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#F97316', marginTop: 4 }}>{VND(data.totalExpense)}</span>
        </div>
        {/* Col 3 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>🏦 SỐ DƯ</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: fundBalance >= 0 ? '#10B981' : '#EF4444', marginTop: 4 }}>
            {fundBalance >= 0 ? '+' : '-'}{VND(Math.abs(fundBalance))}
          </span>
        </div>
      </div>

      {/* MEMBERS SECTION HEADER */}
      <div style={{ padding: '32px 40px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#0B2A4A' }}>👥 Chi tiết thành viên</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{
            background: '#DCFCE7',
            color: '#059669',
            border: '1px solid #86EFAC',
            borderRadius: 99,
            padding: '5px 14px',
            fontSize: 13,
            fontWeight: 700,
          }}>
            {data.paidMembers} đã đóng ✓
          </span>
          <span style={{
            background: '#FFFBEB',
            color: '#D97706',
            border: '1px solid #FCD34D',
            borderRadius: 99,
            padding: '5px 14px',
            fontSize: 13,
            fontWeight: 700,
          }}>
            {data.unpaidMembers} chưa đóng
          </span>
        </div>
      </div>

      {/* MEMBER CARDS GRID */}
      <div style={{ padding: '0 40px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
        {data.members.map((member, index) => (
          <MemberCard key={member.name + index} member={member} index={index} />
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: 48, position: 'relative', overflow: 'hidden', minHeight: 160, background: 'linear-gradient(135deg, #040E1C 0%, #065F46 100%)' }}>
        {/* Left silhouette */}
        <svg width="80" height="120" viewBox="0 0 80 120" style={{ position: 'absolute', bottom: 0, left: 24, opacity: 0.15 }}>
          <ellipse cx="40" cy="18" rx="14" ry="14" fill="white" />
          <rect x="28" y="32" width="24" height="48" rx="8" fill="white" />
          <rect x="18" y="36" width="18" height="8" rx="4" fill="white" />
          <rect x="32" y="80" width="10" height="36" rx="5" fill="white" />
          <rect x="44" y="80" width="10" height="36" rx="5" fill="white" />
        </svg>

        {/* Right silhouette (mirrored) */}
        <svg width="80" height="120" viewBox="0 0 80 120" style={{ position: 'absolute', bottom: 0, right: 24, opacity: 0.15, transform: 'scaleX(-1)' }}>
          <ellipse cx="40" cy="18" rx="14" ry="14" fill="white" />
          <rect x="28" y="32" width="24" height="48" rx="8" fill="white" />
          <rect x="18" y="36" width="18" height="8" rx="4" fill="white" />
          <rect x="32" y="80" width="10" height="36" rx="5" fill="white" />
          <rect x="44" y="80" width="10" height="36" rx="5" fill="white" />
        </svg>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '36px 40px 32px' }}>
          <div style={{ fontSize: 24, fontWeight: 950, color: '#FACC15', letterSpacing: 2 }}>
            CHƠI HẾT MÌNH · ĐÓNG QUỸ HẾT Ý
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
            {data.clubName}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{
        height: 56,
        background: '#020810',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 40px',
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
      }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#10B981' }}>🥒 PickleFund</span>
        <span>{data.exportDate}</span>
      </div>
    </div>
  )
}
