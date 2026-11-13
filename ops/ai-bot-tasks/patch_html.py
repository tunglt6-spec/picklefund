"""AI-BOT static/index.html: (1) bỏ khối "Gợi ý mốc thời gian chuẩn"; (2) thêm ô "Lặp lại" (không lặp / hằng tuần / hằng tháng / hằng năm)
trong khung Tạo Nhiệm vụ / Lịch nhắc; (3) gửi recurrence + due_at_utc lên API; (4) hiển thị nhãn lặp lại trong danh sách.
Chạy bởi rw-ai-bot-tasks-recur.sh. Idempotent (marker recur-select). Neo sai → dừng, không ghi.
"""
import os
import re

AB = os.environ.get("AB", "/opt/ai-bot-saas")
p = os.path.join(AB, "static", "index.html")
t = open(p, encoding="utf-8").read()
if 'id="qc-select-recur"' in t:
    print("index.html đã vá — bỏ qua")
    raise SystemExit(0)
done = []


def one(a, b, what):
    """Thay đúng 1 chỗ; mọi khoảng trắng/xuống dòng trong neo khớp linh hoạt (file thật có thể thừa dấu cách cuối dòng)."""
    global t
    pat = re.compile(r"\s+".join(re.escape(tok) for tok in a.split()))
    found = pat.findall(t)
    assert len(found) == 1, f"{what}: kỳ vọng 1 khớp, thực tế {len(found)}"
    t = pat.sub(lambda m: b.strip(), t, count=1)
    done.append(what)


# (1) bỏ khối gợi ý mốc thời gian nhanh (từ comment "Thanh Gợi Ý Nhanh" đến hết thẻ div của nó)
start_tag = "<!-- Thanh Gợi Ý Nhanh (Smart Presets Ngày Giờ Tháng Năm) -->"
assert t.count(start_tag) == 1, "khối gợi ý nhanh: không đúng 1 chỗ"
i = t.index(start_tag)
line_start = t.rfind("\n", 0, i) + 1
j = t.index("<!-- Phân loại Danh mục Tri thức", i)
k = t.rfind("\n", 0, j) + 1            # đầu dòng comment tiếp theo
block = t[line_start:k]
# khối cần bỏ kết thúc bằng 1 thẻ </div> đóng nhóm cha (qc-group-datetime) → giữ lại thẻ đóng đó
closing = re.search(r"\n(\s*</div>\s*)\n$", block)
assert closing, "không tìm được thẻ đóng nhóm cha sau khối gợi ý"
parent_close = closing.group(1)
inner = block[: closing.start()]
assert "setQuickPreset" in inner and inner.count("<div") == inner.count("</div>"), "khối gợi ý không cân thẻ"

RECUR = '''                    <!-- Lặp lại (không lặp / tuần / tháng / năm) -->
                    <div id="qc-group-recur">
                        <label for="qc-select-recur" class="block text-[11px] font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                            <i class="fa-solid fa-rotate text-emerald-600"></i><span>Lặp lại:</span>
                        </label>
                        <select id="qc-select-recur" onchange="updateRecurHint()" class="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none focus:border-emerald-500">
                            <option value="none">Không lặp lại (chỉ 1 lần)</option>
                            <option value="weekly">Hằng tuần</option>
                            <option value="monthly">Hằng tháng</option>
                            <option value="yearly">Hằng năm</option>
                        </select>
                        <p id="qc-recur-hint" class="hidden mt-1.5 text-[11px] font-semibold text-emerald-700"></p>
                    </div>
'''
t = t[:line_start] + RECUR + parent_close + "\n" + t[k:]
done.append("bỏ gợi ý mốc nhanh + thêm ô Lặp lại")

# gợi ý lặp lại cập nhật theo ngày giờ đã chọn
one("        function updateDatetimePreview() {\n", '''        function recLabelVN(rec) {
            const m = { weekly: 'Hằng tuần', monthly: 'Hằng tháng', yearly: 'Hằng năm', daily: 'Hằng ngày', weekdays: 'T2-T6' };
            return m[rec] || '1 lần';
        }
        function updateRecurHint() {
            const sel = document.getElementById('qc-select-recur'), hint = document.getElementById('qc-recur-hint'), dt = document.getElementById('qc-input-datetime');
            if (!sel || !hint) return;
            const rec = sel.value;
            if (rec === 'none' || !dt || !dt.value) { hint.classList.add('hidden'); hint.textContent = ''; return; }
            const d = new Date(dt.value); if (isNaN(d)) { hint.classList.add('hidden'); return; }
            const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            hint.textContent = rec === 'weekly' ? `Lặp lại vào ${days[d.getDay()]} hằng tuần, lúc ${hm}`
                : rec === 'monthly' ? `Lặp lại vào ngày ${d.getDate()} hằng tháng, lúc ${hm}`
                : `Lặp lại vào ngày ${d.getDate()}/${d.getMonth() + 1} hằng năm, lúc ${hm}`;
            hint.classList.remove('hidden');
        }
        function updateDatetimePreview() {
            setTimeout(updateRecurHint, 0);
''', "hàm gợi ý lặp lại")

# mở khung: đặt lại ô Lặp lại
one("            if (inputDesc) inputDesc.value = '';\n            switchQuickCreateTab(type);",
    "            if (inputDesc) inputDesc.value = '';\n            const recSel = document.getElementById('qc-select-recur'); if (recSel) recSel.value = 'none';\n            switchQuickCreateTab(type);", "reset ô lặp lại khi mở")

# (3) gửi lên API
one("                const now = new Date();\n                if (d.toDateString() === now.toDateString()) {\n                    formattedDueDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} Hôm nay`;\n                } else {\n                    formattedDueDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;\n                }",
    "                const now = new Date();\n                if (d.toDateString() === now.toDateString()) {\n                    formattedDueDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} Hôm nay`;\n                } else {\n                    formattedDueDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;\n                }",
    "hiển thị hạn kèm giờ và năm")
one("            const priority = prioritySelect ? prioritySelect.value : 'normal';\n",
    "            const priority = prioritySelect ? prioritySelect.value : 'normal';\n            const recurVal = (document.getElementById('qc-select-recur') || { value: 'none' }).value;\n", "đọc ô lặp lại")
one("                            due_date: formattedDueDate,\n                            priority: priority\n",
    "                            due_date: formattedDueDate,\n                            priority: priority,\n                            recurrence: recurVal,\n                            due_at_utc: dtVal ? isoDateTime : ''\n", "body tạo nhiệm vụ")
one("                            recurrence: 'none'\n", "                            recurrence: recurVal\n", "body tạo lịch nhắc")

# (4) hiển thị
one("const recLabel = r.recurrence === 'weekdays' ? 'T2-T6' : (r.recurrence === 'daily' ? 'Hàng ngày' : '1 lần');", "const recLabel = recLabelVN(r.recurrence);", "nhãn lặp lịch nhắc")
one("<p class=\"text-[11px] text-slate-400 truncate mt-0.5\">${t.description || t.bot_name || ''}</p>",
    "<p class=\"text-[11px] text-slate-400 truncate mt-0.5\">${(t.recurrence && t.recurrence !== 'none') ? '🔁 ' + recLabelVN(t.recurrence) + ' · ' : ''}${t.description || t.bot_name || ''}</p>", "nhãn lặp nhiệm vụ")

open(p + ".new", "w", encoding="utf-8").write(t)
os.replace(p + ".new", p)
print("đã vá:", "; ".join(done))
