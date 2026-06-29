# Yêu cầu Hệ thống — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29

---

## 1. Yêu cầu Server (Production)

### VPS tối thiểu
| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| vCPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| SSD | 40 GB | 80 GB |
| Bandwidth | 100 Mbps | 200 Mbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Phần mềm server
| Phần mềm | Phiên bản | Ghi chú |
|---|---|---|
| Docker Engine | 24.x+ | Cài qua `get.docker.com` |
| Docker Compose | V2 plugin | Cài cùng Docker Engine |
| Git | 2.x+ | Để nhận code từ GitHub |
| curl | Bất kỳ | Để health check |

### Network
- Cổng 80 và 443 mở ra internet
- Cổng 22 (SSH) mở cho DevOps team
- Không cần expose cổng database (5432, 6379)
- DNS trỏ về IP VPS (qua Cloudflare)

---

## 2. Yêu cầu Database & Cache

| Service | Image | RAM khuyến nghị |
|---|---|---|
| PostgreSQL 16 | `postgres:16-alpine` | 1 GB |
| Redis 7 | `redis:7-alpine` | 256 MB |

PostgreSQL và Redis chạy trong Docker container nội bộ — không yêu cầu cài đặt riêng.

---

## 3. Yêu cầu phát triển (Local Dev)

| Thành phần | Phiên bản |
|---|---|
| Node.js | 18.x hoặc 20.x LTS |
| npm | 9.x hoặc 10.x |
| Docker Desktop | 24.x+ |
| Git | 2.x+ |
| OS | Windows 10/11, macOS 12+, Ubuntu 20.04+ |

---

## 4. Yêu cầu trình duyệt (Frontend)

| Trình duyệt | Phiên bản tối thiểu |
|---|---|
| Chrome | 112+ |
| Firefox | 112+ |
| Safari | 16+ |
| Edge | 112+ |
| Mobile Chrome (Android) | 112+ |
| Mobile Safari (iOS) | 16+ |

**Độ phân giải hỗ trợ:** 375px – 1440px+

---

## 5. Yêu cầu CI/CD

| Thành phần | Yêu cầu |
|---|---|
| GitHub | Repository với Actions enabled |
| GitHub Secrets | `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `SSH_PORT` |
| VPS SSH | Public key đã thêm vào `~/.ssh/authorized_keys` |
| GitHub Secrets (optional) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

---

## 6. Yêu cầu SSL/TLS

- Chứng chỉ SSL hợp lệ cho `app.picklefund.uk` và `api.picklefund.uk`
- Hỗ trợ: Cloudflare managed SSL, Let's Encrypt, hoặc certificate tự quản lý
- File `ssl/cert.pem` và `ssl/key.pem` phải tồn tại tại `/opt/picklefund/ssl/`

---

## 7. Dung lượng lưu trữ ước tính

| Thành phần | Dung lượng ước tính |
|---|---|
| Docker images (tất cả services) | ~2 GB |
| PostgreSQL data | ~100 MB ban đầu, ~1 GB/năm |
| Redis data | ~50 MB |
| Backup SQL files | ~10 MB/bản, giữ 30 ngày |
| Log files | ~100 MB/tháng |
| **Tổng khuyến nghị** | **40 GB SSD** |
