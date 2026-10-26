import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { playfulGlyphs, type PlayfulIconName } from '../src/components/icons/playfulGlyphs'
import { glassLineMarkup, glassLineSvg } from '../src/components/icons/glassLineIcons'
import { mobileTileLabel } from '../src/lib/mobileTileLabels'

const out = resolve(process.argv[2] ?? 'glass-line-design')
const names = Object.keys(playfulGlyphs) as PlayfulIconName[]
const sample: PlayfulIconName[] = ['members','member-rating','member-accounts','roles','member-history','fund-period','income','expense','debt','finance-report','payment-approval','calendar','registration','check-in','attendance','weekly-activity','competition-overview','tournament','feed','matchmaking','moderation','aido','lisa','notifications','subscription','settings']
const esc = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')
mkdirSync(out, { recursive: true })
for (const theme of ['light','dark']) {
  mkdirSync(join(out, theme), { recursive: true })
  for (const name of names) writeFileSync(join(out,theme,`${name}.svg`), glassLineSvg(name, theme === 'dark'))
}
function html(keys: PlayfulIconName[], full = false) {
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PickleFund · Bộ icon nét màu và kính</title>
<style>*{box-sizing:border-box}body{margin:0;background:#F8FAFC;color:#182638;font:15px/1.5 system-ui,sans-serif}main{max-width:1220px;margin:auto;padding:38px 40px}header{display:flex;justify-content:space-between;align-items:start;gap:24px;border-bottom:1px solid #DBE3EB;padding-bottom:22px}.eyebrow{font-size:12px;letter-spacing:2px;font-weight:700;color:#2768D9}h1{font-size:32px;line-height:1.2;letter-spacing:-1px;margin:8px 0 10px}p{margin:0;color:#53657B}.controls{display:flex;gap:6px}button{border:1px solid #CCD8E4;background:transparent;color:inherit;padding:10px 16px;border-radius:10px;cursor:pointer;font:inherit;font-weight:600}button[aria-pressed=true]{background:#2768D9;color:white;border-color:#2768D9}.grid{display:grid;grid-template-columns:repeat(${full?8:7},minmax(0,1fr));gap:22px 12px;padding:30px 0}.item{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;min-height:100px}.item img{width:52px;height:52px}.label{font-size:13px;font-weight:600;max-width:130px}.id{font-size:10px;color:#6B7D91}.detail{border-top:1px solid #DBE3EB;display:flex;align-items:center;gap:24px;padding:24px 0}.detail img{width:88px;height:88px}.detail div{margin-left:auto;max-width:320px}h2{font-size:18px;margin:0 0 6px}.sizes{display:flex;gap:28px;align-items:center}.sizes span{display:grid;text-align:center;justify-items:center;font-size:11px;color:#53657B}.sizes img{display:block;margin-bottom:8px}footer{border-top:1px solid #DBE3EB;padding-top:18px;display:flex;justify-content:space-between;font-size:12px;color:#53657B}a{color:#2768D9}body.dark{background:#142033;color:#ECF3FA}body.dark p,body.dark .id,body.dark footer,body.dark .sizes span{color:#B5C6DC}body.dark header,body.dark .detail,body.dark footer{border-color:#34465D}@media(max-width:700px){main{padding:24px 16px}header{flex-direction:column}h1{font-size:26px}.grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:18px 6px}.label{font-size:12px}.detail{flex-wrap:wrap;gap:14px}.detail img{width:60px;height:60px}.detail div{margin:0}footer{gap:12px;flex-wrap:wrap}}</style>
<main><header><div><div class="eyebrow">PICKLEFUND · BẢN THIẾT KẾ ICON</div><h1>${full?'Trọn bộ 93 icon':'Icon nét màu, kết hợp kính trong'}</h1><p>Nét tròn gọn · Màu tươi theo chức năng · Bề mặt kính trong</p></div><div class="controls"><button aria-pressed="true" onclick="theme(false)">Nền sáng</button><button aria-pressed="false" onclick="theme(true)">Nền tối</button></div></header>
<div class="grid">${keys.map(name=>`<div class="item"><img src="light/${name}.svg" alt="${esc(playfulGlyphs[name].label)}"><span class="label">${esc(mobileTileLabel(playfulGlyphs[name].label))}</span>${full?`<span class="id">${name}</span>`:''}</div>`).join('')}</div>
${full?'':`<section class="detail"><img src="light/income.svg" alt="Thu quỹ"><img src="light/tournament.svg" alt="Giải đấu"><img src="light/lisa.svg" alt="Lisa AI"><img src="light/members.svg" alt="Thành viên"><div><h2>Liquid Glass ở trong hình vẽ</h2><p>Lớp màu xuyên nhẹ, mép sáng và bóng mỏng. Giữ đường nét rõ ở kích thước nhỏ.</p></div></section><section class="sizes">${[20,24,32,40,48].map(size=>`<span><img src="light/calendar.svg" style="width:${size}px;height:${size}px" alt="Lịch ${size}px">${size}px</span>`).join('')}</section>`}
<footer><span>93 biểu tượng · 2 bộ nền sáng/tối · SVG vector · Nét 1,7 trên khung 32</span><a href="${full?'index':'all-icons'}.html">${full?'Xem 26 chức năng chính':'Xem toàn bộ 93 icon'} →</a></footer></main>
<script>function theme(dark){document.body.classList.toggle('dark',dark);document.querySelectorAll('img').forEach(img=>{img.src=(dark?'dark/':'light/')+img.getAttribute('src').split('/').pop()});document.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===(dark?1:0))))}</script></html>`
}
writeFileSync(join(out,'index.html'),html(sample))
writeFileSync(join(out,'all-icons.html'),html(names,true))
function board(keys: PlayfulIconName[], dark = false, full = false) {
  const columns = full ? 8 : 7, width = 1280, cell = 162, left = 73
  const rows = Math.ceil(keys.length / columns), rowHeight = full ? 136 : 126
  const height = full ? 260 + rows * rowHeight : 1010
  const ink = dark ? '#ECF3FA' : '#182638', muted = dark ? '#B5C6DC' : '#53657B'
  const icon = (name: PlayfulIconName, x: number, y: number, size: number, id: string) => `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="-2 -2 36 36">${glassLineMarkup(name,id,dark)}</svg>`
  const labels = (text: string, x: number, y: number) => {
    const lines: string[] = []
    for (const word of text.split(' ')) {
      if (!lines.length || (lines[lines.length-1]+' '+word).length>21) lines.push(word)
      else lines[lines.length-1]+=' '+word
    }
    return `<text x="${x}" y="${y}" text-anchor="middle" fill="${ink}" font-size="13" font-weight="600">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?17:0}">${esc(line)}</tspan>`).join('')}</text>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Segoe UI,Arial,sans-serif">
  <rect width="${width}" height="${height}" fill="${dark?'#142033':'#F8FAFC'}"/>
  <text x="70" y="47" fill="${dark?'#99C8FF':'#2768D9'}" font-size="12" font-weight="700" letter-spacing="2">PICKLEFUND · BẢN THIẾT KẾ ICON</text>
  <text x="70" y="94" fill="${ink}" font-size="32" font-weight="700">${full?'Trọn bộ 93 icon':'Icon nét màu, kết hợp kính trong'}</text>
  <text x="70" y="126" fill="${muted}" font-size="15">Nét tròn gọn · Màu tươi theo chức năng · Bề mặt kính trong</text>
  <path d="M70 154H1210" stroke="${dark?'#34465D':'#DBE3EB'}"/>
  ${keys.map((name,i)=>{const x=left+(i%columns)*cell,y=188+Math.floor(i/columns)*rowHeight;return icon(name,x+45,y,52,`board-${i}`)+labels(mobileTileLabel(playfulGlyphs[name].label),x+71,y+80)+(full?`<text x="${x+71}" y="${y+128}" text-anchor="middle" fill="${muted}" font-size="10">${name}</text>`:'')}).join('')}
  ${full?'':`<path d="M70 702H1210" stroke="${dark?'#34465D':'#DBE3EB'}"/>${(['income','tournament','lisa','members'] as PlayfulIconName[]).map((name,i)=>icon(name,72+i*112,730,84,`detail-${i}`)).join('')}
  <text x="700" y="757" fill="${ink}" font-size="18" font-weight="700">Liquid Glass ở trong hình vẽ</text>
  <text x="700" y="786" fill="${muted}" font-size="14">Lớp màu xuyên nhẹ, mép sáng và bóng mỏng.</text>
  <text x="700" y="810" fill="${muted}" font-size="14">Giữ đường nét rõ ở kích thước nhỏ.</text>
  ${[20,24,32,40,48].map((size,i)=>icon('calendar',72+i*72,870-size,size,`size-${i}`)+`<text x="${72+i*72+size/2}" y="900" text-anchor="middle" fill="${muted}" font-size="11">${size}px</text>`).join('')}`}
  <text x="70" y="${height-35}" fill="${muted}" font-size="12">93 biểu tượng · SVG vector · Nét 1,7 trên khung 32 · Hai bộ nền sáng/tối</text></svg>`
}
writeFileSync(join(out,'preview-light.svg'),board(sample))
writeFileSync(join(out,'preview-dark.svg'),board(sample,true))
writeFileSync(join(out,'all-93-icons.svg'),board(names,false,true))
writeFileSync(join(out,'manifest.json'),JSON.stringify({count:names.length,themes:['light','dark'],strokeWidth:1.7,viewBox:'-2 -2 36 36',icons:names.map(name=>({name,label:playfulGlyphs[name].label}))},null,2))
writeFileSync(join(out,'README.txt'),`PICKLEFUND - BỘ ICON NÉT MÀU + KÍNH TRONG\n\n93 icon, đủ theo danh mục hiện tại.\nlight/: dùng trên nền sáng. dark/: dùng trên nền tối.\nindex.html: 26 chức năng chính và chi tiết kính.\nall-icons.html: toàn bộ 93 biểu tượng.\nSVG co giãn: 20/24 px cho công cụ; 32 px cho tiêu đề; 40/48 px cho lối tắt.\nKhông đặt lại vào đế vuông màu đặc. Vùng bấm nằm ở nút bên ngoài, tối thiểu 44px.\nTên đầy đủ và liên kết nghiệp vụ giữ nguyên; không dùng màu icon thay trạng thái nghiệp vụ.\nThành phần React: GlassLineIcon (name, size, theme).\nBản thiết kế này chưa thay biểu tượng trên app đang chạy.\n`)
console.log(JSON.stringify({out,count:names.length,svgFiles:names.length*2}))
