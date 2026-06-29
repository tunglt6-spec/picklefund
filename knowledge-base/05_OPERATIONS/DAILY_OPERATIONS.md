# Vận hành hàng ngày PickleFund

**Mục đích:** Checklist và quy trình vận hành định kỳ
**Đối tượng:** Ops
**Cập nhật:** 2026-06-29

---

## Kiểm tra hàng ngày

- [ ] Truy cập app.picklefund.uk — confirm load bình thường
- [ ] Kiểm tra Telegram — có alert nào không?
- [ ] `docker compose ps` — tất cả containers Up?

## Kiểm tra hàng tuần

- [ ] Disk usage: `df -h` — còn > 20% không?
- [ ] Xóa backup cũ hơn 7 ngày
- [ ] Xem logs lỗi: `docker compose logs backend 2>&1 | grep ERROR`

## Kiểm tra hàng tháng

- [ ] Review SSL certificate expiry (Cloudflare tự renew)
- [ ] Review Docker images cũ: `docker image prune`
