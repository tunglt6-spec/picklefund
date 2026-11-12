#!/usr/bin/env bash
# CHỈ ĐỌC. Đọc nhật ký CẤU TRÚC sự kiện tệp Zalo (data/zalo_event_shapes.jsonl): tên trường và kiểu, không có giá trị/nội dung.
set -uo pipefail
F=/opt/ai-bot-saas/data/zalo_event_shapes.jsonl
if [ ! -f "$F" ]; then echo "chưa có tệp nhật ký (chưa có sự kiện tệp nào kể từ khi bật)"; exit 0; fi
echo "số dòng: $(wc -l < "$F")"
echo "=== tóm tắt theo (event_name, chat_type, message_type, file_marker, file_keys) ==="
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -40
import json, collections
cnt = collections.Counter()
last = {}
for line in open("/app/data/zalo_event_shapes.jsonl", encoding="utf-8"):
    try: r = json.loads(line)
    except ValueError: continue
    k = (r["event_name"], r["chat_type"], r["message_type"], r["file_marker"], tuple(r["file_keys"]))
    cnt[k] += 1; last[k] = r
for k, n in cnt.most_common(12):
    print(n, "x", k)
print("--- cấu trúc của sự kiện mới nhất mỗi nhóm (tối đa 4):")
for k in list(last)[-4:]:
    print(k[0], k[1], "->", json.dumps(last[k]["shape"], ensure_ascii=False)[:900])
PY
echo "=== xong ==="
exit 0
