# Tiêu chuẩn Code — PickleFund

> **Mục đích:** Quy định chuẩn code cho toàn bộ dự án PickleFund  
> **Đối tượng:** Developer, AI coding assistant (Claude Code)

---

## 1. Nguyên tắc chung

- **Không thêm tính năng ngoài scope** — bug fix không cần refactor xung quanh
- **Không thêm error handling thừa** — chỉ validate tại system boundary (user input, external API)
- **Không comment thừa** — chỉ comment khi WHY là non-obvious
- **Không tạo abstraction sớm** — 3 đoạn code giống nhau tốt hơn 1 abstraction sai
- **Không backwards-compatibility hack** — nếu không dùng thì xóa hoàn toàn

---

## 2. TypeScript / NestJS (Backend)

```typescript
// ✅ Tên rõ ràng, không cần comment
async calculateCarryForward(periodId: string): Promise<number> { ... }

// ❌ Tên mơ hồ + comment thừa
// This function calculates carry forward
async calc(id: string): Promise<number> { ... }
```

### 2.1 Module pattern
- Mỗi domain là một NestJS Module độc lập
- Service chứa business logic — Controller chỉ nhận/trả HTTP
- Không để business logic trong Controller

### 2.2 Prisma / Database
- Dùng Prisma transactions khi cần atomic operations
- Không dùng raw SQL trừ khi cần thiết
- Tên Prisma model theo PascalCase, tên column theo camelCase

### 2.3 carryForward pattern (QUAN TRỌNG)
- `FinancialCalculatorService.calculate()` là pure function — không gọi DB
- `carryForwardBalance` inject từ caller (`fund-periods.service.ts`) qua `CalculateOptions`
- **Không bao giờ** thêm DB call vào calculator

```typescript
// ✅ ĐÚNG — inject từ ngoài
const carryForward = await this.findCarryForward(periodId);
return this.calculator.calculate(entries, { carryForwardBalance: carryForward });

// ❌ SAI — calculator tự gọi DB
async calculate(entries, periodId) {
  const cf = await this.prisma.fundPeriod.findFirst(...); // CẤM
}
```

---

## 3. React / TypeScript (Frontend)

### 3.1 Component
- Functional component với hooks
- Props interface đặt ngay trên component function
- Không dùng `any` — dùng type cụ thể hoặc `unknown`

### 3.2 Tailwind CSS
- Ưu tiên Tailwind class thay inline style
- Inline style chỉ khi Tailwind không hỗ trợ (gradient động, animation delay)
- Responsive prefix: `sm:`, `md:`, `lg:` — mobile-first

### 3.3 NavLink pattern (Sidebar)
```tsx
// ✅ ĐÚNG — Tailwind callback, không có JS event handlers
className={({ isActive }) => cn(
  'flex items-center gap-3 rounded-lg px-3 py-2',
  isActive ? 'text-white' : 'text-white/50 hover:text-white/90 hover:bg-white/[0.07]'
)}
style={({ isActive }) => isActive
  ? { background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' }
  : {}
}

// ❌ SAI — JS event handlers override React style
onMouseEnter={() => element.classList.add('hover')}
```

### 3.4 Overflow guard cho số tiền
```tsx
// ✅ ĐÚNG — tránh overflow số tiền dài
<p className="text-xl sm:text-2xl font-bold tabular-nums break-words whitespace-normal max-w-full">
  {formatCurrency(balance)}
</p>

// ❌ SAI — text cứng, không break-words
<p className="text-2xl font-bold">{formatCurrency(balance)}</p>
```

---

## 4. Docker / DevOps

### 4.1 env_file
```yaml
# ✅ ĐÚNG — không bắt buộc .env tồn tại
env_file:
  - path: .env
    required: false

# ❌ SAI — fail nếu thiếu .env
env_file: .env
```

### 4.2 Nginx upstream
```nginx
# ✅ ĐÚNG — dùng upstream name
upstream backend { server backend:3000; }
location /api/ { proxy_pass http://backend/api/; }

# ❌ SAI — port conflict với upstream
location /api/ { proxy_pass http://backend:3000/api/; }
```

---

## 5. Bảo mật

- Không commit `.env`, `.env.production`
- Không echo secrets trong logs
- Không expose PostgreSQL/Redis port ra host
- `ALLOWED_ORIGINS` chỉ chứa domain chính thức
- JWT secret ≥ 64 ký tự

---

## 6. Testing

- Backend: Jest, mỗi service có spec file
- Mock chain: dùng `mockResolvedValueOnce` khi cùng một mock cần trả giá trị khác nhau
- Không dùng `mockResolvedValue` khi mock function được gọi nhiều lần với kết quả khác nhau
- Xem [TESTING_STANDARD.md](TESTING_STANDARD.md) để biết thêm chi tiết
