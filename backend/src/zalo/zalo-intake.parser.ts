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
export function parseIntake(
  text: string,
): { kind: 'INCOME' | 'EXPENSE'; payload: IntakePayload } | null {
  const match = text.trim().match(/(?:^|\s)\/(thu|chi)\s+(.+)$/i);
  if (!match) return null;
  const fields = match[2].split('|').map((s) => s.trim());
  if (fields.length !== 4)
    throw new BadRequestException(
      'Dùng /thu SỐ TIỀN | TÊN THÀNH VIÊN | quỹ chính | DD/MM/YYYY hoặc /chi SỐ TIỀN | NỘI DUNG | quỹ chính | DD/MM/YYYY. Có thể chọn quỹ phụ.',
    );
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
