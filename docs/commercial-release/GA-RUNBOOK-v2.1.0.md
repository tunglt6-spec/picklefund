# PickleFund v2.1.0 — GA Runbook & Go-Live Checklist

**Phiên bản:** 2.1.0 · **Ngày:** 2026-07-06 · **Trạng thái:** chuẩn bị GA

Tài liệu này bổ sung phần **vận hành mới của v2.1** (so với V2.0 handbook), kèm **ma
trận verify cuối** và **checklist go-live**. Không lặp lại nội dung đã có:

- Tính năng & giới hạn: [`RELEASE-NOTES.md`](../../RELEASE-NOTES.md)
- Hardening secrets/env/backup/CORS: [`ops/PRODUCTION-CHECKLIST.md`](../../ops/PRODUCTION-CHECKLIST.md)
- Hướng dẫn admin/user/cài đặt: [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) · [`USER_GUIDE.md`](USER_GUIDE.md) · [`INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md)
- Rotate/lock scripts: [`ops/security/`](../../ops/security/)

> ⚠️ **Reality note:** các ô "verified" bên dưới phản ánh kiểm chứng thực tế trong quá
> trình phát hành. Nơi chưa kiểm từng nền được ghi rõ là "chung bundle" hoặc nằm ở
> "giới hạn đã biết" — KHÔNG suy diễn là đã verify đầy đủ.

---

## 1. Runbook vận hành v2.1 (delta so với V2.0)

### 1.1. Email thông báo (SMTP + DKIM/SPF)
- Backend gửi email qua SMTP, cấu hình bằng env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS`, `SMTP_FROM` (chỉ là **tên biến**, giá trị nằm ở `/opt/picklefund/.env`,
  KHÔNG commit).
- **Dùng dịch vụ email giao dịch chuyên dụng** (không dùng SMTP tài khoản email cá nhân
  cho production — dễ 535 BadCredentials/bị chặn). Cần **App Password/API key** đúng độ dài
  của nhà cung cấp, không dùng mật khẩu đăng nhập thường.
- **Xác thực domain (DKIM + SPF)** cho domain gửi (vd `picklefund.uk`) trong dashboard nhà
  cung cấp → thêm bản ghi DNS họ cấp. `SMTP_FROM` **phải dùng domain đã xác thực**, nếu
  không email hiển thị địa chỉ mặc định của nhà cung cấp và dễ vào Spam.
- **Email "mang danh" CLB:** tên hiển thị = tên CLB, `Reply-To` = email admin CLB. Địa chỉ
  gửi kỹ thuật (envelope/From address) vẫn là domain đã xác thực (giới hạn: chưa per-club
  SMTP — xem RELEASE-NOTES).
- **Người nhận:** email Liên hệ của thành viên (`Member.email`), fallback email tài khoản.
  Địa chỉ đuôi `.local` bị chặn (placeholder).
- **Sau khi sửa `.env`:** `docker compose up -d --force-recreate` (chỉ `up -d` KHÔNG nạp
  lại `env_file`), chờ backend khởi động lại (kiểm `GET /health` = 200).

### 1.2. Onboarding CLB kèm tài khoản admin
- Tạo CLB **bắt buộc kèm** `adminUsername` + `adminEmail` (email cá nhân thật, **chặn đuôi
  `.local`**, `@IsEmail`) + `adminPassword` (≥ 6). Hệ thống tạo Club + User `CLUB_ADMIN`
  trong cùng transaction (mật khẩu băm Argon2, `mustChangePassword = true`).
- Email admin CLB này về sau dùng làm `Reply-To` thông báo gửi cho thành viên → **phải là
  email thật, kiểm được**.

### 1.3. Đúng login theo vai trò (multi-tenant)
- **Mô hình:** 1 tài khoản = 1 email = 1 CLB (unique).
- `SUPER_ADMIN` quản **nền tảng** (CLB, người dùng, audit) — KHÔNG quản nội bộ tài chính
  từng CLB.
- Mỗi CLB đăng nhập bằng **admin CLB riêng** (vd The Ping = `admin_ping`, B32 = `admin_b32`,
  nền tảng = `TungLT6`). Không dùng chung một tài khoản cho nhiều CLB.

### 1.4. Thông báo AI (Mít Đặc executor)
- Luồng: Hermes rule (trigger DEBT_ESCALATION / EVENT_REMINDER / REPORT_DISPATCH) đánh giá
  trên dữ liệu thật → tạo **AiAction** trong Action Center → admin **duyệt** → **thực thi**
  qua Mít Đặc → fan-out thông báo (IN_APP + EMAIL nếu rule bật kênh EMAIL).
- Kênh EMAIL chỉ gửi khi rule cấu hình kênh EMAIL **và** SMTP đã cấu hình hợp lệ.
- Idempotent theo `(clubId, channel, idempotencyKey)` → duyệt/thực thi lại không gửi trùng.

### 1.5. Cập nhật client sau deploy (PWA cache)
- Web & Android PWA: nhận bundle mới gần như ngay (service worker `autoUpdate`).
- **iOS PWA cache "lười":** sau deploy nếu iOS vẫn hiện bản cũ → **đóng hẳn app** (vuốt khỏi
  app switcher) + mở lại (đôi khi 2 lần); nếu vẫn cũ → gỡ + cài lại icon PWA. **Không phải
  lỗi code.** Khi user báo "một nền mobile OK, nền kia như cũ" → nghi cache PWA trước.

---

## 2. Ma trận verify cuối (v2.1.0)

Nền tảng dùng **chung backend + web bundle**; Desktop = Electron tải web app, Mobile = PWA
cùng bundle. "Chung bundle" = cùng code path với Web (không kiểm lại từng nền).

> **Quy ước cột:** ✅ = xác minh ở mức **code / web** (chứng minh được từ repo). Xác nhận
> trên **prod thật** và **thiết bị thật** (Android/iOS) là bước ở **checklist §3** — không
> khẳng định trong ma trận này khi chưa lưu artifact.

| Tính năng | Backend/API | Web | Desktop | Mobile | Ghi chú |
|-----------|:-----------:|:---:|:-------:|:------:|---------|
| Đăng nhập đúng vai trò (super/club admin) | ✅ | ✅ | chung bundle | chung bundle | demo khoá → 401 (xác nhận prod ở §3.1) |
| Fix crash 502 (audit resilient) | ✅ fix | — | — | — | audit trả null nếu thiếu userId + try/catch; kiểm burst ghi nối tiếp ở §3.2 |
| Tạo CLB kèm admin email (chặn `.local`) | ✅ | ✅ | chung bundle | chung bundle | |
| AI Rating card (0–100, TB CLB) | ✅ | ✅ | chung bundle | chung bundle | compute-on-read; hiện số khi CLB có dữ liệu |
| AI Manager đề xuất → điều hướng | ✅ | ✅ | chung bundle | chung bundle | read-only nav |
| Executor Mít Đặc (DEBT/EVENT/REPORT) | ✅ | ✅ | chung bundle | chung bundle | tạo thông báo IN_APP thật |
| Email tới member contact (DKIM) | ✅ code | — | — | — | gửi thử 1 email vào Inbox = checklist §3.1 |
| Version/build/env ở SuperSettings | ✅ | ✅ | chung bundle | chung bundle | inject lúc build; env theo build mode |
| Đổi mật khẩu (super + club admin) | ✅ | ✅ | chung bundle | chung bundle | |
| FAB không bị Lisa đè (mobile) | — | n/a | n/a | ✅ layout fix | xếp trên nút Lisa (mobile-only); xác minh thiết bị ở §3.2 |
| Branding (app chrome + PDF header/footer) | ✅ | ✅ | chung bundle | chung bundle | Excel = bảng thuần (giới hạn) |
| Member Portal self-scope (read-only) | ✅ | ✅ | chung bundle | chung bundle | MemberScopeGuard |

**Giới hạn đã biết (không phải lỗi):** xem RELEASE-NOTES — Excel chưa white-label; màu PDF
theo theme mặc định; per-club SMTP chưa có; AI Rating chỉ TB CLB; TELEGRAM DRY_RUN; desktop
auto-update/ký số chưa bật.

---

## 3. Checklist Go-Live (GA)

### 3.1. Trước khi mở (pre-launch)
- [ ] Env production đủ & fail-fast pass (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
      `ALLOWED_ORIGINS`, `APP_URL`/`API_URL`, `SMTP_*`) — xem `ops/PRODUCTION-CHECKLIST.md`.
- [ ] SMTP: domain đã xác thực DKIM/SPF, `SMTP_FROM` dùng domain đó, gửi thử 1 email vào Inbox.
- [ ] JWT secret đã rotate (`ops/security/rotate-jwt-secrets.sh`), giá trị cũ vô hiệu.
- [ ] Tài khoản demo đã khoá (`admin`/`superadmin`/`treasurer`/`member` → login 401);
      SUPER_ADMIN + admin CLB thật login 200; **mật khẩu khởi tạo đã được đổi**.
- [ ] Backup: `pg_dump` trước deploy hoạt động (deploy.yml), có backup thủ công gần nhất.
- [ ] `GET https://api.picklefund.uk/health` = 200; auto-rollback deploy.yml còn hiệu lực.
- [ ] CORS: origin lạ không có `Access-Control-Allow-Origin`; domain app trả ACAO đúng.

### 3.2. Khi mở (launch)
- [ ] Deploy commit GA lên main → CI/CD xanh (build + health + không rollback).
- [ ] Smoke prod: login super admin + 1 admin CLB thật (200); tạo 1 CLB test kèm admin
      (rồi xoá/deactivate); xem dashboard + báo cáo 1 CLB.
- [ ] Kiểm version footer prod = 2.1.0, env = production.
- [ ] Kiểm mobile (Android + iOS): mở PWA bản mới (đóng/mở lại nếu iOS còn cache).

### 3.3. Sau khi mở (post-launch)
- [ ] Theo dõi `GET /health` (khuyến nghị uptime monitor ngoài + alert — hiện CHƯA có).
- [ ] Theo dõi log backend cho `PrismaClientValidationError`/restart bất thường (bài học 502).
- [ ] Retention/offsite cho `backups/` (khuyến nghị — hiện CHƯA có cron dọn).
- [ ] Quyết định repo PUBLIC→PRIVATE hoặc purge git history (JWT cũ còn trong history — đã
      rotate nhưng history lộ; transaction riêng — xem `ops/PRODUCTION-CHECKLIST.md` mục 3).

---

## 4. Sự cố thường gặp & xử lý nhanh

| Triệu chứng | Nguyên nhân thường gặp | Xử lý |
|-------------|------------------------|-------|
| Email không tới / vào Spam | `SMTP_FROM` không phải domain đã DKIM; sai key SMTP | Dùng domain đã xác thực; kiểm key; gửi thử |
| Email báo BadCredentials (535) | Dùng mật khẩu thường thay vì App Password/API key | Tạo App Password/API key đúng nhà cung cấp |
| iOS PWA vẫn bản cũ sau deploy | Cache service worker iOS | Đóng hẳn app + mở lại; hoặc gỡ+cài lại PWA |
| 502 khi ghi nối tiếp | (đã fix v2.1) — nếu tái diễn: backend restart | Kiểm log `PrismaClientValidationError`, docker `RestartCount` |
| Không tạo được CLB | Email admin trùng/username trùng/đuôi `.local` | Đổi email/username hợp lệ, email thật |
| Member không nhận thông báo | Rule không bật kênh; member thiếu `Member.email`; action chưa duyệt/thực thi | Bật kênh trong rule; nhập email Liên hệ; duyệt+thực thi ở Action Center |

---

_Tài liệu vận hành nội bộ. Không chứa giá trị secret. Cập nhật khi có thay đổi vận hành._
