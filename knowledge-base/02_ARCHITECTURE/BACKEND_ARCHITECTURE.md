# Kiến trúc Backend PickleFund

**Mục đích:** Mô tả kiến trúc NestJS backend  
**Đối tượng:** Backend Developer  
**Cập nhật:** 2026-06-29

---

## Stack công nghệ

| Công nghệ | Mục đích |
|---|---|
| NestJS | Framework chính |
| TypeScript | Type safety |
| TypeORM | ORM |
| PostgreSQL 16 | Database |
| Redis 7 | Cache / Token store |
| Argon2 | Password hashing |
| JWT | Authentication |
| Jest | Testing (175/175 PASS) |

---

## Danh sách Modules trong AppModule

- **AuthModule** — Đăng nhập, đăng ký, refresh token
- **ClubModule** — Quản lý thông tin CLB
- **MembersModule** — Quản lý thành viên
- **FundPeriodsModule** — Quản lý kỳ quỹ
- **ContributionsModule** — Thu quỹ thành viên
- **ExpensesModule** — Chi phí (sân, sinh hoạt, hoạt động)
- **MiniFundsModule** — Quỹ Phụ
- **ReportsModule** — Báo cáo PDF
- **AttendanceModule** — Điểm danh (dùng cho tính chi sinh hoạt)

---

## Cấu trúc module điển hình

```
src/modules/fund-periods/
├── fund-periods.module.ts
├── fund-periods.controller.ts
├── fund-periods.service.ts
├── fund-periods.repository.ts
├── fund-periods.entity.ts
├── dto/
│   ├── create-fund-period.dto.ts
│   └── update-fund-period.dto.ts
└── tests/
    └── fund-periods.service.spec.ts
```

---

## Finance Calculator — Pure Function

**Nguyên tắc quan trọng (ADR-002):**

`FinanceCalculator` là **pure function** — KHÔNG tự lấy dữ liệu từ database.

Caller (`fund-periods.service`) truyền dữ liệu vào qua `CalculateOptions`:

```typescript
interface CalculateOptions {
  contributions: Contribution[];
  expenses: Expense[];
  carryForwardBalance: number;  // Inject từ caller
  memberCount: number;
  attendanceData: AttendanceRecord[];
}
```

`carryForwardBalance` được `fund-periods.service` tính toán và inject vào — calculator KHÔNG tự query DB để lấy giá trị này.

---

## Authentication Flow

```
POST /auth/login
  → Verify password (Argon2)
  → Generate Access Token (JWT, short TTL)
  → Generate Refresh Token (random, hash + store in Redis with TTL)
  → Return { accessToken, refreshToken }

POST /auth/refresh
  → Verify Refresh Token against Redis hash
  → Issue new Access Token
  → Rotate Refresh Token

POST /auth/logout
  → Delete Refresh Token from Redis
```

---

## Guards & Decorators

- `@UseGuards(JwtAuthGuard)` — Bảo vệ route cần xác thực
- `@CurrentUser()` — Lấy thông tin user từ JWT payload
- `@ClubId()` — Lấy clubId từ JWT payload (dùng để filter data)

---

## Testing

- Framework: Jest
- Trạng thái hiện tại: **175/175 PASS**
- Test files: `*.spec.ts` trong mỗi module
- Mục tiêu: Maintain 100% pass rate trước mỗi deploy
