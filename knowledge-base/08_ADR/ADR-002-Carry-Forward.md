# ADR-002: carryForward Pattern — Inject từ Caller

**Ngày:** 2026-06  
**Trạng thái:** ✅ Accepted

---

## Bối cảnh

PickleFund cần tính `Số dư chuyển kỳ` (carryForward) — số dư Quỹ Chính từ kỳ tài chính liền trước đã đóng, để cộng vào Tổng tài sản CLB của kỳ hiện tại.

Câu hỏi thiết kế: `carryForwardBalance` nên được tính ở đâu?

**Option A:** Tính trong `FinancialCalculatorService.calculate()` — calculator tự gọi DB để tìm kỳ trước.

**Option B:** Inject từ caller — caller (`fund-periods.service.ts`) tra cứu DB và truyền vào qua interface.

---

## Quyết định

**Option B: inject `carryForwardBalance` từ caller qua `CalculateOptions`.**

```typescript
// Interface
interface CalculateOptions {
  carryForwardBalance?: number;
}

// Calculator — pure function, không gọi DB
calculate(entries: FinancialEntry[], options: CalculateOptions = {}) {
  const { carryForwardBalance = 0 } = options;
  const clubAssetsBalance = commonBalance + carryForwardBalance;
  return { ..., carryForwardBalance, clubAssetsBalance };
}

// Caller — tra cứu DB và inject
async calculateSummary(periodId: string) {
  const prevPeriod = await this.findClosedPeriodBefore(periodId);
  const carryForwardBalance = prevPeriod?.commonBalance ?? 0;
  return this.calculator.calculate(entries, { carryForwardBalance });
}
```

---

## Lý do

1. **Pure function:** Calculator không có DB dependency → không có side effect → dễ test
2. **Existing tests:** 170 tests cũ không thay đổi — calculator interface không breaking change
3. **Separation of concerns:** Data fetching (service) tách khỏi calculation (calculator)
4. **Testability:** Test calculator chỉ cần mock `CalculateOptions`, không cần mock Prisma

---

## Hậu quả

**Tích cực:**
- 170 existing tests PASS không thay đổi
- Calculator dễ test với unit test thuần
- Dễ thay đổi logic tìm kỳ trước mà không ảnh hưởng calculator
- Rõ ràng ai chịu trách nhiệm gì

**Tiêu cực:**
- Caller cần biết cách truyền carryForwardBalance
- Nếu quên truyền → default = 0 (có thể gây nhầm, nhưng hành vi mặc định an toàn)

---

## Các phương án đã xem xét

**Option A: Calculator tự gọi DB**  
- Calculator có DB dependency → không còn là pure function
- 170 existing tests bị phá vỡ (cần mock Prisma)
- Khó test và maintain. **Bị từ chối.**

---

## Mock pattern trong tests

```typescript
// Khi mock cần trả giá trị khác nhau cho 2 lần gọi
prisma.fundPeriod.findFirst
  .mockResolvedValueOnce(currentPeriod)   // call 1: lấy period hiện tại
  .mockResolvedValueOnce(previousPeriod); // call 2: lấy period trước để tính carryForward

// KHÔNG dùng mockResolvedValue (trả cùng giá trị cho mọi lần gọi)
```
