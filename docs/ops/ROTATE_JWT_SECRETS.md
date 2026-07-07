# Kịch bản Rotate JWT Secrets (Production) — PickleFund

> Áp dụng khi cần thay `JWT_SECRET` và/hoặc `JWT_REFRESH_SECRET` production (ví dụ: secret từng lộ trong lịch sử git). **Claude KHÔNG tự chạy trên production** — tài liệu này để bạn (người có quyền VPS) thực thi thủ công.

---

## 0. TÁC ĐỘNG — ĐỌC TRƯỚC KHI LÀM

- Đổi `JWT_SECRET` → **mọi access token hiện tại bị vô hiệu ngay** (user đang đăng nhập bị 401 ở request kế tiếp).
- Đổi `JWT_REFRESH_SECRET` → **mọi refresh token bị vô hiệu** → user phải **đăng nhập lại**.
- ⇒ Toàn bộ người dùng bị đăng xuất. Đây là hành vi ĐÚNG và MONG MUỐN khi rotate sau rò rỉ.
- Nên làm trong **khung giờ ít người dùng** (maintenance window) và thông báo trước.
- KHÔNG mất dữ liệu (không đụng DB). Chỉ phiên đăng nhập bị reset.

**Ràng buộc kỹ thuật:** backend fail-fast nếu thiếu `JWT_SECRET`/`JWT_REFRESH_SECRET` (env-validation) → phải điền đủ trước khi khởi động lại. Backend đọc 2 biến này lúc boot (`auth.service`, `jwt.strategy` `getOrThrow`), nên **bắt buộc recreate container** để nhận giá trị mới (reload không đủ).

---

## 1. SSH vào VPS + vào thư mục repo

```bash
ssh <user>@<vps-host>
cd /opt/picklefund
```

## 2. Sao lưu file env hiện tại (bắt buộc — để rollback)

```bash
cp .env             .env.bak.$(date +%Y%m%d_%H%M%S)
cp .env.production  .env.production.bak.$(date +%Y%m%d_%H%M%S)   # nếu có
ls -la .env*        # xác nhận đã có bản .bak
```

## 3. Sinh 2 secret mới đủ mạnh (≥64 byte ngẫu nhiên)

```bash
NEW_JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
NEW_JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
# Kiểm tra khác nhau + không rỗng
echo "ACCESS len=${#NEW_JWT_SECRET}  REFRESH len=${#NEW_JWT_REFRESH_SECRET}"
```
> Hai secret PHẢI khác nhau. Không tái sử dụng secret cũ. Không đưa secret vào lịch sử shell dùng chung — cân nhắc `unset HISTFILE` nếu môi trường nhạy cảm.

## 4. Cập nhật giá trị trong file env

Container backend nạp env qua `env_file: .env` (xem `docker-compose.yml`). Deploy workflow còn `source .env.production` rồi `.env` khi build. ⇒ **Cập nhật ĐỒNG BỘ cả 2 file** (nếu VPS có `.env.production`) để tránh lệch.

Cách an toàn (thay đúng dòng, giữ nguyên phần còn lại). Chạy cho từng file tồn tại (`.env`, và `.env.production` nếu có):

```bash
update_env () {
  local f="$1"
  [ -f "$f" ] || { echo "skip $f (không tồn tại)"; return; }
  # Thay nếu key đã có; nếu chưa có thì thêm mới
  grep -q '^JWT_SECRET='          "$f" && sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|"                 "$f" || echo "JWT_SECRET=${NEW_JWT_SECRET}"                 >> "$f"
  grep -q '^JWT_REFRESH_SECRET='  "$f" && sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}|" "$f" || echo "JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}" >> "$f"
  echo "updated $f"
}
update_env .env
update_env .env.production
```

Kiểm tra (chỉ xem KEY, KHÔNG in giá trị ra màn hình dùng chung):
```bash
grep -c '^JWT_SECRET=\|^JWT_REFRESH_SECRET=' .env          # kỳ vọng: 2
grep -c '^JWT_SECRET=\|^JWT_REFRESH_SECRET=' .env.production 2>/dev/null
```

## 5. Khởi động lại backend để nạp secret mới

```bash
# Nạp env cho compose interpolation (giống deploy workflow)
set -a; [ -f .env.production ] && . ./.env.production; [ -f .env ] && . ./.env; set +a

# Recreate riêng backend (đủ, không cần rebuild image vì code không đổi)
docker compose up -d --force-recreate --no-deps backend

# Chờ backend khởi động
sleep 20
docker compose ps
```

## 6. Kiểm tra sau rotate

```bash
# Health API (kỳ vọng 200)
curl -s -o /dev/null -w "health: %{http_code}\n" https://api.picklefund.uk/health

# Backend không crash vì thiếu env
docker compose logs backend --tail=50 | grep -iE "listening|error|jwt" | tail

# Đăng nhập thử bằng 1 tài khoản thật trên https://app.picklefund.uk
#  → phải đăng nhập LẠI được (token cũ đã chết là đúng).
```

**Tiêu chí PASS:** health 200; log backend không lỗi thiếu JWT; đăng nhập mới thành công; token/phiên cũ bị 401 (đúng kỳ vọng).

## 7. Rollback (nếu backend không lên hoặc lỗi env)

```bash
cd /opt/picklefund
# Khôi phục bản .bak gần nhất
cp $(ls -t .env.bak.* | head -1) .env
[ -f .env.production ] && cp $(ls -t .env.production.bak.* | head -1) .env.production 2>/dev/null
set -a; [ -f .env.production ] && . ./.env.production; [ -f .env ] && . ./.env; set +a
docker compose up -d --force-recreate --no-deps backend
sleep 20 && curl -s -o /dev/null -w "health: %{http_code}\n" https://api.picklefund.uk/health
```
> Lưu ý: rollback về secret CŨ sẽ khôi phục phiên cũ — nhưng nếu lý do rotate là secret bị lộ thì secret cũ vẫn KHÔNG an toàn; chỉ rollback để khôi phục dịch vụ tạm thời rồi thử rotate lại cho đúng.

## 8. Dọn dẹp sau khi PASS

```bash
# Xóa các bản backup env chứa secret sau khi đã xác nhận ổn định vài giờ/ngày
# (giữ ít nhất 1 bản cho tới khi chắc chắn)
ls -t .env.bak.* .env.production.bak.* 2>/dev/null
# rm .env.bak.<timestamp_cũ>   # cân nhắc kỹ trước khi xóa
```

---

## Ghi chú

- **Không** commit `.env`/`.env.production` lên git (đã có `.gitignore` chặn). Rotate chỉ sửa file trên VPS.
- Nếu dùng nhiều instance backend / load balancer: recreate tất cả instance để đồng bộ secret.
- Sau rotate, cân nhắc **thu hồi** quyền truy cập lịch sử git chứa secret cũ (secret cũ vẫn nằm trong history 3 commit đã untrack — rotate làm secret đó vô dụng, nhưng nếu muốn xoá hẳn khỏi history cần `git filter-repo`/BFG + force-push, thao tác nặng, làm riêng có cân nhắc).
- Biến liên quan khác trong env (KHÔNG cần đổi khi rotate JWT): `DATABASE_URL`, `REDIS_PASSWORD`, `ALLOWED_ORIGINS`, `POSTGRES_*`. Giữ nguyên.
