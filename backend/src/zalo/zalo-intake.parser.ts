import { BadRequestException } from '@nestjs/common';
export interface IntakePayload {
  amount: number;
  description: string;
  fundSource: 'COMMON' | 'MINI';
  date: string;
  memberId?: string;
  fundPeriodId?: string;
  allocationRule?: 'EQUAL' | 'FUND_ONLY';
  costType?: 'COURT' | 'LIVING';
  paymentMethod?: 'cash' | 'bank_transfer';
}
const USAGE =
  'Dùng /thu SỐ TIỀN | TÊN THÀNH VIÊN | quỹ chính | DD/MM/YYYY hoặc /chi SỐ TIỀN | NỘI DUNG | quỹ chính | DD/MM/YYYY. Có thể chọn quỹ phụ. Hoặc viết tự nhiên, ví dụ: /thu Nguyễn Văn A đóng 300k hôm qua.';

const vnDay = (offset = 0) => {
  const d = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()) + 'T00:00:00Z',
  );
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const U = '(?![\\p{L}\\d])';
/** Số tiền viết tự nhiên: 300k, 300.000, 300 nghìn, 1tr, 1,5tr, 1tr5, 2 triệu. */
export function parseVnAmount(src: string): { amount: number; raw: string } | null {
  const s = src.toLowerCase();
  let m = s.match(new RegExp(`(\\d+)\\s*(?:tr|triệu|trieu)\\s*(\\d{1,3})${U}`, 'u'));
  if (m) {
    const frac = Number(m[2]) * (m[2].length === 1 ? 100_000 : m[2].length === 2 ? 10_000 : 1_000);
    return { amount: Number(m[1]) * 1_000_000 + frac, raw: m[0] };
  }
  m = s.match(new RegExp(`(\\d+(?:[.,]\\d+)?)(?:\\s*(?:tr|triệu|trieu)|m)${U}`, 'u'));
  if (m) return { amount: Math.round(Number(m[1].replace(',', '.')) * 1_000_000), raw: m[0] };
  m = s.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:k|nghìn|nghin|ngàn|ngan)${U}`, 'u'));
  if (m) return { amount: Math.round(Number(m[1].replace(',', '.')) * 1_000), raw: m[0] };
  m = s.match(new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})\\s*(?:đ|vnd|vnđ|d)?${U}`, 'u'));
  if (m) return { amount: Number(m[1].replace(/[.,]/g, '')), raw: m[0] };
  return null;
}

function parseNatural(
  kind: 'INCOME' | 'EXPENSE',
  body: string,
): { kind: 'INCOME' | 'EXPENSE'; payload: IntakePayload } {
  let rest = ` ${body} `;
  // Ngày trước, để "12/10" không bị nhầm thành số tiền.
  let iso = vnDay();
  const rel = rest.match(/\s(hôm nay|hom nay|hôm qua|hom qua|hôm kia|hom kia)(?=\s)/iu);
  const abs = rest.match(/\s(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?(?=\s|$)/);
  if (rel) {
    const k = rel[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    iso = vnDay(k.endsWith('qua') ? -1 : k.endsWith('kia') ? -2 : 0);
    rest = rest.replace(rel[0], ' ');
  } else if (abs) {
    const yearNow = Number(vnDay().slice(0, 4));
    let y = abs[3] ? (abs[3].length === 2 ? 2000 + Number(abs[3]) : Number(abs[3])) : yearNow;
    const build = (yy: number) =>
      `${yy}-${abs[2].padStart(2, '0')}-${abs[1].padStart(2, '0')}`;
    iso = build(y);
    if (!abs[3] && iso > vnDay()) iso = build(--y);
    rest = rest.replace(abs[0], ' ');
  }
  const money = parseVnAmount(rest);
  if (!money)
    throw new BadRequestException(
      'Chưa hiểu số tiền. Viết rõ như 300k, 300.000, 1tr5 hoặc 2 triệu.',
    );
  rest = rest.replace(new RegExp(money.raw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
  const mini = /(?:^|\s)(?:quỹ phụ|quy phu|quỹ mini|quy mini)(?=\s)/iu;
  const fundSource: 'COMMON' | 'MINI' = mini.test(rest) ? 'MINI' : 'COMMON';
  rest = rest.replace(mini, ' ').replace(/(?:^|\s)(?:quỹ chính|quy chinh)(?=\s)/iu, ' ');
  // Chỉ bỏ từ nối ở ĐẦU/CUỐI cụm và chỉ dạng có dấu: "Thu Hà", "Lê Văn Quy", "Nguyễn Thị Dong" giữ nguyên.
  const lead = new Set(kind === 'INCOME' ? ['đóng', 'nộp', 'đã', 'tiền', 'quỹ', 'của', 'cho', 'vào', 'ngày'] : ['ngày', 'vào']);
  const trail = new Set(kind === 'INCOME' ? ['đóng', 'nộp', 'đã', 'tiền', 'quỹ', 'vào', 'ngày'] : ['ngày', 'vào']);
  const tokens = rest.replace(/[:;,]+/g, ' ').split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && lead.has(tokens[0].toLowerCase())) tokens.shift();
  while (tokens.length > 1 && trail.has(tokens[tokens.length - 1].toLowerCase())) tokens.pop();
  const description = tokens.join(' ').trim();
  if (!description)
    throw new BadRequestException(
      kind === 'INCOME' ? 'Thiếu tên thành viên.' : 'Thiếu nội dung khoản chi.',
    );
  return finalize(kind, money.amount, description, fundSource, iso);
}

function finalize(
  kind: 'INCOME' | 'EXPENSE',
  amount: number,
  description: string,
  fundSource: 'COMMON' | 'MINI',
  iso: string,
): { kind: 'INCOME' | 'EXPENSE'; payload: IntakePayload } {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000_000_000)
    throw new BadRequestException('Số tiền không hợp lệ.');
  if (!description || description.length > 200)
    throw new BadRequestException(
      'Nội dung hoặc tên thành viên phải từ 1 đến 200 ký tự.',
    );
  const day = new Date(iso + 'T00:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== iso)
    throw new BadRequestException('Ngày không tồn tại.');
  if (iso > vnDay())
    throw new BadRequestException(
      'Không nhập thu/chi cho ngày trong tương lai.',
    );
  return {
    kind,
    payload: { amount, description, fundSource, date: iso, paymentMethod: 'bank_transfer' },
  };
}

export function parseIntake(
  text: string,
): { kind: 'INCOME' | 'EXPENSE'; payload: IntakePayload } | null {
  const match = text.trim().match(/(?:^|\s)\/(thu|chi)\s+(.+)$/i);
  if (!match) return null;
  const kind = match[1].toLowerCase() === 'thu' ? 'INCOME' : 'EXPENSE';
  // Không có dấu "|" → câu tiếng Việt tự nhiên; vẫn chỉ tạo bản nháp chờ xác nhận.
  if (!match[2].includes('|')) return parseNatural(kind, match[2]);
  const fields = match[2].split('|').map((s) => s.trim());
  if (fields.length !== 4) throw new BadRequestException(USAGE);
  const [raw, description, fund, date] = fields;
  if (!/^(?:[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)$/.test(raw))
    throw new BadRequestException(
      'Nhập số tiền nguyên VND, ví dụ 450000 hoặc 450.000.',
    );
  const amount = Number(raw.replaceAll('.', ''));
  if (!Number.isSafeInteger(amount) || amount > 1_000_000_000_000)
    throw new BadRequestException('Số tiền không hợp lệ.');
  if (!description || description.length > 200)
    throw new BadRequestException(
      'Nội dung hoặc tên thành viên phải từ 1 đến 200 ký tự.',
    );
  const normalized = fund
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const fundSource = ['quy chinh', 'chinh', 'common'].includes(normalized)
    ? 'COMMON'
    : ['quy phu', 'phu', 'mini'].includes(normalized)
      ? 'MINI'
      : null;
  if (!fundSource)
    throw new BadRequestException('Chọn quỹ chính hoặc quỹ phụ.');
  const parts = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!parts) throw new BadRequestException('Ngày phải có dạng DD/MM/YYYY.');
  const iso = `${parts[3]}-${parts[2]}-${parts[1]}`;
  const day = new Date(iso + 'T00:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== iso)
    throw new BadRequestException('Ngày không tồn tại.');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  if (iso > today)
    throw new BadRequestException(
      'Không nhập thu/chi cho ngày trong tương lai.',
    );
  return {
    kind: match[1].toLowerCase() === 'thu' ? 'INCOME' : 'EXPENSE',
    payload: {
      amount,
      description,
      fundSource,
      date: iso,
      paymentMethod: 'bank_transfer',
    },
  };
}
