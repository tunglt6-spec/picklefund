# PickleFund Load Test

## Yêu cầu

```bash
# Install k6 (Windows)
winget install k6

# hoặc dùng Docker
docker pull grafana/k6
```

## Chạy load test

```bash
# Local (backend đang chạy tại localhost:3000)
k6 run load-test/k6-script.js

# Trỏ vào VPS production
k6 run --env BASE_URL=https://api.picklefund.vn/api \
       --env TEST_USERNAME=admin \
       --env TEST_PASSWORD=yourpassword \
       load-test/k6-script.js

# Dùng Docker
docker run --rm -i grafana/k6 run - < load-test/k6-script.js
```

## Acceptance criteria (SDD Chapter 8)

| Metric | Target |
|--------|--------|
| p95 response time | < 2000ms |
| Error rate | < 5% |
| Auth latency p95 | < 1000ms |
| Data endpoint p95 | < 500ms |
| Peak VUs | 50 concurrent |

## Test email SMTP

```bash
curl -X POST https://api.picklefund.vn/api/hermes/test-email \
  -H "Authorization: Bearer <token>"
```

Trả về `{ sent: true, to: "your@email.com" }` nếu SMTP OK.

## Test Telegram Bot

```bash
curl -X POST https://api.picklefund.vn/api/telegram/test \
  -H "Authorization: Bearer <token>"
```

Trả về `{ sent: true, chatId: "..." }` và gửi tin nhắn test vào Telegram group của CLB.
