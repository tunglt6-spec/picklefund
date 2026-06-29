# Monitoring PickleFund

**Mục đích:** Hướng dẫn giám sát hệ thống
**Đối tượng:** DevOps, Ops
**Cập nhật:** 2026-06-29

---

## Health Check Endpoints

| Endpoint | Mục đích |
|---|---|
| `GET /health` (backend) | Kiểm tra backend alive |
| Cloudflare dashboard | Uptime, SSL, traffic |

---

## Kiểm tra Docker containers

```bash
# Trạng thái các containers
docker compose ps

# Logs backend
docker compose logs backend --tail=50

# Logs nginx
docker compose logs nginx --tail=50

# Logs postgres
docker compose logs postgres --tail=20
```

---

## Kiểm tra tài nguyên VPS

```bash
# RAM và CPU
top

# Disk space
df -h

# Docker disk usage
docker system df
```

---

## Alerts (hiện tại)

- Telegram notifications từ GitHub Actions cho mỗi deploy
- Health check fail → auto notify + rollback

## Monitoring nâng cao (Planned)

- Uptime monitoring (UptimeRobot hoặc tương tự): Planned
- Error tracking (Sentry): Planned
- Metrics dashboard: Future
