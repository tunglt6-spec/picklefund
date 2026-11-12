#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ4b: xác nhận nhóm CLB The PING cho liên kết PickleFund đang hoạt động của bot The PING (tương đương bấm "Xác nhận cho PickleFund").
# Chỉ chèn khi: có liên kết active của bot_7be4d5962d80 VÀ nhóm zgr-d6bd97da8ebb67e53eaa đã có trong lịch sử trò chuyện của bot. Không in khóa/mã.
# Sao lưu DB trước. Idempotent. Quay lại: DELETE FROM hub_link_chats WHERE link_id=… AND chat_id=… (hoặc bấm "Bỏ xác nhận" trên AI-BOT).
set -euo pipefail
C=maika-saas-engine
TS=$(date +%Y%m%d_%H%M%S)
docker exec -i "$C" python - "$TS" <<'PY'
import sqlite3, sys, time
BOT, CHAT = "bot_7be4d5962d80", "zgr-d6bd97da8ebb67e53eaa"
db = sqlite3.connect("/app/data/saas_bots.sqlite")
bak = sqlite3.connect(f"/app/data/backups/saas_bots_pre_hubseed_{sys.argv[1]}.sqlite"); db.backup(bak); bak.close()
link = db.execute("SELECT link_id FROM hub_links WHERE bot_id=? AND status='active' ORDER BY created_at DESC LIMIT 1", (BOT,)).fetchone()
if not link:
    print("CHƯA có liên kết active cho bot The PING — hãy tạo mã ở AI-BOT và dán vào PickleFund trước"); sys.exit(1)
seen = db.execute("SELECT COUNT(*) FROM group_chat_history WHERE bot_id=? AND chat_id=?", (BOT, CHAT)).fetchone()[0]
if not seen:
    print("nhóm chưa có trong lịch sử của bot — dừng"); sys.exit(1)
now = time.time()
db.execute("INSERT INTO hub_link_chats(link_id,chat_id,first_seen,last_seen) VALUES(?,?,?,?) ON CONFLICT(link_id,chat_id) DO UPDATE SET last_seen=excluded.last_seen", (link[0], CHAT, now, now))
db.commit()
print("đã xác nhận nhóm", CHAT, "cho liên kết", link[0], "(", seen, "tin trong lịch sử )")
PY
echo "=== xong ==="
exit 0
