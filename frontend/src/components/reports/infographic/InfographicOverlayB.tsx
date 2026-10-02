import React from 'react'
import type { InfographicReportData } from './infographic.types'
import { makeInfographicPalette, type InfographicPalette } from './infographic.utils'

const VND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(Math.abs(n))) + ' đ'
const FONT = "'Inter', Arial, sans-serif"

function getInitials(name: string) {
  const w = name.trim().split(/\s+/)
  return w.length>=2?(w[w.length-2][0]+w[w.length-1][0]).toUpperCase():name.slice(0,2).toUpperCase()
}

function T({ top, left, width, height, children, style }: {
  top:number; left:number; width:number; height:number;
  children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={{
      position:'absolute', top, left, width, height,
      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      lineHeight:`${height}px`,
      ...style,
    }}>{children}</div>
  )
}

/* Bill thành viên — bố cục FROZEN; chỉ màu/tương phản/cỡ chữ tối thiểu (≥14px) theo chuẩn Luxury SaaS:
   1 màu nhấn = màu CLB (tự tối cho chữ trắng AA), không navy/vàng/đa màu avatar, không emoji/gradient/bóng. */
function MemberCard({ member, index, P }: { member: InfographicReportData['members'][number]; index: number; P: InfographicPalette }) {
  const col = index % 2
  const row = Math.floor(index / 2)
  const cardLeft = col === 0 ? 32 : 548
  const cardTop = 360 + row * 280

  const initials = getInitials(member.name)
  const pct = member.totalSessions ? Math.round(member.attendedSessions / member.totalSessions * 100) : 0
  const mBalPos = member.balance >= 0
  const cut: React.CSSProperties = { position:'absolute', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }

  return (
    <div style={{
      position: 'absolute',
      top: cardTop, left: cardLeft,
      width: 500, height: 260,
      background: 'white',
      borderRadius: 22,
      border: `1px solid ${P.line}`,
      overflow: 'hidden',
    }}>
      {/* Top accent strip */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:5, background:P.brand }}/>

      {/* Jersey number (decorative) */}
      <div style={{ position:'absolute', top:14, left:10, fontSize:38, fontWeight:950, color:P.brand, opacity:0.1, lineHeight:1, userSelect:'none' }}>
        #{String(index+1).padStart(2,'0')}
      </div>

      {/* Avatar circle */}
      <div style={{ position:'absolute', top:12, left:60, width:50, height:50, borderRadius:'50%', background:P.deep, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ color:'white', fontWeight:900, fontSize:16 }}>{initials}</span>
      </div>

      {/* Name — max 2 lines */}
      <div style={{
        position:'absolute', top:14, left:122, width:270, height:44,
        overflow:'hidden',
        display:'-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        fontSize:17, fontWeight:900, color:P.text, lineHeight:1.3,
      }}>
        {member.name}
      </div>

      {/* Status badge */}
      <div style={{
        position:'absolute', top:62, left:122, width:160, height:26,
        overflow:'hidden',
      }}>
        <span style={{
          display:'inline-block', fontSize:14, fontWeight:800,
          padding:'1px 10px', borderRadius:99,
          background: member.isPaid ? P.posTint : P.warnTint,
          color: member.isPaid ? P.pos : P.warn,
          border: `1px solid ${member.isPaid ? P.posFill : P.warnFill}`,
          whiteSpace:'nowrap',
        }}>
          {member.isPaid ? 'Đã đóng' : 'Chưa đóng'}
        </span>
      </div>

      {/* Index badge (top right) */}
      <div style={{ position:'absolute', top:14, right:14, width:34, height:34, borderRadius:'50%', background:P.soft, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:P.ink }}>
        #{index+1}
      </div>

      {/* Attendance label */}
      <div style={{ ...cut, top:98, left:16, width:240, height:20, fontSize:14, color:P.muted, fontWeight:600 }}>
        Tham gia buổi tập
      </div>
      <div style={{ ...cut, top:96, left:260, width:224, height:22, fontSize:14, fontWeight:800, color:P.text, textAlign:'right' }}>
        {member.attendedSessions}/{member.totalSessions} · {pct}%
      </div>

      {/* Progress bar track */}
      <div style={{ position:'absolute', top:122, left:16, width:468, height:10, background:P.line, borderRadius:99, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, height:'100%', width:`${pct}%`, background: pct>=80?P.posFill:pct>=50?P.warnFill:P.negFill, borderRadius:99 }}/>
      </div>

      {/* Finance box bg */}
      <div style={{ position:'absolute', top:144, left:16, width:468, height:76, background:P.surface2, borderRadius:14, border:`1px solid ${P.line}` }}/>

      {/* Phí sân */}
      <div style={{ ...cut, top:151, left:28, width:160, height:20, fontSize:14, color:P.muted }}>Phí sân</div>
      <div style={{ ...cut, top:151, left:190, width:282, height:20, fontSize:14, fontWeight:900, color:P.text, textAlign:'right' }}>{VND(member.courtFee)}</div>
      <div style={{ position:'absolute', top:173, left:28, width:456, height:1, background:P.line }}/>
      {/* Sinh hoạt */}
      <div style={{ ...cut, top:176, left:28, width:160, height:20, fontSize:14, color:P.muted }}>Sinh hoạt</div>
      <div style={{ ...cut, top:176, left:190, width:282, height:20, fontSize:14, fontWeight:900, color:P.text, textAlign:'right' }}>{VND(member.livingFee)}</div>
      <div style={{ position:'absolute', top:198, left:28, width:456, height:1, background:P.line }}/>
      {/* Total */}
      <div style={{ ...cut, top:201, left:28, width:140, height:18, fontSize:14, fontWeight:800, color:P.text }}>Tổng chi phí</div>
      <div style={{ ...cut, top:198, left:190, width:282, height:22, fontSize:15, fontWeight:950, color:P.text, textAlign:'right' }}>{VND(member.totalCost)}</div>

      {/* Balance highlight */}
      <div style={{ position:'absolute', top:224, left:16, width:468, height:28, background:mBalPos?P.posTint:P.negTint, borderRadius:10, border:`1px solid ${mBalPos?P.posFill:P.negFill}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px', boxSizing:'border-box' }}>
        <span style={{ fontSize:14, fontWeight:700, color:mBalPos?P.pos:P.neg, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:240 }}>
          {mBalPos?'Số dư còn lại':'Cần nộp thêm'}
        </span>
        <span style={{ fontSize:15, fontWeight:950, color:mBalPos?P.pos:P.neg, whiteSpace:'nowrap', flexShrink:0, marginLeft:8 }}>
          {member.balance>=0?'+':'-'}{VND(member.balance)}
        </span>
      </div>
    </div>
  )
}

export function InfographicOverlayB({ data, id = 'infographic-canvas-b', brand }: { data: InfographicReportData; id?: string; brand?: string | null }) {
  const P = makeInfographicPalette(brand)
  const rows = Math.ceil(data.members.length / 2)
  const memberSectionH = rows * 280
  const totalH = 360 + memberSectionH + 160 + 56
  const balPos = data.fundBalance >= 0
  const footerTop = 360 + memberSectionH
  const bottomTop = 360 + memberSectionH + 160
  const stripLabel: React.CSSProperties = { fontSize:14, color:P.onDarkMuted, textTransform:'uppercase', letterSpacing:1, fontWeight:600, textAlign:'center' }

  return (
    <div id={id} style={{
      width: 1080,
      height: totalH,
      position: 'relative',
      background: P.soft,
      fontFamily: FONT,
    }}>

      {/* ── SECTION 1: HEADER (màu CLB đã tối cho chữ trắng AA) ── */}
      <div style={{ position:'absolute', top:0, left:0, width:1080, height:200, overflow:'hidden', background:P.deep }}>
        <svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 1080 200" preserveAspectRatio="none">
          <rect x="40" y="15" width="1000" height="170" fill="none" stroke="white" strokeWidth="2" opacity="0.1"/>
          <line x1="540" y1="15" x2="540" y2="185" stroke="white" strokeWidth="1.5" opacity="0.08"/>
          <line x1="40" y1="100" x2="1040" y2="100" stroke="white" strokeWidth="3" opacity="0.1" strokeDasharray="12 8"/>
        </svg>
        <svg width="52" height="104" viewBox="0 0 52 104" style={{position:'absolute',top:42,left:40,opacity:0.22}}>
          <ellipse cx="26" cy="38" rx="24" ry="36" fill="white"/>
          <rect x="22" y="72" width="8" height="30" rx="4" fill="white"/>
        </svg>
      </div>

      {/* Header text overlays */}
      <T top={44} left={114} width={620} height={22} style={{ fontSize:14, fontWeight:800, letterSpacing:4, color:P.onDark, textTransform:'uppercase' }}>
        BILL CHI TIẾT THÀNH VIÊN
      </T>
      <T top={70} left={114} width={620} height={62} style={{ fontSize:(data.clubName || '').length > 18 ? 40 : 50, fontWeight:950, color:P.onDark, letterSpacing:-2, lineHeight:'62px' }}>
        {data.clubName || 'PickleFund'}
      </T>

      {/* Period pill */}
      <div style={{ position:'absolute', top:140, left:114, width:500, height:38, overflow:'hidden' }}>
        <span style={{
          display:'inline-block', background:P.pill, border:'1px solid rgba(255,255,255,0.5)',
          borderRadius:99, padding:'5px 18px', fontSize:14, color:P.onDark, fontWeight:700,
          whiteSpace:'nowrap', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {data.periodLabel}
        </span>
      </div>

      {/* Right side */}
      <T top={50} left={800} width={248} height={20} style={{ fontSize:14, color:P.onDark, textAlign:'right' }}>
        Xuất ngày
      </T>
      <T top={74} left={750} width={298} height={30} style={{ fontSize:22, fontWeight:900, color:P.onDark, textAlign:'right' }}>
        {data.exportDate}
      </T>
      <div style={{ position:'absolute', top:116, left:770, width:278 }}>
        <div style={{ display:'inline-block', float:'right', background:P.pill, borderRadius:8, padding:'4px 14px', fontSize:14, color:P.onDark, whiteSpace:'nowrap' }}>
          {data.totalSessions} buổi | {data.totalMembers} TV
        </div>
      </div>

      {/* ── SECTION 2: SUMMARY STRIP ── */}
      <div style={{ position:'absolute', top:200, left:0, width:1080, height:80, background:P.dark }}/>
      <div style={{ position:'absolute', top:200, left:360, width:1, height:80, background:'rgba(255,255,255,0.1)' }}/>
      <div style={{ position:'absolute', top:200, left:720, width:1, height:80, background:'rgba(255,255,255,0.1)' }}/>

      <T top={216} left={0} width={360} height={18} style={stripLabel}>TỔNG THU</T>
      <T top={238} left={0} width={360} height={26} style={{ fontSize:18, fontWeight:800, color:P.posOnDark, textAlign:'center' }}>
        {VND(data.totalIncome)}
      </T>

      <T top={216} left={360} width={360} height={18} style={stripLabel}>TỔNG CHI</T>
      <T top={238} left={360} width={360} height={26} style={{ fontSize:18, fontWeight:800, color:P.warnOnDark, textAlign:'center' }}>
        {VND(data.totalExpense)}
      </T>

      <T top={216} left={720} width={360} height={18} style={stripLabel}>SỐ DƯ</T>
      <T top={238} left={720} width={360} height={26} style={{ fontSize:18, fontWeight:800, color:balPos?P.posOnDark:P.negOnDark, textAlign:'center' }}>
        {balPos?'+':'-'}{VND(data.fundBalance)}
      </T>

      {/* ── SECTION 3: SECTION HEADING ── */}
      <div style={{ position:'absolute', top:280, left:0, width:1080, height:80, background:P.soft }}/>

      <T top={296} left={40} width={400} height={40} style={{ fontSize:22, fontWeight:900, color:P.text }}>
        Chi tiết thành viên
      </T>

      <div style={{ position:'absolute', top:296, left:460, width:180, height:40, display:'flex', alignItems:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', background:P.posTint, border:`1px solid ${P.posFill}`, borderRadius:99, padding:'6px 14px', fontSize:14, fontWeight:700, color:P.pos }}>
          {data.paidMembers} đã đóng
        </div>
      </div>

      <div style={{ position:'absolute', top:296, left:656, width:180, height:40, display:'flex', alignItems:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', background:P.warnTint, border:`1px solid ${P.warnFill}`, borderRadius:99, padding:'6px 14px', fontSize:14, fontWeight:700, color:P.warn }}>
          {data.unpaidMembers} chưa đóng
        </div>
      </div>

      {/* ── SECTION 4: MEMBER CARDS ── */}
      {data.members.map((member, index) => (
        <MemberCard key={member.name + index} member={member} index={index} P={P} />
      ))}

      {/* ── SECTION 5: FOOTER ── */}
      <div style={{ position:'absolute', top:footerTop, left:0, width:1080, height:160, background:P.dark, overflow:'hidden' }}>
        <svg width="72" height="110" viewBox="0 0 72 110" style={{position:'absolute', bottom:0, left:20, opacity:0.15}}>
          <ellipse cx="36" cy="14" rx="12" ry="12" fill="white"/>
          <rect x="24" y="28" width="24" height="44" rx="8" fill="white"/>
          <rect x="8" y="32" width="18" height="10" rx="5" fill="white" transform="rotate(-15 8 32)"/>
          <rect x="26" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(-4 26 72)"/>
          <rect x="38" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(4 38 72)"/>
        </svg>
        <svg width="72" height="110" viewBox="0 0 72 110" style={{position:'absolute', bottom:0, right:20, opacity:0.15, transform:'scaleX(-1)'}}>
          <ellipse cx="36" cy="14" rx="12" ry="12" fill="white"/>
          <rect x="24" y="28" width="24" height="44" rx="8" fill="white"/>
          <rect x="8" y="32" width="18" height="10" rx="5" fill="white" transform="rotate(-15 8 32)"/>
          <rect x="26" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(-4 26 72)"/>
          <rect x="38" y="72" width="10" height="34" rx="5" fill="white" transform="rotate(4 38 72)"/>
        </svg>
      </div>

      <T top={footerTop+40} left={0} width={1080} height={48} style={{ fontSize:24, fontWeight:950, color:P.onDark, letterSpacing:2, textAlign:'center' }}>
        CHƠI HẾT MÌNH · ĐÓNG QUỸ HẾT Ý
      </T>
      <T top={footerTop+96} left={0} width={1080} height={24} style={{ fontSize:14, color:P.onDarkMuted, textAlign:'center' }}>
        {data.clubName}
      </T>

      {/* ── SECTION 6: BOTTOM BAR ── */}
      <div style={{ position:'absolute', top:bottomTop, left:0, width:1080, height:56, background:P.darkest }}/>

      <T top={bottomTop+16} left={32} width={200} height={24} style={{ fontSize:14, fontWeight:900, color:P.onDark }}>
        PickleFund
      </T>
      <T top={bottomTop+18} left={848} width={200} height={20} style={{ fontSize:14, color:P.onDarkMuted, textAlign:'right' }}>
        {data.exportDate}
      </T>
    </div>
  )
}
