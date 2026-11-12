#!/usr/bin/env bash
# CHỈ ĐỌC. Vì sao bot đọc file nhưng trả lời chung chung: độ dài chữ đã trích của các file gần nhất (KHÔNG in nội dung),
# phần còn lại của hàm trích chữ, và nơi attached_doc_text được đưa vào lời nhắc cho AI (chỉ mã).
set -uo pipefail
echo "=== 1. Các file mới nhất trong kho: kênh | thời điểm | đuôi | cỡ | độ dài chữ trích | số dòng chữ ==="
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -12
import sqlite3, os
c = sqlite3.connect("file:/app/data/saas_bots.sqlite?mode=ro", uri=True)
for ch, ts, fn, size, tx in c.execute("select channel, created_at, file_name, file_size, extracted_text from chat_file_vault order by id desc limit 5"):
    tx = tx or ""
    print(" ", ch, "|", (ts or "")[:19], "|", os.path.splitext(fn or "")[1].lower(), "|", size, "|", len(tx), "|", tx.count("\n") + 1 if tx else 0)
PY
echo "=== 2. Phần còn lại của resolve_and_download_attachment (trích chữ, cắt ngắn) ==="
n=$(grep -n 'def resolve_and_download_attachment' /opt/ai-bot-saas/main.py | head -1 | cut -d: -f1)
sed -n "$((n+70)),$((n+170))p" /opt/ai-bot-saas/main.py | cut -c1-160
echo "=== 3. Nơi attached_doc_text / attached_doc_name được dùng (±8 dòng) ==="
grep -n 'attached_doc_text' /opt/ai-bot-saas/main.py | cut -c1-140 | head -20
for m in $(grep -n 'attached_doc_text' /opt/ai-bot-saas/main.py | cut -d: -f1 | sed -n '2,4p'); do echo "--- quanh dòng $m"; sed -n "$((m-8)),$((m+8))p" /opt/ai-bot-saas/main.py | cut -c1-170; done
echo "=== xong ==="
exit 0
