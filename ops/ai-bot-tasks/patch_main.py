"""AI-BOT main.py: lặp lại tuần/tháng/năm cho Lịch nhắc + Nhiệm vụ, và tự đánh dấu Nhiệm vụ HOÀN THÀNH khi bot đã nhắc xong.
Chạy trên VPS bởi rw-ai-bot-tasks-recur.sh (AB=/opt/ai-bot-saas). Idempotent (marker TASKS-RECUR-2026). Mọi neo dùng assert: sai neo → dừng, KHÔNG ghi.
"""
import ast
import os
import re

AB = os.environ.get("AB", "/opt/ai-bot-saas")
p = os.path.join(AB, "main.py")
s = open(p, encoding="utf-8").read()
MARK = "# TASKS-RECUR-2026"
if MARK in s:
    print("main.py đã vá — bỏ qua")
    raise SystemExit(0)


def one(pattern_or_text, repl, regex=False, flags=0, what=""):
    global s
    if regex:
        found = re.findall(pattern_or_text, s, flags)
        assert len(found) == 1, f"{what}: kỳ vọng 1 khớp, thực tế {len(found)}"
        s = re.sub(pattern_or_text, lambda m: repl, s, count=1, flags=flags)
    else:
        assert s.count(pattern_or_text) == 1, f"{what}: kỳ vọng 1 khớp, thực tế {s.count(pattern_or_text)}"
        s = s.replace(pattern_or_text, repl, 1)


# ── 0. an toàn: mọi INSERT vào 2 bảng phải có danh sách cột (thêm cột mới ở cuối không làm hỏng INSERT theo vị trí)
ins_all = re.findall(r"INSERT\s+(?:OR\s+\w+\s+)?INTO\s+skill_(?:tasks|reminders)\b", s, re.I)
ins_cols = re.findall(r"INSERT\s+(?:OR\s+\w+\s+)?INTO\s+skill_(?:tasks|reminders)\s*\(", s, re.I)
assert len(ins_all) == len(ins_cols), "có INSERT vào skill_tasks/skill_reminders không kèm danh sách cột — dừng"

# ── 1. model nhận dữ liệu lặp lại
one('''class TaskCreateReq(BaseModel):
    creator_id: Optional[str] = ""
    assignee_id: Optional[str] = ""
    bot_id: str
    group_id: Optional[str] = ""
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = "Hôm nay"
    priority: Optional[str] = "normal"
''', '''class TaskCreateReq(BaseModel):
    creator_id: Optional[str] = ""
    assignee_id: Optional[str] = ""
    bot_id: str
    group_id: Optional[str] = ""
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = "Hôm nay"
    priority: Optional[str] = "normal"
    recurrence: Optional[str] = "none"      ''' + MARK + '''
    due_at_utc: Optional[str] = ""
''', what="TaskCreateReq")

# ── 2. hàm tính lần lặp kế tiếp (thêm monthly/yearly, giữ nguyên các kiểu cũ) + trợ giúp cho nhiệm vụ
NEW_FUNCS = '''RECURRENCE_ALLOWED = {"none", "daily", "weekdays", "weekly", "monthly", "yearly"}  ''' + MARK + '''


def _norm_recurrence(rec):
    r = (rec or "none").lower().strip()
    alias = {"hang_ngay": "daily", "hang ngay": "daily", "hang_tuan": "weekly", "hang tuan": "weekly", "hang_thang": "monthly", "hang thang": "monthly",
             "hang_nam": "yearly", "hang nam": "yearly", "mon_to_fri": "weekdays", "mon_fri": "weekdays", "thu_2_den_thu_6": "weekdays", "thu 2 den thu 6": "weekdays", "t2-t6": "weekdays"}
    r = alias.get(r, r)
    return r if r in RECURRENCE_ALLOWED else "none"


def _parse_iso_aware(v):
    """Chuỗi ISO (có thể kết thúc bằng Z) -> datetime có múi giờ; không hợp lệ -> None."""
    try:
        t = str(v or "").strip()
        if not t:
            return None
        t = t[:-1] + "+00:00" if t.endswith(("Z", "z")) else t
        d = datetime.fromisoformat(t)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def compute_next_recurrence_utc(current_utc_str: str, recurrence: str, anchor_day=None) -> str:
    """Computes the next ISO UTC datetime string based on recurrence pattern (daily/weekdays/weekly/monthly/yearly)."""
    try:
        dt = _parse_iso_aware(current_utc_str)
        if dt is None:
            return None
        import calendar as _cal
        dt_vn = dt.astimezone(VN_TZ)
        rec = _norm_recurrence(recurrence)
        if rec == "daily":
            next_vn = dt_vn + timedelta(days=1)
        elif rec == "weekdays":
            day = dt_vn.weekday()  # 0=Mon ... 4=Fri, 5=Sat, 6=Sun
            next_vn = dt_vn + timedelta(days=3 if day == 4 else 2 if day == 5 else 1)
        elif rec == "weekly":
            next_vn = dt_vn + timedelta(days=7)
        elif rec in ("monthly", "yearly"):
            add = 1 if rec == "monthly" else 12
            y = dt_vn.year + (dt_vn.month - 1 + add) // 12
            m = (dt_vn.month - 1 + add) % 12 + 1
            d = min(int(anchor_day) if anchor_day else dt_vn.day, _cal.monthrange(y, m)[1])  # ngày 31 → cuối tháng ngắn, nhưng tháng sau quay lại 31
            next_vn = dt_vn.replace(year=y, month=m, day=d)
        else:
            return None
        return next_vn.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    except Exception as e:
        logger.error(f"Error computing next recurrence: {e}")
        return None


def next_recurrence_after_now(current_utc_str: str, recurrence: str, anchor_day=None):
    """Lần lặp kế tiếp LUÔN nằm ở tương lai (nếu máy chủ từng tắt lâu, bỏ qua các lần đã lỡ thay vì gửi dồn)."""
    cur = current_utc_str
    for _ in range(800):
        nxt = compute_next_recurrence_utc(cur, recurrence, anchor_day)
        if not nxt:
            return None
        nd = _parse_iso_aware(nxt)
        if nd and nd > datetime.now(timezone.utc):
            return nxt
        cur = nxt
    return None


def _anchor_day_of(utc_str):
    d = _parse_iso_aware(utc_str)
    return d.astimezone(VN_TZ).day if d else None


def _task_due_dt(t):
    """Hạn của nhiệm vụ: ưu tiên due_at_utc (chính xác), cũ hơn thì phân tích chuỗi due_date."""
    try:
        iso = t["due_at_utc"] if "due_at_utc" in t.keys() else None
    except Exception:
        iso = None
    return _parse_iso_aware(iso) or parse_task_due_datetime(t["due_date"])


def _after_task_fired(c, t, success):
    """Sau khi bot đã nhắc nhiệm vụ đến hạn: lặp lại → dời sang kỳ sau (vẫn PENDING); không lặp + gửi được → COMPLETED."""
    now_s = datetime.now().isoformat()
    keys = t.keys()
    rec = _norm_recurrence(t["recurrence"] if "recurrence" in keys else "none")
    iso = t["due_at_utc"] if "due_at_utc" in keys else None
    if rec != "none" and iso:
        anchor = t["recur_anchor_day"] if "recur_anchor_day" in keys else None
        nxt = next_recurrence_after_now(iso, rec, anchor)
        nd = _parse_iso_aware(nxt) if nxt else None
        if nd:
            nvn = nd.astimezone(VN_TZ)
            c.execute("UPDATE skill_tasks SET due_at_utc = ?, due_date = ?, reminder_sent = 0, status = 'PENDING', updated_at = ? WHERE id = ?",
                      (nxt, f"{nvn.strftime('%H:%M')} {nvn.strftime('%d/%m/%Y')}", now_s, t["id"]))
            return "rescheduled"
    if success:
        c.execute("UPDATE skill_tasks SET status = 'COMPLETED', reminder_sent = 1, updated_at = ? WHERE id = ?", (now_s, t["id"]))
        return "completed"
    c.execute("UPDATE skill_tasks SET reminder_sent = 1, updated_at = ? WHERE id = ?", (now_s, t["id"]))
    return "failed"


'''
one(r"def compute_next_recurrence_utc\(.*?\n(?=async def run_reminder_and_task_scheduler_daemon)", NEW_FUNCS, regex=True, flags=re.S, what="compute_next_recurrence_utc")

# ── 3. bộ lập lịch: Lịch nhắc — lấy cột recurrence (trước đây KHÔNG lấy nên lịch lặp không bao giờ lặp)
one('''                    SELECT r.id, r.owner_id, r.bot_id, r.group_id, r.channel, r.chat_id, r.title, r.remind_at_utc,
                           b.bot_name, b.custom_prompt, b.is_active''', '''                    SELECT r.id, r.owner_id, r.bot_id, r.group_id, r.channel, r.chat_id, r.title, r.remind_at_utc,
                           r.recurrence, r.recur_anchor_day,
                           b.bot_name, b.custom_prompt, b.is_active''', what="SELECT reminders scheduler")
one('''next_utc = compute_next_recurrence_utc(r["remind_at_utc"], rec) if rec and rec != "none" else None''',
    '''next_utc = next_recurrence_after_now(r["remind_at_utc"], rec, r["recur_anchor_day"] if "recur_anchor_day" in r.keys() else None) if rec and _norm_recurrence(rec) != "none" else None''',
    what="tính lần lặp lịch nhắc")

# ── 4. bộ lập lịch: Nhiệm vụ
one('''                    SELECT t.id, t.creator_id, t.assignee_id, t.bot_id, t.group_id, t.title, t.description, t.due_date, t.priority, t.status, t.reminder_sent,
                           b.bot_name, b.custom_prompt, b.is_active''', '''                    SELECT t.id, t.creator_id, t.assignee_id, t.bot_id, t.group_id, t.title, t.description, t.due_date, t.priority, t.status, t.reminder_sent,
                           t.recurrence, t.due_at_utc, t.recur_anchor_day,
                           b.bot_name, b.custom_prompt, b.is_active''', what="SELECT tasks scheduler")
one('''                    due_dt = parse_task_due_datetime(t["due_date"])
                    is_task_due = False''', '''                    due_dt = _task_due_dt(t)
                    is_task_due = False''', what="due_dt scheduler")
one('''                        c.execute("UPDATE skill_tasks SET reminder_sent = 1 WHERE id = ?", (t["id"],))
                        conn.commit()''', '''                        _task_outcome = _after_task_fired(c, t, success)
                        conn.commit()
                        logger.info(f"[SCHEDULER] Task #{t['id']} outcome: {_task_outcome}")''', what="cập nhật nhiệm vụ sau khi nhắc")

# ── 5. API: trả thêm recurrence/due_at_utc; tạo nhiệm vụ/lịch nhắc có lặp lại
one("t.due_date, t.priority, t.status, t.created_at, b.bot_name", "t.due_date, t.priority, t.status, t.created_at, t.recurrence, t.due_at_utc, b.bot_name", what="GET /api/tasks")
one("    due_dt = parse_task_due_datetime(req.due_date)\n    init_reminder_sent = 0",
    "    due_dt = _parse_iso_aware(req.due_at_utc) or parse_task_due_datetime(req.due_date)\n    init_reminder_sent = 0", what="create_new_task due_dt")
one('''        c.execute("""
            INSERT INTO skill_tasks (creator_id, assignee_id, bot_id, group_id, title, description, due_date, priority, status, reminder_sent, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
        """, (eff_user, eff_user, req.bot_id, req.group_id or '', req.title, req.description or '', req.due_date or 'Hôm nay', req.priority or 'normal', init_reminder_sent, now, now))''',
    '''        _rec = _norm_recurrence(req.recurrence)
        _due_iso = None
        _d_aw = _parse_iso_aware(req.due_at_utc)
        if _d_aw:
            _due_iso = _d_aw.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        if not _due_iso:
            _rec = "none"  # lặp lại cần mốc giờ chính xác
        c.execute("""
            INSERT INTO skill_tasks (creator_id, assignee_id, bot_id, group_id, title, description, due_date, priority, status, reminder_sent, created_at, updated_at, recurrence, due_at_utc, recur_anchor_day)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)
        """, (eff_user, eff_user, req.bot_id, req.group_id or '', req.title, req.description or '', req.due_date or 'Hôm nay', req.priority or 'normal', init_reminder_sent, now, now, _rec, _due_iso, _anchor_day_of(_due_iso)))''',
    what="INSERT skill_tasks")
one('''        c.execute("""
            INSERT INTO skill_reminders (owner_id, bot_id, group_id, channel, chat_id, title, remind_at_utc, recurrence, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
        """, (eff_owner, req.bot_id, req.group_id or '', req.channel, req.chat_id, req.title, req.remind_at_utc, req.recurrence or 'none', now))''',
    '''        _rrec = _norm_recurrence(req.recurrence)
        c.execute("""
            INSERT INTO skill_reminders (owner_id, bot_id, group_id, channel, chat_id, title, remind_at_utc, recurrence, status, created_at, recur_anchor_day)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
        """, (eff_owner, req.bot_id, req.group_id or '', req.channel, req.chat_id, req.title, req.remind_at_utc, _rrec, now, _anchor_day_of(req.remind_at_utc)))''',
    what="INSERT skill_reminders")

ast.parse(s)
open(p + ".new", "w", encoding="utf-8").write(s)
os.replace(p + ".new", p)
print("đã vá main.py (lặp lại tuần/tháng/năm, tự hoàn thành nhiệm vụ)")
