"""AI-BOT DB: thêm cột lặp lại cho nhiệm vụ/lịch nhắc + sửa nhiệm vụ cũ đã được bot nhắc nhưng còn PENDING.
Chạy TRONG container (python), DB /app/data/saas_bots.sqlite (hoặc DBFILE). Idempotent. Không in nội dung nhiệm vụ.
"""
import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

DB = os.environ.get("DBFILE", "/app/data/saas_bots.sqlite")
APPLY = "--apply" in sys.argv
VN = timezone(timedelta(hours=7))
c = sqlite3.connect(DB)


def cols(table):
    return {r[1] for r in c.execute(f"PRAGMA table_info({table})")}


def add(table, col, ddl):
    if col not in cols(table):
        c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")
        print("đã thêm cột", table + "." + col)
    else:
        print("đã có cột", table + "." + col)


add("skill_tasks", "recurrence", "TEXT DEFAULT 'none'")
add("skill_tasks", "due_at_utc", "TEXT")
add("skill_tasks", "recur_anchor_day", "INTEGER")
add("skill_reminders", "recur_anchor_day", "INTEGER")
c.commit()

# Sửa dữ liệu cũ: nhiệm vụ PENDING + reminder_sent=1 mà bot THỰC SỰ đã nhắc (tạo trước hạn, hạn đã qua) → COMPLETED.
# Chỉ xử lý 2 dạng hạn mà hệ thống cũ ghi: "HH:MM Hôm nay" (ngày tạo) và "dd/mm" (23:59:59 ngày đó, năm của ngày tạo).
# Nhiệm vụ được tạo khi hạn đã qua (reminder_sent=1 ngay lúc tạo, bot chưa từng nhắc) KHÔNG đụng tới.
now = datetime.now(VN)
rows = c.execute("SELECT id, due_date, created_at FROM skill_tasks WHERE status='PENDING' AND reminder_sent=1 AND (due_at_utc IS NULL OR due_at_utc='')").fetchall()
fix, skip = [], 0
for tid, due, created in rows:
    try:
        cr = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
        cr = cr if cr.tzinfo else cr.replace(tzinfo=VN)
        s = str(due or "")
        m_t = re.search(r"(\d{1,2}):(\d{2})", s)
        m_d = re.search(r"(\d{1,2})/(\d{1,2})(?:/(\d{4}))?", s)
        if m_t and ("hôm nay" in s.lower() or "hom nay" in s.lower()):
            d = datetime.combine(cr.astimezone(VN).date(), datetime.min.time(), tzinfo=VN).replace(hour=int(m_t.group(1)), minute=int(m_t.group(2)))
        elif m_d and not m_t:
            y = int(m_d.group(3)) if m_d.group(3) else cr.astimezone(VN).year
            d = datetime(y, int(m_d.group(2)), int(m_d.group(1)), 23, 59, 59, tzinfo=VN)
        else:
            skip += 1
            continue
        if cr < d <= now:
            fix.append(tid)
        else:
            skip += 1
    except Exception:
        skip += 1
print(f"nhiệm vụ PENDING đã được nhắc: {len(rows)} | sẽ chuyển COMPLETED: {len(fix)} | bỏ qua: {skip}")
if APPLY and fix:
    c.executemany("UPDATE skill_tasks SET status='COMPLETED', updated_at=? WHERE id=?", [(now.isoformat(), t) for t in fix])
    c.commit()
    print("đã chuyển", len(fix), "nhiệm vụ sang COMPLETED")
elif fix:
    print("(chưa áp dụng — thiếu --apply)")
print("trạng thái hiện tại:", c.execute("SELECT status, COUNT(*) FROM skill_tasks GROUP BY status").fetchall())
