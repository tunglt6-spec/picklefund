# PickleFund — Release Notes

## v2.1.0 — Bản thương mại (2026-07-06)

Nền tảng quản lý CLB thể thao (pickleball) đa CLB (multi-tenant): quỹ, thu chi,
điểm danh, minigame, báo cáo, thông báo và trợ lý AI. Bản v2.1.0 hoàn thiện lớp
AI/tự động hoá, thông báo qua email, onboarding CLB và các bản vá ổn định để sẵn
sàng vận hành thương mại.

Chạy trên **Web**, **Desktop** (Electron) và **Mobile** (PWA) — dùng chung một
backend + một bundle giao diện.

---

### ✨ Tính năng chính

#### 1. AI & Tự động hoá
- **Đội ngũ AI:** Maika (trí tuệ CLB, read-only), Lisa (trợ lý thành viên), Hermes
  (điều phối workflow), **Mít Đặc** (Operations Executor — thực thi hành động đã duyệt).
- **AI Action Center:** hàng đợi hành động AI + phê duyệt theo rủi ro (LOW/MEDIUM/HIGH/
  CRITICAL) + thực thi thủ công qua Mít Đặc (APPROVED → EXECUTING → EXECUTED/FAILED),
  idempotent, có nhật ký sự kiện.
- **Hermes Workflow Engine:** rule theo trigger (DEBT_ESCALATION / EVENT_REMINDER /
  REPORT_DISPATCH), đánh giá điều kiện trên **dữ liệu thật** của CLB (nợ quỹ / buổi tập
  sắp tới / kỳ đã chốt) → tạo AiAction qua Action Center (không thực thi trực tiếp).
- **Executor thật của Mít Đặc:** khi duyệt + thực thi, tạo **sản phẩm thật** —
  fan-out thông báo tới thành viên:
  - `DEBT_ESCALATION` → nhắc đóng quỹ tới thành viên **chưa đóng** kỳ đang mở.
  - `EVENT_REMINDER` → nhắc buổi tập sắp tới tới **toàn bộ** thành viên hoạt động.
  - `REPORT_DISPATCH` → báo kỳ quỹ đã chốt tới toàn bộ thành viên.
- **AI Rating (điểm hoạt động thành viên) 0–100:** tính từ điểm danh + đóng quỹ +
  tham gia minigame (compute-on-read), hiển thị trung bình toàn CLB ở màn Thành viên.
- **AI Manager:** bảng điều phối AI (read-only) + các đề xuất đọc dữ liệu có thể **bấm
  điều hướng** thẳng tới trang tương ứng.

#### 2. Thông báo (Notifications)
- **Đa kênh, opt-in theo rule:** IN_APP (trong app) + EMAIL. Kênh chọn qua cấu hình rule.
- **Email gửi tới email Liên hệ của thành viên** (`Member.email`, fallback email tài
  khoản); thành viên không cần tài khoản đăng nhập vẫn nhận được email nếu có email Liên hệ.
- **Email "mang danh" CLB:** tên hiển thị = tên CLB, Reply-To = email admin CLB.
- **Nền tảng gửi:** qua dịch vụ SMTP giao dịch, hỗ trợ xác thực domain (DKIM/SPF) để
  email vào Inbox; chặn địa chỉ placeholder `.local`.

#### 3. Onboarding & Quản trị CLB
- **Tạo CLB bắt buộc kèm tài khoản admin** có **email cá nhân thật** (chặn đuôi `.local`)
  — email này dùng làm địa chỉ gửi thông báo cho thành viên về sau. Tạo Club + tài khoản
  CLUB_ADMIN trong cùng một transaction (mật khẩu băm Argon2, buộc đổi ở lần đăng nhập đầu).
- **Phân quyền multi-tenant:** SUPER_ADMIN (quản nền tảng: CLB, người dùng, audit) tách
  bạch CLUB_ADMIN (vận hành 1 CLB). Mỗi CLB đăng nhập bằng admin CLB riêng.
- **Đổi mật khẩu** cho mọi vai trò (super admin: màn Cài Đặt Hệ Thống; admin CLB: màn
  Cài đặt; hoặc trang `/change-password`).

#### 4. Branding trắng nhãn (white-label)
- Mỗi CLB tuỳ biến tên hiển thị, logo, màu chủ đạo, favicon, footer PDF — áp dụng cho
  app chrome, tiêu đề trang và header/footer PDF. Excel hiện giữ dạng bảng dữ liệu thuần.

#### 5. Member Portal (cổng thành viên)
- Thành viên (MEMBER_VIEW) xem **dữ liệu của chính mình** (read-only, self-scope): tổng
  quan, lịch sử đóng quỹ, lịch tham gia, thông báo, Lisa AI — dùng cùng hệ thống thiết kế
  với màn admin.

#### 6. Đa thiết bị
- **Web** + **Desktop** (Electron, có About/phiên bản) + **Mobile** (PWA cài đặt được,
  service worker tự cập nhật) dùng chung backend + web bundle; các màn chính dùng
  responsive layout. Một số xác minh nền tảng (vd desktop auto-update/ký số) vẫn nằm ở
  mục giới hạn đã biết.

---

### 🔒 Bảo mật & Ổn định
- Băm mật khẩu **Argon2**; JWT access/refresh; guard theo vai trò + MemberScopeGuard
  (chặn thành viên truy cập dữ liệu toàn CLB).
- **Fail-fast cấu hình:** thiếu biến môi trường bắt buộc (DATABASE_URL/JWT_SECRET/
  JWT_REFRESH_SECRET) → dừng khởi động (không in giá trị).
- **Vá lỗi ổn định quan trọng:** ghi audit-log không còn làm sập backend khi thiếu
  `userId` (nguyên nhân lỗi 502 gián đoạn) — audit giờ resilient (không bao giờ ném).
- **Runbook vận hành thương mại:** xoay JWT secret, khoá tài khoản demo, tạo SUPER_ADMIN/
  admin CLB thật trước GA/production handover.

---

### ⚙️ Ghi chú vận hành (ops)
- **Email:** cấu hình `SMTP_HOST/PORT/USER/PASS/FROM` trên môi trường backend. Khuyến
  nghị dùng dịch vụ email giao dịch chuyên dụng + xác thực domain (DKIM/SPF);
  `SMTP_FROM` nên dùng domain đã xác thực để email vào Inbox.
- **Sau khi đổi file `.env`:** chạy `docker compose up -d --force-recreate` (up -d thường
  không nạp lại thay đổi env_file) và chờ vài giây để backend khởi động lại.
- **PWA:** sau khi phát hành bản mới, iOS PWA có thể cần đóng hẳn + mở lại (đôi khi 2 lần)
  để nạp bundle mới; Android/web cập nhật ngay.

---

### 🚧 Giới hạn đã biết & hướng phát triển
- Executor Mít Đặc mở rộng thật cho DEBT/EVENT/REPORT; các loại action khác giữ no-op
  (mở rộng ở bản sau).
- Kênh EMAIL dùng **một tài khoản SMTP chung**; per-club SMTP riêng (From = đúng email
  admin từng CLB) là hướng phát triển sau.
- AI Rating hiện hiển thị **trung bình toàn CLB**; điểm từng thành viên (cột riêng) và
  tinh chỉnh công thức/trọng số là bước tiếp theo.
- Kênh TELEGRAM ở trạng thái foundation (DRY_RUN — chưa gửi thật).
- **Branding/export:** Excel export hiện là bảng dữ liệu thuần, chưa có header/footer
  branding; màu PDF vẫn theo theme mặc định, chưa dùng màu branding CLB.
- Auto-update cho bản Desktop (electron-updater) chưa bật; bản build hiện chưa ký số.

---

### ⬆️ Ghi chú nâng cấp
- Không có thay đổi schema/migration phá vỡ trong các cải tiến AI Rating / thông báo
  (compute-on-read). Backend Dockerfile tự chạy `prisma migrate deploy` khi khởi động.
- Phiên bản hiển thị ở màn **Cài Đặt Hệ Thống** lấy từ `package.json` + ngày build
  (inject lúc build), môi trường lấy từ chế độ build (production/development).
