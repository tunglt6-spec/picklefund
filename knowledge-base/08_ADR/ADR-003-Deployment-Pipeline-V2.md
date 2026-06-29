# ADR-003: Deployment Pipeline V2

**Ngày:** 2026-06  
**Trạng thái:** ✅ Accepted

---

## Bối cảnh

PickleFund V1 dùng pipeline đơn giản: `git pull origin main` + `docker compose up`. Gặp nhiều vấn đề:

1. `git pull` fail khi VPS có local changes
2. Không có backup trước deploy
3. Không có health check sau deploy
4. Không có rollback khi deploy fail
5. Không thông báo khi deploy thành công/thất bại

---

## Quyết định

**Triển khai Pipeline V2 với các bước:**

1. `git fetch + git reset --hard origin/main` thay `git pull`
2. `git clean -fd` với exclusion: `.env`, `ssl/`, `*.sql`
3. Load `.env` → `pg_dump` backup trước deploy
4. Kiểm tra backup không rỗng (abort nếu fail)
5. `docker compose build --no-cache` → `down` → `up -d`
6. Sleep 30 giây
7. Health check: `api.picklefund.uk/health` + `app.picklefund.uk`
8. Nếu OK → Telegram notify ✅
9. Nếu fail → auto rollback về `PREVIOUS_COMMIT` → rebuild → health check lần 2 → notify 🔄/🚨

---

## Lý do từng quyết định

**git reset --hard thay git pull:**  
`git pull` fail khi VPS có local changes. `git reset --hard` luôn thành công, đảm bảo VPS chính xác với main.

**Source .env trước pg_dump:**  
`${POSTGRES_USER:-picklefund}` hardcoded fallback không an toàn khi password thật khác. `set -a; source .env; set +a` load đúng credentials production.

**Telegram printf pattern:**  
YAML block scalar không cho phép literal newlines → `printf '...\n...'` là giải pháp chuẩn.

**`env_file: required: false`:**  
Docker Compose V2 — cho phép CI chạy `docker compose config` mà không cần `.env` thật.

**`command_timeout: 30m`:**  
Docker build có thể mất 10-15 phút. Default 5 phút của appleboy/ssh-action không đủ.

---

## Hậu quả

**Tích cực:**
- Deploy an toàn — có backup + health check + rollback
- Không bị block bởi VPS local changes
- Team nhận thông báo realtime qua Telegram

**Tiêu cực:**
- Deploy lâu hơn (~5-10 phút thay vì ~2 phút) do backup + health check wait
- Cần cấu hình thêm GitHub Secrets

---

## Bảo vệ file production

```bash
git clean -fd \
  -e .env \
  -e .env.production \
  -e "*.sql" \
  -e "backup_*.sql" \
  -e "ssl/"
```

Không bao giờ xóa: secrets, backup SQL, SSL certificates.
