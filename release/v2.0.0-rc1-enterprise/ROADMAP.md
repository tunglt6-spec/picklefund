# Lộ trình Sản phẩm — PickleFund

> **Phiên bản hiện tại:** V2.0 RC1 | **Ngày:** 2026-06-29  
> Lộ trình phản ánh định hướng sản phẩm — có thể thay đổi theo phản hồi thực tế từ CLB.

---

## Trạng thái hiện tại: V2.0 RC1 ✅

**Hoàn thành:**
- Finance Dashboard Standard (4 KPI card: Quỹ Chính, Quỹ Phụ, Số dư chuyển kỳ, Tổng tài sản CLB)
- Công thức: `Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ`
- Premium Dashboard UI (dark sidebar, gradient cards, responsive)
- Deployment Pipeline V2 (backup, health check, rollback, Telegram)
- Backend tests: 175/175 PASS
- Multi-tenant architecture

---

## V2.0 GA — Dự kiến Q3/2026

**Mục tiêu:** General Availability — sẵn sàng cho CLB ngoài pilot

| Hạng mục | Mô tả |
|---|---|
| Fix lint warnings | Xử lý ~188 pre-existing warnings |
| Quỹ Phụ trong PDF | Tích hợp số liệu Quỹ Phụ vào báo cáo PDF |
| Backup auto cleanup | Cron job xóa backup SQL cũ hơn 30 ngày |
| Onboarding flow | Hướng dẫn setup CLB mới đầu tiên |
| Email thông báo | Thay thế/bổ sung Telegram notification |

---

## V2.1 — Dự kiến Q4/2026

**Chủ đề:** Nâng cao trải nghiệm thành viên

| Hạng mục | Mô tả |
|---|---|
| Push notification | Thông báo đến thành viên qua app/email |
| Member mobile app | Progressive Web App cho thành viên |
| Lịch tập | Tích hợp lịch buổi tập vào ứng dụng |
| QR check-in | Điểm danh bằng QR code |
| Multi-language | Hỗ trợ tiếng Anh song song tiếng Việt |

---

## V2.2 — Dự kiến Q1/2027

**Chủ đề:** Phân tích & BI

| Hạng mục | Mô tả |
|---|---|
| Analytics dashboard | Biểu đồ tài chính theo thời gian |
| Trend analysis | So sánh thu/chi giữa các kỳ |
| Forecasting | Dự báo số dư cuối kỳ dựa trên xu hướng |
| Export Excel | Xuất dữ liệu ra Excel ngoài PDF |
| CLB comparison | So sánh chỉ số giữa các CLB (nếu đồng ý) |

---

## V3.0 — Tầm nhìn dài hạn 2027+

**Chủ đề:** Mở rộng quy mô & Tích hợp

| Hạng mục | Mô tả |
|---|---|
| Marketplace | Giải đấu, thiết bị, huấn luyện viên |
| Booking sân | Đặt sân pickleball tích hợp |
| Payment gateway | Thu phí online qua VNPAY / Momo |
| API public | API cho đối tác tích hợp |
| Kubernetes | Chuyển từ Docker Compose sang K8s |

---

## Không trong lộ trình

Các hạng mục sau **không** có kế hoạch triển khai:

- Desktop installer (Windows/macOS app): PickleFund là SaaS web app
- Self-hosted không có Docker: Docker là yêu cầu bắt buộc
- Hỗ trợ trình duyệt cũ (IE, Chrome < 100): Không đủ thị trường

---

## Đóng góp ý kiến

Phản hồi từ CLB pilot là nguồn đầu vào quan trọng nhất để định hình lộ trình V2.1+.  
Liên hệ team sản phẩm để ghi nhận nhu cầu hoặc bug report.
