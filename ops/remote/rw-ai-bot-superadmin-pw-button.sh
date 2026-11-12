#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). Thêm nút "Đổi Mật Khẩu" vào menu tài khoản của Super Admin trong giao diện AI-BOT
# (/opt/ai-bot-saas/static/index.html). Dùng lại modal + hàm đổi mật khẩu đã có (openChangePasswordModal →
# POST /api/auth/change-password, xác minh mật khẩu cũ). Chỉ sửa HTML tĩnh; không đụng main.py hay DB.
# An toàn: sao lưu trước, đúng 1 vị trí neo (không đúng → dừng, không sửa), kiểm tra nội dung trang sau khi sửa,
# tự khôi phục nếu lỗi. Idempotent. Quay lại: cp index.html.bak_pre_pwbtn_<thời điểm> index.html
set -euo pipefail
F=/opt/ai-bot-saas/static/index.html
TS=$(date +%Y%m%d_%H%M%S)
[ -f "$F" ] || { echo "Không thấy $F"; exit 1; }
cp -p "$F" "${F}.bak_pre_pwbtn_${TS}"
echo "đã sao lưu: index.html.bak_pre_pwbtn_${TS}"

python3 - "$F" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
MARK = "closeSuperAdminHeaderMenu(); openChangePasswordModal();"
if MARK in s:
    print("đã có nút đổi mật khẩu cho Super Admin — bỏ qua"); raise SystemExit(0)
ANCHOR = '<button type="button" onclick="closeSuperAdminHeaderMenu(); openModal(\'logout-confirm-modal\');"'
assert s.count(ANCHOR) == 1, "kỳ vọng đúng 1 nút Đăng Xuất của Super Admin, thực tế %d — dừng" % s.count(ANCHOR)
i = s.index(ANCHOR)
box = '<div class="pt-2 border-t border-slate-100">'
j = s.rfind(box, max(0, i - 400), i)
assert j != -1, "không thấy khối chứa nút Đăng Xuất — dừng"
button = (
    '<button type="button" onclick="closeSuperAdminHeaderMenu(); openChangePasswordModal();" '
    'class="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 '
    'text-slate-700 border border-slate-200 text-xs font-bold transition focus:outline-none">\n'
    '                                            <i class="fa-solid fa-key text-slate-400 text-xs"></i>\n'
    '                                            <span>Đổi Mật Khẩu</span>\n'
    '                                        </button>\n'
    '                                        ')
new = s[:j] + '<div class="pt-2 border-t border-slate-100 space-y-1">' + s[j + len(box):i] + button + s[i:]
open(p + ".new", "w", encoding="utf-8").write(new)
import os
os.replace(p + ".new", p)
print("đã thêm nút Đổi Mật Khẩu vào menu Super Admin")
PY

# Giao diện được đọc lại từ đĩa; khởi động lại nhẹ để chắc chắn không có bản cache trong tiến trình.
docker restart maika-saas-engine >/dev/null
ok=0
for i in $(seq 1 30); do
  if curl -sf -m 5 http://127.0.0.1:4105/healthz >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
served=$(curl -sf -m 15 http://127.0.0.1:4105/ | grep -c "closeSuperAdminHeaderMenu(); openChangePasswordModal();" || true)
if [ "$ok" != 1 ] || [ "${served:-0}" -lt 1 ]; then
  echo "KIỂM TRA THẤT BẠI (khỏe=$ok, nút xuất hiện trong trang=$served) — khôi phục bản sao lưu"
  cp -p "${F}.bak_pre_pwbtn_${TS}" "$F"
  docker restart maika-saas-engine >/dev/null
  exit 1
fi
echo "OK: dịch vụ khỏe; nút Đổi Mật Khẩu của Super Admin có trong trang phục vụ (số vị trí: $served)"
exit 0
