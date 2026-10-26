import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playfulGlyphs, type PlayfulIconName } from './playfulGlyphs'
import { glassLineColor, glassLineMarkup, glassLineSvg } from './glassLineIcons'

const names = Object.keys(playfulGlyphs) as PlayfulIconName[]
test('every app icon has self-contained light and dark SVG artwork', () => {
  assert.equal(names.length, 93)
  for (const name of names) for (const dark of [false, true]) {
    const svg = glassLineSvg(name, dark)
    assert.ok(svg.startsWith('<svg '))
    assert.ok(!/\{[psa]\}|undefined|https?:\/\/(?!www.w3.org)/.test(svg), name)
    const ids = new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]))
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.has(ref[1]), `${name}: ${ref[1]}`)
  }
})
test('instances use independent paint IDs when multiple copies share one page', () => {
  assert.ok(glassLineMarkup('members', 'one').includes('id="one-glass"'))
  assert.ok(!glassLineMarkup('members', 'two').includes('id="one-glass"'))
})
function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map(c => parseInt(c,16)/255).map(c => c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
test('colored outlines retain at least 3:1 contrast on both preview surfaces', () => {
  for (const name of names) for (const dark of [false,true]) {
    const values=[luminance(glassLineColor(name,dark)),luminance(dark?'#142033':'#F8FAFC')].sort((a,b)=>b-a)
    assert.ok((values[0]+.05)/(values[1]+.05)>=3, `${name} (${dark?'dark':'light'})`)
  }
})
