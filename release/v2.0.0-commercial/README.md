# PickleFund V2.0.0-commercial — Release Package

**Ngày phát hành:** 2026-06-28

## Nội dung thư mục này

| File/Folder | Mô tả |
|-------------|-------|
| `RELEASE_NOTES.md` | Ghi chú phát hành, tính năng, lỗi đã sửa |
| `docker-compose.production.yml` | → Xem file gốc ở root project |
| `.env.production.example` | → Xem file gốc ở root project |
| `docs/` | → Xem `docs/commercial-release/` ở root project |
| `PickleFund-Setup-2.0.0.exe` | Windows installer (build từ `desktop/`) |

## Cài đặt nhanh (Docker)

```bash
# 1. Clone hoặc download release
git clone https://github.com/tunglt6-spec/picklefund.git
cd picklefund

# 2. Tạo file env
cp .env.production.example .env.production
# Chỉnh sửa .env.production với giá trị thực

# 3. Build & start
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# 4. Kiểm tra
curl https://your-domain.com/api/health
```

## Checksums

Kiểm tra integrity sau khi download:

```bash
# Windows
certutil -hashfile PickleFund-Setup-2.0.0.exe SHA256

# Linux/Mac
sha256sum PickleFund-Setup-2.0.0.exe
```

*(Checksums sẽ được đăng trên GitHub Release page)*

## Tài liệu

- [User Guide](../../docs/commercial-release/USER_GUIDE.md)
- [Admin Guide](../../docs/commercial-release/ADMIN_GUIDE.md)  
- [Installation Guide](../../docs/commercial-release/INSTALLATION_GUIDE.md)
- [API Guide](../../docs/commercial-release/API_GUIDE.md)
