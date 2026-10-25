import test from 'node:test'
import assert from 'node:assert/strict'
import { countSignal, clubHealthSignal, readingSignal, syncSignal, SIGNAL_PALETTE } from './statusDesign'
import { brandAssetUrl } from './brandAssets'

test('traffic lights distinguish zero failures/queues from unknown values', () => {
  assert.equal(countSignal(0, 'failure'), 'success')
  assert.equal(countSignal(2, 'failure'), 'danger')
  assert.equal(countSignal(0, 'pending'), 'success')
  assert.equal(countSignal(2, 'pending'), 'warning')
  for (const value of [null, undefined, NaN, Infinity, -1]) assert.equal(countSignal(value, 'healthy'), 'neutral')
})
const fresh = { now: 200_000, updatedAt: 190_000, online: true }

test('club health colors follow the backend interpretation, not just the presence of a number', () => {
  for (const score of [0, 49]) assert.equal(clubHealthSignal(score), 'danger')
  for (const score of [50, 74]) assert.equal(clubHealthSignal(score), 'warning')
  for (const score of [75, 100]) assert.equal(clubHealthSignal(score), 'success')
  for (const score of [null, undefined, NaN, -1, 101]) assert.equal(clubHealthSignal(score), 'neutral')
})
test('only real numeric readings receive a signal, not loading or empty text', () => {
  for (const value of ['—', '…', 'Đang tải 3 mục', 'Chưa có dữ liệu', null, undefined, NaN, {}]) assert.equal(readingSignal(value), 'neutral')
  assert.equal(readingSignal('1.250.000 ₫'), 'success')
  assert.equal(readingSignal(0), 'success')
  assert.equal(readingSignal(-100), 'danger')
})
test('only a fresh heartbeat plus a connection earns the live label', () => {
  assert.deepEqual(syncSignal({ ...fresh, mode: 'push', connected: true, heartbeatAt: 195_000 }), { tone: 'success', label: 'Trực tiếp' })
  assert.equal(syncSignal({ ...fresh, mode: 'push', connected: true, heartbeatAt: 160_000 }).tone, 'warning')
  assert.equal(syncSignal({ ...fresh, mode: 'push', connected: false, heartbeatAt: 195_000 }).label, 'Đồng bộ định kỳ')
  assert.equal(syncSignal(fresh).label, 'Cập nhật định kỳ')
})
test('offline, stale, loading and failed updates never appear healthy', () => {
  assert.equal(syncSignal({ ...fresh, online: false }).tone, 'danger')
  assert.equal(syncSignal({ ...fresh, updatedAt: 1 }).tone, 'warning')
  assert.equal(syncSignal({ ...fresh, error: true }).tone, 'warning')
  assert.equal(syncSignal({ ...fresh, updatedAt: null, error: true }).tone, 'danger')
  assert.equal(syncSignal({ ...fresh, updatedAt: null, loading: true }).tone, 'warning')
  for (const updatedAt of [null, NaN, Infinity, 1e18]) assert.equal(syncSignal({ ...fresh, updatedAt }).tone, 'neutral')
})
function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return rgb[0]*0.2126 + rgb[1]*0.7152 + rgb[2]*0.0722
}
test('signal text meets 4.5:1 on white and on its soft surface', () => {
  for (const [name, color] of Object.entries(SIGNAL_PALETTE)) {
    for (const surface of ['#FFFFFF', color.soft]) {
      const levels = [luminance(color.ink), luminance(surface)].sort((a,b)=>b-a)
      assert.ok((levels[0]+0.05)/(levels[1]+0.05) >= 4.5, `${name} on ${surface}`)
    }
  }
})
test('legacy first-party branding uses the new origin; external tenant assets stay intact', () => {
  assert.equal(brandAssetUrl('https://app.picklefund.uk/logo-picklefund.png'), '/logo-picklefund.png')
  assert.equal(brandAssetUrl('https://app.picklefund.uk/api/files/a?signature=example'), '/api/files/a?signature=example')
  assert.equal(brandAssetUrl('https://images.example.com/logo.png'), 'https://images.example.com/logo.png')
  assert.equal(brandAssetUrl('/tenant/logo.png'), '/tenant/logo.png')
  assert.equal(brandAssetUrl(null), null)
})
