# Checklist Triển khai — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** DevOps — chạy trước và sau mỗi lần deploy production

---

## Trước khi deploy

### Chuẩn bị code
- [ ] Tất cả code đã merge vào `main`
- [ ] Backend tests: 175/175 PASS (`cd backend && npm test`)
- [ ] Frontend build: 0 errors (`cd frontend && npm run build`)
- [ ] Frontend lint: 0 errors (`npm run lint`)
- [ ] `docker compose config` PASS (không cần `.env` thật)
- [ ] Không có secrets trong code (kiểm tra diff)

### Chuẩn bị môi trường VPS
- [ ] SSH vào VPS thành công
- [ ] `/opt/picklefund/.env.production` tồn tại và đầy đủ giá trị
- [ ] `/opt/picklefund/ssl/cert.pem` và `ssl/key.pem` tồn tại
- [ ] `/opt/picklefund/backups/` thư mục tồn tại
- [ ] Dung lượng ổ cứng còn đủ (`df -h` — ít nhất 5 GB free)
- [ ] Docker Engine đang chạy (`docker ps`)

### Backup trước deploy (thủ công nếu cần)
- [ ] Chạy backup thủ công nếu đây là deploy lớn:
  ```bash
  source .env
  docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    > backups/picklefund_pre_deploy_$(date +%Y%m%d_%H%M%S).sql
  ```

---

## Trong khi deploy (Auto — Pipeline V2)

Pipeline tự động thực hiện các bước sau. Không cần can thiệp thủ công trừ khi pipeline fail.

- [ ] git fetch + reset --hard origin/main ✅
- [ ] git clean (bảo vệ .env, ssl/, *.sql) ✅
- [ ] source .env → pg_dump backup ✅
- [ ] docker compose build --no-cache ✅
- [ ] docker compose down --remove-orphans ✅
- [ ] docker compose up -d ✅
- [ ] sleep 30 ✅
- [ ] Health check API: `api.picklefund.uk/health` ✅
- [ ] Health check Frontend: `app.picklefund.uk` ✅
- [ ] Telegram notification (nếu đã cấu hình) ✅

---

## Sau khi deploy

### Kiểm tra tức thì (trong 5 phút đầu)
- [ ] `docker compose ps` — tất cả services `Up (healthy)`
- [ ] `curl https://api.picklefund.uk/health` → `{"status":"ok"}`
- [ ] `curl -I https://app.picklefund.uk/` → HTTP 200
- [ ] Đăng nhập thành công qua UI
- [ ] Finance Dashboard load đúng 4 card KPI
- [ ] Không có lỗi trong logs: `docker compose logs backend --tail=50 | grep -i error`

### Kiểm tra nghiệp vụ (trong 30 phút đầu)
- [ ] Thu quỹ: tạo mới thành công
- [ ] Chi phí: tạo mới thành công
- [ ] Điểm danh: ghi nhận thành công
- [ ] Báo cáo PDF: xuất được file
- [ ] Minigame: load đúng số liệu Quỹ Phụ
- [ ] Số dư chuyển kỳ: hiển thị đúng từ kỳ liền trước

### Kiểm tra trên mobile
- [ ] Đăng nhập trên mobile (375px)
- [ ] Dashboard không overflow
- [ ] Quick Actions hoạt động

---

## Khi deploy fail — Rollback

Nếu pipeline fail và auto rollback không thành công:

```bash
cd /opt/picklefund

# Lấy commit trước
PREV_COMMIT=$(cat /tmp/picklefund-last-commit.txt)
git reset --hard $PREV_COMMIT

# Rebuild
docker compose build --no-cache
docker compose down --remove-orphans
docker compose up -d
sleep 30

# Kiểm tra
curl -sf https://api.picklefund.uk/health && echo "✅" || echo "❌"
```

- [ ] Rollback thành công: health check PASS
- [ ] Ghi nhận lý do fail vào log vận hành
- [ ] Thông báo cho team về vấn đề

---

## Sau deploy thành công

- [ ] Ghi nhận commit hash và thời gian deploy vào log
- [ ] Xác nhận với team rằng deploy thành công
- [ ] Telegram notification đã nhận (nếu đã cấu hình)
- [ ] Kiểm tra dung lượng backup không vượt quá 70% ổ cứng
