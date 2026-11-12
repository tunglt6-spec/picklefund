#!/usr/bin/env bash
# CHỈ ĐỌC. Danh sách ĐẦY ĐỦ gói/module mà mã AI-BOT import nhưng container hiện tại không có, kèm vài dòng quanh chỗ import
# và các gói lạ trong pip list. Không in dữ liệu.
set -uo pipefail
echo "=== gói bên thứ ba mà mã import nhưng THIẾU (mỗi dòng 1 gói) ==="
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -40
import ast, glob, importlib, os, sys
mods = {}
for f in sorted(glob.glob("/app/*.py")):
    if "bak" in os.path.basename(f): continue
    tree = ast.parse(open(f, encoding="utf-8").read())
    for n in ast.walk(tree):
        names = [a.name for a in n.names] if isinstance(n, ast.Import) else ([n.module] if isinstance(n, ast.ImportFrom) and n.level == 0 and n.module else [])
        for name in names:
            mods.setdefault(name.split(".")[0], set()).add(os.path.basename(f))
std = set(sys.stdlib_module_names); local = {os.path.splitext(os.path.basename(p))[0] for p in glob.glob("/app/*.py")} | {"hub", "modules"}
for top in sorted(mods):
    if top in std or top in local: continue
    try: importlib.import_module(top)
    except Exception as e: print(" ", top, "|", type(e).__name__, "|", ",".join(sorted(mods[top])))
PY
echo "=== chỗ import trong main.py (số dòng: nội dung) cho các gói thiếu ==="
grep -n -E '^\s*(import|from) (docx|fitz|markitdown|pptx|pandas|mammoth|pdfminer|PyPDF2|pypdf|magic|jwt|cryptography)' /opt/ai-bot-saas/main.py | cut -c1-120 | head -20
echo "=== pip list (toàn bộ tên gói, không phiên bản) ==="
docker exec maika-saas-engine pip list --format=freeze 2>/dev/null | cut -d= -f1 | tr '\n' ' '; echo
echo "=== requirements.txt hiện tại ==="
cat /opt/ai-bot-saas/requirements.txt
echo "=== image và thời điểm tạo container ==="
docker inspect maika-saas-engine --format '{{.Config.Image}} | tạo: {{.Created}} | chạy từ: {{.State.StartedAt}}' 2>/dev/null
docker images ai-bot-saas --format '{{.Repository}}:{{.Tag}} | {{.CreatedAt}} | {{.Size}}'
echo "=== xong ==="
exit 0
