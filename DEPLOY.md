# Deploy PickleFund len VPS — Checklist day du

## Kien truc
```
Internet -> Cloudflare -> VPS (Nginx:443) -> Docker Network
                                           |-- backend:3000  (NestJS)
                                           |-- frontend:80   (Nginx static)
                                           |-- postgres:5432
                                           +-- redis:6379
```

---

## BUOC 1 — Chuan bi VPS

### Yeu cau toi thieu
- Ubuntu 22.04 LTS
- RAM: 2GB+, Disk: 20GB+
- Ports mo: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Cai Docker Engine

```bash
ssh root@<VPS_IP>
curl -fsSL https://get.docker.com | sh
docker --version          # Docker version 25+
docker compose version    # Docker Compose version v2.x
```

---

## BUOC 2 — DNS (Cloudflare)

Vao Cloudflare Dashboard -> DNS cua domain `picklefund.uk`, them 2 records:

| Type | Name | Content    | Proxy      |
|------|------|------------|------------|
| A    | app  | `<VPS_IP>` | ON Proxied |
| A    | api  | `<VPS_IP>` | ON Proxied |

Dam bao SSL/TLS mode = **Full (strict)** trong Cloudflare -> SSL/TLS -> Overview.

---

## BUOC 3 — SSL Certificate (Cloudflare Origin Certificate)

Vi da dung Cloudflare proxy, dung **Origin Certificate** (mien phi, 15 nam).

1. Cloudflare Dashboard -> **SSL/TLS -> Origin Server -> Create Certificate**
2. Chon **Let Cloudflare generate a private key** -> RSA (2048)
3. Hostnames: `picklefund.uk`, `*.picklefund.uk`
4. Validity: **15 years**
5. Click **Create** -> copy ca 2: Origin Certificate va Private Key (chi hien 1 lan)

Tren VPS:

```bash
mkdir -p /opt/picklefund/nginx/ssl
nano /opt/picklefund/nginx/ssl/picklefund.crt   # dan "Origin Certificate"
nano /opt/picklefund/nginx/ssl/picklefund.key   # dan "Private Key"
chmod 600 /opt/picklefund/nginx/ssl/picklefund.key
```

---

## BUOC 4 — Clone code len VPS

```bash
mkdir -p /opt/picklefund
cd /opt/picklefund
git clone https://github.com/<your-org>/picklefund.git .
```

---

## BUOC 5 — Tao file .env Production

```bash
cd /opt/picklefund
nano .env
```

Noi dung (thay cac gia tri CHANGE_ME):

```env
NODE_ENV=production
PORT=3000

# PostgreSQL
POSTGRES_USER=picklefund
POSTGRES_PASSWORD=CHANGE_ME_strong_db_password
POSTGRES_DB=picklefund
DATABASE_URL=postgresql://picklefund:CHANGE_ME_strong_db_password@postgres:5432/picklefund

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_strong_redis_password

# JWT — bat buoc 64+ ky tu, sinh bang: openssl rand -hex 64
JWT_SECRET=CHANGE_ME_run_openssl_rand_hex_64
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=CHANGE_ME_run_openssl_rand_hex_64_different
JWT_REFRESH_EXPIRES_IN=30d
JWT_REFRESH_REMEMBER_EXPIRES_IN=90d

# URLs
APP_URL=https://app.picklefund.uk
API_URL=https://api.picklefund.uk
ALLOWED_ORIGINS=https://app.picklefund.uk
```

Sinh JWT secrets:
```bash
openssl rand -hex 64   # chay 2 lan lay 2 gia tri khac nhau
```

---

## BUOC 6 — Build va khoi dong stack

```bash
cd /opt/picklefund
docker compose build --no-cache
docker compose up -d
docker compose logs -f backend   # cho den khi thay "Application is running on port 3000"
```

---

## BUOC 7 — Seed database

```bash
docker compose exec backend npx prisma db seed
```

Expected:
```
Seed completed!
  superadmin / super123 -> SUPER_ADMIN
  admin / admin123      -> CLUB_ADMIN
  treasurer / treasurer123 -> CLUB_TREASURER
  member / member123    -> CLUB_MEMBER
```

---

## BUOC 8 — Kiem tra health

```bash
# API health
curl -f https://api.picklefund.uk/health
# Expected: {"status":"ok"}

# Thu login
curl -X POST https://api.picklefund.uk/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"super123"}'
# Expected: {"data":{"accessToken":"...","user":{...}}}

# Frontend
curl -I https://app.picklefund.uk
# Expected: HTTP/2 200
```

---

## BUOC 9 — GitHub Actions (CI/CD tu dong)

### Tao SSH Deploy Key tren VPS

```bash
ssh-keygen -t ed25519 -C "picklefund-deploy" -f ~/.ssh/picklefund_deploy -N ""
cat ~/.ssh/picklefund_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/picklefund_deploy   # <-- copy noi dung nay lam VPS_SSH_KEY
```

### Them Secrets vao GitHub

Vao: GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret

| Secret       | Gia tri                                          |
|--------------|--------------------------------------------------|
| `VPS_HOST`   | IP VPS cua ban                                   |
| `VPS_USER`   | `root`                                           |
| `VPS_SSH_KEY`| Noi dung file `picklefund_deploy` (private key)  |
| `VPS_PORT`   | `22`                                             |

### Trigger deploy

```bash
git push origin main
```

Workflow `.github/workflows/deploy.yml` se:
1. Chay backend tests
2. SSH vao VPS -> git pull -> docker compose build -> docker compose up -d
3. Chay prisma migrate deploy
4. Health check `https://api.picklefund.uk/health`

---

## BUOC 10 — Cac lenh van hanh thuong dung

```bash
# Xem logs realtime
docker compose logs -f backend
docker compose logs -f nginx

# Restart mot service
docker compose restart backend

# Deploy update thu cong
cd /opt/picklefund && git pull origin main
docker compose build backend frontend
docker compose up -d --no-deps backend frontend

# Xem status cac container
docker compose ps

# Vao DB console
docker compose exec postgres psql -U picklefund -d picklefund

# Vao Redis console
docker compose exec redis redis-cli -a <REDIS_PASSWORD>

# Backup database
docker compose exec postgres pg_dump -U picklefund picklefund > backup_$(date +%Y%m%d).sql

# Xem disk usage
docker system df
```

---

## Checklist cuoi — truoc khi go-live

- [ ] DNS A records tro dung IP VPS (app.picklefund.uk, api.picklefund.uk)
- [ ] Cloudflare SSL mode = Full (strict)
- [ ] nginx/ssl/picklefund.crt va .key da dat dung cho
- [ ] .env production khong chua gia tri CHANGE_ME
- [ ] docker compose ps -> tat ca 5 services deu healthy / running
- [ ] curl https://api.picklefund.uk/health tra ve 200
- [ ] Login bang superadmin / super123 thanh cong
- [ ] Doi mat khau superadmin sau lan dang nhap dau tien
- [ ] GitHub Actions secrets da set du 4 bien
- [ ] Backup policy: cronjob backup DB hang ngay

---

## Troubleshooting nhanh

| Trieu chung                  | Nguyen nhan              | Fix                                              |
|------------------------------|--------------------------|--------------------------------------------------|
| backend restart lien tuc     | DB chua ready            | docker compose logs postgres — cho "ready"       |
| nginx 502                    | backend chua start       | docker compose logs backend                      |
| SSL handshake failed         | Cert chua dat dung path  | Kiem tra /opt/picklefund/nginx/ssl/              |
| Login 401 sau seed           | Hash cu la bcrypt        | docker compose exec backend npx prisma db seed   |
| Redis connection refused     | REDIS_PASSWORD sai       | So sanh .env vs docker-compose.yml               |
