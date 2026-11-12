#!/usr/bin/env bash
# CHỈ ĐỌC. Quét mọi lệnh import trong mã AI-BOT (main.py + các .py ở /app) rồi thử import THẬT từng gói bên thứ ba trong container,
# để biết có gói nào thiếu (vd. do cài tay vào container cũ rồi mất khi tạo lại container).
set -uo pipefail
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -60
import ast, glob, importlib, os, sys
mods = {}
for f in sorted(glob.glob("/app/*.py")) + sorted(glob.glob("/app/**/*.py", recursive=True)):
    if "/venv/" in f or "/site-packages/" in f or "bak" in os.path.basename(f):
        continue
    try:
        tree = ast.parse(open(f, encoding="utf-8").read())
    except Exception as e:
        print("không đọc được", f, type(e).__name__); continue
    for n in ast.walk(tree):
        names = []
        if isinstance(n, ast.Import):
            names = [a.name for a in n.names]
        elif isinstance(n, ast.ImportFrom) and n.level == 0 and n.module:
            names = [n.module]
        for name in names:
            top = name.split(".")[0]
            mods.setdefault(top, set()).add(os.path.basename(f))
std = set(sys.stdlib_module_names)
local = {os.path.splitext(os.path.basename(p))[0] for p in glob.glob("/app/*.py")} | {"hub"}
missing, ok = [], []
for top in sorted(mods):
    if top in std or top in local:
        continue
    try:
        importlib.import_module(top); ok.append(top)
    except Exception as e:
        missing.append((top, type(e).__name__, sorted(mods[top])))
print("gói bên thứ ba import được:", ", ".join(ok))
print("THIẾU / LỖI:", missing if missing else "không có")
PY
echo "=== xong ==="
exit 0
