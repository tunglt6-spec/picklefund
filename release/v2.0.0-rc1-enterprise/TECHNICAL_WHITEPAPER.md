# Technical Whitepaper — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** Kiến trúc sư, Kỹ sư senior, Đối tác kỹ thuật

---

## 1. Tóm tắt kỹ thuật

PickleFund V2.0 RC1 là nền tảng SaaS multi-tenant xây dựng trên kiến trúc container-based với Docker Compose. Backend NestJS thuần TypeScript, Frontend React/Vite SSG, PostgreSQL 16 làm database chính, Redis 7 cho cache/queue. Toàn bộ được orchestrate bằng Nginx Alpine, triển khai tự động qua GitHub Actions với pipeline production-grade có backup, health check và auto rollback.

---

## 2. Kiến trúc tổng quan

### 2.1 Stack kỹ thuật

| Layer | Công nghệ | Version |
|---|---|---|
| Frontend | React + TypeScript + Vite | React 18, Vite 5 |
| CSS Framework | Tailwind CSS | 3.x |
| Routing (FE) | React Router | v6 |
| Backend | NestJS + TypeScript | 10.x |
| ORM | Prisma | 5.x |
| Auth | JWT + Refresh Token + Argon2id | HS256 |
| Database | PostgreSQL | 16-alpine |
| Cache/Queue | Redis | 7-alpine |
| Proxy | Nginx | alpine |
| Container | Docker Compose | V2 plugin |
| CI/CD | GitHub Actions | Latest |

### 2.2 Thiết kế container

Toàn bộ system chạy trong 4 containers trên một Docker network nội bộ:

```
picklefund_network (bridge)
├── postgres:16-alpine    — Database (không expose port)
├── redis:7-alpine        — Cache (không expose port)
├── backend (NestJS)      — Chỉ accessible qua nginx upstream
└── nginx:alpine          — Expose :443 và :80 ra internet
```

**Nguyên tắc bảo mật:** Không có container nào ngoài nginx expose port ra host.

---

## 3. Backend Architecture

### 3.1 Module structure (NestJS)

NestJS sử dụng Module pattern — mỗi domain là một module độc lập với Controller, Service, Repository riêng.

```
AppModule
├── AuthModule        — JWT, Refresh Token, Argon2
├── UsersModule       — User management
├── ClubsModule       — Multi-tenant club management
├── FundPeriodsModule — Kỳ tài chính, carryForward
├── ContributionsModule — Thu quỹ
├── ExpensesModule    — Chi phí
├── AttendanceModule  — Điểm danh
├── ReportsModule     — PDF export
├── MinigamesModule   — Quỹ Phụ
├── LisaModule        — AI Assistant
└── HealthModule      — /health endpoint
```

### 3.2 carryForward Pattern (quan trọng)

Đây là quyết định kiến trúc quan trọng nhất trong V2.0:

**Vấn đề:** Tính `carryForwardBalance` cần truy vấn DB để lấy kỳ trước. Nếu đặt logic này trong `FinancialCalculatorService`, calculator sẽ có side effect và phá vỡ pure function design.

**Giải pháp:** Inject `carryForwardBalance` từ caller qua `CalculateOptions`:

```typescript
// financial-calculator.service.ts
interface CalculateOptions {
  carryForwardBalance?: number;
}

calculate(entries: FinancialEntry[], options: CalculateOptions = {}) {
  const { carryForwardBalance = 0 } = options;
  // ... pure calculation
  const clubAssetsBalance = commonBalance + carryForwardBalance;
  return { commonBalance, miniBalance, carryForwardBalance, clubAssetsBalance };
}
```

```typescript
// fund-periods.service.ts (caller)
async calculateSummary(periodId: string) {
  const prevPeriod = await this.findClosedPeriodBefore(periodId);
  const carryForwardBalance = prevPeriod?.commonBalance ?? 0;
  
  return this.calculator.calculate(entries, { carryForwardBalance });
}
```

**Lợi ích:**
- Calculator là pure function — không có DB dependency
- 175/175 existing tests không thay đổi
- Dễ test: chỉ cần mock `CalculateOptions`

### 3.3 Authentication Flow

```
POST /api/auth/login
→ UsersService.validateUser(email, password)
  → DB lookup user by email
  → argon2.verify(password, user.passwordHash)
  → Nếu valid: tạo accessToken (15m) + refreshToken (7d)
  → Lưu hash của refreshToken vào DB
  → Return { accessToken, refreshToken, user }

Protected request:
→ JwtAuthGuard → JwtStrategy.validate()
→ Extract JwtUser { userId, email, role, clubId }
→ Inject vào controller method
```

---

## 4. Frontend Architecture

### 4.1 Component hierarchy

```
App
└── AuthProvider
    └── Router
        ├── PublicRoute → Login
        └── ProtectedRoute
            └── Layout (Sidebar + Topbar)
                ├── ClubDashboard (Finance KPIs)
                ├── AttendancePage
                ├── ContributionsPage
                ├── ExpensesPage
                ├── ReportsPage
                ├── MinigamesPage
                └── LisaPage
```

### 4.2 Finance Dashboard implementation

`ClubDashboard.tsx` sử dụng một `useMemo` chain để tính tất cả KPI:

```typescript
// Data từ API
const summary = useSWR(`/api/fund-periods/${periodId}/summary`);

// Derived values
const commonBalance = summary.commonFund.balance;
const miniBalance = summary.miniFund.balance;
const carryForwardBalance = summary.carryForward.balance;
const clubAssetsBalance = summary.clubAssets.balance;
// clubAssetsBalance = commonBalance + carryForwardBalance (Quỹ Phụ không cộng vào)

// Health Score
const healthScore = useMemo(() => calculateHealthScore(
  commonBalance, clubAssetsBalance, commonIncome, commonExpTotal
), [commonBalance, clubAssetsBalance, commonIncome, commonExpTotal]);
```

### 4.3 Dark Sidebar + NavLink pattern

**Vấn đề phổ biến:** `classList.contains('active')` không đáng tin cậy với React Router NavLink. Và `onMouseEnter/Leave` JS override inline `style` được set bởi React.

**Giải pháp:** Tailwind callback trong `className` + `style` callback:

```tsx
<NavLink
  className={({ isActive }) => cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
    isActive
      ? 'text-white'
      : 'text-white/50 hover:text-white/90 hover:bg-white/[0.07]'
  )}
  style={({ isActive }: { isActive: boolean }) => isActive
    ? { background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' }
    : {}
  }
/>
```

Không có JS event handlers. CSS-only hover. Gradient chỉ áp dụng khi `isActive=true`.

---

## 5. CI/CD Pipeline V2

### 5.1 Design decisions

**`git reset --hard` thay `git pull`:**  
`git pull` fail nếu VPS có local changes (ví dụ: ai đó sửa `nginx.conf` trực tiếp). `git reset --hard origin/main` luôn thành công và đảm bảo VPS sync chính xác với main.

**Backup trước deploy:**  
`pg_dump` chạy trước khi `docker compose down`. Nếu backup fail (file size = 0), pipeline abort — không deploy lên database có vấn đề.

**Source `.env` trước `pg_dump`:**  
`set -a; source .env; set +a` load biến môi trường không echo ra stdout — an toàn cho CI logs.

**`printf '\n'` cho Telegram messages:**  
YAML block scalar không cho phép literal newlines trong double-quoted strings. `printf '...\n...'` là giải pháp chuẩn.

**`env_file: required: false`:**  
Docker Compose V2 syntax. Cho phép `docker compose config --env-file .env.example` chạy trong CI không cần `.env` thật.

### 5.2 Auto rollback logic

```bash
PREVIOUS_COMMIT=$(git rev-parse HEAD)
echo "$PREVIOUS_COMMIT" > /tmp/picklefund-last-commit.txt

# ... deploy mới ...

if [ "$HEALTH_OK" = "false" ]; then
  git reset --hard "$PREVIOUS_COMMIT"
  docker compose build --no-cache
  docker compose up -d
  # health check lần 2
fi
```

---

## 6. Database Schema (tóm tắt)

| Table | Mô tả |
|---|---|
| `users` | Tài khoản người dùng, role, refreshTokenHash |
| `clubs` | CLB (multi-tenant root) |
| `club_members` | Thành viên CLB |
| `fund_periods` | Kỳ tài chính (active/closed/finalized) |
| `contributions` | Thu quỹ |
| `expenses` | Chi phí (court/activity/club/minigame) |
| `attendance_records` | Điểm danh theo buổi |
| `minigame_entries` | Giao dịch Quỹ Phụ |

**Multi-tenant isolation:** Tất cả entities đều có `clubId` foreign key. API filter theo `clubId` từ JWT payload — không thể truy cập dữ liệu CLB khác.

---

## 7. Quyết định kỹ thuật quan trọng

| Quyết định | Lý do |
|---|---|
| Docker Compose thay K8s | Đủ cho quy mô hiện tại, đơn giản hơn nhiều |
| NestJS thay Express thuần | Module system, DI, decorator — maintainable hơn |
| Prisma thay TypeORM | Type safety tốt hơn, migration dễ hơn |
| Argon2id thay bcrypt | Bảo mật cao hơn, resist GPU/ASIC attacks |
| Vite thay CRA | Build nhanh hơn 10-20x, HMR tốt hơn |
| Tailwind thay styled-components | Không runtime CSS-in-JS, build nhỏ hơn |
| carryForward inject thay tính trong calculator | Pure function, không phá existing tests |
| git reset --hard thay git pull | Không bị block bởi VPS local changes |
