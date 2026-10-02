/* Chạy: node --test src/components/minigame/pairBuilder.logic.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  takenPlayerKeys, unpairedSavedGuests, collectPicks, buildManualPayload, buildAutoPayload, describeAutoResult, nextPairName, resolveGuestName,
} from './pairBuilder.logic.ts'

const members = [{ id: 'm1', fullName: 'Mr HảiPM' }, { id: 'm2', fullName: 'B' }]
const saved = [{ id: 'g1', name: 'Khách 1' }, { id: 'g2', name: 'Khách 2' }]

test('thành viên + khách mới → cặp thủ công hợp lệ (ca user báo lỗi)', () => {
  const picks = collectPicks(members, ['m1'], saved, [], ['Mr MinhNB'])
  assert.equal(picks.length, 2)
  assert.deepEqual(buildManualPayload('Đôi 1', picks), { name: 'Đôi 1', player1Id: 'm1', player2Guest: 'Mr MinhNB' })
})

test('khách đã lưu + khách mới / khách + khách / thành viên + khách đã lưu', () => {
  assert.deepEqual(
    buildManualPayload('Đôi 2', collectPicks(members, [], saved, ['g1'], ['Mới'])),
    { name: 'Đôi 2', player1Id: 'g1', player2Guest: 'Mới' },
  )
  assert.deepEqual(
    buildManualPayload('x', collectPicks(members, ['m2'], saved, ['g2'], [])),
    { name: 'x', player1Id: 'm2', player2Id: 'g2' },
  )
})

test('thủ công chỉ khi ĐÚNG 2 người', () => {
  assert.equal(buildManualPayload('x', collectPicks(members, ['m1'], saved, [], [])), null)
  assert.equal(buildManualPayload('x', collectPicks(members, ['m1', 'm2'], saved, ['g1'], [])), null)
})

test('khách mới trùng tên (khác hoa/thường) chỉ tính 1', () => {
  assert.equal(collectPicks(members, [], saved, [], ['A', ' a ', 'B']).length, 2)
})

test('khách đã lưu chưa ghép: loại khách nằm trong đội; xoá đội trả khách về pool', () => {
  const teams = [{ player1Id: 'm1', player2GuestId: 'g1' }]
  assert.deepEqual(unpairedSavedGuests(saved, teams).map(g => g.id), ['g2'])
  assert.deepEqual(unpairedSavedGuests(saved, []).map(g => g.id), ['g1', 'g2'])
  assert.ok(takenPlayerKeys([{ player1: { id: 'm9' } }]).has('m9'))
})

test('payload tự động tách member / khách đã lưu / khách mới', () => {
  const p = buildAutoPayload(collectPicks(members, ['m1'], saved, ['g2'], ['Mới']), 'RANDOM_PAIRING')
  assert.deepEqual(p, { memberIds: ['m1'], guestIds: ['g2'], guests: [{ name: 'Mới' }], pairingMode: 'RANDOM_PAIRING' })
})

test('thông điệp kết quả + tên đội kế tiếp', () => {
  assert.equal(describeAutoResult({ pairedCount: 2, unpaired: [] }), 'Đã ghép 2 cặp')
  assert.match(describeAutoResult({ pairedCount: 1, unpaired: [{ name: 'X' }] }), /còn 1 người chưa ghép \(X\)/)
  assert.equal(nextPairName(['Đôi 1', 'Đôi 4']), 'Đôi 5')
  assert.equal(nextPairName([]), 'Đôi 1')
})

test('khách mới trùng tên khách đã lưu → dùng khách đã lưu (không tạo bản mới)', () => {
  const picks = collectPicks(members, [], saved, [], [' khách 1 '])
  assert.deepEqual(picks, [{ kind: 'saved', id: 'g1', name: 'Khách 1' }])
  // đã chọn sẵn khách đó → không nhân đôi
  assert.equal(collectPicks(members, [], saved, ['g1'], ['khách 1']).length, 1)
})

test('resolveGuestName: mới / chọn khách có sẵn / khách đã thuộc cặp / rỗng', () => {
  assert.deepEqual(resolveGuestName('  ', saved, []), { action: 'empty' })
  assert.deepEqual(resolveGuestName('Mới', saved, []), { action: 'new', name: 'Mới' })
  assert.deepEqual(resolveGuestName('khách 2', saved, []), { action: 'select-saved', id: 'g2', name: 'Khách 2' })
  assert.deepEqual(resolveGuestName('Khách 1', saved, [{ player1GuestId: 'g1' }]), { action: 'taken', name: 'Khách 1' })
})
