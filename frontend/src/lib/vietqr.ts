/**
 * Mã VietQR (EMVCo / NAPAS 247) tạo CỤC BỘ — dự phòng khi không tải được ảnh QR từ VietQR.
 * CHỈ hỗ trợ ngân hàng có BIN đã đối chiếu; ngân hàng khác trả null (UI báo chuyển khoản thủ công)
 * để KHÔNG BAO GIỜ sinh QR trỏ nhầm ngân hàng.
 */
const BIN: Record<string, string> = {
  VCB: '970436', TCB: '970407', MB: '970422', ACB: '970416', VPB: '970432', BIDV: '970418',
  CTG: '970415', TPB: '970423', STB: '970403', HDB: '970437', VIB: '970441', SHB: '970443',
  MSB: '970426', OCB: '970448', EIB: '970431', SEAB: '970440', LPB: '970449', VBA: '970405',
}

const tlv = (id: string, v: string) => `${id}${String(v.length).padStart(2, '0')}${v}`

export function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

const ascii = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export function buildVietQrPayload(bankCode: string, account: string, amount: number, memo: string): string | null {
  const bin = BIN[(bankCode || '').toUpperCase()]
  const acc = (account || '').replace(/\s/g, '')
  if (!bin || !/^\d{4,19}$/.test(acc)) return null
  const bank = tlv('00', bin) + tlv('01', acc)
  const merchant = tlv('00', 'A000000727') + tlv('01', bank) + tlv('02', 'QRIBFTTA')
  const amt = Math.max(0, Math.round(amount))
  const info = ascii(memo).slice(0, 50)
  const body =
    tlv('00', '01') + tlv('01', amt > 0 ? '12' : '11') + tlv('38', merchant) + tlv('53', '704') +
    (amt > 0 ? tlv('54', String(amt)) : '') + tlv('58', 'VN') + (info ? tlv('62', tlv('08', info)) : '') + '6304'
  return body + crc16(body)
}
