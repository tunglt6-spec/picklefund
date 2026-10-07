import test from 'node:test'
import assert from 'node:assert/strict'
import { crc16, buildVietQrPayload } from './vietqr.ts'

test('CRC16-CCITT-FALSE vector chuẩn', () => assert.equal(crc16('123456789'), '29B1'))

test('payload TPB hợp lệ: BIN, tài khoản, số tiền, CRC khớp', () => {
  const p = buildVietQrPayload('TPB', '00584047001', 6028, 'Dong quy Quy 3')!
  assert.ok(p.includes('0006970423'))
  assert.ok(p.includes('011100584047001'))
  assert.ok(p.includes('54046028'))
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)))
})

test('ngân hàng chưa đối chiếu BIN → null (không sinh QR sai)', () => assert.equal(buildVietQrPayload('XYZ', '123456', 1000, ''), null))
