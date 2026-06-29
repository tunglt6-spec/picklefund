# Mục lục — PickleFund V2.0 RC1 Enterprise Release Package

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> Bộ tài liệu đầy đủ cho việc nghiệm thu, triển khai và vận hành PickleFund V2.0 RC1.

---

## Tài liệu theo vai trò

### Lãnh đạo & Ban quản lý

| Tài liệu | Mô tả |
|---|---|
| [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) | Tóm tắt điều hành 1 trang |
| [PRODUCT_BROCHURE.md](PRODUCT_BROCHURE.md) | Brochure sản phẩm, tính năng nổi bật |
| [ROADMAP.md](ROADMAP.md) | Lộ trình sản phẩm V2.0 → V3.0 |

### Project Manager & Product Owner

| Tài liệu | Mô tả |
|---|---|
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | Ghi chú phát hành đầy đủ |
| [ACCEPTANCE_CHECKLIST.md](ACCEPTANCE_CHECKLIST.md) | Checklist 47 mục nghiệm thu |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Vấn đề đã biết và workaround |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | Checklist phát hành |

### Kỹ sư & Developer

| Tài liệu | Mô tả |
|---|---|
| [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | Kiến trúc hệ thống + Mermaid diagram |
| [TECHNICAL_WHITEPAPER.md](TECHNICAL_WHITEPAPER.md) | Whitepaper kỹ thuật chi tiết |
| [API_HANDBOOK.md](API_HANDBOOK.md) | Tài liệu API endpoints |
| [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) | Cài đặt local development |
| [SYSTEM_REQUIREMENTS.md](SYSTEM_REQUIREMENTS.md) | Yêu cầu hệ thống |
| [CHANGELOG.md](CHANGELOG.md) | Lịch sử thay đổi (Keep a Changelog) |

### DevOps & Vận hành

| Tài liệu | Mô tả |
|---|---|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Hướng dẫn triển khai production |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Checklist deploy |
| [SECURITY_GUIDE.md](SECURITY_GUIDE.md) | Hướng dẫn bảo mật |
| [OPERATIONS_MANUAL.md](OPERATIONS_MANUAL.md) | Sổ tay vận hành hàng ngày |
| [DISASTER_RECOVERY_GUIDE.md](DISASTER_RECOVERY_GUIDE.md) | Phục hồi thảm họa |

### Audit & Kiểm thử

| Tài liệu | Mô tả |
|---|---|
| [AUDIT_REPORT.md](AUDIT_REPORT.md) | Báo cáo kiểm thử & audit RC1 |

### Người dùng cuối

| Tài liệu | Đối tượng | Mô tả |
|---|---|---|
| [ADMIN_MANUAL.md](ADMIN_MANUAL.md) | Admin CLB | Hướng dẫn quản trị CLB |
| [USER_MANUAL.md](USER_MANUAL.md) | Thành viên | Hướng dẫn sử dụng cơ bản |

### Thông tin chung

| Tài liệu | Mô tả |
|---|---|
| [README.md](README.md) | Giới thiệu và tổng quan release package |
| [CHECKSUMS.txt](CHECKSUMS.txt) | Hash xác minh file |

### Tài nguyên

| Thư mục | Mô tả |
|---|---|
| [screenshots/](screenshots/README.md) | Screenshots giao diện RC1 |
| [assets/](assets/README.md) | Logo, icons, tài nguyên branding |

---

## Tổng quan nhanh

**Công thức tài chính chuẩn:**
```
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
(Quỹ Phụ hoạt động độc lập — KHÔNG cộng vào)
```

**Production URLs:**
- App: https://app.picklefund.uk
- API: https://api.picklefund.uk
- Health: https://api.picklefund.uk/health

**Chất lượng RC1:**
- Backend tests: 175/175 PASS
- Frontend: 0 errors
- Codex audit: PASS

---

*PickleFund Enterprise Release Package | V2.0 RC1 | 2026-06-29*
