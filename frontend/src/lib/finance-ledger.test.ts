/* Chạy: node --test src/lib/finance-ledger.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildLedgerRows, isEffectiveExpense, parseMoney } from './finance-ledger.ts'

const P = 'p1'
const c = (id: string, amount: number, o: Record<string, unknown> = {}) => ({
  id, amount, isConfirmed: true, fundSource: 'COMMON', fundPeriodId: P, paymentDate: '2026-07-05', member: { fullName: id }, ...o,
})
const e = (id: string, amount: number, o: Record<string, unknown> = {}) => ({
  id, amount, status: 'approved', fundSource: 'COMMON', fundPeriodId: P, expenseDate: '2026-07-10', description: id, ...o,
})

test('C1: số dư Quỹ Chính = opening + 10 − 3 (bỏ chưa xác nhận, rejected, Quỹ Phụ)', () => {
  const contribs = [
    c('thu-cx', 10_000_000),
    c('thu-cho', 2_000_000, { isConfirmed: false }),
    c('thu-mini', 500_000, { fundSource: 'MINI', fundPeriodId: undefined, paymentDate: '2025-01-01' }),
  ]
  const expenses = [
    e('chi-duyet', 3_000_000),
    e('chi-tu-choi', 1_000_000, { status: 'rejected' }),
  ]
  const opening = 4_000_000
  const r = buildLedgerRows(contribs, expenses, P, opening)
  assert.equal(r.rows.length, 2)
  assert.equal(r.totalIncome, 10_000_000)
  assert.equal(r.totalExpense, 3_000_000)
  assert.equal(r.closingBalance, opening + 10_000_000 - 3_000_000)
  assert.equal(r.rows.at(-1)!.balance, r.closingBalance)
  assert.equal(r.rows[0].balance, opening + 10_000_000) // số dư chạy bắt đầu từ chuyển kỳ
})

test('chi pending không trừ quỹ; paid được tính; status thiếu = pending', () => {
  assert.equal(isEffectiveExpense('pending'), false)
  assert.equal(isEffectiveExpense(undefined), false)
  assert.equal(isEffectiveExpense('paid'), true)
  const r = buildLedgerRows([], [e('a', 100, { status: 'pending' }), e('b', 200, { status: 'paid' }), e('c', 50, { status: undefined })], P, 0)
  assert.equal(r.totalExpense, 200)
})

test('chỉ lấy đúng kỳ đang chọn; fundSource thiếu = COMMON', () => {
  const r = buildLedgerRows(
    [c('k1', 100), c('k2', 900, { fundPeriodId: 'p2' }), c('k3', 50, { fundSource: undefined })],
    [e('x', 30, { fundPeriodId: 'p2' })], P, 0,
  )
  assert.equal(r.totalIncome, 150)
  assert.equal(r.totalExpense, 0)
})

test('cùng ngày: Thu trước Chi, sắp theo ngày', () => {
  const r = buildLedgerRows(
    [c('t', 100, { paymentDate: '2026-07-10' })],
    [e('c', 60, { expenseDate: '2026-07-10' }), e('early', 10, { expenseDate: '2026-07-01' })], P, 0,
  )
  assert.deepEqual(r.rows.map(x => x.id), ['early', 't', 'c'])
  assert.deepEqual(r.rows.map(x => x.balance), [-10, 90, 30])
})

test('parseMoney bỏ dấu phân cách nghìn', () => {
  assert.equal(parseMoney('300.000'), 300000)
  assert.equal(parseMoney('1,500,000'), 1500000)
  assert.equal(parseMoney(250000), 250000)
  assert.equal(parseMoney(''), 0)
  assert.equal(parseMoney('abc'), 0)
})
