#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). KHÔI PHỤC các gói Python mà AI-BOT dùng nhưng KHÔNG có trong requirements.txt và đã MẤT khi container được TẠO LẠI
# (docker compose up --force-recreate lúc cài Zalo Hub GĐ1 lần 1 và lần 2). Các gói này trước đó chỉ được cài tay vào container cũ.
# Thiếu hiện tại (quét import thật): markitdown, docx (python-docx), fitz (PyMuPDF)  → đọc file đính kèm Word/PDF/Excel/PowerPoint trong chat.
# (weasyprint cần thư viện hệ thống pango nên KHÔNG tự cài ở đây — chưa rõ có đang dùng; zalo_enterprise_editorial là module nội bộ không có file.)
# Làm: kiểm tra đĩa (<85%) → pip install vào container đang chạy (KHÔNG khởi động lại, không tạo lại) → kiểm tra import thật →
# ghi các gói vào requirements.txt (để lần dựng image sau không mất nữa). Idempotent. Không đụng main.py/DB.
# Quay lại: pip uninstall trong container; requirements.txt có bản sao requirements.txt.bak_pre_deps_<ts>.
set -euo pipefail
AB=/opt/ai-bot-saas
C=maika-saas-engine
TS=$(date +%Y%m%d_%H%M%S)
use=$(df -P / | awk 'NR==2{gsub(/%/,"",$5);print $5}')
echo "đĩa /: ${use}% đã dùng"
[ "$use" -lt 85 ] || { echo "Đĩa >= 85% — dừng, không cài (tránh đầy đĩa)"; exit 1; }

echo "== 1. pip install vào container đang chạy =="
docker exec "$C" pip install --no-cache-dir "markitdown[docx,pdf,pptx,xlsx]" python-docx PyMuPDF 2>&1 | tail -4 | cut -c1-200

echo "== 2. Kiểm tra import thật =="
docker exec -i "$C" python - <<'PY'
import importlib, sys
bad = []
for m in ("markitdown", "docx", "fitz"):
    try:
        mod = importlib.import_module(m); print(" OK ", m, getattr(mod, "__version__", ""))
    except Exception as e:
        print(" LỖI", m, type(e).__name__, str(e)[:100]); bad.append(m)
try:
    from markitdown import MarkItDown; MarkItDown(); print(" OK  MarkItDown() khởi tạo được")
except Exception as e:
    print(" LỖI MarkItDown()", type(e).__name__, str(e)[:100]); bad.append("MarkItDown()")
sys.exit(1 if bad else 0)
PY

echo "== 3. Ghi vào requirements.txt (để dựng lại image không mất) =="
cp -p "$AB/requirements.txt" "$AB/requirements.txt.bak_pre_deps_${TS}"
for line in "markitdown[docx,pdf,pptx,xlsx]" "python-docx" "PyMuPDF"; do
  grep -qxF "$line" "$AB/requirements.txt" || echo "$line" >> "$AB/requirements.txt"
done
cat "$AB/requirements.txt"
cd "$AB" && git add requirements.txt 2>/dev/null && { git diff --cached --quiet || git commit -q -m "requirements: ghi các gói cài tay (markitdown, python-docx, PyMuPDF)"; } || true
echo "=== xong: đã khôi phục gói; container KHÔNG bị khởi động lại ==="
echo "LƯU Ý: gói cài bằng pip vào container vẫn mất nếu container bị TẠO LẠI; sau khi requirements.txt đã ghi đủ, lần dựng image (docker compose build) sẽ giữ chúng."
exit 0
