# Ma trận tính năng PickleFund

**Mục đích:** Liệt kê tất cả tính năng và trạng thái  
**Đối tượng:** PM, Developer, Sales  
**Cập nhật:** 2026-06-29

---

## Trạng thái tính năng

| Ký hiệu | Ý nghĩa |
|---|---|
| ✓ | Hoàn thành, đang production |
| ~ | Đang phát triển |
| P | Planned — đã lên kế hoạch |
| F | Future — định hướng xa |

---

## Module Auth

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Đăng ký CLB | ✓ | Multi-tenant |
| Đăng nhập | ✓ | JWT + Refresh Token |
| Hash mật khẩu Argon2 | ✓ | |
| Quên mật khẩu | P | |
| 2FA | F | |

---

## Module Members

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Thêm/sửa/xóa thành viên | ✓ | |
| Danh sách thành viên | ✓ | |
| Trạng thái hoạt động | ✓ | |
| Import từ Excel | P | |

---

## Module Quỹ Chính

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo kỳ quỹ | ✓ | |
| Đóng/Finalize kỳ | ✓ | |
| Carry forward tự động | ✓ | ADR-002 |
| Thu quỹ thành viên | ✓ | |
| Chi phí sân (chia đều) | ✓ | Chia theo memberCount |
| Chi sinh hoạt (theo buổi) | ✓ | Tỉ lệ buổi tham dự |
| Chi hoạt động CLB | ✓ | |

---

## Module Quỹ Phụ

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo quỹ phụ | ✓ | Độc lập với Quỹ Chính |
| Thu/chi quỹ phụ | ✓ | |
| Báo cáo quỹ phụ riêng | ✓ | |

---

## Module Reports

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Báo cáo kỳ | ✓ | |
| Phiếu thu thành viên | ✓ | |
| Export PDF | ✓ | |
| Gửi email tự động | P | |

---

## Dashboard

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| KPI tổng quan | ✓ | Gradient cards |
| Dark sidebar | ✓ | #0F1629 |
| Biểu đồ thu/chi | ✓ | |
| Mobile responsive | ✓ | |

---

## AI Platform (V2.1 — Planned)

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Maika AI (tài chính) | P | V2.1 |
| Lisa AI (member support) | P | V2.1 |
| Hermes AI (ops) | P | V2.1 |
| LiteLLM gateway | P | V2.1 |
| OpenClaw framework | P | V2.1 |
