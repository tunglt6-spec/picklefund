import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const palette = readFileSync(new URL('../index.css', import.meta.url), 'utf8').split('/* Sport tonal surfaces:')[1]
const color = (token: string) => {
  const value = palette.match(new RegExp(String.raw`${token}:\s*(#[A-Fa-f0-9]{6})`))?.[1]
  assert.ok(value, `Missing ${token}`)
  return value
}
function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return rgb[0]*0.2126 + rgb[1]*0.7152 + rgb[2]*0.0722
}
test('body, secondary and signal text remain readable on every mobile tonal card', () => {
  const surfaces = [color('--pf-surface'), ...[...palette.matchAll(/--mod-surface:\s*(#[A-Fa-f0-9]{6})/g)].map(m => m[1])]
  assert.equal(surfaces.length, 8)
  for (const token of ['--pf-text', '--pf-text-muted', '--pf-signal-success-ink', '--pf-signal-warning-ink', '--pf-signal-danger-ink']) {
    for (const surface of surfaces) {
      const levels = [luminance(color(token)), luminance(surface)].sort((a,b) => b-a)
      assert.ok((levels[0]+0.05)/(levels[1]+0.05) >= 4.5, `${token} on ${surface}`)
    }
  }
})
