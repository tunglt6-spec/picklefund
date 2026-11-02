// Chạy mọi *.test.ts trong src bằng node:test + tsx (tự liệt kê file để chạy được cả Node 20 lẫn Windows).
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.test.ts') ? [join(dir, e.name)] : [],
  )
const files = walk('src')
if (!files.length) {
  console.error('Không tìm thấy file *.test.ts')
  process.exit(1)
}
const r = spawnSync(process.execPath, ['./node_modules/tsx/dist/cli.mjs', '--tsconfig', 'tsconfig.app.json', '--test', ...files], { stdio: 'inherit' })
process.exit(r.status ?? 1)
