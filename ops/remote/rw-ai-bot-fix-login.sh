#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw). Vá lỗ hổng đăng nhập của AI-BOT (/opt/ai-bot-saas/main.py):
#   1. Gỡ 2 nhánh "mật khẩu mặc định" trong login() (chấp nhận mật khẩu viết cứng và TỰ GHI ĐÈ băm mật khẩu).
#   2. Seed người dùng không còn dùng mật khẩu cố định: lấy từ AIBOT_BOOTSTRAP_PASSWORD hoặc sinh ngẫu nhiên.
#   3. Tài khoản nào đang có băm trùng một mật khẩu mặc định bị đổi sang mật khẩu tạm NGẪU NHIÊN, ghi vào
#      /root/aibot-temp-passwords.txt (chmod 600) — KHÔNG in ra log (log Actions của repo công khai là công khai).
# An toàn: sao lưu main.py + DB trước; kiểm tra cú pháp; khởi động lại; kiểm tra sức khỏe; tự khôi phục main.py nếu lỗi.
# Danh sách mật khẩu mặc định được đọc từ chính main.py lúc chạy — KHÔNG có trong script này.
# Chạy lại an toàn (idempotent). Cách quay lại: khôi phục main.py từ /opt/ai-bot-saas/main.py.bak_pre_authfix_<thời điểm>
# rồi `docker restart maika-saas-engine`; DB có bản sao trong /opt/ai-bot-saas/data/backups/.
set -euo pipefail
AB=/opt/ai-bot-saas
TS=$(date +%Y%m%d_%H%M%S)
cd "$AB"
[ -f main.py ] || { echo "Không thấy $AB/main.py"; exit 1; }

echo "== 1. Sao lưu =="
cp -p main.py "main.py.bak_pre_authfix_${TS}"
mkdir -p data/backups
docker exec -i maika-saas-engine python - "$TS" <<'PY'
import sqlite3, sys
ts = sys.argv[1]
src = sqlite3.connect("/app/data/saas_bots.sqlite")
dst = sqlite3.connect(f"/app/data/backups/saas_bots_pre_authfix_{ts}.sqlite")
src.backup(dst); dst.close(); src.close()
print("đã sao lưu DB:", f"saas_bots_pre_authfix_{ts}.sqlite")
PY
echo "đã sao lưu main.py: main.py.bak_pre_authfix_${TS}"

echo "== 2. Vá main.py và đổi mật khẩu các tài khoản dùng mật khẩu mặc định =="
python3 - "$AB" <<'PY'
import ast, hashlib, os, re, secrets, sqlite3, sys
ab = sys.argv[1]
path = os.path.join(ab, "main.py")
src = open(path, encoding="utf-8").read()

# --- a) tập mật khẩu mặc định, đọc từ chính main.py (không lưu literal trong script) ---
weak = set()
branch_re = re.compile(
    r'\n        elif target_u == "([^"]+)" and raw_p in \(([^)]*)\):\n'
    r'            valid_login = True\n'
    r'            c\.execute\([^\n]*\)\n'
    r'            conn\.commit\(\)')
branches = list(branch_re.finditer(src))
priv_users = set()
for m in branches:
    priv_users.add(m.group(1))
    for s in ast.literal_eval("(" + m.group(2) + ",)"):
        weak.add(s)
seed_re = re.compile(r'hash_pw\("([^"]+)"\)')
seeds = seed_re.findall(src)
weak.update(seeds)
print(f"nhánh mật khẩu mặc định tìm thấy: {len(branches)}; seed cố định tìm thấy: {len(seeds)}")

# --- b) vá mã ---
new = src
if branches:
    new = branch_re.sub("", new)
    assert len(branches) == 2, "kỳ vọng đúng 2 nhánh mật khẩu mặc định, thực tế %d — dừng, không sửa" % len(branches)
if seeds:
    new = seed_re.sub(
        'hash_pw(os.environ.get("AIBOT_BOOTSTRAP_PASSWORD") or __import__("secrets").token_urlsafe(18))', new)
ast.parse(new)  # lỗi cú pháp -> dừng trước khi ghi
if new != src:
    tmp = path + ".new"
    open(tmp, "w", encoding="utf-8").write(new)
    os.replace(tmp, path)
    print("đã ghi main.py (đã kiểm tra cú pháp)")
else:
    print("main.py đã được vá trước đó — bỏ qua bước vá mã")

# --- c) đổi mật khẩu tài khoản đang dùng mật khẩu mặc định ---
weak_hashes = {hashlib.sha256(w.encode()).hexdigest() for w in weak}
rotated = []
other_weak = []
if weak_hashes:
    db = sqlite3.connect(os.path.join(ab, "data", "saas_bots.sqlite"), timeout=30)
    rows = db.execute("select id, username, password_hash from users").fetchall()
    old_umask = os.umask(0o077)
    try:
        lines = []
        for uid, uname, h in rows:
            if h in weak_hashes and uname not in priv_users:
                other_weak.append(uname)   # khách khác: chỉ báo, không tự đổi (tránh khóa nhầm khách hàng)
            elif h in weak_hashes:
                pw = secrets.token_urlsafe(12)
                db.execute("update users set password_hash=? where id=?", (hashlib.sha256(pw.encode()).hexdigest(), uid))
                lines.append(f"{uname}: {pw}")
                rotated.append(uname)
        db.commit()
        if lines:
            with open("/root/aibot-temp-passwords.txt", "a", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")
            os.chmod("/root/aibot-temp-passwords.txt", 0o600)
    finally:
        os.umask(old_umask)
        db.close()
print("tài khoản đặc quyền đã đổi sang mật khẩu tạm ngẫu nhiên:", rotated if rotated else "không có")
print("tài khoản KHÁC đang dùng mật khẩu nằm trong danh sách mặc định (cần báo khách đổi, script không tự đổi):", other_weak if other_weak else "không có")
# danh sách để kiểm tra sau khi khởi động lại (chỉ lưu tạm ở /tmp, mode 600)
if weak:
    fd = os.open("/tmp/.aibot-weak-check", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    import json
    with os.fdopen(fd, "w") as f:
        json.dump({"users": sorted(priv_users), "weak": sorted(weak)}, f)
PY

echo "== 3. Khởi động lại và kiểm tra =="
docker restart maika-saas-engine >/dev/null
ok=0
for i in $(seq 1 30); do
  if curl -sf -m 5 http://127.0.0.1:4105/healthz >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ "$ok" != 1 ]; then
  echo "KHÔNG khởi động được sau khi vá — khôi phục main.py"
  cp -p "main.py.bak_pre_authfix_${TS}" main.py
  docker restart maika-saas-engine >/dev/null
  rm -f /tmp/.aibot-weak-check
  exit 1
fi
echo "dịch vụ khỏe sau khi vá"

echo "== 4. Kiểm tra: mọi mật khẩu mặc định cũ bị từ chối với các tài khoản đặc quyền =="
python3 - <<'PY'
import json, os, urllib.request, urllib.error, sqlite3
p = "/tmp/.aibot-weak-check"
if not os.path.exists(p):
    print("không có danh sách mật khẩu mặc định để kiểm tra (đã vá từ trước)"); raise SystemExit(0)
d = json.load(open(p, encoding="utf-8"))
weak, users = d["weak"], d["users"]
accepted = 0; tried = 0
for u in users:
    for w in weak:
        tried += 1
        req = urllib.request.Request("http://127.0.0.1:4105/api/auth/login",
              data=json.dumps({"username": u, "password": w}).encode(), headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=10); accepted += 1
        except urllib.error.HTTPError as e:
            if e.code != 401: print("mã bất thường", e.code)
print(f"đã thử {tried} cặp (tài khoản đặc quyền × mật khẩu mặc định cũ); được chấp nhận: {accepted}")
os.remove(p)
raise SystemExit(1 if accepted else 0)
PY
echo "== xong =="
if [ -f /root/aibot-temp-passwords.txt ]; then
  echo "MẬT KHẨU TẠM nằm ở /root/aibot-temp-passwords.txt (chmod 600). Đăng nhập, đổi mật khẩu ngay trong giao diện, rồi chạy: shred -u /root/aibot-temp-passwords.txt"
fi
exit 0
