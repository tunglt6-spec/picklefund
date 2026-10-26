import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const palette = readFileSync(new URL('../index.css', import.meta.url), 'utf8').split('/* Unified mobile light surfaces:')[1]
const color = (token: string) => {
  const value = palette.match(new RegExp(String.raw`${token}:\s*(#[A-Fa-f0-9]{6})`))?.[1]
  assert.ok(value, `Missing ${token}`)
  return value
}
function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return rgb[0]*0.2126 + rgb[1]*0.7152 + rgb[2]*0.0722
}
test('body, secondary and signal text remain readable on the shared light canvas and cards', () => {
  const surfaces = [color('--pf-surface'), color('--pf-bg')]
  for (const token of ['--pf-text', '--pf-text-muted', '--pf-signal-success-ink', '--pf-signal-warning-ink', '--pf-signal-danger-ink']) {
    for (const surface of surfaces) {
      const levels = [luminance(color(token)), luminance(surface)].sort((a,b) => b-a)
      assert.ok((levels[0]+0.05)/(levels[1]+0.05) >= 4.5, `${token} on ${surface}`)
    }
  }
})

test('mobile workspaces share one canvas and card color without module tint assignments', () => {
  assert.equal(color('--pf-bg'), '#F4F7FB')
  assert.equal(color('--pf-surface'), '#EDF2F7')
  assert.ok(!palette.includes('--mod-surface'))
  assert.match(palette, /background-image: none/)
})
