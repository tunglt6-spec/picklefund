# P0-2 — Production Secret Rotation & Demo User Lockdown — RUNBOOK

> Tài liệu vận hành cho hai transaction thực thi: **P0-2B** (rotate JWT) và
> **P0-2C** (khoá demo user). Runbook + script được tạo trong **P0-2A** và
> **không thực hiện thay đổi production nào**. Không paste secret vào bất kỳ đâu.

## Overview

Hai rủi ro P0 xác nhận từ audit trước:

1. `JWT_SECRET` và `JWT_REFRESH_SECRET` từng nằm trong `.env.production` được commit
   lên **repo public** → còn trong git history → **coi như đã lộ**, phải rotate.
2. Tài khoản demo/seed (`admin`, `superadmin`, `treasurer`, `member`) vẫn **login
   được qua API** dù UI production đã ẩn credential (P0-1).

Trạng thái sau P0-1: `.env.production` đã untracked + gitignore; frontend bundle
production không còn chuỗi credential (DCE).

## Prerequisites

- Quyền SSH vào VPS `/opt/picklefund` (chỉ P0-2B).
- `docker`, `openssl`, `curl`, `python3` trên host tương ứng.
- Một tài khoản **admin THẬT** (không phải demo) — xem Gate A.

## Decision checklist (đọc trước khi chạy)

- [ ] Đã có admin thật và đăng nhập được? (Gate A)
- [ ] Đã backup DB + `.env`? (Gate B)
- [ ] Chấp nhận mọi phiên đăng nhập bị vô hiệu sau rotate? (Gate C)
- [ ] Chắc chắn không khoá nhầm tài khoản chủ? (Gate D)
- [ ] Có kế hoạch verify Web/Desktop/Mobile? (Gate E)

## Manual approval gates

| Gate | Nội dung | Ai xác nhận |
|---|---|---|
| **A** | Tồn tại ≥1 admin THẬT (không demo) và login OK | User |
| **B** | DB backup + env backup đã tạo, path ghi lại | User |
| **C** | Đồng ý thực thi rotate JWT (logout toàn hệ thống) | User |
| **D** | Đồng ý khoá demo user (đã có admin thật thay thế) | User |
| **E** | Đã verify Web/Desktop/Mobile sau thay đổi | User |

---

## P0-2C bước 0 — TẠO ADMIN THẬT (Gate A) — làm TRƯỚC mọi thứ

> ⚠️ Nếu khoá hết demo mà chưa có admin thật, bạn tự khoá mình khỏi hệ thống.

```bash
# Login superadmin demo LẦN CUỐI để lấy token tạo admin thật:
TOKEN=$(curl -s -X POST https://api.picklefund.uk/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin","password":"super123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

# Tạo admin thật — TỰ ĐẶT username/password mạnh, KHÔNG chia sẻ:
curl -s -X POST https://api.picklefund.uk/api/users \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"<TÊN_MỚI>","email":"<EMAIL>","password":"<MẬT_KHẨU_MẠNH>","role":"SUPER_ADMIN"}'

# XÁC NHẬN login bằng tài khoản mới TRƯỚC khi đi tiếp (Gate A ✅):
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.picklefund.uk/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"<TÊN_MỚI>","password":"<MẬT_KHẨU_MẠNH>"}'
# → phải 200 hoặc 201
```

---

## P0-2B — Rotate JWT secrets (trên VPS)

Script: `ops/security/rotate-jwt-secrets.sh`

```bash
# 1. DRY_RUN review (không ghi):
cd /opt/picklefund
DRY_RUN=1 bash ops/security/rotate-jwt-secrets.sh

# 2. Thực thi (Gate B backup + Gate C approval) — script tự backup .env,
#    sinh secret bằng openssl, KHÔNG in giá trị, restart backend, health check:
bash ops/security/rotate-jwt-secrets.sh
```

Script làm: verify `.env` + 2 key JWT → backup `backups/env_<ts>.bak` (chmod 600)
→ `openssl rand -base64 64` × 2 → thay in-place chỉ 2 dòng JWT → `docker compose
up -d backend` → health retry. Thất bại ở bất kỳ đâu → exit non-zero + in lệnh rollback.

**Điều KHÔNG được làm:** không echo secret, không commit, không paste vào chat.

---

## P0-2C — Khoá demo users (qua API)

Script: `ops/security/lock-demo-users.sh`

```bash
# ADMIN_TOKEN = token của admin THẬT (Gate A), KHÔNG phải demo:
ADMIN_TOKEN=$(curl -s -X POST https://api.picklefund.uk/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<TÊN_MỚI>","password":"<MẬT_KHẨU_MẠNH>"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

# 1. DRY_RUN — liệt kê ứng viên demo, không sửa:
DRY_RUN=1 ADMIN_TOKEN="$ADMIN_TOKEN" bash ops/security/lock-demo-users.sh

# 2. Thực thi (Gate D):
CONFIRM_LOCK_DEMO_USERS=YES ADMIN_TOKEN="$ADMIN_TOKEN" bash ops/security/lock-demo-users.sh
```

Script làm: `GET /users` → lọc demo → với mỗi user `PUT /users/:id
{password: <random không lưu>, isActive:false}` → verify 4 demo login đều 401/403.
`isActive=false` bị chặn ở `auth.service` + `jwt.strategy` → token cũ cũng vô hiệu.

**KHÔNG xoá user** (chỉ disable + rotate password). KHÔNG in mật khẩu/token.

---

## Verification (Gate E)

Script: `ops/security/verify-production-security.sh` (read-only, chạy từ máy nào cũng được)

```bash
bash ops/security/verify-production-security.sh
# hoặc kèm authenticated check:
REAL_ADMIN_TOKEN="$ADMIN_TOKEN" bash ops/security/verify-production-security.sh
```

Kiểm: `/health` 200 · 4 demo login 401/403 · 9 Epic endpoint ≠ 404 · bundle sạch
credential + có routes · (tuỳ chọn) admin thật gọi API 200.

## Repo hygiene

Script: `ops/security/check-repo-secret-hygiene.sh` (đã chạy trong P0-2A, xem report).

```bash
bash ops/security/check-repo-secret-hygiene.sh
```

## Rollback

| Sự cố | Khôi phục |
|---|---|
| Backend fail sau rotate | `cp backups/env_<ts>.bak /opt/picklefund/.env && docker compose up -d backend` |
| Lockdown gây kẹt (mất admin) | restore DB: `docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < backups/picklefund_pre_*.sql` |
| — | Env backup path + DB backup path phải ghi lại khi chạy |

**Impact dự kiến:** sau rotate JWT, **toàn bộ token hiện tại vô hiệu** → mọi người
login lại (bình thường). Đây không phải lỗi.

## Web / Desktop / Mobile verification matrix

| Platform | Cách verify | Trạng thái mặc định |
|---|---|---|
| Web | HTTP + bundle (verify script) | PASS nếu script PASS |
| Desktop | Launch Electron thủ công, kiểm login | NOT VERIFIED trừ khi launch |
| Mobile responsive | Viewport 390px thủ công | NOT VERIFIED trừ khi chạy |
| Real device | Thiết bị thật | NOT VERIFIED trừ khi có thiết bị |

## KHUYẾN NGHỊ tiếp theo (transaction riêng, cần duyệt)

- Chuyển repo sang **private** (chặn đọc git history chứa secret cũ) — nhanh nhất.
- Hoặc purge history bằng `git-filter-repo`/BFG — KHÔNG làm trong P0-2*.
