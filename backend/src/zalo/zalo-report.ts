import { readFile, stat } from 'fs/promises';
import { resolve, sep } from 'path';
import { loadFontsBase64 } from '../executive-report/export-fonts';

export interface ZaloFinancialReport {
  clubName: string; periodName: string; periodFrom: string; periodTo: string; updatedAt: string;
  income: number; expense: number; carry: number; balance: number; mini: number; logo: string | null;
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!);
const amount = (n: number) => `${n.toLocaleString('vi-VN')} đ`;
const shortDate = (s: string) => s ? new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

/** Branding images are read only from our upload directory, never from arbitrary URLs. */
export async function readZaloLogo(source: unknown): Promise<string | null> {
  if (typeof source !== 'string' || source.length > 2_700_000) return null;
  if (/^data:image\/(png|jpeg|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(source)) return source;
  try {
    let path = source;
    if (/^https?:/.test(path)) {
      const url = new URL(path);
      if (!['picklefund.vn', 'www.picklefund.vn', 'app.picklefund.uk'].includes(url.hostname) || url.username || url.password) return null;
      path = decodeURIComponent(url.pathname);
    }
    if (!/^\/?(?:api\/)?uploads\//.test(path)) return null;
    const root = resolve(process.cwd(), 'uploads');
    const file = resolve(root, path.replace(/^\/?(?:api\/)?uploads\//, ''));
    if (!file.startsWith(root + sep) || (await stat(file)).size > 2_000_000) return null;
    const ext = file.split('.').pop()?.toLowerCase();
    const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' } as Record<string,string>)[ext ?? ''];
    return mime ? `data:${mime};base64,${(await readFile(file)).toString('base64')}` : null;
  } catch { return null; }
}

export async function defaultZaloLogo(): Promise<string | null> {
  try { return `data:image/png;base64,${(await readFile(resolve(__dirname, '../assets/brand/picklefund.png'))).toString('base64')}`; }
  catch { return null; }
}

export function zaloReportText(r: ZaloFinancialReport): string {
  return [`BÁO CÁO THU – CHI VÀ SỐ DƯ QUỸ`, r.clubName, `Kỳ báo cáo: ${r.periodName}`,
    `Thời gian: ${shortDate(r.periodFrom)} – ${shortDate(r.periodTo)}`, '',
    'I. QUỸ CHÍNH', `Số dư đầu kỳ / chuyển kỳ: ${amount(r.carry)}`,
    `Tổng thu đã xác nhận: ${amount(r.income)}`, `Tổng chi đã duyệt / đã chi: ${amount(r.expense)}`,
    `Chênh lệch thu – chi: ${amount(r.income-r.expense)}`, `SỐ DƯ CUỐI KỲ: ${amount(r.balance)}`, '',
    'II. QUỸ PHỤ (ĐỘC LẬP)', `Số dư Quỹ Phụ: ${amount(r.mini)}`, '',
    'Đối chiếu: Số dư cuối kỳ = chuyển kỳ + thu − chi.',
    'Quỹ Phụ không cộng vào số dư Quỹ Chính. Báo cáo quản trị nội bộ CLB.',
    `Lập lúc: ${new Date(r.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    'Chi tiết: https://picklefund.vn/tai-chinh?tab=reports (cần đăng nhập).'].join('\n');
}

export function zaloReportHtml(r: ZaloFinancialReport): string {
  const fonts = loadFontsBase64();
  const row = (label: string, value: number, tone = '') => `<tr><td>${label}</td><td class="${tone}">${amount(value)}</td></tr>`;
  const positive = r.balance >= 0;
  const logo = r.logo ? `<img src="${esc(r.logo)}" alt="Logo CLB">` : `<div class="monogram">${esc(r.clubName.slice(0,2).toUpperCase())}</div>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
  ${fonts ? `@font-face{font-family:BVP;src:url(data:font/ttf;base64,${fonts.regular})} @font-face{font-family:BVP;font-weight:700;src:url(data:font/ttf;base64,${fonts.bold})}` : ''}
  *{box-sizing:border-box}body{margin:0;background:#eaf0f6;color:#163047;font-family:BVP,Arial,sans-serif;font-size:20px;line-height:1.5}
  main{background:#fff;margin:24px;padding:44px;border:1px solid #cad6e2;border-radius:20px;border-top:8px solid #1368d4}
  header{display:flex;align-items:center;gap:20px;padding-bottom:24px;border-bottom:1px solid #d8e1ea}header img,.monogram{width:84px;height:84px;object-fit:contain;flex-shrink:0}.monogram{display:grid;place-items:center;border-radius:20px;background:#1368d4;color:white;font-weight:700;font-size:28px}
  .brand{font-size:26px;font-weight:700;overflow-wrap:anywhere}.overline{font-size:14px;letter-spacing:1.5px;color:#577087;margin:0}.title{font-size:32px;line-height:1.3;margin:28px 0 12px;letter-spacing:-.6px}.period{font-weight:700;margin:0 0 4px;overflow-wrap:anywhere}.muted{color:#577087;font-size:17px;margin:0}.kpis{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}.kpi{border:1px solid #d5e1ea;border-radius:14px;padding:20px;background:#f4f8fc}.kpi span{display:block;font-size:17px;color:#405a70}.kpi strong{font-size:30px;display:block;margin-top:8px;font-variant-numeric:tabular-nums;white-space:nowrap}.green{color:#117d3b}.red{color:#dc2447}
  h2{font-size:20px;margin:28px 0 10px}table{width:100%;border-collapse:collapse;font-size:19px}td{padding:14px 0;border-bottom:1px solid #dde5ed}td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:20px}.balance{display:flex;justify-content:space-between;align-items:center;gap:12px;background:${positive?'#eaf8ef':'#fff0f3'};border:1px solid ${positive?'#9dd4ad':'#f2aabc'};border-radius:12px;padding:20px;margin-top:18px}.balance strong{font-size:30px;white-space:nowrap;font-variant-numeric:tabular-nums}.notes{margin-top:20px;font-size:15px;color:#4c657a;line-height:1.65}.footer{border-top:1px solid #d8e1ea;margin-top:26px;padding-top:18px;display:flex;justify-content:space-between;gap:20px;font-size:14px;color:#577087}.footer b{color:#1368d4}footer p{margin:0}
  </style></head><body><main><header>${logo}<div><p class="overline">BÁO CÁO QUẢN TRỊ NỘI BỘ</p><div class="brand">${esc(r.clubName)}</div></div></header>
  <h1 class="title">Báo cáo thu – chi và số dư quỹ</h1><p class="period">${esc(r.periodName)}</p><p class="muted">${shortDate(r.periodFrom)} – ${shortDate(r.periodTo)} · Đơn vị: VNĐ</p>
  <div class="kpis"><div class="kpi"><span>Tổng thu đã xác nhận</span><strong class="green">${amount(r.income)}</strong></div><div class="kpi"><span>Tổng chi đã duyệt / đã chi</span><strong class="red">${amount(r.expense)}</strong></div></div>
  <h2>01 · Đối chiếu Quỹ Chính</h2><table>${row('Số dư đầu kỳ / chuyển kỳ',r.carry,r.carry<0?'red':'')}${row('Thu phát sinh trong kỳ',r.income,'green')}${row('Chi phát sinh trong kỳ',r.expense,'red')}${row('Chênh lệch thu − chi',r.income-r.expense,r.income-r.expense<0?'red':'green')}</table>
  <div class="balance"><b>Số dư cuối kỳ</b><strong class="${positive?'green':'red'}">${amount(r.balance)}</strong></div>
  <h2>02 · Quỹ Phụ độc lập</h2><table>${row('Số dư Quỹ Phụ',r.mini,r.mini<0?'red':'green')}</table>
  <div class="notes">Số dư cuối kỳ = số dư chuyển kỳ + thu − chi.<br>Quỹ Phụ được theo dõi riêng, không cộng vào số dư Quỹ Chính.<br>Số liệu tại thời điểm lập; không thay thế báo cáo tài chính pháp định.</div>
  <footer class="footer"><p>Lập lúc ${esc(new Date(r.updatedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))}<br>Giờ Việt Nam (UTC+7)</p><p><b>PickleFund</b><br>picklefund.vn</p></footer></main></body></html>`;
}
