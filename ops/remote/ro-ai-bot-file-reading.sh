#!/usr/bin/env bash
# CHỈ ĐỌC (+ tạo 1 file Word giả trong /tmp của container rồi xóa). Chẩn đoán "bot không đọc file":
# (1) thư viện đọc file chạy được không (thử thật với docx tạo tại chỗ); (2) lịch sử kho file: từng đọc được file chưa (theo kênh, đuôi file, có/không chữ trích);
# (3) mã hàm xử lý tệp đính kèm (chỉ mã); (4) request webhook Zalo quanh 17:00–17:30 giờ VN. Không in tên file, nội dung hay tên người.
set -uo pipefail
echo "=== 1. Thử đọc file Word bằng thư viện đã khôi phục ==="
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -12
import docx, os, tempfile
from markitdown import MarkItDown
p = os.path.join(tempfile.gettempdir(), "t_probe.docx")
d = docx.Document(); d.add_paragraph("Xin chào kiểm tra đọc file 12345"); d.save(p)
txt = MarkItDown().convert(p).text_content
print("markitdown đọc docx:", "OK" if "kiểm tra đọc file" in txt else "KHÔNG ĐỌC ĐƯỢC", "| độ dài", len(txt))
os.remove(p)
PY
echo "=== 2. Kho file (chat_file_vault) theo kênh, đuôi file, tháng: số file / số có chữ trích ==="
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -30
import sqlite3, os
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
rows = c.execute("select channel, file_name, extracted_text, created_at from chat_file_vault").fetchall()
agg = {}
for ch, fn, tx, ts in rows:
    ext = os.path.splitext(fn or "")[1].lower() or "?"
    k = (ch, ext, (ts or "")[:7]); a = agg.setdefault(k, [0, 0]); a[0] += 1; a[1] += 1 if (tx or "").strip() else 0
for k in sorted(agg): print(" ", k, "files=%d  có_chữ=%d" % tuple(agg[k]))
last = c.execute("select channel, created_at, length(coalesce(extracted_text,'')) from chat_file_vault order by id desc limit 5").fetchall()
print("5 file gần nhất (kênh, thời điểm, độ dài chữ):", last)
print("tổng:", len(rows))
PY
echo "=== 3. Hàm xử lý tệp đính kèm trong main.py (chỉ mã, rút gọn) ==="
n=$(grep -n 'def resolve_and_download_attachment' /opt/ai-bot-saas/main.py | head -1 | cut -d: -f1)
echo "hàm ở dòng: ${n:-không thấy}"
[ -n "$n" ] && sed -n "${n},$((n+70))p" /opt/ai-bot-saas/main.py | cut -c1-150
echo "=== 4. Request webhook Zalo 17:00-17:30 VN (10:00-10:30 UTC) theo đường dẫn và mã ==="
docker logs --since 4h -t maika-saas-engine 2>&1 | grep -E '"POST /webhook/zalo' | grep -E 'T10:[0-2][0-9]' | sed -E 's/^([0-9T:-]{13}).*"POST (\/webhook\/zalo[^ ]*) HTTP[^"]*" ([0-9]{3}).*/\1 \2 \3/' | sort | uniq -c | tail -12
echo "=== xong ==="
exit 0
