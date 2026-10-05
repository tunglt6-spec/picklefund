/* Chạy: node --test src/lib/glass-safety.test.ts
   Lưới an toàn Liquid Glass: bảo đảm giao diện kính KHÔNG lọt vào báo cáo xuất (PDF/PNG/Excel/infographic). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(import.meta.dirname, '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) out.push(p)
  }
  return out
}
const files = walk(SRC)
const rel = (p: string) => relative(SRC, p).replace(/\\/g, '/')

test('mọi file gọi html2canvas(...) đều ép data-glass="off" trên bản chụp', () => {
  const offenders = files.filter(f => {
    const s = readFileSync(f, 'utf8')
    return /html2canvas\(/.test(s) && !/data-glass['"]\s*,\s*['"]off/.test(s)
  })
  assert.deepEqual(offenders.map(rel), [])
})

test('mã dựng báo cáo (export/infographic/pdf-kit) không dùng class kính hay backdrop-filter', () => {
  const targets = files.filter(f => /lib\/(export|pdf-report-core|pdf-kit|excel-kit|export-theme)|reports\/infographic\/infographic\.utils/.test(f.replace(/\\/g, '/')))
  assert.ok(targets.length > 0)
  for (const f of targets) {
    const s = readFileSync(f, 'utf8')
    assert.ok(!/pf-glass|backdrop-filter\s*:/.test(s), `${rel(f)} chứa pf-glass/backdrop-filter`)
  }
})

test('CSS kính có đủ cơ chế tắt: [data-glass="off"], @supports not, @media print', () => {
  const css = read('index.css')
  assert.match(css, /\[data-glass="off"\] \.pf-glass\b/)
  assert.match(css, /@supports not \(\(backdrop-filter/)
  assert.match(css, /@media print\s*\{\s*\.pf-glass/)
})

test('backdrop-filter chỉ đặt trong index.css (primitive kính), không rải trong TSX', () => {
  const offenders = files.filter(f => {
    const s = readFileSync(f, 'utf8')
    return /backdrop-filter\s*:|backdropFilter/.test(s)
  })
  // Cho phép các chỗ đã có TRƯỚC Liquid Glass; thêm mới phải đi qua .pf-glass*.
  const legacy = new Set<string>(LEGACY_BACKDROP)
  const added = offenders.map(rel).filter(f => !legacy.has(f))
  assert.deepEqual(added, [])
})

// Danh sách file đã dùng backdrop-filter inline trước khi triển khai Liquid Glass (khoá lại để không phình thêm).
const LEGACY_BACKDROP: string[] = ['pages/public/LandingHeader.tsx']
