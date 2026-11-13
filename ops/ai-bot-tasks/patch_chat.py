"""AI-BOT main.py — đường đặt lịch/giao việc TỪ TIN NHẮN (@bot trong nhóm): hiểu & lưu lặp lại tuần/tháng/năm.
 - Chỉ thị AI: thêm monthly/yearly + cách chọn tần suất + 'next_run_iso_utc' là lần đầu ở tương lai.
 - CREATE_REMINDER: chuẩn hóa recurrence, lưu recur_anchor_day.
 - CREATE_TASK: lưu recurrence + due_at_utc (nhiệm vụ lặp lại từ chat được bộ lập lịch xử lý như nhiệm vụ tạo từ app).
Phụ thuộc patch_main.py (hàm _norm_recurrence/_parse_iso_aware/_anchor_day_of). Idempotent (marker CHAT-RECUR-2026). Neo sai → dừng, không ghi.
"""
import ast
import os
import re

AB = os.environ.get("AB", "/opt/ai-bot-saas")
p = os.path.join(AB, "main.py")
s = open(p, encoding="utf-8").read()
MARK = "CHAT-RECUR-2026"
if MARK in s:
    print("đường chat đã vá — bỏ qua")
    raise SystemExit(0)
assert "def _norm_recurrence" in s, "chưa có patch_main.py (TASKS-RECUR-2026) — chạy trước"


def one(a, b, what):
    """Thay đúng 1 chỗ; khoảng trắng trong neo khớp linh hoạt."""
    global s
    pat = re.compile(r"\s+".join(re.escape(tok) for tok in a.split()))
    found = pat.findall(s)
    assert len(found) == 1, f"{what}: kỳ vọng 1 khớp, thực tế {len(found)}"
    s = pat.sub(lambda m: b.strip(), s, count=1)


# 1. chỉ thị cho AI (prompt là f-string: tuyệt đối không dùng dấu ngoặc nhọn trong phần thêm)
one("- TUYỆT ĐỐI KHÔNG chọn nếu câu nói là nhờ làm việc, lấy giá, cào web hay tra cứu thông tin.",
    "- TUYỆT ĐỐI KHÔNG chọn nếu câu nói là nhờ làm việc, lấy giá, cào web hay tra cứu thông tin.\n"
    "- TẦN SUẤT LẶP LẠI ('recurrence'): CHỈ đặt khi người dùng nói rõ lặp lại; còn lại để 'none'. 'mỗi ngày/hằng ngày' = 'daily'; "
    "'thứ 2 đến thứ 6/các ngày trong tuần' = 'weekdays'; 'mỗi tuần/hằng tuần/mỗi thứ N' = 'weekly'; "
    "'mỗi tháng/hằng tháng/ngày N hằng tháng' = 'monthly'; 'mỗi năm/hằng năm/sinh nhật/kỷ niệm' = 'yearly'. "
    "'next_run_iso_utc' là LẦN ĐẦU TIÊN (giờ UTC, kết thúc bằng Z) và phải ở TƯƠNG LAI; các lần sau hệ thống tự tính.",
    "chỉ thị lặp lại cho nhắc hẹn")
one("'lưu việc này vào app để mai anh xử lý').",
    "'lưu việc này vào app để mai anh xử lý').\n"
    "- Với CREATE_TASK có hạn cụ thể hoặc lặp lại: điền 'next_run_iso_utc' = hạn (giờ UTC, kết thúc bằng Z) và 'recurrence' như quy tắc trên.",
    "chỉ thị cho nhiệm vụ")
one('''  "recurrence": "weekdays" / "daily" / "weekly" / "none",''',
    '''  "recurrence": "none" / "daily" / "weekdays" / "weekly" / "monthly" / "yearly",''', "mẫu JSON recurrence")

# 2. CREATE_REMINDER
one('''        recurrence = extracted.get("recurrence", "none")
        with sqlite3.connect(str(DB_PATH)) as conn:
            c = conn.cursor()
            c.execute("""
                INSERT INTO skill_reminders (owner_id, bot_id, group_id, channel, chat_id, title, remind_at_utc, recurrence, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
            """, (bot_tenant_id, bot_id, target_group_name, target_platform, target_chat_id, title, next_run_utc, recurrence, now_iso))''',
    '''        recurrence = _norm_recurrence(extracted.get("recurrence", "none"))  # CHAT-RECUR-2026
        with sqlite3.connect(str(DB_PATH)) as conn:
            c = conn.cursor()
            c.execute("""
                INSERT INTO skill_reminders (owner_id, bot_id, group_id, channel, chat_id, title, remind_at_utc, recurrence, status, created_at, recur_anchor_day)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
            """, (bot_tenant_id, bot_id, target_group_name, target_platform, target_chat_id, title, next_run_utc, recurrence, now_iso, _anchor_day_of(next_run_utc)))''',
    "CREATE_REMINDER chuẩn hóa + anchor")

# 3. CREATE_TASK
one('''        priority = extracted.get("priority", "normal")
        creator_id = bot_tenant_id if is_owner else f"{sender_name}"
        try:
            with sqlite3.connect(str(DB_PATH)) as conn:
                c = conn.cursor()
                c.execute("""
                    INSERT INTO skill_tasks (creator_id, assignee_id, bot_id, group_id, title, description, due_date, priority, status, reminder_sent, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?)
                """, (creator_id, bot_tenant_id, bot_id, target_group_name, title, desc, due_date, priority, now_iso, now_iso))''',
    '''        priority = extracted.get("priority", "normal")
        creator_id = bot_tenant_id if is_owner else f"{sender_name}"
        _t_rec = _norm_recurrence(extracted.get("recurrence", "none"))
        _t_aw = _parse_iso_aware(extracted.get("next_run_iso_utc", ""))
        _t_iso = _t_aw.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z") if _t_aw else None
        if _t_iso:
            _t_vn = _t_aw.astimezone(VN_TZ)
            due_date = f"{_t_vn.strftime('%H:%M')} {_t_vn.strftime('%d/%m/%Y')}"
        else:
            _t_rec = "none"  # lặp lại cần mốc giờ chính xác
        try:
            with sqlite3.connect(str(DB_PATH)) as conn:
                c = conn.cursor()
                c.execute("""
                    INSERT INTO skill_tasks (creator_id, assignee_id, bot_id, group_id, title, description, due_date, priority, status, reminder_sent, created_at, updated_at, recurrence, due_at_utc, recur_anchor_day)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?, ?, ?)
                """, (creator_id, bot_tenant_id, bot_id, target_group_name, title, desc, due_date, priority, now_iso, now_iso, _t_rec, _t_iso, _anchor_day_of(_t_iso)))''',
    "CREATE_TASK lưu lặp lại")

ast.parse(s)
open(p + ".new", "w", encoding="utf-8").write(s)
os.replace(p + ".new", p)
print("đã vá đường đặt lịch/giao việc từ chat")
