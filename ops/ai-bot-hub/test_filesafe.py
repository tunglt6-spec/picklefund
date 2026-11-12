"""Kiểm thử aibot_filesafe.py (python test_filesafe.py). Trong container: HUB_DIR=/app, chạy qua stdin."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.environ.get("HUB_DIR") or os.path.dirname(os.path.abspath(__file__)))
import aibot_filesafe as fs  # noqa: E402


class GuardTest(unittest.TestCase):
    def test_has_text_lets_ai_read(self):
        self.assertIsNone(fs.file_guard({"has_file": True, "extracted_text": "nội dung thật"}, "", "đọc file này"))

    def test_quoted_file_without_content_is_blocked(self):
        self.assertEqual(fs.file_guard({"has_file": False, "extracted_text": ""}, "[File] Nâng cấp AI-BOT.docx", "đọc phân tích giải pháp trong file này cho chú nhé"), fs.MSG_NO_CONTENT)
        self.assertEqual(fs.file_guard(None, "[file] a.pdf", "xin chào"), fs.MSG_NO_CONTENT)
        self.assertEqual(fs.file_guard({}, "  [Tệp] bao cao.xlsx", "tóm tắt"), fs.MSG_NO_CONTENT)
        self.assertEqual(fs.file_guard({}, "", "đọc [File] này giúp"), fs.MSG_NO_CONTENT)

    def test_asks_about_file_without_one(self):
        for t in ("đọc file này đi", "Tóm tắt tài liệu giúp chú", "phân tích nội dung tệp vừa gửi"):
            self.assertEqual(fs.file_guard({"has_file": False, "extracted_text": ""}, "", t), fs.MSG_NO_CONTENT, t)

    def test_file_without_extractable_text(self):
        self.assertEqual(fs.file_guard({"has_file": True, "extracted_text": "   "}, "", "đọc file"), fs.MSG_NO_TEXT)

    def test_normal_chat_untouched(self):
        for t in ("xin chào", "hôm nay tập mấy giờ", "nhắc lịch 14h", "mình gửi file cho anh rồi nhé", "tài liệu hướng dẫn ở đâu"):
            self.assertIsNone(fs.file_guard({"has_file": False, "extracted_text": ""}, "", t), t)
        self.assertIsNone(fs.file_guard({}, "tin nhắn thường được trích dẫn", "ok"))

    def test_never_raises(self):
        self.assertIsNone(fs.file_guard(object(), None, None))


class ShapeTest(unittest.TestCase):
    def setUp(self):
        self.p = os.path.join(tempfile.mkdtemp(), "sub", "shapes.jsonl")

    def lines(self):
        return [json.loads(x) for x in open(self.p, encoding="utf-8")] if os.path.exists(self.p) else []

    def test_plain_text_not_logged(self):
        ev = {"event_name": "message.text.received", "message": {"text": "xin chào", "chat": {"id": "z", "chat_type": "GROUP"}, "from": {"id": "u"}}}
        self.assertFalse(fs.log_event_shape(ev, self.p))
        self.assertEqual(self.lines(), [])

    def test_quote_file_logged_without_values(self):
        ev = {"event_name": "message.text.received", "message": {"message_id": "m1", "text": "bí-mật-nội-dung", "chat": {"id": "zgr-1", "chat_type": "GROUP"},
              "from": {"id": "u", "display_name": "Tên Người"}, "reply_to_message": {"text": "[File] Hợp đồng 123.docx", "from": {"id": "u2"}}}}
        self.assertTrue(fs.log_event_shape(ev, self.p))
        rec = self.lines()[0]
        raw = open(self.p, encoding="utf-8").read()
        for secret in ("bí-mật-nội-dung", "Tên Người", "Hợp đồng 123", "zgr-1", "m1"):
            self.assertNotIn(secret, raw)
        self.assertTrue(rec["file_marker"]); self.assertEqual(rec["chat_type"], "GROUP")
        self.assertEqual(rec["shape"]["message"]["reply_to_message"]["text"], "str(24)")

    def test_non_text_events_and_file_keys(self):
        self.assertTrue(fs.log_event_shape({"event_name": "message.unsupported.received", "message": {"chat": {"chat_type": "PRIVATE"}}}, self.p))
        self.assertTrue(fs.log_event_shape({"event_name": "message.text.received", "message": {"attachments": [{"payload": {"url": "https://x/f.docx", "name": "a.docx"}}]}}, self.p))
        recs = self.lines()
        self.assertEqual(recs[0]["event_name"], "message.unsupported.received")
        self.assertIn("attachments", recs[1]["file_keys"]); self.assertIn("url", recs[1]["file_keys"])
        self.assertNotIn("https://x/f.docx", open(self.p, encoding="utf-8").read())

    def test_trim_and_robustness(self):
        os.makedirs(os.path.dirname(self.p), exist_ok=True)
        for i in range(fs.MAX_LINES + 5):
            fs.log_event_shape({"event_name": "message.image.received", "message": {"photo_url": "u"}}, self.p)
        self.assertLessEqual(len(self.lines()), fs.MAX_LINES)
        self.assertGreaterEqual(len(self.lines()), fs.KEEP_LINES)
        self.assertFalse(fs.log_event_shape("không phải dict", self.p))
        blocker = os.path.join(os.path.dirname(os.path.dirname(self.p)), "blocker")
        open(blocker, "w").close()                                                 # thư mục cha là TỆP → không ghi được
        self.assertFalse(fs.log_event_shape({"event_name": "message.image.received"}, os.path.join(blocker, "sub", "x.jsonl")))


if __name__ == "__main__":
    unittest.main(verbosity=2)
