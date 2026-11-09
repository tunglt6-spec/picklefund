import test from 'node:test'
import assert from 'node:assert/strict'
import { detectInstallPlatform } from './pwaInstallStore.ts'

test('detectInstallPlatform', () => {
  assert.equal(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari'), 'ios')
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120'), 'android')
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'), 'desktop')
  // iPadOS 13+ giả Macintosh, phân biệt bằng số điểm chạm
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 5), 'ios')
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 0), 'desktop')
})
