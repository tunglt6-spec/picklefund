# PickleFund v2.1 — Commercial Release Candidate 1 (RC1) Report

Ngày: 2026-07-05 · HEAD: `d2cf75a7` · Validation-only (không sửa code).

## Kết luận: ✅ RC1 PASS — **KHÔNG có P0 mở**.

## 1. Build & Test
| Gate | Kết quả |
|---|---|
| Backend full tests | ✅ **84 suites / 774 tests PASS** |
| Backend build | ✅ PASS |
| Frontend build | ✅ PASS |
| Frontend lint | ✅ 0 errors (172 warnings) |
| Lint file thuộc masterplan (Epic10-13 + T1) | ✅ 0 errors |

## 2. Production API smoke & regression (admin, 200)
members, fund-periods, contributions, expenses, attendance, minigames, clubs/me,
clubs/me/branding, ai/actions/summary, workflows/{rules,runs,templates,runtime/status},
notification-runtime/{channels,jobs} → **15/15 = 200**. fund-period summary (nguồn PDF) = 200.

## 3. Role / tenant
MEMBER_VIEW: ai/actions, workflows/rules, notification-runtime/jobs, clubs/me/branding → **403**;
member/me → **200**. clubId lấy từ JWT. CORS: origin lạ không ACAO, app.picklefund.uk có ACAO.

## 4. Web / PWA
app 200 · bundle `index-C_bOvt1J.js` chứa routes AI Manager/Workflows + branding · sw.js 200 · manifest 200.

## 5. Perf sanity
health 0.44s · contributions/summary 0.51s · ai/actions/summary 0.40s · runtime/status 0.42s (qua Cloudflare — chấp nhận).

## 6. Security
Env fail-fast boot ✅ · repo hygiene RISK=2 lành tính (Login demo gated+DCE; 1 placeholder doc) · bundle 0 credential · không secret thật committed.

## 7. Web/Desktop/Mobile matrix
| Platform | Trạng thái |
|---|---|
| Web | ✅ PASS |
| Desktop | NOT VERIFIED (headless; packaging PASS ở EPIC12) |
| Mobile responsive | ✅ PASS (390px verified EPIC10B) |
| Real mobile device | NOT VERIFIED |

## 8. Phân loại findings

### P0 (blocker release) — **KHÔNG có** ✅

### P1 (phải đóng trước GA thương mại)
1. **Demo users còn active trên production** (admin/admin123… login 200) — HOÃN có chủ đích tới **P0-2C** (chạy ngay trước EPIC15). Bắt buộc đóng trước GA.
2. **Repo public + JWT cũ trong git history** (đã rotate → vô hại) — khuyến nghị chuyển **private** / purge history trước GA.

### P2 (polish, không chặn RC1)
1. **Nợ lint backend (toàn bộ)**: `npx eslint src` = **438 errors / 57 files** (+147 warnings) — nợ kỹ thuật **pre-existing** rải khắp codebase (chủ yếu `no-unsafe-*`/`no-floating-promises` do `any`/`user: any` cũ). KHÔNG phải regression: build + 774 tests + smoke đều PASS, và **các file thuộc masterplan (Epic10-13 + T1) = 0 errors**. (Ghi chú: con số "43/7" ở bản RC1 trước chỉ là lint SCOPED 6 thư mục epic — đã đính chính theo full-scan.)
2. Frontend **172 lint warnings** (0 errors); backend cũng có 147 warnings.
3. Bundle chính 2.8MB chưa code-split.
4. Backup retention/offsite, uptime monitor ngoài, CI/CD SSH key thay password (khuyến nghị EPIC13).
5. Deferred có chủ đích: PDF colors chưa branded, login page chưa per-club (10D), Desktop signing/auto-update, push notification.

## 9. Rollback plan
- Code: CI/CD auto-rollback về commit trước nếu health fail; thủ công `git reset --hard <prev> && docker compose up -d`.
- DB: restore `backups/*.sql` (pg_dump trước mỗi deploy).
- Env: `backups/env_*.bak`.
- Migration: additive; code cũ tương thích schema mới.

## 10. Khuyến nghị next
1. **P0-2C** (khoá demo + admin thật) — bắt buộc trước EPIC15.
2. (Tuỳ chọn) repo private/purge history.
3. **EPIC15** — Commercial Release (tag, release notes, docs).
P2 để lại backlog sau GA.
