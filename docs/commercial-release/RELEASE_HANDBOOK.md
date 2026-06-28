# Sổ Tay Phát Hành Thương Mại — PickleFund V2.0

**Phiên bản:** V2.0.0-commercial  
**Ngày phát hành:** 2026-06-28  
**Trạng thái:** General Availability (GA)

---

## 1. Giới Thiệu Sản Phẩm

**PickleFund** là nền tảng SaaS quản lý tài chính cho Câu Lạc Bộ Pickleball tại Việt Nam.

### 1.1. Vấn đề giải quyết

Phần lớn CLB Pickleball đang quản lý quỹ bằng Google Sheets thủ công, dẫn đến:
- Sai sót khi tính chi phí sân / sinh hoạt chia theo buổi
- Không có phiếu cá nhân minh bạch cho từng thành viên
- Mất thời gian tổng hợp báo cáo cuối kỳ
- Không có lịch sử điểm danh và đóng quỹ

PickleFund giải quyết toàn bộ bằng hệ thống tự động.

### 1.2. Đối tượng khách hàng

| Đối tượng | Mô tả |
|-----------|-------|
| CLB Pickleball nhỏ (10–30 người) | Target chính — quản lý quỹ hằng tháng |
| CLB Pickleball vừa (30–100 người) | Target mở rộng — multi-admin |
| Ban tổ chức giải | Use case phụ — quản lý giải đấu mini |

### 1.3. Thị trường mục tiêu

- Việt Nam: ~500+ CLB Pickleball đang hoạt động (2026)
- Tốc độ tăng trưởng: ~30% YoY theo số CLB thành lập mới
- Chưa có sản phẩm nào chuyên biệt cho phân khúc này

---

## 2. Tính Năng Thương Mại V2.0

### 2.1. Quản lý Tài Chính (Core)

| Module | Tính năng |
|--------|-----------|
| **Kỳ quỹ** | Tạo / active / close kỳ, xem tổng kết |
| **Quỹ Chung** | Thu quỹ, xác nhận, tính tỷ lệ theo điểm danh |
| **Quỹ Mini** | Thu quỹ game, chi riêng cho hoạt động minigame |
| **Chi phí** | Nhập chi phí sân + sinh hoạt, phân bổ tự động |
| **Phiếu cá nhân** | Tổng hợp per-member: đã đóng, còn nợ, số dư |

### 2.2. Điểm Danh & Buổi Chơi

- Tạo buổi chơi với phí sân cụ thể
- Điểm danh từng thành viên mỗi buổi
- Liên kết buổi với kỳ quỹ tự động

### 2.3. Báo Cáo

- Báo cáo tài chính tổng hợp (PDF)
- Bill từng thành viên (PDF)
- Infographic tổng quan + bill (PNG)
- Xuất Excel danh sách thành viên

### 2.4. Minigame

- Bốc thăm đội ngẫu nhiên (Random Doubles Draw)
- Nhập kết quả và bảng điểm

### 2.5. Multi-Tenant & Phân Quyền

- Mỗi CLB là một tenant riêng biệt
- Role: Admin / Thành viên / Thủ quỹ
- Dữ liệu hoàn toàn cách ly giữa các CLB

### 2.6. Bảo Mật

- Argon2 password hashing
- JWT + Refresh Token (7 ngày / 30 ngày)
- Rate limiting per endpoint
- Audit log tất cả thao tác

---

## 3. Mô Hình Phát Hành

### 3.1. Phiên bản hiện tại

| Kênh | Phiên bản | Trạng thái |
|------|-----------|------------|
| SaaS (cloud) | v2.0.0 | Đang hoạt động tại `app.picklefund.uk` |
| Self-hosted Docker | v2.0.0 | GA — sẵn sàng deploy |
| Desktop Windows | v2.0.0 (ZIP Portable) | GA |

### 3.2. Roadmap V2.1 (dự kiến Q3 2026)

- Push notification (Telegram / Web Push)
- Thanh toán online (VNPay / MoMo)
- App mobile native (React Native)
- Multi-language (EN/VI toggle)
- Báo cáo Excel nâng cao

---

## 4. Quy Trình Onboarding CLB Mới

### Bước 1: Tạo tài khoản

Admin CLB tự đăng ký tại `https://app.picklefund.uk/register`
hoặc admin hệ thống tạo tài khoản qua API.

### Bước 2: Cấu hình CLB

1. Đặt tên CLB, ảnh logo
2. Thêm thành viên (import CSV hoặc thêm tay)
3. Cấu hình kỳ quỹ đầu tiên (ngày bắt đầu, mức đóng)

### Bước 3: Vận hành tháng đầu

1. Tạo buổi chơi → điểm danh
2. Nhập đóng quỹ từng thành viên
3. Nhập chi phí sân + sinh hoạt
4. Xem báo cáo → xuất PDF → chia sẻ nhóm CLB

### Bước 4: Đóng kỳ quỹ

1. Admin xem tổng kết kỳ
2. Generate phiếu cá nhân cho tất cả thành viên
3. Thành viên xem phiếu → đóng phần còn nợ
4. Close kỳ quỹ → mở kỳ mới

---

## 5. Hỗ Trợ & SLA

### 5.1. Kênh hỗ trợ

| Kênh | Thời gian phản hồi | Đối tượng |
|------|--------------------|-----------|
| GitHub Issues | 2–3 ngày làm việc | Bug reports, feature requests |
| Email (admin@picklefund.uk) | 1–2 ngày làm việc | Tài khoản, billing |
| Telegram Support Bot | Khi có | Enterprise tier |

### 5.2. SLA (dịch vụ SaaS)

| Chỉ số | Cam kết |
|--------|---------|
| Uptime | ≥99% mỗi tháng |
| Backup data | Hàng ngày (giữ 30 ngày) |
| Thông báo bảo trì | Trước 24h qua email |

### 5.3. Chính sách dữ liệu

- Dữ liệu CLB hoàn toàn riêng biệt, không chia sẻ giữa các tenant
- Backup tự động hàng ngày
- Theo yêu cầu: export toàn bộ dữ liệu CLB (JSON/CSV)
- Xóa tài khoản: dữ liệu xóa hoàn toàn trong 30 ngày

---

## 6. Hướng Dẫn Deploy Self-Hosted

Xem chi tiết tại [`INSTALLATION_GUIDE.md`](./INSTALLATION_GUIDE.md).

Tóm tắt nhanh:

```bash
git clone https://github.com/tunglt6-spec/picklefund.git /opt/picklefund
cd /opt/picklefund
cp .env.production.example .env.production
# Chỉnh sửa .env.production
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

---

## 7. Liên Hệ

| Vai trò | Thông tin |
|---------|-----------|
| Technical Lead | GitHub: `@tunglt6-spec` |
| Support Email | admin@picklefund.uk |
| Production URL | https://app.picklefund.uk |
| GitHub Repo | https://github.com/tunglt6-spec/picklefund |
| GitHub Releases | https://github.com/tunglt6-spec/picklefund/releases |
