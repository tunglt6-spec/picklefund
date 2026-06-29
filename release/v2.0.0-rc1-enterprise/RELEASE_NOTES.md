# Ghi chú Phát hành — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 Release Candidate 1  
> **Ngày phát hành:** 2026-06-29  
> **Loại:** Release Candidate — Production-ready pilot

---

## Tổng quan phiên bản

PickleFund V2.0 RC1 đánh dấu bước chuyển đổi hoàn toàn từ MVP sang nền tảng SaaS chuyên nghiệp. Phiên bản này hoàn thiện toàn bộ nghiệp vụ tài chính chuẩn, nâng cấp giao diện lên chuẩn thương mại, và xây dựng pipeline triển khai production-grade với backup tự động và khả năng rollback.

---

## ✅ Tính năng mới (Added)

### Finance Dashboard Standard
- Triển khai 4 chỉ số KPI tài chính riêng biệt: Quỹ Chính, Quỹ Phụ, Số dư chuyển kỳ, Tổng tài sản CLB
- Chuẩn hóa thuật ngữ: Quỹ Chung → Quỹ Chính, Quỹ Mini → Quỹ Phụ
- Thêm khái niệm **Số dư chuyển kỳ** (Carry Forward) — tự động tính từ kỳ đã đóng
- Công thức: `Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ` (Quỹ Phụ không cộng vào)
- API trả đầy đủ `carryForward`, `clubAssets`, `miniIncome`, `miniExpense`

### Premium Dashboard UI
- Sidebar dark navy — phong cách SaaS thương mại hiện đại
- 4 Finance KPI cards gradient màu sắc riêng biệt theo chức năng
- Quick Actions row: Điểm danh, Thu quỹ, Chi phí, Minigame, Báo cáo, Lisa AI
- Animation fade-in stagger cho các card tài chính
- Health Score với nguyên nhân rõ ràng (Quỹ Chính dương/âm, Tổng tài sản)
- Khuyến nghị tài chính cụ thể với số tiền cần bổ sung

### Deployment Pipeline V2
- Thay `git pull origin main` bằng `git fetch + git reset --hard`
- Backup PostgreSQL tự động trước mỗi lần deploy
- Health check tự động sau deploy: API endpoint + Frontend
- Rollback tự động về commit trước nếu health check thất bại
- Thông báo Telegram (optional) cho mỗi event deploy
- Bảo vệ file production: `.env`, `.env.production`, `ssl/`, `*.sql`

### Hạ tầng
- `docker-compose.yml`: thêm `env_file: required: false` để hỗ trợ `--env-file .env.example`
- Tạo `.env.example` đầy đủ tại root project
- Nginx: thêm `location /api/` proxy đúng upstream, không có port conflict

---

## 🔄 Thay đổi (Changed)

| Hạng mục | Trước | Sau |
|---|---|---|
| Tên quỹ | Quỹ Chung | Quỹ Chính |
| Tên quỹ | Quỹ Mini | Quỹ Phụ |
| Deploy | `git pull origin main` | `git fetch + reset --hard` |
| Finance formula | Không rõ ràng | `Tổng tài sản = Quỹ Chính + Chuyển kỳ` |
| Dashboard | White cards | Premium gradient dark-sidebar |
| Sidebar | Light white | Dark navy `#0F1629` |
| `env_file` | required (fail nếu thiếu) | `required: false` |
| Nginx proxy | Thiếu `/api/` block | Đã thêm, dùng upstream name |
| Health check | Không có | Backend + Frontend sau mỗi deploy |

---

## 🔧 Lỗi đã sửa (Fixed)

- **Login 405 production**: Nginx thiếu `location /api/` trong server block `app.picklefund.uk` → đã thêm và dùng đúng upstream name (không dùng port trực tiếp)
- **Docker compose config fail**: Thiếu `.env` root → fix `env_file: required: false`
- **Sidebar hover**: `classList.contains('active')` không đáng tin cậy → chuyển sang Tailwind callback
- **Finance card overflow**: Số tiền dài tràn ngang trên mobile → thêm `min-w-0`, `break-words`, `max-w-full`
- **Mobile KPI overflow**: `text-[26px]` cứng → `text-[20px] sm:text-[24px]` + `break-words`
- **Backend test mock chain**: `findFirst` mock không phân biệt call 1 vs call 2 → `mockResolvedValueOnce` chain
- **YAML parse error**: Telegram messages có literal newlines trong block scalar YAML → chuyển sang `printf '\n'`
- **DB backup credential**: Không load `.env` trước `pg_dump` → thêm `set -a; source .env; set +a`

---

## 🔒 Bảo mật (Security)

- Không commit `.env` thật — chỉ `.env.example` với placeholder
- Không in `TELEGRAM_BOT_TOKEN` ra log deploy
- `git clean` loại trừ `ssl/` và `*.sql` để bảo vệ file production
- JWT + Refresh token với Argon2 password hashing
- HTTPS bắt buộc qua Nginx + Cloudflare

---

## ⚙️ DevOps

- GitHub Actions deploy workflow V2 với 8 bước có cấu trúc
- `command_timeout: 30m` để tránh timeout khi build Docker
- Telegram notification 4 trạng thái: started, success, rollback success, rollback failed
- Backup file lưu tại `/opt/picklefund/backups/picklefund_YYYYMMDD_HHMMSS.sql`

---

## ⚠️ Vấn đề đã biết (Known Issues)

Xem chi tiết tại [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

- Một số lint warnings không chặn build (pre-existing, ~188 warnings)
- Telegram notification cần cấu hình secrets `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` trên GitHub
- Chưa có desktop installer đóng gói trong RC1

---

## 📋 Ghi chú nâng cấp (Upgrade Notes)

Nếu nâng cấp từ V1.x:

1. Backup database trước khi nâng cấp
2. Chạy `git pull` và `prisma migrate deploy`
3. Đổi tên biến môi trường nếu có thay đổi trong `.env.example`
4. Kiểm tra `nginx/nginx.conf` — phiên bản mới có `location /api/` block
5. Cập nhật GitHub Actions workflow nếu dùng deploy tự động

---

## ✅ Tóm tắt kiểm thử (Verification Summary)

| Hạng mục | Kết quả |
|---|---|
| Backend unit tests | ✅ 175/175 PASS |
| Frontend build | ✅ 0 errors |
| Frontend lint | ✅ 0 errors |
| Docker compose config | ✅ PASS |
| Nginx config | ✅ PASS |
| Production health check (API) | ✅ HTTP 200 |
| Production health check (Frontend) | ✅ HTTP 200 |
| Finance formula | ✅ Verified — Tổng tài sản = QC + CF |
| Responsive 375–1440px | ✅ PASS |
| Codex audit | ✅ PASS |
