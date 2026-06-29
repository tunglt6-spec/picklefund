# Tổng quan dự án PickleFund

**Mục đích:** Giới thiệu toàn diện về dự án PickleFund cho người mới  
**Đối tượng:** Developer mới, PM, Sales, Ops  
**Cập nhật:** 2026-06-29

---

## 1. PickleFund là gì?

**PickleFund** là nền tảng SaaS multi-tenant chuyên biệt cho việc **quản lý tài chính CLB Pickleball** tại Việt Nam.

Mỗi CLB Pickleball có nhu cầu:
- Thu quỹ thành viên theo kỳ (tháng/quý)
- Chi trả tiền sân, tổ chức sinh hoạt
- Quản lý quỹ phụ (minigame, thưởng, tài trợ)
- Báo cáo minh bạch cho thành viên

PickleFund giải quyết tất cả các nhu cầu trên trong một nền tảng duy nhất.

---

## 2. Thông tin kỹ thuật cốt lõi

| Hạng mục | Giá trị |
|---|---|
| Phiên bản hiện tại | V2.0 RC1 |
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Reverse proxy | Nginx Alpine |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Frontend URL | app.picklefund.uk |
| API URL | api.picklefund.uk |
| Backend tests | 175/175 PASS |

---

## 3. Kiến trúc tổng thể

```
[User Browser]
      ↓ HTTPS
[Cloudflare CDN]
      ↓
[Nginx Alpine] (reverse proxy)
      ├── / → [React/Vite SPA]
      └── /api → [NestJS Backend]
                      ├── [PostgreSQL 16]
                      └── [Redis 7]
```

---

## 4. Các module chính

### 4.1 Auth Module
- Đăng ký / Đăng nhập tài khoản CLB
- JWT + Refresh Token (Argon2 hashing)
- Multi-tenant: mỗi CLB độc lập hoàn toàn

### 4.2 Members Module
- Quản lý danh sách thành viên
- Theo dõi trạng thái hoạt động
- Lịch sử đóng quỹ

### 4.3 Finance Module — Quỹ Chính
- Kỳ quỹ (Fund Periods): mở/đóng/finalize
- Thu quỹ thành viên
- Chi phí sân (chia đều theo memberCount)
- Chi sinh hoạt (tỉ lệ theo buổi tham dự)
- Số dư chuyển kỳ tự động

### 4.4 Finance Module — Quỹ Phụ
- Minigame fund: thu/chi độc lập
- Không kết nối với Quỹ Chính
- Báo cáo riêng

### 4.5 Reports Module
- Báo cáo kỳ (theo fund period)
- Phiếu thu thành viên
- Export PDF

### 4.6 Dashboard
- KPI tổng quan CLB
- Biểu đồ thu/chi
- Dark mode premium sidebar

---

## 5. Nghiệp vụ tài chính cốt lõi

```
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
```

> **Lưu ý quan trọng:** Quỹ Phụ KHÔNG được cộng vào Tổng tài sản CLB. Quỹ Phụ là độc lập.

Chi tiết xem tại [03_FINANCE_ENGINE/](../03_FINANCE_ENGINE/)

---

## 6. Trạng thái dự án (2026-06-29)

- **Production:** Đang chạy tại app.picklefund.uk
- **Backend tests:** 175/175 PASS
- **V2.0 RC1:** Đã release, đang hotfix
- **V2.1 (AI Platform):** Planned — chưa bắt đầu phát triển
- **Mobile apps:** Phát triển song song với mỗi tính năng desktop mới

---

## 7. Liên kết quan trọng

- Kiến trúc chi tiết: [02_ARCHITECTURE/SYSTEM_ARCHITECTURE.md](../02_ARCHITECTURE/SYSTEM_ARCHITECTURE.md)
- Nghiệp vụ tài chính: [03_FINANCE_ENGINE/FINANCE_OVERVIEW.md](../03_FINANCE_ENGINE/FINANCE_OVERVIEW.md)
- Quy trình deploy: [05_OPERATIONS/DEPLOYMENT.md](../05_OPERATIONS/DEPLOYMENT.md)
- Xử lý sự cố: [07_TROUBLESHOOTING/FAQ.md](../07_TROUBLESHOOTING/FAQ.md)
