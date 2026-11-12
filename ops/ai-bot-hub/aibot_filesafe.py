"""
AI-BOT: (1) chặn AI "bịa" khi người dùng hỏi về file mà bot KHÔNG có nội dung file; (2) ghi cấu trúc (chỉ tên trường/kiểu, KHÔNG ghi giá trị)
của sự kiện Zalo có liên quan tới tệp để biết Zalo thật sự gửi gì.
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

MSG_NO_CONTENT = (
    "Dạ, mình chưa nhận được nội dung file này qua Zalo (Zalo không gửi nội dung tệp trong nhóm cho bot) nên mình chưa thể đọc hay tóm tắt. "
    "Anh/chị dán phần nội dung cần đọc vào nhóm, hoặc tải file lên trang AI-BOT rồi nhắn \"đọc file vừa tải\" để mình đọc ngay nhé."
)
MSG_NO_TEXT = (
    "Dạ, mình nhận được file nhưng không trích được chữ từ đó (có thể là file ảnh/bản quét). "
    "Anh/chị dán nội dung cần đọc vào nhóm giúp mình nhé."
)

_QUOTE_FILE = re.compile(r"^\s*\[(?:file|tệp|tep|tài liệu|tai lieu)\]", re.IGNORECASE)
_ASK_FILE = re.compile(r"\b(?:file|tệp|tài liệu)\b", re.IGNORECASE)
_ASK_VERB = re.compile(r"(?:đọc|tóm tắt|phân tích|xem|mở|nội dung|trích|dịch|tổng hợp)", re.IGNORECASE)


def file_guard(att_res: Optional[dict], reply_context: str, text: str) -> Optional[str]:
    """
    Trả lời cố định (chuỗi) khi KHÔNG nên để AI tự trả lời về file; None = để luồng AI cũ chạy.
      - Có chữ trích được từ file → None (AI đọc tài liệu như thường).
      - Có file nhưng không trích được chữ → MSG_NO_TEXT.
      - Tin trích dẫn là "[File] …" hoặc người dùng hỏi đọc/tóm tắt file mà không có nội dung → MSG_NO_CONTENT.
    """
    try:
        att = att_res or {}
        if (att.get("extracted_text") or "").strip():
            return None
        if att.get("has_file"):
            return MSG_NO_TEXT
        t = text or ""
        if _QUOTE_FILE.search(reply_context or "") or "[file]" in t.lower():
            return MSG_NO_CONTENT
        if _ASK_FILE.search(t) and _ASK_VERB.search(t):
            return MSG_NO_CONTENT
    except Exception:  # noqa: BLE001
        return None
    return None


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
    elif isinstance(v, str) and _QUOTE_FILE.search(v):
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
