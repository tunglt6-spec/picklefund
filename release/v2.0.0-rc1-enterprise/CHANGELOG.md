# Lịch sử Thay đổi — PickleFund

Tài liệu này ghi lại toàn bộ thay đổi đáng kể theo chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

Định dạng phiên bản theo [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0-rc1] — 2026-06-29

### Thêm mới (Added)

#### Finance Dashboard Standard
- Thêm khái niệm `carryForward` (Số dư chuyển kỳ): số dư Quỹ Chính từ kỳ đã đóng/finalized gần nhất
- Thêm trường `clubAssets` trong API summary: `balance = commonFund.balance + carryForward.balance`
- Thêm interface `CalculateOptions` trong `financial-calculator.service.ts`
- Backend tự động tra cứu kỳ trước để tính `carryForwardBalance` trong `fund-periods.service.ts`
- Frontend: 4 KPI finance gradient cards với màu sắc và icon riêng biệt
- Frontend: `statusLabel` (Còn dư / Thiếu hụt / Không có chuyển kỳ) trên card Số dư chuyển kỳ
- Frontend: công thức trực quan `Quỹ Chính + Số dư chuyển kỳ = Tổng tài sản CLB` trong card

#### Premium Dashboard UI
- Sidebar dark navy (`#0F1629`) với hover Tailwind thuần CSS
- 4 Finance KPI cards gradient: emerald/teal, purple/indigo, orange/amber, blue/cyan
- Quick Actions row: 6 pill buttons màu sắc riêng
- Health Score causes: giải thích nguyên nhân điểm sức khỏe
- Animation `fundCardFadeIn` stagger (0/80/160/240ms)
- Overflow guard: `min-w-0`, `break-words`, `text-xl sm:text-2xl`

#### Deployment Pipeline V2
- `git fetch origin main` + `git reset --hard origin/main` thay thế `git pull`
- Lưu commit cũ vào `/tmp/picklefund-last-commit.txt` trước mỗi deploy
- Backup PostgreSQL tự động: `pg_dump` → `/opt/picklefund/backups/*.sql`
- Load `.env` / `.env.production` trước khi chạy `pg_dump`
- Health check backend: `curl -sf https://api.picklefund.uk/health`
- Health check frontend: `curl -sf https://app.picklefund.uk/`
- Auto rollback: reset về commit cũ + rebuild nếu health check thất bại
- Telegram notification (optional): 4 trạng thái deploy
- `command_timeout: 30m`

#### Hạ tầng
- `.env.example` tại root với đầy đủ biến mẫu
- `docker-compose.yml`: `env_file: path: .env, required: false`
- `docker compose --env-file .env.example config` hoạt động không cần `.env` thật

#### Backend Tests
- 5 test case mới cho `carryForward` trong `financial-calculator.service.spec.ts`
- Fix mock chain `findFirst` trong `fund-periods.service.spec.ts`
- Tổng: 175/175 tests PASS

### Thay đổi (Changed)

- Đổi tên: "Quỹ Chung" → "Quỹ Chính" toàn bộ frontend
- Đổi tên: "Quỹ Mini" → "Quỹ Phụ" toàn bộ frontend
- Badge Quỹ Chính: "Quỹ vận hành"
- Badge Quỹ Phụ: "Quỹ phụ trợ"
- Badge Số dư chuyển kỳ: "Carry Forward"
- Badge Tổng tài sản CLB: "Net Asset"
- Sidebar: `bg-white` → dark navy `#0F1629`
- NavLink hover: `onMouseEnter/Leave JS` → Tailwind `hover:` class
- `MobileKpiCard`: `text-[26px]` → `text-[20px] sm:text-[24px]` + `break-words`

### Sửa lỗi (Fixed)

- Nginx 405 tại `app.picklefund.uk/api/auth/login`: thêm `location /api/` block, dùng upstream `backend` (không dùng port)
- Docker compose config fail khi thiếu `.env`: thêm `required: false`
- Deploy thất bại do local changes trên VPS: thay `git pull` bằng `git reset --hard`
- `classList.contains('active')` không đáng tin cậy với NavLink → Tailwind callback
- Finance card overflow số tiền dài: thêm `min-w-0`, `break-words`, `max-w-full`
- YAML parse error trong deploy.yml: Telegram messages có literal newlines → `printf '\n'`
- Backend test fail: mock `findFirst` không phân biệt call → `mockResolvedValueOnce` chain

### Bảo mật (Security)

- Không commit `.env` thật — chỉ `.env.example` với placeholder
- Không echo `TELEGRAM_BOT_TOKEN` trong log
- `git clean` loại trừ `ssl/` và `*.sql`
- Source `.env` bằng `set -a/+a` không gây secret leak

### DevOps (DevOps)

- Deploy workflow hoàn toàn mới: `deploy.yml` V2 (174 dòng)
- `appleboy/ssh-action@v1.0.3` với `envs:` truyền secrets an toàn
- Backup SQL tự động mỗi deploy, kiểm tra `file -s > 0`

### Tài liệu (Documentation)

- Tạo bộ Enterprise Release Package V2.0 RC1 (26 tài liệu)
- README, RELEASE_NOTES, CHANGELOG, INSTALLATION_GUIDE, DEPLOYMENT_GUIDE
- ARCHITECTURE_OVERVIEW, SECURITY_GUIDE, OPERATIONS_MANUAL, DISASTER_RECOVERY_GUIDE
- ADMIN_MANUAL, USER_MANUAL, API_HANDBOOK, AUDIT_REPORT
- ACCEPTANCE_CHECKLIST, DEPLOYMENT_CHECKLIST, RELEASE_CHECKLIST
- EXECUTIVE_SUMMARY, PRODUCT_BROCHURE, TECHNICAL_WHITEPAPER, ROADMAP
- KNOWN_ISSUES, SYSTEM_REQUIREMENTS, INDEX, CHECKSUMS

---

## [1.x] — Trước 2026-06

> Phiên bản MVP nội bộ — không được ghi lại chính thức trong changelog này.  
> Toàn bộ lịch sử git vẫn được lưu trong repository.
