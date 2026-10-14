import test from 'node:test'
import assert from 'node:assert/strict'
import { moneyTone, moneyColor, LOW_BALANCE_THRESHOLD } from './moneyTone'

test('balance: âm đỏ · dưới ngưỡng vàng · đủ xanh', () => {
  assert.equal(moneyTone(-1, 'balance'), 'danger')
  assert.equal(moneyTone(0, 'balance'), 'warning')
  assert.equal(moneyTone(LOW_BALANCE_THRESHOLD - 1, 'balance'), 'warning')
  assert.equal(moneyTone(LOW_BALANCE_THRESHOLD, 'balance'), 'success')
})
test('signed/income/expense/pending/debt', () => {
  assert.equal(moneyTone(5, 'signed'), 'success')
  assert.equal(moneyTone(-5, 'signed'), 'danger')
  assert.equal(moneyTone(0, 'signed'), 'neutral')
  assert.equal(moneyTone(10, 'income'), 'success')
  assert.equal(moneyTone(0, 'income'), 'neutral')
  assert.equal(moneyTone(10, 'expense'), 'danger')
  assert.equal(moneyTone(10, 'pending'), 'warning')
  assert.equal(moneyTone(0, 'pending'), 'neutral')
  assert.equal(moneyTone(900, 'debt'), 'danger')
  assert.equal(moneyTone(0, 'debt'), 'success')
})
test('giá trị không hợp lệ → trung tính, không có màu', () => {
  assert.equal(moneyTone(undefined, 'balance'), 'neutral')
  assert.equal(moneyTone(NaN, 'income'), 'neutral')
  assert.equal(moneyColor(null, 'balance'), undefined)
  assert.match(moneyColor(1_000_000, 'balance') ?? '', /pf-money-pos/)
  assert.match(moneyColor(-1, 'balance') ?? '', /pf-money-neg/)
})
