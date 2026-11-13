"""AI-BOT static/index.html: thêm nút Sửa/Xóa vào 4 mẫu thẻ (widget Lịch nhắc, widget Nhiệm vụ, "Xem tất cả" Lịch nhắc, "Xem tất cả" Nhiệm vụ)
và chèn script tasks_ui.js. Idempotent (marker id="tasks-crud-ui"). Neo chịu khoảng trắng; sai neo → dừng, không ghi.
"""
import os
import re

AB = os.environ.get("AB", "/opt/ai-bot-saas")
p = os.path.join(AB, "static", "index.html")
js = open(os.path.join(AB, "tasks_ui.js"), encoding="utf-8").read()
t = open(p, encoding="utf-8").read()
if 'id="tasks-crud-ui"' in t:
    print("nút sửa/xóa đã có — bỏ qua")
    raise SystemExit(0)
assert "</script" not in js.lower() and "window.rowActions" in js, "tasks_ui.js không đúng"
assert 'id="qc-select-recur"' in t, "cần patch_html.py (ô Lặp lại) trước"
done = []


def sub1(pattern, repl, what):
    global t
    found = re.findall(pattern, t, re.S)
    assert len(found) == 1, f"{what}: kỳ vọng 1 khớp, thực tế {len(found)}"
    t = re.sub(pattern, lambda m: repl(m), t, count=1, flags=re.S)
    done.append(what)


def ACT(kind, ident):
    return "${window.rowActions ? window.rowActions('" + kind + "', " + ident + ") : ''}"


# (a) widget Lịch nhắc: bọc dấu ✓ cùng nút thao tác
sub1(r'(<div class="w-6 h-6 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-700 flex items-center justify-center flex-shrink-0 text-\[10px\] font-bold shadow-2xs">\s*<i class="fa-solid fa-check"></i>\s*</div>)',
     lambda m: '<div class="flex items-center gap-1 flex-shrink-0">' + ACT("reminder", "r.id") + m.group(1) + '</div>', "widget lịch nhắc")
# (b) widget Nhiệm vụ: bọc nhãn hạn cùng nút
sub1(r'(<span class="px-2\.5 py-0\.5 rounded-lg text-\[10px\] font-bold \$\{badgeClass\} flex-shrink-0 shadow-2xs">\$\{t\.due_date \|\| \'Hôm nay\'\}</span>)',
     lambda m: '<div class="flex items-center gap-1.5 flex-shrink-0">' + m.group(1) + ACT("task", "t.id") + '</div>', "widget nhiệm vụ")
# (c) "Xem tất cả" Lịch nhắc: thêm nút sau nhãn trạng thái
sub1(r"(\$\{isScheduled \? '🟢 Đang chờ' : '✓ Đã nhắc'\}\s*</span>)",
     lambda m: m.group(1) + "\n                                        " + ACT("reminder", "r.id"), "danh sách lịch nhắc")
# (d) "Xem tất cả" Nhiệm vụ: bọc nhãn hạn cùng nút
sub1(r'(<span class="px-2 py-0\.5 rounded text-\[10px\] font-bold [^"]*flex-shrink-0">\s*\$\{t\.due_date \|\| \'Hôm nay\'\}\s*</span>)',
     lambda m: '<div class="flex items-center gap-1.5 flex-shrink-0">' + m.group(1) + ACT("task", "t.id") + '</div>', "danh sách nhiệm vụ")

# (e) script: đặt ngay sau script hub-pf-ui (đã nạp sau script chính)
m = re.search(r'<script id="hub-pf-ui">\n.*?\n</script>\n', t, re.S)
assert m, "không thấy script hub-pf-ui"
t = t[:m.end()] + '<script id="tasks-crud-ui">\n' + js + "\n</script>\n" + t[m.end():]
done.append("script tasks_ui")

open(p + ".new", "w", encoding="utf-8").write(t)
os.replace(p + ".new", p)
print("đã vá:", "; ".join(done))
