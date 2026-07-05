# PickleFund — Production Config & Secrets Hardening Checklist (EPIC13)

Trạng thái vận hành production tại thời điểm chốt EPIC13 (2026-07-05). KHÔNG in giá trị secret.

## 1. Env validation (fail-fast)
- Backend **fail-fast lúc boot** nếu thiếu `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
  (`common/env-validation.ts` + `main.ts` → `process.exit(1)`, chỉ in TÊN key). ✅
- `jwt.strategy` dùng `getOrThrow('JWT_SECRET')` (fail-fast thêm 1 lớp). ✅
- AI harness: `AIConfigService.validateConfig` fail-fast khi provider bật thiếu key. ✅

## 2. Secrets — nơi lưu & không commit
- Server: `/opt/picklefund/.env` (gitignored, không track). Chứa DB/JWT/SMTP/Telegram/AI keys.
- Repo chỉ commit `*.env.example` (placeholder `CHANGE_ME`). `.env`, `.env.production` gitignored. ✅
- Script kiểm: `bash ops/security/check-repo-secret-hygiene.sh` — hiện RISK=2 **lành tính**
  (Login.tsx demo gated+DCE khỏi prod bundle; 1 placeholder doc). ✅
- Biến bắt buộc production: xem `.env.example` (DB, REDIS, JWT_SECRET/REFRESH + expiry,
  ALLOWED_ORIGINS, APP_URL/API_URL, SMTP_*, TELEGRAM_BOT_TOKEN, HERMES_SCHEDULER_ENABLED, AI providers).

## 3. ⚠️ Repo history & visibility (khuyến nghị — CẦN DUYỆT)
- `.env.production` từng bị commit trên **repo PUBLIC** → JWT secret cũ còn trong git history.
  **Đã rotate** (P0-2B, commit rotate trên VPS) nên giá trị cũ vô hiệu, nhưng history vẫn lộ.
- **Khuyến nghị**: (a) chuyển repo **PRIVATE** (nhanh nhất, chặn đọc history), và/hoặc
  (b) purge history bằng `git-filter-repo`/BFG. **Chưa thực hiện** (thay đổi lớn, cần duyệt) → transaction riêng.

## 4. Backup policy
- CI/CD (`.github/workflows/deploy.yml`) **pg_dump trước mỗi deploy** → `/opt/picklefund/backups/`,
  abort nếu backup rỗng. ✅
- Backup thủ công trước thao tác nhạy cảm (đã dùng ở P0-2B: `picklefund_pre_rotation_*.sql`). ✅
- `.env` được backup trước rotate (`ops/security/rotate-jwt-secrets.sh` → `backups/env_*.bak` chmod 600). ✅
- **Cần bổ sung** (khuyến nghị): retention/offsite cho `backups/` (env `BACKUP_RETENTION_DAYS=30` có trong example nhưng cần cron dọn/offsite). ⚠️

## 5. Monitoring / health check
- `GET https://api.picklefund.uk/health` → 200. ✅ (deploy.yml health-check API + frontend, auto-rollback nếu fail).
- **Cần bổ sung** (khuyến nghị): uptime monitor ngoài (cron/UptimeRobot) + alert khi /health fail. ⚠️

## 6. CORS / origin
- Allowlist qua `ALLOWED_ORIGINS` (không wildcard), fallback localhost chỉ khi env trống. ✅
- Verified: origin lạ → KHÔNG có `Access-Control-Allow-Origin`; `app.picklefund.uk` → ACAO đúng. ✅
- `credentials: true` an toàn (origin whitelist). ✅

## 7. Scheduler safety (Hermes)
- `HERMES_SCHEDULER_ENABLED` mặc định **false** (không tự chạy) — production hiện `enabled:false`. ✅
- Bật chỉ sau khi rà rule enabled + scheduleType; idempotency theo kỳ chặn dispatch trùng. ✅ (doc `.env.example`).

## 8. SMTP / Telegram safety
- SMTP: EMAIL adapter chỉ READY khi SMTP_* cấu hình; credential không log/không UI. ✅
- Telegram: Notification Runtime giữ **DRY_RUN** (chưa gửi thật); `TELEGRAM_BOT_TOKEN` chỉ server-side, không vào frontend bundle. ✅

## 9. GitHub Actions secrets (review)
Cần có (KHÔNG in giá trị): `VPS_HOST`, `VPS_USER`, `VPS_PASSWORD`, `VPS_PORT?`, `TELEGRAM_BOT_TOKEN?`, `TELEGRAM_CHAT_ID?`.
- Deploy dùng SSH password auth. **Khuyến nghị**: chuyển sang SSH key + rotate VPS_PASSWORD định kỳ. ⚠️

## 10. Deployment checklist (mỗi release)
1. `git status` sạch; Codex audit PASS; commit message rõ.
2. Push `main` → CI/CD: test → backup DB → build → deploy → health → (auto-rollback nếu fail).
3. Migration additive (prisma migrate deploy tự chạy trong container CMD).
4. Verify: `/health` 200, endpoint mới ≠ 404, bundle mới (hash đổi), demo login (giai đoạn dev) / khoá demo (khi thương mại).
5. Rollback: `cp backups/env_<ts>.bak .env && docker compose up -d` hoặc restore DB backup.

## 11. Frontend / secrets in bundle
- Bundle production **0 credential** (demo gated sau `VITE_SHOW_DEMO_ACCOUNTS`, DCE). ✅
- Không có API key/secret nào trong frontend env (chỉ `VITE_API_URL` public). ✅

## Tổng kết trạng thái
| Hạng mục | Trạng thái |
|---|---|
| Env fail-fast | ✅ |
| Secrets không commit | ✅ |
| CORS | ✅ |
| Backup trước deploy | ✅ |
| Health check + auto-rollback | ✅ |
| Scheduler/SMTP/Telegram safe | ✅ |
| Repo private/history purge | ⚠️ khuyến nghị (chưa làm) |
| Backup retention/offsite | ⚠️ khuyến nghị |
| Uptime monitor ngoài | ⚠️ khuyến nghị |
| SSH key thay password | ⚠️ khuyến nghị |
