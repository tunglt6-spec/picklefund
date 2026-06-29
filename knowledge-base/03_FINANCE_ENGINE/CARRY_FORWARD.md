# Số dư chuyển kỳ (Carry Forward)

**Mục đích:** Giải thích cơ chế chuyển số dư giữa các kỳ  
**Đối tượng:** Developer, CLB Admin  
**Cập nhật:** 2026-06-29

---

## Định nghĩa

**Số dư chuyển kỳ (carryForwardBalance)** là số dư còn lại của Quỹ Chính từ kỳ **FINALIZED** gần nhất, được mang sang kỳ tiếp theo.

---

## Cơ chế hoạt động

```
Kỳ N (FINALIZED)
  Số dư cuối = carryForwardBalance(N-1) + Thu(N) - Chi(N)
       ↓
  Số dư cuối của Kỳ N trở thành carryForwardBalance(N+1)
       ↓
Kỳ N+1 (OPEN)
  Bắt đầu với carryForwardBalance = Số dư cuối Kỳ N
```

---

## Thiết kế kỹ thuật (ADR-002)

### Nguyên tắc: Calculator là pure function

`carryForwardBalance` được **inject từ caller** (`fund-periods.service`) vào `CalculateOptions`:

```typescript
// fund-periods.service.ts — ĐÚNG
const options: CalculateOptions = {
  contributions: [...],
  expenses: [...],
  carryForwardBalance: previousPeriod?.finalBalance ?? 0,  // inject ở đây
  memberCount: members.length,
  attendanceData: [...],
};

const result = financeCalculator.calculate(options);
```

```typescript
// finance.calculator.ts — Calculator không tự query DB
calculate(options: CalculateOptions) {
  const { carryForwardBalance, contributions, expenses } = options;
  const totalIncome = contributions.reduce((sum, c) => sum + c.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = carryForwardBalance + totalIncome - totalExpense;
  return { balance, totalIncome, totalExpense };
}
```

### Tại sao thiết kế vậy?

- Calculator là **pure function**: cùng input → cùng output, dễ test
- Dễ viết unit test vì không phụ thuộc DB
- Caller chịu trách nhiệm lấy đúng giá trị `carryForwardBalance`

---

## Khi nào carryForwardBalance = 0?

- Kỳ đầu tiên của CLB (chưa có kỳ nào FINALIZED trước đó)
- Admin muốn bắt đầu lại từ đầu (reset — trường hợp đặc biệt)

---

## Lưu ý

- Chỉ kỳ FINALIZED mới tính carry forward
- Kỳ CLOSED chưa carry forward
- Không lấy carry forward từ Quỹ Phụ
