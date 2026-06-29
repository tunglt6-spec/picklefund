# Xử lý sự cố PickleFund

**Mục đích:** Quy trình ứng phó sự cố
**Đối tượng:** DevOps, Developer
**Cập nhật:** 2026-06-29

---

## Phân loại sự cố

| Mức độ | Mô tả | Thời gian xử lý mục tiêu |
|---|---|---|
| P1 | Production down hoàn toàn | < 30 phút |
| P2 | Tính năng quan trọng không hoạt động | < 2 giờ |
| P3 | Tính năng phụ lỗi | < 1 ngày |

---

## Checklist khi production down (P1)

1. Kiểm tra Cloudflare status
2. SSH vào VPS: `docker compose ps`
3. Xem logs: `docker compose logs --tail=100`
4. Kiểm tra disk: `df -h` (nếu đầy disk → xóa logs/backup cũ)
5. Kiểm tra RAM: `free -h`
6. Nếu cần: `docker compose restart backend`
7. Nếu vẫn fail: rollback về commit trước

---

## Postmortem

Sau mỗi P1/P2, viết postmortem ngắn gồm:
- Timeline sự cố
- Root cause
- Fix đã áp dụng
- Hành động phòng ngừa

Lưu vào [07_TROUBLESHOOTING/](../07_TROUBLESHOOTING/) nếu có giá trị tái sử dụng.
