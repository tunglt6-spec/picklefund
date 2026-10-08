import * as QRCode from 'qrcode';

/** Tài khoản nhận tiền của nền tảng (Super Admin) — cấu hình ở Cài đặt hệ thống. */
export interface PlatformBank {
  code: string;
  account: string;
  name: string;
}

// BIN đã đối chiếu — chỉ dùng cho QR tự tạo dự phòng (ngân hàng khác → không tạo, tránh QR sai ngân hàng).
const BIN: Record<string, string> = {
  VCB: '970436', TCB: '970407', MB: '970422', ACB: '970416', VPB: '970432', BIDV: '970418',
  CTG: '970415', TPB: '970423', STB: '970403', HDB: '970437', VIB: '970441', SHB: '970443',
  MSB: '970426', OCB: '970448', EIB: '970431', SEAB: '970440', LPB: '970449', VBA: '970405',
};

const tlv = (id: string, v: string) => `${id}${String(v.length).padStart(2, '0')}${v}`;

export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function asciiMemo(s: string, max = 50): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function buildVietQrPayload(bank: PlatformBank, amount: number, memo: string): string | null {
  const bin = BIN[(bank.code || '').toUpperCase()];
  const acc = (bank.account || '').replace(/\s/g, '');
  if (!bin || !/^\d{4,19}$/.test(acc)) return null;
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', acc)) + tlv('02', 'QRIBFTTA');
  const amt = Math.max(0, Math.round(amount));
  const info = asciiMemo(memo);
  const body =
    tlv('00', '01') + tlv('01', amt > 0 ? '12' : '11') + tlv('38', merchant) + tlv('53', '704') +
    (amt > 0 ? tlv('54', String(amt)) : '') + tlv('58', 'VN') + (info ? tlv('62', tlv('08', info)) : '') + '6304';
  return body + crc16(body);
}

/** Ảnh QR chuyển khoản (PNG): ưu tiên ảnh VietQR (mọi ngân hàng); lỗi → tự vẽ từ payload EMVCo (ngân hàng đã biết BIN). */
export async function renderTransferQr(bank: PlatformBank, amount: number, memo: string): Promise<Buffer | null> {
  try {
    const qs = new URLSearchParams({
      amount: String(Math.max(0, Math.round(amount))),
      addInfo: asciiMemo(memo),
      accountName: bank.name,
    });
    const url = `https://img.vietqr.io/image/${encodeURIComponent(bank.code)}-${encodeURIComponent(bank.account)}-compact2.png?${qs.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok && /^image\//i.test(res.headers.get('content-type') || '')) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 500) return buf;
    }
  } catch {
    /* rơi xuống QR tự tạo */
  }
  const payload = buildVietQrPayload(bank, amount, memo);
  if (!payload) return null;
  return QRCode.toBuffer(payload, { type: 'png', errorCorrectionLevel: 'M', margin: 2, width: 420 });
}
