"""
AI-BOT Zalo Hub (Giai đoạn 1) — liên kết bot mẫu "CLB & Thể Thao" với PickleFund.

Thiết kế: docs/ops/zalo-hub-club-sports-spec.md (PickleFund repo). Module này chạy trong container AI-BOT (/app/hub.py):
  - AI-BOT vẫn là bên DUY NHẤT giữ webhook Zalo của bot.
  - Tin khớp lệnh PickleFund được ký (HMAC) và chuyển sang PickleFund; PickleFund xử lý thì AI không trả lời.
  - PickleFund gửi tin ra qua API /api/hub/v1/messages (không bao giờ thấy token bot).
TẮT MẶC ĐỊNH: chỉ hoạt động khi biến môi trường HUB_ENABLED=1. Khi tắt, hook trả False ngay → hành vi AI-BOT không đổi.

Cấu hình: đọc từ tệp /app/.env.hub (dạng KEY=VALUE; thay đổi có hiệu lực NGAY, không cần khởi động lại) rồi mới tới biến môi trường:
  HUB_ENABLED=1            bật
  HUB_KEY                  chuỗi bí mật ngẫu nhiên (>=32 ký tự) để mã hóa signing_secret trong DB
  AIBOT_SESSION_SECRET     khóa HS256 cho token phiên đăng nhập (dùng cho API tạo mã)
  HUB_ALLOWED_EVENT_HOSTS  danh sách host[:cổng] cho phép làm event_url (vd. picklefund-api:3000) — chặn SSRF
  HUB_SEND_DRY_RUN=1       (thử nghiệm) không gọi Zalo thật khi gửi tin
Chỉ dùng thư viện chuẩn + fastapi/pydantic/httpx (đã có trong image) — KHÔNG thêm phụ thuộc, vì gói cài tay vào container sẽ mất khi container bị tạo lại.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from typing import Any, Optional
from urllib.parse import urlparse

import base64

import httpx
from fastapi import APIRouter, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel

log = logging.getLogger("aibot.hub")

APPS = {"picklefund"}
TEMPLATE_KEYS = {"thethao"}          # khóa mẫu "CLB & Thể Thao" (BOT_TEMPLATES trong static/index.html)
CODE_TTL = 600                        # mã liên kết hết hạn sau 10 phút
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # bỏ ký tự dễ nhầm (0/O, 1/I)
SESSION_TTL = 12 * 3600
SEND_LIMIT_PER_MIN = 30
EXCHANGE_LIMIT_PER_MIN = 10
FORWARD_TIMEOUT = 15.0  # PickleFund xử lý lệnh rồi gọi ngược /messages (tới ~8s) nên không đặt quá ngắn
MAX_TEXT = 2000

# Lệnh của PickleFund (giữ ĐỒNG BỘ với backend/src/zalo/zalo-commands.ts và zalo.service.ts):
#   /lienket|/thu|/chi + khoảng trắng ở bất kỳ đâu; /ketnoi <16 hex> ở cuối; lệnh tra cứu/đăng ký ở cuối (kèm tối đa 1 số).
COMMAND_RE = re.compile(
    r"(?:(?:^|\s)/(?:lienket|thu|chi)\s)"
    r"|(?:(?:^|\s)/ketnoi\s+[A-Fa-f0-9]{16}\s*$)"
    r"|(?:(?:^|\s)/(?:quy|congno|lich|bxh|diemdanh|no|help|trogiup|lenh|dangky|huy|huydangky)(?:\s+\d{1,4})?\s*$)",
    re.IGNORECASE,
)

router = APIRouter(prefix="/api/hub/v1", tags=["zalo-hub"])
_db_path: Optional[str] = None
_hits: dict[str, deque] = defaultdict(deque)


# ───────────────────────── cấu hình / tiện ích ─────────────────────────
_ENV_FILE = os.environ.get("HUB_ENV_FILE", "/app/.env.hub")
_file_cache: dict[str, Any] = {"mtime": None, "vars": {}}


def _file_vars() -> dict[str, str]:
    """Đọc .env.hub; nạp lại khi tệp đổi (mtime) để bật/tắt hub tức thời mà không phải khởi động lại container."""
    try:
        m = os.stat(_ENV_FILE).st_mtime_ns
    except OSError:
        _file_cache.update(mtime=None, vars={})
        return {}
    if m != _file_cache["mtime"]:
        out: dict[str, str] = {}
        with open(_ENV_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    out[k.strip()] = v.strip().strip('"').strip("'")
        _file_cache.update(mtime=m, vars=out)
    return _file_cache["vars"]


def _env(name: str, default: str = "") -> str:
    fv = _file_vars()
    return fv[name] if name in fv else os.environ.get(name, default)


def enabled() -> bool:
    return _env("HUB_ENABLED", "0") == "1"


def _conn() -> sqlite3.Connection:
    if not _db_path:
        raise RuntimeError("hub chưa init")
    c = sqlite3.connect(_db_path, timeout=15)
    c.row_factory = sqlite3.Row
    return c


def _sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _keys() -> tuple[bytes, bytes]:
    master = _env("HUB_KEY")
    if len(master) < 32:
        raise HTTPException(status_code=503, detail="Hub chưa cấu hình khóa (HUB_KEY >= 32 ký tự)")
    root = hashlib.sha256(master.encode()).digest()
    return hmac.new(root, b"enc", hashlib.sha256).digest(), hmac.new(root, b"mac", hashlib.sha256).digest()


def _seal(plain: str) -> str:
    """Mã hóa có xác thực bằng thư viện chuẩn: nonce(16) || (plain XOR dòng khóa HMAC-SHA256) || tag(32)."""
    enc, mac = _keys()
    nonce = secrets.token_bytes(16)
    data = plain.encode()
    stream = b"".join(hmac.new(enc, nonce + i.to_bytes(4, "big"), hashlib.sha256).digest() for i in range((len(data) + 31) // 32))
    ct = bytes(a ^ b for a, b in zip(data, stream))
    return _b64e(nonce + ct + hmac.new(mac, nonce + ct, hashlib.sha256).digest())


def _open(sealed: str) -> str:
    enc, mac = _keys()
    raw = _b64d(sealed)
    if len(raw) < 48:
        raise ValueError("dữ liệu mã hóa không hợp lệ")
    nonce, ct, tag = raw[:16], raw[16:-32], raw[-32:]
    if not hmac.compare_digest(tag, hmac.new(mac, nonce + ct, hashlib.sha256).digest()):
        raise ValueError("sai khóa hoặc dữ liệu bị sửa")
    stream = b"".join(hmac.new(enc, nonce + i.to_bytes(4, "big"), hashlib.sha256).digest() for i in range((len(ct) + 31) // 32))
    return bytes(a ^ b for a, b in zip(ct, stream)).decode()


def _rate(key: str, limit: int, window: float = 60.0) -> bool:
    """True nếu còn hạn mức; ghi nhận lượt gọi."""
    now = time.time()
    if len(_hits) > 5000:
        for k in [k for k, v in _hits.items() if not v or now - v[-1] > window]:
            _hits.pop(k, None)
    q = _hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return False
    q.append(now)
    return True


def _require_enabled() -> None:
    if not enabled():
        raise HTTPException(status_code=404, detail="Hub chưa bật")


def init_db() -> None:
    with _conn() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS hub_link_codes(
              code_hash TEXT PRIMARY KEY, bot_id TEXT NOT NULL, tenant_id TEXT NOT NULL, app TEXT NOT NULL,
              expires_at REAL NOT NULL, used_at REAL);
            CREATE TABLE IF NOT EXISTS hub_links(
              link_id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, tenant_id TEXT NOT NULL, app TEXT NOT NULL, club_ref TEXT,
              event_url TEXT NOT NULL, access_key_hash TEXT NOT NULL, signing_secret_enc TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'active', created_at REAL NOT NULL, last_event_at REAL, last_error TEXT,
              fwd_ok INTEGER NOT NULL DEFAULT 0, fwd_fail INTEGER NOT NULL DEFAULT 0);
            CREATE INDEX IF NOT EXISTS idx_hub_links_bot ON hub_links(bot_id, status);
            CREATE TABLE IF NOT EXISTS hub_link_chats(
              link_id TEXT NOT NULL, chat_id TEXT NOT NULL, first_seen REAL NOT NULL, last_seen REAL NOT NULL,
              PRIMARY KEY(link_id, chat_id));
            CREATE TABLE IF NOT EXISTS hub_messages(
              link_id TEXT NOT NULL, idem_key TEXT NOT NULL, created_at REAL NOT NULL, PRIMARY KEY(link_id, idem_key));
            """
        )
        try:
            db.execute("ALTER TABLE bots ADD COLUMN template_key TEXT")
        except sqlite3.OperationalError:
            pass  # đã có cột (hoặc bảng bots chưa tồn tại ở môi trường thử)


def init(app: FastAPI, db_path: str, logger: Optional[logging.Logger] = None) -> None:
    """Gọi 1 lần ở cuối main.py: đặt đường dẫn DB, tạo bảng, gắn router."""
    global _db_path, log
    _db_path = str(db_path)
    if logger:
        log = logger
    init_db()
    app.include_router(router)
    log.info("[HUB] đã nạp module Zalo Hub (enabled=%s)", enabled())


# ───────────────────────── xác thực ─────────────────────────
def issue_session_token(username: str, role: str) -> str:
    """Token phiên cho API tạo mã (đăng nhập sẽ trả về ở GĐ3)."""
    secret = _env("AIBOT_SESSION_SECRET")
    if not secret:
        raise RuntimeError("thiếu AIBOT_SESSION_SECRET")
    now = int(time.time())
    head = _b64e(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _b64e(json.dumps({"sub": (username or "").strip().lower(), "role": role, "iat": now, "exp": now + SESSION_TTL}, separators=(",", ":")).encode())
    sig = _b64e(hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest())
    return f"{head}.{body}.{sig}"


def _decode_token(token: str, secret: str) -> dict[str, Any]:
    """Xác minh token HS256 (chỉ nhận alg HS256, kiểm tra chữ ký và hạn). Ném ValueError nếu sai."""
    try:
        head_b, body_b, sig_b = token.split(".")
        head = json.loads(_b64d(head_b))
        if not isinstance(head, dict) or head.get("alg") != "HS256":
            raise ValueError("alg")
        good = hmac.new(secret.encode(), f"{head_b}.{body_b}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(good, _b64d(sig_b)):
            raise ValueError("sig")
        payload = json.loads(_b64d(body_b))
        if not isinstance(payload, dict) or float(payload.get("exp", 0)) < time.time():
            raise ValueError("exp")
        return payload
    except (ValueError, KeyError, TypeError, AttributeError, json.JSONDecodeError) as e:
        raise ValueError("token không hợp lệ") from e


def _session_user(authorization: Optional[str]) -> tuple[str, str]:
    secret = _env("AIBOT_SESSION_SECRET")
    if not secret or not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Cần đăng nhập")
    try:
        p = _decode_token(authorization[7:].strip(), secret)
    except ValueError:
        raise HTTPException(status_code=401, detail="Phiên không hợp lệ hoặc đã hết hạn")
    return str(p.get("sub", "")), str(p.get("role", ""))


def _is_super(role: str, sub: str) -> bool:
    return role in ("superadmin", "super_admin") or sub in ("superadmin", "super_admin")


def _link_by_key(link_id: Optional[str], authorization: Optional[str]) -> sqlite3.Row:
    if not link_id or not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Thiếu khóa liên kết")
    key = authorization[7:].strip()
    with _conn() as db:
        row = db.execute("SELECT * FROM hub_links WHERE link_id=?", (link_id,)).fetchone()
    if not row or not hmac.compare_digest(row["access_key_hash"], _sha(key)):
        raise HTTPException(status_code=401, detail="Khóa liên kết không đúng")
    if row["status"] != "active":
        raise HTTPException(status_code=403, detail="Liên kết đã bị gỡ")
    return row


EVENT_PATH_RE = re.compile(r"/api/zalo/hub/[A-Za-z0-9_-]{1,64}")


def _client_ip(request: Request) -> str:
    """IP người gọi. Sau tunnel cloudflared (nguồn loopback) mới tin CF-Connecting-IP; còn lại dùng IP kết nối."""
    host = request.client.host if request.client else "?"
    if host in ("127.0.0.1", "::1"):
        fwd = (request.headers.get("cf-connecting-ip") or "").strip()
        if fwd and len(fwd) <= 45 and re.fullmatch(r"[0-9a-fA-F:.]+", fwd):
            return fwd
    return host


def _host_allowed(url: str) -> bool:
    allowed = [h.strip().lower() for h in _env("HUB_ALLOWED_EVENT_HOSTS").split(",") if h.strip()]
    try:
        u = urlparse(url)
        port = u.port
    except ValueError:
        return False
    if u.scheme not in ("http", "https") or not u.hostname or u.username or u.password or u.fragment or u.query or u.params or len(url) > 300:
        return False
    if not EVENT_PATH_RE.fullmatch(u.path or ""):
        return False  # chỉ cho đúng đường dẫn nhận sự kiện của PickleFund
    hostport = f"{u.hostname}:{port}" if port else u.hostname
    return hostport.lower() in allowed or u.hostname.lower() in [a for a in allowed if ":" not in a]


# ───────────────────────── API ─────────────────────────
class CodeReq(BaseModel):
    bot_id: str
    app: str = "picklefund"


class ExchangeReq(BaseModel):
    code: str
    app: str = "picklefund"
    event_url: str
    club_ref: Optional[str] = None


class MessageReq(BaseModel):
    chat_id: str
    text: Optional[str] = None
    photo_url: Optional[str] = None
    caption: Optional[str] = None
    idempotency_key: str


@router.get("/health")
async def hub_health():
    return {"ok": True, "enabled": enabled()}


@router.post("/links/code")
async def create_code(req: CodeReq, authorization: Optional[str] = Header(None)):
    _require_enabled()
    sub, role = _session_user(authorization)
    if req.app not in APPS:
        raise HTTPException(status_code=400, detail="Ứng dụng không được hỗ trợ")
    with _conn() as db:
        bot = db.execute("SELECT bot_id, tenant_id, platform, template_key FROM bots WHERE bot_id=?", (req.bot_id,)).fetchone()
        if not bot or (str(bot["tenant_id"]).lower() != sub and not _is_super(role, sub)):
            raise HTTPException(status_code=404, detail="Không tìm thấy bot")
        if (bot["platform"] or "").lower() != "zalo" or bot["template_key"] not in TEMPLATE_KEYS:
            raise HTTPException(status_code=400, detail="Chỉ bot Zalo thuộc mẫu CLB & Thể Thao mới liên kết được")
        now = time.time()
        db.execute("DELETE FROM hub_link_codes WHERE expires_at < ? OR used_at IS NOT NULL", (now,))
        if db.execute("SELECT COUNT(*) c FROM hub_link_codes WHERE bot_id=?", (req.bot_id,)).fetchone()["c"] >= 5:
            raise HTTPException(status_code=429, detail="Đã tạo quá nhiều mã, chờ mã cũ hết hạn")
        raw = "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        code = f"PF-{raw[:4]}-{raw[4:]}"
        db.execute("INSERT INTO hub_link_codes(code_hash,bot_id,tenant_id,app,expires_at) VALUES(?,?,?,?,?)",
                   (_sha(code), req.bot_id, str(bot["tenant_id"]).lower(), req.app, now + CODE_TTL))
    return {"ok": True, "code": code, "expires_in": CODE_TTL}


@router.post("/links/exchange")
async def exchange(req: ExchangeReq, request: Request):
    _require_enabled()
    ip = _client_ip(request)
    if not _rate(f"ex:{ip}", EXCHANGE_LIMIT_PER_MIN):
        raise HTTPException(status_code=429, detail="Thử quá nhiều lần")
    if req.app not in APPS:
        raise HTTPException(status_code=400, detail="Ứng dụng không được hỗ trợ")
    if not _host_allowed(req.event_url):
        raise HTTPException(status_code=400, detail="Địa chỉ nhận sự kiện không nằm trong danh sách cho phép")
    code = re.sub(r"\s+", "", req.code).upper()
    _keys()  # báo 503 sớm nếu chưa có khóa
    link_id, access_key, signing_secret = "lnk_" + secrets.token_hex(6), "hak_" + secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    now = time.time()
    with _conn() as db:
        row = db.execute("SELECT * FROM hub_link_codes WHERE code_hash=?", (_sha(code),)).fetchone()
        if not row or row["used_at"] is not None or row["expires_at"] < now or row["app"] != req.app:
            raise HTTPException(status_code=400, detail="Mã không đúng hoặc đã hết hạn")
        if db.execute("SELECT 1 FROM hub_links WHERE bot_id=? AND app=? AND status='active'", (row["bot_id"], req.app)).fetchone():
            raise HTTPException(status_code=409, detail="Bot này đã có liên kết đang hoạt động; gỡ liên kết cũ trước")
        # đánh dấu dùng mã một cách nguyên tử: chỉ 1 request thắng
        cur = db.execute("UPDATE hub_link_codes SET used_at=? WHERE code_hash=? AND used_at IS NULL", (now, _sha(code)))
        if cur.rowcount != 1:
            raise HTTPException(status_code=400, detail="Mã không đúng hoặc đã hết hạn")
        bot = db.execute("SELECT bot_id, bot_name, platform FROM bots WHERE bot_id=?", (row["bot_id"],)).fetchone()
        db.execute(
            "INSERT INTO hub_links(link_id,bot_id,tenant_id,app,club_ref,event_url,access_key_hash,signing_secret_enc,status,created_at) "
            "VALUES(?,?,?,?,?,?,?,?, 'active', ?)",
            (link_id, row["bot_id"], row["tenant_id"], req.app, (req.club_ref or "")[:80], req.event_url,
             _sha(access_key), _seal(signing_secret), now))
    return {"ok": True, "link_id": link_id, "access_key": access_key, "signing_secret": signing_secret,
            "bot": {"id": bot["bot_id"], "name": bot["bot_name"], "platform": bot["platform"]}}


def _public_link(row: sqlite3.Row) -> dict[str, Any]:
    return {"link_id": row["link_id"], "bot_id": row["bot_id"], "app": row["app"], "status": row["status"],
            "created_at": row["created_at"], "last_event_at": row["last_event_at"], "last_error": row["last_error"],
            "forward_ok": row["fwd_ok"], "forward_fail": row["fwd_fail"]}


@router.get("/links/{link_id}")
async def get_link(link_id: str, authorization: Optional[str] = Header(None)):
    _require_enabled()
    return {"ok": True, "link": _public_link(_link_by_key(link_id, authorization))}


@router.delete("/links/{link_id}")
async def revoke_link(link_id: str, authorization: Optional[str] = Header(None)):
    _require_enabled()
    row = _link_by_key(link_id, authorization)
    with _conn() as db:
        db.execute("UPDATE hub_links SET status='revoked' WHERE link_id=?", (row["link_id"],))
    return {"ok": True}


@router.get("/links/{link_id}/groups")
async def link_groups(link_id: str, authorization: Optional[str] = Header(None)):
    """GĐ1: các nhóm đã từng chuyển sự kiện cho liên kết (mã thật). Sổ nhóm có tên/link mời làm ở GĐ3."""
    _require_enabled()
    row = _link_by_key(link_id, authorization)
    with _conn() as db:
        chats = db.execute("SELECT chat_id, first_seen, last_seen FROM hub_link_chats WHERE link_id=? ORDER BY last_seen DESC", (row["link_id"],)).fetchall()
    return {"ok": True, "groups": [{"chat_id": c["chat_id"], "first_seen": c["first_seen"], "last_seen": c["last_seen"]} for c in chats]}


# ───────────────────────── GĐ3: API cho CHỦ BOT (đăng nhập AI-BOT), dùng bởi bảng "PickleFund" trong giao diện ─────────────────────────
class ConfirmGroupReq(BaseModel):
    chat_id: str


def _owned_bot(db: sqlite3.Connection, bot_id: str, authorization: Optional[str]) -> sqlite3.Row:
    sub, role = _session_user(authorization)
    bot = db.execute("SELECT bot_id, bot_name, tenant_id, platform, template_key FROM bots WHERE bot_id=?", (bot_id,)).fetchone()
    if not bot or (str(bot["tenant_id"]).lower() != sub and not _is_super(role, sub)):
        raise HTTPException(status_code=404, detail="Không tìm thấy bot")
    return bot


def _eligible(bot: sqlite3.Row) -> bool:
    return (bot["platform"] or "").lower() == "zalo" and bot["template_key"] in TEMPLATE_KEYS


def _seen_groups(db: sqlite3.Connection, bot_id: str) -> list[dict[str, Any]]:
    """Nhóm Zalo (mã thật `zgr-…`) bot đã nhận tin, lấy từ lịch sử trò chuyện nhóm; không đọc nội dung tin."""
    try:
        rows = db.execute("SELECT chat_id, COUNT(*) n, MAX(created_at) last FROM group_chat_history WHERE bot_id=? AND chat_id LIKE 'zgr-%' "
                          "GROUP BY chat_id ORDER BY MAX(created_at) DESC LIMIT 50", (bot_id,)).fetchall()
    except sqlite3.OperationalError:
        return []
    return [{"chat_id": r["chat_id"], "messages": r["n"], "last_message_at": str(r["last"] or "")[:25]} for r in rows]


@router.get("/bots/{bot_id}/overview")
async def bot_overview(bot_id: str, authorization: Optional[str] = Header(None)):
    """Trạng thái liên kết PickleFund của bot + nhóm bot đã thấy (kèm trạng thái đã xác nhận cho liên kết)."""
    with _conn() as db:
        bot = _owned_bot(db, bot_id, authorization)
        out: dict[str, Any] = {"ok": True, "enabled": enabled(), "eligible": _eligible(bot), "links": [], "groups": []}
        if not _eligible(bot):
            return out
        links = db.execute("SELECT * FROM hub_links WHERE bot_id=? AND status='active' ORDER BY created_at DESC", (bot_id,)).fetchall()
        confirmed: dict[str, set[str]] = {}
        for l in links:
            confirmed[l["link_id"]] = {r["chat_id"] for r in db.execute("SELECT chat_id FROM hub_link_chats WHERE link_id=?", (l["link_id"],)).fetchall()}
            d = _public_link(l); d["club_ref"] = l["club_ref"]
            out["links"].append(d)
        groups = _seen_groups(db, bot_id)
        for g in groups:
            g["confirmed_for"] = [lid for lid, chats in confirmed.items() if g["chat_id"] in chats]
        out["groups"] = groups
    return out


@router.post("/bots/{bot_id}/links/{link_id}/groups")
async def confirm_group(bot_id: str, link_id: str, req: ConfirmGroupReq, authorization: Optional[str] = Header(None)):
    """Chủ bot XÁC NHẬN nhóm cho PickleFund: chỉ nhóm bot đã thật sự nhận tin mới được xác nhận (không tự nghĩ ra mã)."""
    _require_enabled()
    with _conn() as db:
        bot = _owned_bot(db, bot_id, authorization)
        if not _eligible(bot):
            raise HTTPException(status_code=400, detail="Bot không thuộc mẫu CLB & Thể Thao")
        link = db.execute("SELECT link_id FROM hub_links WHERE link_id=? AND bot_id=? AND status='active'", (link_id, bot_id)).fetchone()
        if not link:
            raise HTTPException(status_code=404, detail="Không tìm thấy liên kết")
        if req.chat_id not in {g["chat_id"] for g in _seen_groups(db, bot_id)}:
            raise HTTPException(status_code=400, detail="Bot chưa nhận tin từ nhóm này; nhắn một tin trong nhóm rồi thử lại")
        now = time.time()
        db.execute("INSERT INTO hub_link_chats(link_id,chat_id,first_seen,last_seen) VALUES(?,?,?,?) "
                   "ON CONFLICT(link_id,chat_id) DO UPDATE SET last_seen=excluded.last_seen", (link_id, req.chat_id, now, now))
    return {"ok": True}


@router.delete("/bots/{bot_id}/links/{link_id}/groups/{chat_id}")
async def unconfirm_group(bot_id: str, link_id: str, chat_id: str, authorization: Optional[str] = Header(None)):
    _require_enabled()
    with _conn() as db:
        _owned_bot(db, bot_id, authorization)
        db.execute("DELETE FROM hub_link_chats WHERE link_id=? AND chat_id=? AND link_id IN (SELECT link_id FROM hub_links WHERE bot_id=?)",
                   (link_id, chat_id, bot_id))
    return {"ok": True}


@router.delete("/bots/{bot_id}/links/{link_id}")
async def owner_revoke_link(bot_id: str, link_id: str, authorization: Optional[str] = Header(None)):
    _require_enabled()
    with _conn() as db:
        _owned_bot(db, bot_id, authorization)
        cur = db.execute("UPDATE hub_links SET status='revoked' WHERE link_id=? AND bot_id=? AND status='active'", (link_id, bot_id))
        if cur.rowcount != 1:
            raise HTTPException(status_code=404, detail="Không tìm thấy liên kết")
    return {"ok": True}


async def _zalo_post(token: str, method: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=15) as cl:
        r = await cl.post(f"https://bot-api.zaloplatforms.com/bot{token}/{method}", json=payload)
    try:
        return r.json()
    except ValueError:
        return {"ok": False, "description": f"HTTP {r.status_code}"}


@router.post("/messages")
async def send_message(req: MessageReq, authorization: Optional[str] = Header(None), x_hub_link_id: Optional[str] = Header(None)):
    _require_enabled()
    link = _link_by_key(x_hub_link_id, authorization)
    if not _rate(f"send:{link['link_id']}", SEND_LIMIT_PER_MIN):
        raise HTTPException(status_code=429, detail="Gửi quá nhanh")
    if bool(req.text) == bool(req.photo_url):
        raise HTTPException(status_code=400, detail="Cần đúng một trong text hoặc photo_url")
    if req.photo_url and (len(req.photo_url) > 500 or not re.match(r"https://[^\s]+$", req.photo_url)):
        raise HTTPException(status_code=400, detail="photo_url phải là địa chỉ https hợp lệ (≤500 ký tự)")
    if req.text is not None and not (1 <= len(req.text) <= MAX_TEXT):
        raise HTTPException(status_code=400, detail=f"text dài 1–{MAX_TEXT} ký tự")
    if not re.fullmatch(r"[A-Za-z0-9_.:-]{1,150}", req.chat_id) or not re.fullmatch(r"[\w.:-]{1,100}", req.idempotency_key):
        raise HTTPException(status_code=400, detail="chat_id hoặc idempotency_key không hợp lệ")
    with _conn() as db:
        if not db.execute("SELECT 1 FROM hub_link_chats WHERE link_id=? AND chat_id=?", (link["link_id"], req.chat_id)).fetchone():
            raise HTTPException(status_code=403, detail="Nhóm này chưa từng chuyển sự kiện cho liên kết")
        db.execute("DELETE FROM hub_messages WHERE created_at < ?", (time.time() - 7 * 86400,))
        try:
            db.execute("INSERT INTO hub_messages(link_id,idem_key,created_at) VALUES(?,?,?)", (link["link_id"], req.idempotency_key, time.time()))
        except sqlite3.IntegrityError:
            return {"ok": True, "duplicate": True}
        bot = db.execute("SELECT bot_token FROM bots WHERE bot_id=?", (link["bot_id"],)).fetchone()
    if _env("HUB_SEND_DRY_RUN") == "1":
        return {"ok": True, "dry_run": True}
    token = (bot["bot_token"] or "").strip() if bot else ""
    if not token:
        raise HTTPException(status_code=409, detail="Bot chưa có token")
    if req.text:
        res = await _zalo_post(token, "sendMessage", {"chat_id": req.chat_id, "text": req.text})
    else:
        res = await _zalo_post(token, "sendPhoto", {"chat_id": req.chat_id, "photo": req.photo_url, "caption": (req.caption or "")[:1900]})
    if res.get("ok") is not True:
        # cho phép gửi lại cùng idempotency_key sau lỗi
        with _conn() as db:
            db.execute("DELETE FROM hub_messages WHERE link_id=? AND idem_key=?", (link["link_id"], req.idempotency_key))
        desc = re.sub(r"[^\w\s:.,()-]", "", str(res.get("description", "")))[:160]
        raise HTTPException(status_code=502, detail=f"Zalo từ chối ({res.get('error_code', '?')}): {desc}")
    return {"ok": True, "message_id": (res.get("result") or {}).get("message_id")}


# ───────────────────────── hook trong webhook_zalo ─────────────────────────
def _sign(secret: str, ts: str, body: bytes) -> str:
    return "v1=" + hmac.new(secret.encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()


def _record(link_id: str, ok: bool, err: Optional[str], chat_id: Optional[str] = None) -> None:
    now = time.time()
    with _conn() as db:
        if chat_id:
            # CHỈ cập nhật nhóm đã được chủ bot xác nhận; KHÔNG tự thêm (xác nhận là việc của nút ở AI-BOT)
            db.execute("UPDATE hub_link_chats SET last_seen=? WHERE link_id=? AND chat_id=?", (now, link_id, chat_id))
        if ok:
            db.execute("UPDATE hub_links SET fwd_ok=fwd_ok+1, last_event_at=?, last_error=NULL WHERE link_id=?", (now, link_id))
        else:
            db.execute("UPDATE hub_links SET fwd_fail=fwd_fail+1, last_error=? WHERE link_id=?", ((err or "lỗi")[:120], link_id))


NOTICE_COOLDOWN = 90.0


async def _notify_failure(bot_id: str, chat_id: str, kind: str) -> None:
    """Báo ngắn vào nhóm khi chuyển lệnh lỗi (tránh lệnh biến mất im lặng). Tối đa 1 lần/nhóm/90 giây; mọi lỗi đều nuốt."""
    try:
        if not _rate(f"notice:{bot_id}:{chat_id}", 1, NOTICE_COOLDOWN):
            return
        with _conn() as db:
            bot = db.execute("SELECT bot_token FROM bots WHERE bot_id=?", (bot_id,)).fetchone()
        token = (bot["bot_token"] or "").strip() if bot else ""
        if not token or _env("HUB_SEND_DRY_RUN") == "1":
            return
        text = ("PickleFund đang bảo trì hoặc tạm thời không phản hồi. Vui lòng gửi lại lệnh sau ít phút."
                if kind == "down" else
                "Liên kết PickleFund không còn hiệu lực. Nhờ quản trị bot kiểm tra lại ở AI-BOT (Gỡ liên kết rồi liên kết lại).")
        await _zalo_post(token, "sendMessage", {"chat_id": chat_id, "text": text})
    except Exception:  # noqa: BLE001
        pass


async def hub_try_forward(bot_id: str, data: dict, text: str, chat_id: str) -> bool:
    """
    Gọi từ webhook_zalo sau khi chọn được bot. Trả True = đã xử lý (AI KHÔNG trả lời), False = để AI xử lý như cũ.
    Chỉ chuyển khi: hub bật, bot thuộc mẫu CLB & Thể Thao có liên kết active, và tin khớp lệnh PickleFund.
    Chuyển lỗi/timeout → True (im lặng, tránh AI trả lời lệnh lung tung) và ghi lỗi vào liên kết.
    """
    if not enabled() or not text or not chat_id:
        return False
    if not COMMAND_RE.search(text.strip()):
        return False
    with _conn() as db:
        link = db.execute(
            "SELECT l.* FROM hub_links l JOIN bots b ON b.bot_id=l.bot_id "
            "WHERE l.bot_id=? AND l.status='active' AND b.template_key IN ({})".format(",".join("?" * len(TEMPLATE_KEYS))),
            (bot_id, *TEMPLATE_KEYS)).fetchone()
    if not link:
        return False
    try:
        secret = _open(link["signing_secret_enc"])
    except (ValueError, HTTPException):
        _record(link["link_id"], False, "không giải mã được khóa ký", chat_id)
        return True
    body = json.dumps({"link_id": link["link_id"], "bot_id": bot_id, "event": data}, ensure_ascii=False, separators=(",", ":")).encode()
    ts = str(int(time.time()))
    headers = {"Content-Type": "application/json", "X-Hub-Link-Id": link["link_id"], "X-Hub-Timestamp": ts, "X-Hub-Signature": _sign(secret, ts, body)}
    try:
        async with httpx.AsyncClient(timeout=FORWARD_TIMEOUT) as cl:
            r = await cl.post(link["event_url"], content=body, headers=headers)
        if r.status_code // 100 != 2:
            _record(link["link_id"], False, f"HTTP {r.status_code}", chat_id)
            await _notify_failure(bot_id, chat_id, "down" if r.status_code >= 500 else "revoked")
            return True
        handled = True
        try:
            handled = bool((r.json() or {}).get("handled", True))
        except ValueError:
            pass
        _record(link["link_id"], True, None, chat_id)
        return handled
    except Exception as e:  # noqa: BLE001 — mọi lỗi mạng đều xử lý như nhau
        _record(link["link_id"], False, type(e).__name__, chat_id)
        await _notify_failure(bot_id, chat_id, "down")
        return True
