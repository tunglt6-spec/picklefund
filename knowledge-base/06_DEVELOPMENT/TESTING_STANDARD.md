# Tiêu chuẩn Testing — PickleFund

> **Mục đích:** Quy định cách viết và chạy tests  
> **Đối tượng:** Developer, AI coding assistant

---

## 1. Trạng thái hiện tại (V2.0 RC1)

- **Backend:** 175/175 tests PASS
- **Framework:** Jest + NestJS Testing module
- **Frontend:** Chưa có unit test — build và lint là kiểm tra chính

---

## 2. Quy tắc viết test Backend

### 2.1 Mock chain
```typescript
// ✅ ĐÚNG — khi cùng 1 mock gọi 2 lần với kết quả khác nhau
prisma.fundPeriod.findFirst
  .mockResolvedValueOnce(currentPeriod)  // call 1
  .mockResolvedValueOnce(previousPeriod); // call 2

// ❌ SAI — mockResolvedValue trả cùng giá trị cho mọi lần gọi
prisma.fundPeriod.findFirst.mockResolvedValue(currentPeriod);
// → Call 2 cũng trả currentPeriod → test sai
```

### 2.2 Test carryForward
```typescript
it('should not include miniFund in clubAssets', () => {
  const result = calculator.calculate(entries, {
    carryForwardBalance: 500_000
  });
  expect(result.clubAssetsBalance).toBe(result.commonBalance + 500_000);
  expect(result.clubAssetsBalance).not.toBe(result.commonBalance + result.miniBalance);
});
```

### 2.3 Cấu trúc test file
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

---

## 3. Chạy tests

```bash
# Tất cả tests
cd backend && npm test

# Chạy sequential (tránh race condition)
npm test -- --runInBand

# Xem coverage
npm test -- --coverage

# Chỉ test 1 file
npm test -- financial-calculator.service.spec.ts
```

---

## 4. Khi nào phải thêm test

- Khi thêm logic nghiệp vụ tài chính mới → **bắt buộc**
- Khi fix bug → nên thêm test cover bug đó
- Khi refactor service → đảm bảo tests cũ vẫn PASS

---

## 5. Test modules quan trọng

| Module | Tests quan trọng |
|---|---|
| `financial-calculator.service.spec.ts` | carryForward, clubAssets, công thức |
| `fund-periods.service.spec.ts` | tìm kỳ trước, tính summary |
| `auth.service.spec.ts` | login, refresh token, Argon2 |

---

## 6. Mục tiêu

- Backend: duy trì 100% tests PASS trước mỗi commit vào main
- Không giảm số lượng test qua các phiên bản
- Thêm test khi thêm tính năng mới vào finance engine
