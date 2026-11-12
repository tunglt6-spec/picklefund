"""Kiểm thử hub.py (chạy: python test_hub.py). Dùng DB tạm, máy chủ nhận sự kiện giả; không đụng Zalo thật."""
import asyncio
import hashlib
import hmac
import json
import os
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

# Trong container chạy qua stdin (không có __file__): đặt HUB_DIR=/app.
sys.path.insert(0, os.environ.get("HUB_DIR") or os.path.dirname(os.path.abspath(__file__)))
from cryptography.fernet import Fernet  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import hub  # noqa: E402


class Receiver(BaseHTTPRequestHandler):
    calls: list = []
    mode = "ok"          # ok | not_handled | fail

    def do_POST(self):  # noqa: N802
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n)
        Receiver.calls.append({"headers": dict(self.headers), "body": body})
        if Receiver.mode == "fail":
            self.send_response(500); self.end_headers(); return
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(json.dumps({"handled": Receiver.mode != "not_handled"}).encode())

    def log_message(self, *a):
        pass


class HubTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = HTTPServer(("127.0.0.1", 0), Receiver)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.db = os.path.join(self.tmp, "t.sqlite")
        c = sqlite3.connect(self.db)
        c.execute("CREATE TABLE bots (bot_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, bot_name TEXT NOT NULL, platform TEXT NOT NULL, "
                  "bot_token TEXT, skills_json TEXT NOT NULL DEFAULT '{}', custom_prompt TEXT, is_active INTEGER DEFAULT 1, created_at TEXT NOT NULL DEFAULT 'x')")
        c.execute("INSERT INTO bots(bot_id,tenant_id,bot_name,platform,bot_token) VALUES('b_club','lethanhtung','Maika The PING','zalo','1:tok')")
        c.execute("INSERT INTO bots(bot_id,tenant_id,bot_name,platform,bot_token) VALUES('b_other','lethanhtung','Bot giúp việc','zalo','2:tok')")
        c.commit(); c.close()
        os.environ.update({"HUB_ENABLED": "1", "HUB_KEY": Fernet.generate_key().decode(), "AIBOT_SESSION_SECRET": "s" * 40,
                           "HUB_ALLOWED_EVENT_HOSTS": f"127.0.0.1:{self.port},picklefund-api:3000"})
        os.environ.pop("HUB_SEND_DRY_RUN", None)
        self.app = FastAPI()
        hub._hits.clear()
        hub.init(self.app, self.db)
        # gắn nhãn mẫu cho bot CLB (sau init vì init thêm cột template_key)
        c = sqlite3.connect(self.db); c.execute("UPDATE bots SET template_key='thethao' WHERE bot_id='b_club'"); c.commit(); c.close()
        self.cl = TestClient(self.app)
        self.url = f"http://127.0.0.1:{self.port}/api/zalo/hub/club-1"
        Receiver.calls = []; Receiver.mode = "ok"

    def auth(self, user="lethanhtung", role="customer"):
        return {"Authorization": "Bearer " + hub.issue_session_token(user, role)}

    def make_link(self, bot="b_club"):
        code = self.cl.post("/api/hub/v1/links/code", json={"bot_id": bot}, headers=self.auth()).json()["code"]
        r = self.cl.post("/api/hub/v1/links/exchange", json={"code": code, "event_url": self.url, "club_ref": "club-1"})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def run_hook(self, text, bot="b_club", chat="zgr-1"):
        return asyncio.run(hub.hub_try_forward(bot, {"event_name": "message.text.received", "message": {"text": text, "chat": {"id": chat}}}, text, chat))

    # ---- tắt/bật ----
    def test_disabled_changes_nothing(self):
        link = self.make_link()
        os.environ["HUB_ENABLED"] = "0"
        self.assertEqual(self.cl.post("/api/hub/v1/links/code", json={"bot_id": "b_club"}, headers=self.auth()).status_code, 404)
        self.assertFalse(self.run_hook("/quy"))
        self.assertEqual(Receiver.calls, [])
        self.assertEqual(self.cl.get("/api/hub/v1/health").json(), {"ok": True, "enabled": False})
        self.assertTrue(link["link_id"])

    # ---- tạo mã / trao đổi ----
    def test_code_requires_session_tenant_and_template(self):
        j = {"bot_id": "b_club"}
        self.assertEqual(self.cl.post("/api/hub/v1/links/code", json=j).status_code, 401)
        self.assertEqual(self.cl.post("/api/hub/v1/links/code", json=j, headers={"Authorization": "Bearer xxx"}).status_code, 401)
        self.assertEqual(self.cl.post("/api/hub/v1/links/code", json=j, headers=self.auth("khachkhac")).status_code, 404)   # tenant khác
        self.assertEqual(self.cl.post("/api/hub/v1/links/code", json={"bot_id": "b_other"}, headers=self.auth()).status_code, 400)  # không phải mẫu CLB
        self.assertEqual(self.cl.post("/api/hub/v1/links/code", json={"bot_id": "b_club", "app": "x"}, headers=self.auth()).status_code, 400)
        ok = self.cl.post("/api/hub/v1/links/code", json=j, headers=self.auth("superadmin", "superadmin"))
        self.assertEqual(ok.status_code, 200); self.assertRegex(ok.json()["code"], r"^PF-[A-Z2-9]{4}-[A-Z2-9]{4}$")

    def test_exchange_flow_and_security(self):
        code = self.cl.post("/api/hub/v1/links/code", json={"bot_id": "b_club"}, headers=self.auth()).json()["code"]
        bad_host = self.cl.post("/api/hub/v1/links/exchange", json={"code": code, "event_url": "http://evil.example.com/x"})
        self.assertEqual(bad_host.status_code, 400)
        for u in ("ftp://picklefund-api:3000/x", "http://u:p@picklefund-api:3000/x", "http://picklefund-api:3000/x#f", "http://picklefund-api:9999/x"):
            self.assertEqual(self.cl.post("/api/hub/v1/links/exchange", json={"code": code, "event_url": u}).status_code, 400, u)
        ok = self.cl.post("/api/hub/v1/links/exchange", json={"code": code.lower() + " ", "event_url": "http://picklefund-api:3000/api/zalo/hub/c"})
        self.assertEqual(ok.status_code, 200, ok.text)
        body = ok.json()
        self.assertEqual(body["bot"], {"id": "b_club", "name": "Maika The PING", "platform": "zalo"})
        # dùng lại mã → từ chối
        self.assertEqual(self.cl.post("/api/hub/v1/links/exchange", json={"code": code, "event_url": "http://picklefund-api:3000/x"}).status_code, 400)
        # khóa không lưu dạng rõ
        raw = sqlite3.connect(self.db).execute("select access_key_hash, signing_secret_enc from hub_links").fetchone()
        self.assertNotIn(body["access_key"], raw[0]); self.assertNotIn(body["signing_secret"], raw[1])
        self.assertEqual(raw[0], hashlib.sha256(body["access_key"].encode()).hexdigest())
        # đã có liên kết → mã mới không đổi được (409)
        code2 = self.cl.post("/api/hub/v1/links/code", json={"bot_id": "b_club"}, headers=self.auth()).json()["code"]
        self.assertEqual(self.cl.post("/api/hub/v1/links/exchange", json={"code": code2, "event_url": "http://picklefund-api:3000/x"}).status_code, 409)

    def test_expired_code_and_rate_limit(self):
        code = self.cl.post("/api/hub/v1/links/code", json={"bot_id": "b_club"}, headers=self.auth()).json()["code"]
        c = sqlite3.connect(self.db); c.execute("UPDATE hub_link_codes SET expires_at=?", (time.time() - 1,)); c.commit(); c.close()
        self.assertEqual(self.cl.post("/api/hub/v1/links/exchange", json={"code": code, "event_url": self.url}).status_code, 400)
        codes = [self.cl.post("/api/hub/v1/links/exchange", json={"code": "PF-AAAA-AAAA", "event_url": self.url}).status_code for _ in range(12)]
        self.assertIn(429, codes)

    # ---- hook chuyển sự kiện ----
    def test_command_matching(self):
        yes = ["/quy", "@Bot PickleFund The Ping /quy", "/congno", "/lich", "/bxh", "/dangky", "/dangky 2", "/huy 3", "/huydangky", "/diemdanh", "/no",
               "/help", "/lenh", "/lienket ABC123", "/thu Nguyễn Văn A 300k", "/chi tiền sân 600k", "@Bot /ketnoi " + "A1" * 8, "/QUY"]
        no = ["xin chào", "hôm nay /quy nhé các bạn", "/abc", "mua 1/2 kg", "/ketnoi ZZZZ", "/dangky 12345", "", "/thuong"]
        for t in yes:
            self.assertTrue(hub.COMMAND_RE.search(t.strip()), t)
        for t in no:
            self.assertFalse(hub.COMMAND_RE.search(t.strip()), t)

    def test_forward_signed_and_handled(self):
        link = self.make_link()
        self.assertTrue(self.run_hook("@Bot /quy"))
        self.assertEqual(len(Receiver.calls), 1)
        call = Receiver.calls[0]
        h = {k.lower(): v for k, v in call["headers"].items()}
        self.assertEqual(h["x-hub-link-id"], link["link_id"])
        expect = "v1=" + hmac.new(link["signing_secret"].encode(), h["x-hub-timestamp"].encode() + b"." + call["body"], hashlib.sha256).hexdigest()
        self.assertEqual(h["x-hub-signature"], expect)
        self.assertAlmostEqual(int(h["x-hub-timestamp"]), int(time.time()), delta=5)
        payload = json.loads(call["body"])
        self.assertEqual(payload["bot_id"], "b_club"); self.assertEqual(payload["event"]["message"]["text"], "@Bot /quy")
        # nhóm được ghi nhận để giới hạn nơi gửi
        self.assertEqual(sqlite3.connect(self.db).execute("select chat_id from hub_link_chats").fetchall(), [("zgr-1",)])
        st = self.cl.get(f"/api/hub/v1/links/{link['link_id']}", headers={"Authorization": "Bearer " + link["access_key"]}).json()["link"]
        self.assertEqual((st["forward_ok"], st["forward_fail"]), (1, 0))

    def test_not_command_or_other_bot_or_no_link(self):
        self.assertFalse(self.run_hook("/quy"))                       # chưa có liên kết
        self.make_link()
        self.assertFalse(self.run_hook("xin chào cả nhà"))            # không phải lệnh
        self.assertFalse(self.run_hook("/quy", bot="b_other"))       # bot không thuộc mẫu/không có liên kết
        self.assertEqual(Receiver.calls, [])

    def test_pickelfund_not_handled_falls_back_to_ai(self):
        self.make_link(); Receiver.mode = "not_handled"
        self.assertFalse(self.run_hook("/quy"))

    def test_forward_error_is_silent_and_recorded(self):
        link = self.make_link(); Receiver.mode = "fail"
        self.assertTrue(self.run_hook("/quy"))
        st = self.cl.get(f"/api/hub/v1/links/{link['link_id']}", headers={"Authorization": "Bearer " + link["access_key"]}).json()["link"]
        self.assertEqual(st["forward_fail"], 1); self.assertEqual(st["last_error"], "HTTP 500")
        # máy chủ không tồn tại
        c = sqlite3.connect(self.db); c.execute("UPDATE hub_links SET event_url='http://127.0.0.1:1/x'"); c.commit(); c.close()
        self.assertTrue(self.run_hook("/quy"))

    # ---- gửi tin ----
    def test_messages_auth_scope_idempotency(self):
        link = self.make_link()
        H = {"Authorization": "Bearer " + link["access_key"], "X-Hub-Link-Id": link["link_id"]}
        body = {"chat_id": "zgr-1", "text": "xin chào", "idempotency_key": "k1"}
        os.environ["HUB_SEND_DRY_RUN"] = "1"
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json=body).status_code, 401)
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json=body, headers={**H, "Authorization": "Bearer sai"}).status_code, 401)
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json=body, headers=H).status_code, 403)   # nhóm chưa từng chuyển sự kiện
        self.run_hook("/quy", chat="zgr-1")
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json=body, headers=H).json(), {"ok": True, "dry_run": True})
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json=body, headers=H).json(), {"ok": True, "duplicate": True})
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json={**body, "chat_id": "zgr-khac", "idempotency_key": "k2"}, headers=H).status_code, 403)
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json={"chat_id": "zgr-1", "idempotency_key": "k3"}, headers=H).status_code, 400)
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json={**body, "idempotency_key": "k4", "text": "x" * 2001}, headers=H).status_code, 400)
        self.assertEqual(self.cl.post("/api/hub/v1/messages", json={**body, "idempotency_key": "k5", "chat_id": "zgr 1!"}, headers=H).status_code, 400)

    def test_messages_real_send_path_and_failure_allows_retry(self):
        link = self.make_link()
        self.run_hook("/quy", chat="zgr-1")
        H = {"Authorization": "Bearer " + link["access_key"], "X-Hub-Link-Id": link["link_id"]}
        sent = []

        async def fake(token, method, payload):
            sent.append((token, method, payload))
            return {"ok": False, "error_code": 422, "description": "not permitted <x>"} if len(sent) == 1 else {"ok": True, "result": {"message_id": "m1"}}
        hub._zalo_post = fake
        r1 = self.cl.post("/api/hub/v1/messages", json={"chat_id": "zgr-1", "text": "a", "idempotency_key": "k"}, headers=H)
        self.assertEqual(r1.status_code, 502); self.assertIn("422", r1.text); self.assertNotIn("<x>", r1.text)
        r2 = self.cl.post("/api/hub/v1/messages", json={"chat_id": "zgr-1", "text": "a", "idempotency_key": "k"}, headers=H)   # gửi lại sau lỗi được
        self.assertEqual(r2.json(), {"ok": True, "message_id": "m1"})
        self.assertEqual(sent[1], ("1:tok", "sendMessage", {"chat_id": "zgr-1", "text": "a"}))
        r3 = self.cl.post("/api/hub/v1/messages", json={"chat_id": "zgr-1", "photo_url": "https://x/y.png", "caption": "c", "idempotency_key": "p"}, headers=H)
        self.assertEqual(sent[2][1], "sendPhoto"); self.assertTrue(r3.json()["ok"])

    def test_send_rate_limit(self):
        link = self.make_link(); self.run_hook("/quy")
        os.environ["HUB_SEND_DRY_RUN"] = "1"
        H = {"Authorization": "Bearer " + link["access_key"], "X-Hub-Link-Id": link["link_id"]}
        codes = [self.cl.post("/api/hub/v1/messages", json={"chat_id": "zgr-1", "text": "a", "idempotency_key": f"r{i}"}, headers=H).status_code for i in range(hub.SEND_LIMIT_PER_MIN + 3)]
        self.assertEqual(codes.count(429), 3)

    # ---- gỡ liên kết ----
    def test_revoke_stops_everything(self):
        link = self.make_link(); self.run_hook("/quy")
        H = {"Authorization": "Bearer " + link["access_key"]}
        self.assertEqual(self.cl.delete(f"/api/hub/v1/links/{link['link_id']}", headers=H).json(), {"ok": True})
        Receiver.calls = []
        self.assertFalse(self.run_hook("/quy"))                                   # lệnh về lại cho AI
        self.assertEqual(Receiver.calls, [])
        self.assertEqual(self.cl.get(f"/api/hub/v1/links/{link['link_id']}", headers=H).status_code, 403)
        # sau khi gỡ có thể liên kết mới
        self.make_link()

    def test_groups_endpoint(self):
        link = self.make_link(); self.run_hook("/quy", chat="zgr-abc")
        g = self.cl.get(f"/api/hub/v1/links/{link['link_id']}/groups", headers={"Authorization": "Bearer " + link["access_key"]}).json()
        self.assertEqual([x["chat_id"] for x in g["groups"]], ["zgr-abc"])

    def test_migration_idempotent(self):
        hub.init_db(); hub.init_db()
        cols = [r[1] for r in sqlite3.connect(self.db).execute("pragma table_info(bots)")]
        self.assertEqual(cols.count("template_key"), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
