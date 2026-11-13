"""AI-BOT main.py: API SỬA / XÓA Nhiệm vụ và Lịch nhắc (PUT/DELETE /api/skills/task/{id}, /api/skills/reminder/{id}).
Xác thực bằng token phiên (hub_token cấp lúc đăng nhập, hub._session_user) + kiểm tra quyền sở hữu — chặt hơn các API cũ (chỉ tin account_id từ trình duyệt).
Phụ thuộc patch_main.py (_norm_recurrence, _parse_iso_aware, _anchor_day_of). Idempotent (marker TASKS-CRUD-2026). Neo sai → dừng.
"""
import ast
import os
import re

AB = os.environ.get("AB", "/opt/ai-bot-saas")
p = os.path.join(AB, "main.py")
s = open(p, encoding="utf-8").read()
MARK = "# TASKS-CRUD-2026"
if MARK in s:
    print("API sửa/xóa đã có — bỏ qua")
    raise SystemExit(0)
assert "def _norm_recurrence" in s and "def _anchor_day_of" in s, "chưa có patch_main.py (TASKS-RECUR-2026)"

ANCHOR = '@app.post("/api/skills/memory")'
pat = re.compile(re.escape(ANCHOR))
assert len(pat.findall(s)) == 1, "neo /api/skills/memory: không đúng 1 chỗ"

CODE = '''# TASKS-CRUD-2026 — sửa / xóa nhiệm vụ & lịch nhắc (xác thực phiên + quyền sở hữu)
class TaskEditReq(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    due_at_utc: Optional[str] = None
    priority: Optional[str] = None
    recurrence: Optional[str] = None
    bot_id: Optional[str] = None
    group_id: Optional[str] = None
class ReminderEditReq(BaseModel):
    title: Optional[str] = None
    remind_at_utc: Optional[str] = None
    recurrence: Optional[str] = None
    bot_id: Optional[str] = None
    group_id: Optional[str] = None
    channel: Optional[str] = None
    chat_id: Optional[str] = None
def _crud_user(request: Request):
    """(username thường, là superadmin). Cần Authorization: Bearer <hub_token> từ lúc đăng nhập; thiếu/hết hạn → 401."""
    sub, role = _hub_mod._session_user(request.headers.get("authorization"))
    return sub.strip().lower(), bool(_hub_mod._is_super(role, sub))
def _crud_iso(v, what):
    aw = _parse_iso_aware(v)
    if not aw:
        raise HTTPException(status_code=400, detail=f"{what} không hợp lệ")
    return aw.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
def _crud_check_bot(c, bot_id, user, is_super):
    brow = c.execute("SELECT tenant_id FROM bots WHERE bot_id = ?", (bot_id,)).fetchone()
    if not brow or not (is_super or (brow[0] or "").strip().lower() == user):
        raise HTTPException(status_code=403, detail="Bot không thuộc tài khoản của bạn")
@app.put("/api/skills/task/{task_id}")
async def edit_task(task_id: int, req: TaskEditReq, request: Request):
    user, is_super = _crud_user(request)
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        row = c.execute("SELECT * FROM skill_tasks WHERE id = ?", (task_id,)).fetchone()
        if not row or not (is_super or user in ((row["assignee_id"] or "").strip().lower(), (row["creator_id"] or "").strip().lower())):
            raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")
        title = (req.title if req.title is not None else row["title"] or "").strip()
        if not title or len(title) > 300:
            raise HTTPException(status_code=400, detail="Tiêu đề phải từ 1 đến 300 ký tự")
        desc = (req.description if req.description is not None else row["description"] or "")
        if len(desc) > 4000:
            raise HTTPException(status_code=400, detail="Mô tả quá dài (tối đa 4000 ký tự)")
        prio = req.priority if req.priority in ("low", "normal", "high", "urgent") else row["priority"]
        old_rec = _norm_recurrence(row["recurrence"])
        rec = _norm_recurrence(req.recurrence) if req.recurrence is not None else old_rec
        due_text = req.due_date if req.due_date is not None else row["due_date"]
        due_iso = row["due_at_utc"]
        status, rem_sent = row["status"], row["reminder_sent"]
        due_changed = False
        if req.due_at_utc is not None:
            new_iso = _crud_iso(req.due_at_utc, "Hạn") if req.due_at_utc.strip() else None
            due_changed = new_iso != due_iso
            due_iso = new_iso
        if not due_iso:
            rec = "none"  # lặp lại cần mốc giờ chính xác
        if due_changed or rec != old_rec:
            aw = _parse_iso_aware(due_iso)
            if aw and aw > datetime.now(timezone.utc):
                status, rem_sent = "PENDING", 0  # đặt hạn ở tương lai → mở lại để bot nhắc đúng giờ
        bot_id, group_id = row["bot_id"], row["group_id"]
        if req.bot_id and req.bot_id != bot_id:
            _crud_check_bot(c, req.bot_id, user, is_super)
            bot_id, group_id = req.bot_id, (req.group_id or "")
        c.execute("""UPDATE skill_tasks SET title = ?, description = ?, due_date = ?, priority = ?, status = ?, reminder_sent = ?, bot_id = ?, group_id = ?,
                     recurrence = ?, due_at_utc = ?, recur_anchor_day = ?, updated_at = ? WHERE id = ?""",
                  (title, desc, due_text, prio, status, rem_sent, bot_id, group_id, rec, due_iso, _anchor_day_of(due_iso), datetime.now().isoformat(), task_id))
        conn.commit()
    return {"ok": True, "task_id": task_id, "status": status}
@app.delete("/api/skills/task/{task_id}")
async def delete_task(task_id: int, request: Request):
    user, is_super = _crud_user(request)
    with sqlite3.connect(str(DB_PATH)) as conn:
        c = conn.cursor()
        row = c.execute("SELECT assignee_id, creator_id FROM skill_tasks WHERE id = ?", (task_id,)).fetchone()
        if not row or not (is_super or user in ((row[0] or "").strip().lower(), (row[1] or "").strip().lower())):
            raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")
        c.execute("DELETE FROM skill_tasks WHERE id = ?", (task_id,))
        conn.commit()
    return {"ok": True, "task_id": task_id}
@app.put("/api/skills/reminder/{reminder_id}")
async def edit_reminder(reminder_id: int, req: ReminderEditReq, request: Request):
    user, is_super = _crud_user(request)
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        row = c.execute("SELECT * FROM skill_reminders WHERE id = ?", (reminder_id,)).fetchone()
        if not row or not (is_super or (row["owner_id"] or "").strip().lower() == user):
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch nhắc")
        title = (req.title if req.title is not None else row["title"] or "").strip()
        if not title or len(title) > 300:
            raise HTTPException(status_code=400, detail="Nội dung phải từ 1 đến 300 ký tự")
        old_rec = _norm_recurrence(row["recurrence"])
        rec = _norm_recurrence(req.recurrence) if req.recurrence is not None else old_rec
        when = row["remind_at_utc"]
        status = row["status"]
        if req.remind_at_utc is not None:
            new_when = _crud_iso(req.remind_at_utc, "Thời gian nhắc")
            if _parse_iso_aware(new_when) != _parse_iso_aware(when):
                aw = _parse_iso_aware(new_when)
                if aw and aw > datetime.now(timezone.utc) and status != "CANCELLED":
                    status = "SCHEDULED"  # đổi sang tương lai → bot nhắc lại đúng giờ mới
                when = new_when
        bot_id, group_id, channel, chat_id = row["bot_id"], row["group_id"], row["channel"], row["chat_id"]
        if req.bot_id and req.bot_id != bot_id:
            _crud_check_bot(c, req.bot_id, user, is_super)
            bot_id, group_id = req.bot_id, (req.group_id or "")
            channel = req.channel or channel
            chat_id = req.chat_id or req.group_id or chat_id
        c.execute("""UPDATE skill_reminders SET title = ?, remind_at_utc = ?, recurrence = ?, status = ?, bot_id = ?, group_id = ?, channel = ?, chat_id = ?,
                     recur_anchor_day = ? WHERE id = ?""",
                  (title, when, rec, status, bot_id, group_id, channel, chat_id, _anchor_day_of(when), reminder_id))
        conn.commit()
    return {"ok": True, "reminder_id": reminder_id, "status": status}
@app.delete("/api/skills/reminder/{reminder_id}")
async def delete_reminder(reminder_id: int, request: Request):
    user, is_super = _crud_user(request)
    with sqlite3.connect(str(DB_PATH)) as conn:
        c = conn.cursor()
        row = c.execute("SELECT owner_id FROM skill_reminders WHERE id = ?", (reminder_id,)).fetchone()
        if not row or not (is_super or (row[0] or "").strip().lower() == user):
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch nhắc")
        c.execute("DELETE FROM skill_reminders WHERE id = ?", (reminder_id,))
        conn.commit()
    return {"ok": True, "reminder_id": reminder_id}
'''
s = pat.sub(lambda m: CODE + ANCHOR, s, count=1)
ast.parse(s)
open(p + ".new", "w", encoding="utf-8").write(s)
os.replace(p + ".new", p)
print("đã thêm API sửa/xóa nhiệm vụ & lịch nhắc")
