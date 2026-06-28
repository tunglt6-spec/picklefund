# PickleFund V2.0.0-commercial — Release Notes

**Phiên bản:** v2.0.0-commercial  
**Ngày phát hành:** 2026-06-28  
**Loại:** Commercial Release (General Availability)

---

## Điều kiện hệ thống

| Thành phần | Yêu cầu tối thiểu |
|------------|-------------------|
| OS (Server) | Ubuntu 22.04 LTS / Debian 12 |
| Docker | 24.0+ |
| Docker Compose | v2.20+ |
| RAM (VPS) | 2 GB (4 GB khuyến nghị) |
| vCPU | 2 vCPU |
| Disk | 20 GB SSD |
| OS (Desktop) | Windows 10 64-bit trở lên |

---

## Tính năng chính V2.0

### Quản lý tài chính CLB
- Kỳ quỹ (Fund Periods): tạo, active, close, xem tổng kết
- Thu quỹ Chung và Quỹ Mini (game) tách biệt
- Chi phí sân phân chia theo tỷ lệ điểm danh (attendance-proportional)
- Chi phí sinh hoạt phân chia theo tỷ lệ điểm danh
- Phiếu tài chính cá nhân (Personal Receipt) per-member

### FinancialCalculatorService (mới)
- Một công thức tính toán duy nhất dùng cho toàn hệ thống
- Court fee lấy từ `AttendanceSession.courtFee` (không dùng keyword detection)
- Chỉ tính thu nhập đã xác nhận (`isConfirmed: true`)
- Phân bổ chi phí theo tỷ lệ điểm danh thực tế

### Điểm danh
- Tạo buổi chơi với phí sân
- Điểm danh từng thành viên
- Liên kết buổi với kỳ quỹ

### Báo cáo & Xuất file
- Báo cáo tài chính tổng hợp
- Bill từng thành viên
- Xuất PDF báo cáo + phiếu cá nhân
- Infographic (Template A: tổng quan, Template B: bill thành viên)

### Minigame
- Bốc thăm đội ngẫu nhiên (Random Doubles Draw)
- Nhập kết quả và điểm số

### Mobile
- Giao diện mobile đầy đủ cho admin và thành viên
- Tab Quỹ Chung / Quỹ Mini trên mobile
- Bottom nav với drawer "Thêm" cho admin

### Bảo mật
- Argon2 password hashing
- JWT + Refresh Token
- Multi-tenant isolation (TenantGuard)
- Rate limiting
- Audit logs

---

## Lỗi đã sửa trong V2.0

| ID | Mô tả |
|----|-------|
| PF-01 | Formula tính chi phí không nhất quán giữa các service → tập trung vào FinancialCalculatorService |
| PF-02 | Admin tạo quỹ không thể set `isConfirmed: true` ngay |
| PF-03 | Mobile Contributions không hiển thị Quỹ Mini |
| PF-04 | Reports dùng keyword detection cho chi phí sân → đã thay bằng `session.courtFee` |
| PF-05 | Mobile admin nav thiếu Kỳ quỹ, Minigame, Settings, Thông báo |
| PF-06 | Frontend 193 lint errors → 0 errors, 192 warnings |
| PF-07 | `courtCost: 0` trong PDF export MemberDashboard |
| PF-08 | `clubName: ''` trong tất cả PDF export |
| PF-09 | `tsconfig.build.tsbuildinfo` committed → deploy VPS fail silent |

---

## Hướng dẫn nâng cấp

### Từ V1.x
1. Backup database: `docker exec picklefund-db pg_dump -U picklefund picklefund > backup_v1.sql`
2. Pull code mới: `git pull origin main`
3. Rebuild: `docker compose -f docker-compose.production.yml build --no-cache`
4. Restart: `docker compose -f docker-compose.production.yml up -d`
5. Migration chạy tự động khi container start

### Fresh Install
Xem `docs/commercial-release/INSTALLATION_GUIDE.md`

---

## Known Issues

| Issue | Workaround |
|-------|------------|
| Infographic export trên Safari mobile có thể bị vỡ layout | Dùng Chrome mobile |
| Windows Desktop Installer cần icon file thủ công | Xem `desktop/assets/README.txt` |
| Telegram bot webhook cần domain HTTPS | Cấu hình `TELEGRAM_WEBHOOK_URL` trong `.env.production` |

---

## Liên hệ

- Support: [GitHub Issues](https://github.com/tunglt6-spec/picklefund/issues)
- Email: admin@picklefund.uk
