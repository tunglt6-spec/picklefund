/* Sinh bản CommonJS của lõi PDF vector (nguồn chân lý: frontend/src/lib) để backend dùng ĐÚNG mẫu phiếu của app.
 * Chạy: npm run sync:pdf-core. Spec pdf-core-sync.spec.ts kiểm tra bản sinh còn khớp nguồn. */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'frontend', 'src', 'lib');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'pdf-core');
const FILES = ['export-theme', 'pdf-kit', 'pdf-report-core'];

function toCjs(name, code) {
  const names = [];
  let out = code.replace(/^import\s+\{([^}]+)\}\s+from\s+'\.\/([\w-]+)\.js'\s*;?$/gm, (_, list, mod) => `const {${list}} = require('./${mod}.js')`);
  out = out.replace(/^export\s+(const|function)\s+(\w+)/gm, (_, kind, n) => { names.push(n); return `${kind} ${n}`; });
  out = out.replace(/^export\s+\{([^}]+)\}\s*;?$/gm, (_, list) => { list.split(',').map((s) => s.trim()).filter(Boolean).forEach((n) => names.push(n)); return ''; });
  const uniq = [...new Set(names)];
  return `/* AUTO-GENERATED từ frontend/src/lib/${name}.js — KHÔNG sửa tay. Chạy: npm run sync:pdf-core */\n${out}\n\nmodule.exports = { ${uniq.join(', ')} };\n`;
}

function generate() {
  const res = {};
  for (const f of FILES) res[f + '.js'] = toCjs(f, fs.readFileSync(path.join(SRC, f + '.js'), 'utf8').replace(/\r\n/g, '\n'));
  return res;
}

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [file, code] of Object.entries(generate())) fs.writeFileSync(path.join(OUT, file), code);
  console.log('pdf-core synced');
}
module.exports = { generate, OUT };
