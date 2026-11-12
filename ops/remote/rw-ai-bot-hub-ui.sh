#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). GĐ3 Zalo Hub: giao diện + API cho CHỦ BOT trong AI-BOT (/opt/ai-bot-saas). Hub vẫn TẮT (HUB_ENABLED=0 trong .env.hub).
# Gồm:
#  (1) hub.py bản GĐ3 (API chủ bot: overview / xác nhận nhóm / bỏ xác nhận / gỡ liên kết) + bộ kiểm thử;
#  (2) main.py: /api/auth/login trả thêm `hub_token` (token phiên HS256 của hub); POST /api/bots nhận+lưu `template_key` (chỉ 'thethao');
#      GET /api/bots trả `template_key`; hàm phụ _hub_session ở cuối file;
#  (3) static/index.html: lưu hub_token khi đăng nhập; chọn mẫu "CLB & Thể Thao" → gửi template_key khi tạo bot; chèn bảng "Liên kết PickleFund"
#      (script hub_ui.js) phía trên lưới bot. Bot cũ (vd. The PING) chưa có template_key nên chưa hiện bảng — gắn ở GĐ4.
# KHÔNG tạo lại container (chỉ `docker restart`); không đổi docker-compose; không thêm gói. Sao lưu main.py + index.html + hub.py trước khi vá.
# Tự khôi phục cả 3 tệp (và restart) nếu kiểm tra sau restart hoặc bộ kiểm thử lỗi. Idempotent (có dấu mốc).
# Quay lại: cp main.py.bak_pre_hubui_<ts> main.py; cp static/index.html.bak_pre_hubui_<ts> static/index.html; cp hub.py.bak_pre_hubui_<ts> hub.py; docker restart maika-saas-engine
set -euo pipefail
AB=/opt/ai-bot-saas
C=maika-saas-engine
TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"

echo "== 1. Sao lưu =="
cp -p main.py "main.py.bak_pre_hubui_${TS}"
cp -p static/index.html "static/index.html.bak_pre_hubui_${TS}"
cp -p hub.py "hub.py.bak_pre_hubui_${TS}"
echo "đã sao lưu main.py, static/index.html, hub.py (hậu tố bak_pre_hubui_${TS})"

echo "== 2. Chép hub.py, hub_ui.js, bộ kiểm thử từ commit ${OPS_SHA:0:8} =="
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/hub.py") > hub.py.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/hub_ui.js") > hub_ui.js.new
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/test_hub.py") > /tmp/test_hub.py
python3 -c "
import ast
s = open('hub.py.new', encoding='utf-8').read()
assert '\x00' not in s and 'def bot_overview' in s, 'hub.py lỗi'
ast.parse(s); print('hub.py cú pháp OK')
j = open('hub_ui.js.new', encoding='utf-8').read()
assert '\x00' not in j and 'hub-pf-panel' in j, 'hub_ui.js lỗi'; print('hub_ui.js có mặt (%d byte)' % len(j))"
grep -q -E '^\s*(import|from) (jwt|cryptography)' hub.py.new && { echo "hub.py còn phụ thuộc gói ngoài — dừng"; exit 1; } || true
mv hub.py.new hub.py
mv hub_ui.js.new hub_ui.js

echo "== 3. Vá main.py và static/index.html =="
python3 - <<'PY'
import ast, os, re

# ---------- main.py ----------
p = "/opt/ai-bot-saas/main.py"
s = open(p, encoding="utf-8").read()
changed = []

def within(src, start_pat, end_pat):
    a = src.index(start_pat)
    b = src.index(end_pat, a + len(start_pat))
    return a, b

if "hub_token" not in s:
    a, b = within(s, "async def login(", '@app.post("/api/auth/change-password")')
    seg = s[a:b]
    OLD = '            "is_first_login": False\n        }\n    }'
    assert seg.count(OLD) == 1, "login: kỳ vọng 1 khối is_first_login, thực tế %d" % seg.count(OLD)
    seg = seg.replace(OLD, '            "is_first_login": False\n        },\n        "hub_token": _hub_session(user[1], user[4])\n    }', 1)
    s = s[:a] + seg + s[b:]
    changed.append("login")

if "template_key: Optional[str] = None" not in s:
    OLD = "class BotCreateRequest(BaseModel):\n"
    assert s.count(OLD) == 1, "BotCreateRequest: thực tế %d" % s.count(OLD)
    s = s.replace(OLD, OLD + "    template_key: Optional[str] = None\n", 1)
    changed.append("model")

if "UPDATE bots SET template_key" not in s:
    a, b = within(s, "async def create_bot(", '@app.get("/api/bots")')
    seg = s[a:b]
    OLD = "    conn.commit()\n    conn.close()\n"
    assert seg.count(OLD) == 1, "create_bot: thực tế %d" % seg.count(OLD)
    NEW = ("    if (req.template_key or \"\") == \"thethao\":\n"
           "        try:\n"
           "            c.execute(\"UPDATE bots SET template_key = ? WHERE bot_id = ?\", (\"thethao\", bot_id))\n"
           "        except Exception as _tk_err:\n"
           "            logger.warning(f\"[HUB] không lưu được template_key: {type(_tk_err).__name__}\")\n") + OLD
    seg = seg.replace(OLD, NEW, 1)
    s = s[:a] + seg + s[b:]
    changed.append("create")

if '"template_key": _tk.get(r[0])' not in s:
    a, b = within(s, "async def list_bots(", "\n@app.", )
    seg = s[a:b]
    OLD1 = "    rows = c.fetchall()\n    conn.close()\n"
    assert seg.count(OLD1) == 1, "list_bots rows: thực tế %d" % seg.count(OLD1)
    NEW1 = ("    rows = c.fetchall()\n"
            "    try:\n"
            "        c.execute(\"SELECT bot_id, template_key FROM bots\")\n"
            "        _tk = {r_[0]: r_[1] for r_ in c.fetchall()}\n"
            "    except Exception:\n"
            "        _tk = {}\n"
            "    conn.close()\n")
    seg = seg.replace(OLD1, NEW1, 1)
    OLD2 = '            "webhook_url": f"/webhook/{r[3]}/{r[0]}"\n        })'
    assert seg.count(OLD2) == 1, "list_bots webhook_url: thực tế %d" % seg.count(OLD2)
    seg = seg.replace(OLD2, '            "webhook_url": f"/webhook/{r[3]}/{r[0]}",\n            "template_key": _tk.get(r[0])\n        })', 1)
    s = s[:a] + seg + s[b:]
    changed.append("list")

MARK = "# --- ZALO HUB UI (GĐ3) ---"
if MARK not in s:
    s = s.rstrip("\n") + "\n\n\n" + MARK + "\n" \
        "def _hub_session(username, role):\n" \
        "    try:\n" \
        "        return _hub_mod.issue_session_token(username, role)\n" \
        "    except Exception:\n" \
        "        return None\n"
    changed.append("helper")
ast.parse(s)
if changed:
    open(p + ".new", "w", encoding="utf-8").write(s); os.replace(p + ".new", p)
    print("main.py: đã vá", ", ".join(changed), "(đã kiểm tra cú pháp)")
else:
    print("main.py: đã vá trước đó — bỏ qua")

# ---------- static/index.html ----------
h = "/opt/ai-bot-saas/static/index.html"
t = open(h, encoding="utf-8").read()
hc = []
if "hub_token" not in t:
    i = t.index("fetch('/api/auth/login'")
    pat = re.compile(r"currentUser = data\.user;(\s*)localStorage\.setItem\('aibot_auth'")
    m = pat.search(t, i)
    assert m, "login JS: không thấy khối currentUser = data.user sau fetch login"
    t = t[:m.start()] + "currentUser = data.user; currentUser.hub_token = data.hub_token || null;" + t[m.start() + len("currentUser = data.user;"):]
    hc.append("login")
if "_pendingTemplateKey" not in t:
    pat = re.compile(r"(function applyBotTemplate\(key\) \{\s*const tmpl = BOT_TEMPLATES\[key\];\s*if \(!tmpl\) return;)")
    assert len(pat.findall(t)) == 1, "applyBotTemplate: không khớp đúng 1 chỗ"
    t = pat.sub(lambda m: m.group(1) + "\n            window._pendingTemplateKey = key;", t, count=1)
    a = t.index("async function handleCustomerCreateBot(")
    b = t.index("async function deleteCustomerBot(", a)
    seg = t[a:b]
    pat2 = re.compile(r"custom_prompt: customPrompt(\s*)\}\)")
    assert len(pat2.findall(seg)) == 1, "create body: không khớp đúng 1 chỗ"
    seg = pat2.sub(lambda m: "custom_prompt: customPrompt,\n                        template_key: window._pendingTemplateKey || null" + m.group(1) + "})", seg, count=1)
    OKS = "showToast(`Khởi tạo thành công Bot [${botName}]!`);"
    assert seg.count(OKS) == 1, "create success toast: không khớp"
    seg = seg.replace(OKS, "if (window._pendingTemplateKey === 'thethao') { window._hubOpenBot = data.bot_id; }\n                    window._pendingTemplateKey = null;\n                    " + OKS, 1)
    t = t[:a] + seg + t[b:]
    hc.append("template")
if 'id="hub-pf-ui"' not in t:
    js = open("/opt/ai-bot-saas/hub_ui.js", encoding="utf-8").read()
    assert "</script" not in js.lower(), "hub_ui.js chứa </script"
    block = '<script id="hub-pf-ui">\n' + js + "\n</script>\n"
    k = t.rfind("</body>")
    t = (t[:k] + block + t[k:]) if k != -1 else (t + "\n" + block)
    hc.append("panel")
if hc:
    open(h + ".new", "w", encoding="utf-8").write(t); os.replace(h + ".new", h)
    print("index.html: đã vá", ", ".join(hc))
else:
    print("index.html: đã vá trước đó — bỏ qua")
PY
rm -f hub_ui.js   # đã nhúng vào index.html; không cần giữ

rollback() {
  echo "LỖI ở bước $1: ${2:-không rõ}"
  echo "--- log container gần nhất (trước khi khôi phục):"
  docker logs --tail 40 "$C" 2>&1 | cut -c1-200 | tail -40 || true
  echo "--- khôi phục main.py + index.html + hub.py + restart"
  cp -p "main.py.bak_pre_hubui_${TS}" main.py
  cp -p "static/index.html.bak_pre_hubui_${TS}" static/index.html
  cp -p "hub.py.bak_pre_hubui_${TS}" hub.py
  docker restart "$C" >/dev/null 2>&1 || true
  exit 1
}

echo "== 4. Restart (KHÔNG tạo lại container) và kiểm tra hành vi cũ =="
docker restart "$C" >/dev/null
ok=0
for i in $(seq 1 40); do
  curl -sf -m 5 http://127.0.0.1:4105/healthz >/dev/null 2>&1 && { ok=1; break; }
  sleep 2
done
[ "$ok" = 1 ] || rollback 4 "container không khỏe sau 80 giây"
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
curl -s -m 10 http://127.0.0.1:4105/api/hub/v1/health | grep -q '"enabled":false' || rollback 4 "hub không ở trạng thái tắt"
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback 4 "trang chủ không 200"
curl -s -m 10 http://127.0.0.1:4105/ | grep -q 'id="hub-pf-ui"' || rollback 4 "trang chủ không chứa bảng PickleFund"
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 4 "GET webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback 4 "POST webhook Zalo không 200"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:4105/webhook/telegram/bot_maika_openclaw_telegram)" = 200 ] || rollback 4 "POST webhook Telegram không 200"
[ "$(code http://127.0.0.1:4105/api/bots?account_id=superadmin)" = 200 ] || rollback 4 "GET /api/bots không 200"
curl -s -m 10 "http://127.0.0.1:4105/api/bots?account_id=superadmin" | grep -q '"bots"' || rollback 4 "GET /api/bots không trả danh sách"
# đăng nhập sai vẫn 401 (không lộ hub_token); bảng overview cần phiên
[ "$(code -X POST -H 'Content-Type: application/json' -d '{"username":"khong_ton_tai","password":"x"}' http://127.0.0.1:4105/api/auth/login)" = 401 ] || rollback 4 "login sai không trả 401"
[ "$(code http://127.0.0.1:4105/api/hub/v1/bots/x/overview)" = 401 ] || rollback 4 "overview không đòi phiên"
docker exec "$C" python -c "import markitdown, docx, fitz" 2>/dev/null || rollback 4 "mất gói đọc file"
echo "OK: trang chủ (có bảng PickleFund), webhook Zalo/Telegram, /api/bots, login sai=401, overview cần phiên, hub tắt, gói đọc file"

echo "== 5. Bộ kiểm thử hub trong container (DB tạm) =="
docker exec -i -e HUB_DIR=/app "$C" python -W ignore - < /tmp/test_hub.py > /tmp/test_hub.out 2>&1 && tail -4 /tmp/test_hub.out || { tail -25 /tmp/test_hub.out; rollback 5 "bộ kiểm thử hub lỗi trong container"; }
rm -f /tmp/test_hub.py /tmp/test_hub.out

echo "== 6. Commit git cục bộ =="
git add hub.py main.py static/index.html 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "zalo hub GĐ3: API chủ bot, hub_token khi đăng nhập, template_key, bảng Liên kết PickleFund (HUB_ENABLED=0)"
echo "commit: $(git log --oneline -1 | cut -c1-70)"
echo "=== xong: giao diện liên kết PickleFund đã cài, hub vẫn TẮT ==="
exit 0
