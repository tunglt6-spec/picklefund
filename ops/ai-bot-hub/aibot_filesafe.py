"""
AI-BOT: (1) chỉ thị để AI KHÔNG bịa khi bot không có nội dung file — AI tự trả lời bằng ngôn ngữ tự nhiên, KHÔNG khóa theo từ khóa;
(2) ghi cấu trúc (chỉ tên trường/kiểu, KHÔNG ghi giá trị) của sự kiện Zalo có liên quan tới tệp để biết Zalo thật sự gửi gì.
Chỉ dùng thư viện chuẩn. Hàm không bao giờ ném lỗi ra ngoài (an toàn cho đường xử lý tin).
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Optional

SHAPE_FILE = os.environ.get("AIBOT_SHAPE_FILE", "/app/data/zalo_event_shapes.jsonl")
MAX_LINES, KEEP_LINES = 400, 300

NOTE_RULE = (
    "\n\n[QUY TẮC VỀ TÀI LIỆU — bắt buộc] Hiện KHÔNG có nội dung tài liệu/tệp nào được đính kèm cho bạn "
    "(chỉ có khi xuất hiện khối [TÀI LIỆU ĐÍNH KÈM ...]). Nếu người dùng nhờ đọc, tóm tắt, phân tích hay trích dẫn một file/tài liệu "
    "mà bạn không thấy khối đó, TUYỆT ĐỐI không bịa hay đoán nội dung. Hãy trả lời tự nhiên, đúng vai và cách xưng hô của bạn: "
    "nói rằng bạn chưa nhận được nội dung tệp (Zalo không chuyển nội dung tệp trong nhóm cho bot) và gợi ý họ dán nội dung cần đọc vào đây, "
    "hoặc tải file lên trang AI-BOT rồi nhờ bạn đọc. Nếu người dùng không hỏi gì về tài liệu thì bỏ qua quy tắc này, đừng nhắc tới nó."
)

# Tín hiệu CẤU TRÚC của Zalo khi trả lời vào tin chứa file: dòng trích dẫn bắt đầu bằng "[File] tên". Không dò từ khóa trong lời người dùng.
_QUOTE_FILE = re.compile(r"^\s*\[(?:file|tệp|tep|tài liệu|tai lieu)\]\s*(.*)$", re.IGNORECASE | re.DOTALL)
_QUOTE_PREFIX = re.compile(r"^\s*\[(?:file|tệp|tep|tài liệu|tai lieu)\]", re.IGNORECASE)
_BAD_NAME_CHARS = re.compile(r"[\x00-\x1f\x7f«»\"'`]")


def _clean_name(name: str) -> str:
    return _BAD_NAME_CHARS.sub(" ", name or "").strip()[:120]


def file_note(att_res: Optional[dict], reply_context: str, text: str) -> str:
    """
    Chỉ thị bổ sung (nối vào chỉ dẫn hệ thống của bot) để AI tự trả lời bằng ngôn ngữ tự nhiên, không bịa nội dung file.
    KHÔNG khóa theo từ ngữ của người dùng: AI tự hiểu ý; code chỉ cung cấp sự thật về tệp.
      - Có chữ trích được → '' (AI đã có khối tài liệu để đọc).
      - Còn lại → quy tắc chống bịa; thêm ngữ cảnh nếu có tín hiệu cấu trúc (tin trích dẫn "[File] …" hoặc có tệp nhưng không trích được chữ).
    """
    try:
        att = att_res or {}
        if (att.get("extracted_text") or "").strip():
            return ""
        note = NOTE_RULE
        if att.get("has_file"):
            note += f"\nNgữ cảnh: người dùng đã gửi tệp «{_clean_name(att.get('file_name') or 'tệp')}» nhưng không trích được chữ từ đó (có thể là bản quét/ảnh)."
        else:
            m = _QUOTE_FILE.match(reply_context or "")
            if m:
                note += f"\nNgữ cảnh: người dùng đang trả lời vào tệp «{_clean_name(m.group(1)) or 'tệp'}» nhưng nội dung tệp không đến được với bạn."
        return note
    except Exception:  # noqa: BLE001
        return ""


def _shape(v: Any, depth: int = 0) -> Any:
    if depth > 5:
        return "…"
    if isinstance(v, dict):
        return {str(k)[:40]: _shape(x, depth + 1) for k, x in list(v.items())[:40]}
    if isinstance(v, list):
        return [_shape(v[0], depth + 1), f"×{len(v)}"] if v else []
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, (int, float)):
        return "num"
    if v is None:
        return "null"
    if isinstance(v, str):
        return f"str({min(len(v), 999)})"
    return type(v).__name__


def _scan(v: Any, flags: dict, depth: int = 0) -> None:
    if depth > 6:
        return
    if isinstance(v, dict):
        for k, x in v.items():
            lk = str(k).lower()
            if lk in ("attachments", "attachment", "document", "file", "files", "file_url", "photo_url", "image", "voice_url", "url", "file_id", "file_name"):
                flags["file_keys"].add(lk)
            _scan(x, flags, depth + 1)
    elif isinstance(v, list):
        for x in v[:20]:
            _scan(x, flags, depth + 1)
    elif isinstance(v, str) and _QUOTE_PREFIX.match(v):
        flags["file_marker"] = True


def log_event_shape(data: Any, path: Optional[str] = None) -> bool:
    """Ghi 1 dòng JSON cấu trúc nếu sự kiện liên quan tới tệp. Trả True nếu đã ghi. Không ném lỗi."""
    try:
        path = path or SHAPE_FILE
        if not isinstance(data, dict):
            return False
        flags: dict[str, Any] = {"file_keys": set(), "file_marker": False}
        _scan(data, flags)
        ev = str(data.get("event_name", ""))[:60]
        if ev == "message.text.received" and not flags["file_keys"] and not flags["file_marker"]:
            return False
        msg = data.get("message") if isinstance(data.get("message"), dict) else {}
        chat = msg.get("chat") if isinstance(msg.get("chat"), dict) else {}
        rec = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "event_name": ev, "message_type": str(msg.get("message_type", ""))[:30],
               "chat_type": str(chat.get("chat_type", ""))[:20], "file_marker": flags["file_marker"],
               "file_keys": sorted(flags["file_keys"]), "shape": _shape(data)}
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")
        _trim(path)
        return True
    except Exception:  # noqa: BLE001
        return False


def _trim(path: str) -> None:
    try:
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
        if len(lines) > MAX_LINES:
            with open(path, "w", encoding="utf-8") as f:
                f.writelines(lines[-KEEP_LINES:])
    except Exception:  # noqa: BLE001
        pass
