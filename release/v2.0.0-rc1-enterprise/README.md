# PickleFund V2.0 RC1 — Enterprise Release Package

> **Nền tảng quản lý tài chính, hoạt động và cộng đồng cho Câu lạc bộ Pickleball**  
> Phiên bản: **V2.0 Release Candidate 1** | Ngày phát hành: 2026-06-29

---

## Giới thiệu

**PickleFund** là nền tảng SaaS đa tenant (multi-tenant) được thiết kế chuyên biệt cho các Câu lạc bộ Pickleball tại Việt Nam. Hệ thống số hóa toàn bộ quy trình quản lý tài chính, điểm danh, thành viên và hoạt động của CLB — giúp Ban quản lý vận hành chuyên nghiệp, minh bạch và hiệu quả hơn.

---

## PickleFund V2.0 RC1 là gì?

V2.0 RC1 là phiên bản Release Candidate đầu tiên của PickleFund thế hệ thứ hai. Đây là phiên bản hoàn chỉnh về mặt nghiệp vụ, đã qua kiểm thử đầy đủ và sẵn sàng cho triển khai SaaS thương mại.

**Điểm khác biệt so với V1.x:**
- Finance Dashboard Standard với 4 chỉ số tài chính độc lập
- Kiến trúc multi-tenant production-grade
- Deployment Pipeline V2 với backup, health check và rollback tự động
- Premium Dashboard UI với sidebar dark theme
- Responsive hoàn chỉnh trên Desktop / Tablet / Mobile

---

## Tính năng nổi bật V2.0 RC1

| Tính năng | Mô tả |
|---|---|
| **Finance Dashboard Standard** | 4 card KPI: Quỹ Chính, Quỹ Phụ, Số dư chuyển kỳ, Tổng tài sản CLB |
| **Quỹ Chính** | Quỹ vận hành chính của CLB (thu quỹ, chi phí sân, sinh hoạt) |
| **Quỹ Phụ** | Quỹ phụ trợ độc lập (minigame, thưởng, tài trợ) |
| **Số dư chuyển kỳ** | Số dư Quỹ Chính từ kỳ đã đóng, chuyển sang kỳ hiện tại |
| **Tổng tài sản CLB** | = Quỹ Chính + Số dư chuyển kỳ (không cộng Quỹ Phụ) |
| **Premium Dashboard UI** | Dark sidebar, gradient KPI cards, quick actions |
| **Responsive** | Desktop 1440px / Tablet 768px / Mobile 430/390/375px |
| **PDF Export** | Báo cáo tài chính xuất PDF theo chuẩn CLB |
| **Deployment Pipeline V2** | git reset hard, DB backup, health check, auto rollback, Telegram notify |
| **Member Receipt** | Phiếu thu điện tử cho thành viên |
| **Maika AI** | Health score, khuyến nghị tài chính thông minh |

---

## Công thức tài chính chuẩn

```
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ

Trong đó:
  Quỹ Chính       = Tổng thu Quỹ Chính - Tổng chi Quỹ Chính
  Số dư chuyển kỳ = Balance Quỹ Chính của kỳ liền trước (đã đóng/finalized)
  Quỹ Phụ         ≠ thành phần của Tổng tài sản CLB (hoạt động độc lập)
```

---

## Kiến trúc tổng quan

```
Internet
   │
   ▼
Cloudflare DNS
   │
   ▼
Nginx Reverse Proxy (SSL/TLS)
   ├── app.picklefund.uk  →  React/Vite Frontend Container
   └── api.picklefund.uk  →  NestJS API Container
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                     PostgreSQL          Redis
                     (Database)         (Cache)
```

**Stack kỹ thuật:**

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | SPA, responsive |
| Backend | NestJS + Prisma ORM | REST API |
| Database | PostgreSQL 16 | ACID compliant |
| Cache | Redis 7 | Session, queue |
| Proxy | Nginx Alpine | SSL termination |
| Container | Docker Compose | All-in-one orchestration |
| CI/CD | GitHub Actions | Auto deploy on push to main |
| Hosting | VPS Production | Linux, Docker |

---

## Production Endpoints

| Service | URL |
|---|---|
| Frontend (App) | https://app.picklefund.uk |
| API | https://api.picklefund.uk |
| Health Check | https://api.picklefund.uk/health |

---

## Trạng thái chất lượng RC1

| Hạng mục | Kết quả |
|---|---|
| Backend Tests | ✅ **175/175 PASS** |
| Frontend Build | ✅ **0 errors** |
| Frontend Lint | ✅ **0 errors** |
| Docker Compose Config | ✅ **PASS** |
| Production Deploy | ✅ **PASS** |
| Codex Audit | ✅ **PASS** |
| Finance Formula | ✅ **Verified** |
| Responsive | ✅ **375–1440px** |

---

## Cấu trúc tài liệu Release Package

| Tài liệu | Đối tượng | Mô tả |
|---|---|---|
| [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) | Lãnh đạo | Tóm tắt điều hành |
| [PRODUCT_BROCHURE.md](PRODUCT_BROCHURE.md) | Khách hàng | Brochure sản phẩm |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | Tất cả | Ghi chú phát hành |
| [CHANGELOG.md](CHANGELOG.md) | Kỹ thuật | Lịch sử thay đổi |
| [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | Kỹ thuật | Kiến trúc hệ thống |
| [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) | Kỹ thuật | Cài đặt local |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | DevOps | Triển khai production |
| [SECURITY_GUIDE.md](SECURITY_GUIDE.md) | DevOps | Bảo mật |
| [OPERATIONS_MANUAL.md](OPERATIONS_MANUAL.md) | Vận hành | Vận hành hàng ngày |
| [DISASTER_RECOVERY_GUIDE.md](DISASTER_RECOVERY_GUIDE.md) | DevOps | Phục hồi sự cố |
| [ADMIN_MANUAL.md](ADMIN_MANUAL.md) | Admin CLB | Hướng dẫn admin |
| [USER_MANUAL.md](USER_MANUAL.md) | Thành viên | Hướng dẫn người dùng |
| [API_HANDBOOK.md](API_HANDBOOK.md) | Developer | Tài liệu API |
| [AUDIT_REPORT.md](AUDIT_REPORT.md) | Audit | Báo cáo kiểm thử |
| [ACCEPTANCE_CHECKLIST.md](ACCEPTANCE_CHECKLIST.md) | PM | Checklist nghiệm thu |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | DevOps | Checklist deploy |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | PM | Checklist phát hành |
| [ROADMAP.md](ROADMAP.md) | Lãnh đạo | Lộ trình sản phẩm |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Tất cả | Vấn đề đã biết |
| [SYSTEM_REQUIREMENTS.md](SYSTEM_REQUIREMENTS.md) | Kỹ thuật | Yêu cầu hệ thống |
| [TECHNICAL_WHITEPAPER.md](TECHNICAL_WHITEPAPER.md) | Kỹ thuật | Whitepaper kỹ thuật |
| [INDEX.md](INDEX.md) | Tất cả | Mục lục toàn bộ |

---

## Liên hệ & Hỗ trợ

- **Sản phẩm:** PickleFund  
- **Phiên bản:** V2.0 RC1  
- **Phát hành:** 2026-06-29  
- **Loại:** Release Candidate — Sẵn sàng pilot production
