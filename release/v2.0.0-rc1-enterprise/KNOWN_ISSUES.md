# Vấn đề Đã biết — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> Tài liệu này liệt kê các vấn đề đã biết trong RC1, trạng thái và cách xử lý tạm thời (workaround).

---

## Mức độ ưu tiên

| Mức | Ký hiệu | Mô tả |
|---|---|---|
| Nghiêm trọng | 🔴 | Ảnh hưởng nghiệp vụ, cần fix trước GA |
| Trung bình | 🟡 | Bất tiện, có workaround |
| Thấp | 🟢 | Cosmetic, không ảnh hưởng nghiệp vụ |

---

## Vấn đề đang theo dõi

### KI-001 — Lint warnings pre-existing (~188 warnings) 🟢

**Mô tả:** Frontend build có ~188 ESLint warnings (mostly `@typescript-eslint/no-explicit-any` và `react-hooks/exhaustive-deps`). Warnings này có từ trước V2.0 và không ảnh hưởng đến runtime.

**Trạng thái:** Không chặn build. Build thành công với 0 errors.

**Workaround:** Không cần xử lý trong RC1. Kế hoạch fix trong V2.1.

**Tác động:** Không có.

---

### KI-002 — Telegram notification cần cấu hình thủ công 🟡

**Mô tả:** Pipeline V2 hỗ trợ thông báo Telegram khi deploy, nhưng cần thêm `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` vào GitHub Secrets thủ công. Không có UI để cấu hình từ dashboard.

**Trạng thái:** Feature optional — pipeline chạy bình thường ngay cả khi không cấu hình Telegram.

**Workaround:** Bỏ qua Telegram nếu không cần. Xem [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) để cấu hình.

**Tác động:** Không nhận thông báo deploy qua Telegram nếu chưa cấu hình.

---

### KI-003 — Chưa có desktop installer đóng gói 🟢

**Mô tả:** RC1 là web app. Chưa có installer `.exe`, `.dmg` hay `.AppImage`. Người dùng truy cập qua trình duyệt tại `https://app.picklefund.uk`.

**Trạng thái:** Không có kế hoạch trong V2.x. PickleFund là SaaS web app.

**Workaround:** Truy cập qua trình duyệt. Có thể "Add to Home Screen" trên mobile.

**Tác động:** Không có — đây là thiết kế intentional.

---

### KI-004 — Backup SQL không tự xóa file cũ 🟡

**Mô tả:** Pipeline V2 tạo file backup SQL mỗi lần deploy nhưng không tự động xóa file cũ. Nếu deploy nhiều lần, thư mục `/opt/picklefund/backups/` sẽ tích lũy nhiều file.

**Trạng thái:** Cần cron job thủ công để dọn dẹp.

**Workaround:**
```bash
# Chạy thủ công hoặc thêm vào crontab
find /opt/picklefund/backups/ -name "*.sql" -mtime +30 -delete
```

**Tác động:** Tốn dung lượng ổ cứng theo thời gian.

---

### KI-005 — carryForward chỉ tính từ kỳ đã đóng/finalized 🟢

**Mô tả:** `Số dư chuyển kỳ` chỉ lấy từ kỳ có trạng thái `closed` hoặc `finalized`. Kỳ đang `active` không được tính là carryForward dù có số dư.

**Trạng thái:** Đây là thiết kế intentional — tránh double-count kỳ đang chạy.

**Workaround:** Không cần workaround. Đóng kỳ (`close period`) để kỳ tiếp theo nhận carryForward.

**Tác động:** Không có nếu quy trình vận hành CLB đúng (đóng kỳ trước khi mở kỳ mới).

---

### KI-006 — Quỹ Phụ không tích hợp báo cáo PDF 🟡

**Mô tả:** Báo cáo PDF xuất ra tập trung vào Quỹ Chính. Số liệu Quỹ Phụ (minigame, thưởng, tài trợ) chưa được tích hợp đầy đủ vào PDF report.

**Trạng thái:** Tính năng trong backlog cho V2.1.

**Workaround:** Xem số liệu Quỹ Phụ trực tiếp trên dashboard hoặc trang Minigame.

**Tác động:** Báo cáo PDF chưa đầy đủ cho CLB dùng Quỹ Phụ nhiều.

---

## Vấn đề đã giải quyết trong RC1

Các vấn đề dưới đây đã được fix và KHÔNG còn tồn tại trong RC1:

| Vấn đề | Fix |
|---|---|
| Nginx 405 tại `app.picklefund.uk/api/auth/login` | Thêm `location /api/` block, dùng upstream name |
| Docker compose config fail khi thiếu `.env` | `env_file: required: false` |
| Deploy fail do local changes trên VPS | `git reset --hard origin/main` |
| `classList.contains('active')` không đáng tin | Tailwind `className` callback |
| Finance card overflow số tiền dài | `min-w-0`, `break-words` |
| Mobile KPI overflow `text-[26px]` | `text-[20px] sm:text-[24px]` + `break-words` |
| YAML parse error Telegram messages | `printf '\n'` pattern |
| Backend test mock chain conflict | `mockResolvedValueOnce` chain |

---

## Báo cáo vấn đề mới

Nếu phát hiện vấn đề chưa có trong danh sách trên, liên hệ team DevOps hoặc ghi nhận vào backlog.  
Thông tin cần cung cấp: mô tả vấn đề, bước tái hiện, môi trường (browser, OS), screenshot (nếu có).
