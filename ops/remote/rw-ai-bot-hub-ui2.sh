#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). Zalo Hub — chuyển "Liên kết PickleFund" từ panel riêng thành TÙY CHỌN của bot "CLB & Thể Thao":
#  (1) khung "Khởi Tạo Trợ Lý AI Mới": thêm bước 6 tùy chọn (chỉ hiện khi chọn mẫu CLB & Thể Thao + Zalo); tạo bot xong → tự hiện cửa sổ có mã PF-…;
#  (2) thẻ bot thuộc mẫu CLB & Thể Thao: nút "Liên kết PickleFund" (trạng thái, tạo mã, xác nhận nhóm, gỡ liên kết);
#  (3) gỡ panel riêng phía trên lưới bot (thay nội dung script hub-pf-ui bằng hub_ui.js mới).
# Chỉ sửa static/index.html (phục vụ trực tiếp từ volume, KHÔNG restart, KHÔNG đụng main.py/DB). Sao lưu; lỗi kiểm tra → khôi phục.
set -euo pipefail
AB=/opt/ai-bot-saas; TS=$(date +%Y%m%d_%H%M%S)
: "${OPS_SHA:?cần OPS_SHA từ workflow}"
cd "$AB"
cp -p static/index.html "static/index.html.bak_pre_hubui2_${TS}"
(cd /opt/picklefund && git show "${OPS_SHA}:ops/ai-bot-hub/hub_ui.js") > hub_ui.js.new
python3 -c "
j = open('hub_ui.js.new', encoding='utf-8').read()
assert '\x00' not in j and 'window.hubOpen' in j and '</script' not in j.lower(), 'hub_ui.js không đúng bản mới'; print('hub_ui.js mới OK (%d byte)' % len(j))"
mv hub_ui.js.new hub_ui.js
rollback() { echo "LỖI: $1 — KHÔI PHỤC index.html"; cp -p "static/index.html.bak_pre_hubui2_${TS}" static/index.html; exit 1; }

python3 - <<'PY' || rollback "vá index.html thất bại"
import re, os
p = "/opt/ai-bot-saas/static/index.html"
t = open(p, encoding="utf-8").read()
js = open("/opt/ai-bot-saas/hub_ui.js", encoding="utf-8").read()
done = []

# (1) tùy chọn trong khung tạo bot
if 'id="cust-hub-option"' not in t:
    A = "<!-- BANNER TIỆN ÍCH TỰ ĐỘNG BẮT SÓNG -->"
    assert t.count(A) == 1, "banner tạo bot: thực tế %d" % t.count(A)
    OPT = ('<!-- PHẦN 6: LIÊN KẾT PICKLEFUND (tùy chọn, chỉ hiện với mẫu CLB & Thể Thao) -->\n'
           '                <div id="cust-hub-option" class="hidden p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50">\n'
           '                    <label class="flex items-start gap-2.5 cursor-pointer">\n'
           '                        <input type="checkbox" id="cust-hub-link" class="mt-0.5 w-4 h-4 accent-emerald-600 flex-shrink-0">\n'
           '                        <span class="text-[11px] text-slate-700 leading-relaxed"><b class="text-emerald-900 text-xs">6. Dùng bot này với PickleFund (tùy chọn)</b><br>'
           'Để PickleFund nhận lệnh <b>/quy, /congno, /dangky…</b> trong nhóm CLB và gửi thông báo, báo cáo qua chính bot này. '
           'Sau khi kích hoạt bạn sẽ nhận một <b>mã liên kết</b> để dán vào PickleFund (không cần dán token bot vào PickleFund).</span>\n'
           '                    </label>\n'
           '                </div>\n                ')
    t = t.replace(A, OPT + A, 1); done.append("tùy chọn trong khung tạo bot")

# (2) tạo bot xong: chỉ mở cửa sổ mã khi người dùng tick tùy chọn
OLD = "if (window._pendingTemplateKey === 'thethao') { window._hubOpenBot = data.bot_id; }"
NEW = ("if (window._pendingTemplateKey === 'thethao' && document.getElementById('cust-hub-link') && document.getElementById('cust-hub-link').checked) "
       "{ window._hubOpenBot = data.bot_id || ('name:' + botName); }")
if OLD in t:
    assert t.count(OLD) == 1, "dòng mở cửa sổ sau tạo bot: thực tế %d" % t.count(OLD)
    t = t.replace(OLD, NEW, 1); done.append("mở cửa sổ mã sau khi tạo bot")
else:
    assert NEW in t, "không thấy dòng mở cửa sổ sau khi tạo bot (cả bản cũ lẫn mới)"

# (3) nút trên thẻ bot
CHIP = "${window.hubChip ? window.hubChip(bot) : ''}"
if CHIP not in t:
    F = "<!-- Footer: Phím Thao Tác Nhanh"
    assert t.count(F) == 1, "footer thẻ bot: thực tế %d" % t.count(F)
    t = t.replace(F, CHIP + "\n                        " + F, 1); done.append("nút trên thẻ bot")

# (4) thay script hub-pf-ui bằng bản mới (không còn panel riêng)
m = re.search(r'<script id="hub-pf-ui">\n.*?\n</script>\n', t, re.S)
assert m, "không thấy script hub-pf-ui (GĐ3)"
block = '<script id="hub-pf-ui">\n' + js + "\n</script>\n"
if m.group(0) != block:
    t = t[:m.start()] + block + t[m.end():]; done.append("script hub_ui mới")

open(p + ".new", "w", encoding="utf-8").write(t); os.replace(p + ".new", p)
print("đã vá:", ", ".join(done) if done else "(không có gì mới)")
PY

echo "== Kiểm tra =="
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code http://127.0.0.1:4105/)" = 200 ] || rollback "trang chủ không 200"
P=$(curl -s -m 10 http://127.0.0.1:4105/)
for k in 'id="cust-hub-option"' 'id="cust-hub-link"' 'window.hubOpen' 'hubChip(bot)'; do echo "$P" | grep -qF "$k" || rollback "trang chủ thiếu: $k"; done
echo "$P" | grep -q 'id="hub-pf-panel"' && rollback "vẫn còn panel riêng" || true
[ "$(code http://127.0.0.1:4105/webhook/zalo/bot_7be4d5962d80)" = 200 ] || rollback "webhook Zalo không 200"
[ "$(code http://127.0.0.1:4105/api/bots?account_id=superadmin)" = 200 ] || rollback "GET /api/bots không 200"
echo "OK: tùy chọn trong khung tạo bot, nút trên thẻ bot, không còn panel riêng"
git add static/index.html hub_ui.js 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "zalo hub: liên kết PickleFund là tùy chọn của bot CLB & Thể Thao (khung tạo bot + thẻ bot)"
echo "=== xong ==="
exit 0
