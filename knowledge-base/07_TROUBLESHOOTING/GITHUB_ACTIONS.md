# Troubleshooting: GitHub Actions — PickleFund

> **Mục đích:** Ghi lại các sự cố GitHub Actions deploy pipeline đã gặp  
> **Đối tượng:** DevOps

---

## Vấn đề 1: SSH connection failed

### Triệu chứng
```
dial tcp: connection refused
```

### Checklist
- [ ] `SSH_HOST`, `SSH_USERNAME`, `SSH_PORT` đúng trong GitHub Secrets
- [ ] `SSH_PRIVATE_KEY` là private key (không phải public key)
- [ ] Public key đã thêm vào `~/.ssh/authorized_keys` trên VPS
- [ ] Port 22 mở trên firewall VPS

---

## Vấn đề 2: Secrets không được truyền vào script

### Triệu chứng
Biến `$TELEGRAM_BOT_TOKEN` trống trong script.

### Nguyên nhân
Chưa thêm vào `envs:` của SSH action.

### Fix
```yaml
- uses: appleboy/ssh-action@v1.0.3
  with:
    envs: TELEGRAM_BOT_TOKEN,TELEGRAM_CHAT_ID,GIT_SHA
    script: |
      # Bây giờ $TELEGRAM_BOT_TOKEN có giá trị
```

---

## Vấn đề 3: Telegram notification không gửi

### Nguyên nhân
- `TELEGRAM_BOT_TOKEN` hoặc `TELEGRAM_CHAT_ID` chưa thêm vào GitHub Secrets
- Bot chưa được add vào group/channel

### Verify
```bash
# Test gửi message thủ công
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=Test message"
```

Telegram notification là **optional** — pipeline chạy bình thường nếu không cấu hình.

---

## Vấn đề 4: Pipeline timeout

### Triệu chứng
Pipeline bị cancel sau 5 phút.

### Fix
Xem [DEPLOYMENT.md vấn đề 5](DEPLOYMENT.md) — cần `command_timeout: 30m`.

---

## Vấn đề 5: Workflow không trigger

### Kiểm tra
- Workflow file phải ở `.github/workflows/deploy.yml`
- Trigger đúng: `on: push: branches: [main]`
- Push đúng vào nhánh `main` (không phải nhánh khác)

---

## Xem lịch sử pipeline

GitHub → Repository → Actions → chọn workflow run để xem logs chi tiết.

Logs SSH action chứa toàn bộ output của script deploy trên VPS.
