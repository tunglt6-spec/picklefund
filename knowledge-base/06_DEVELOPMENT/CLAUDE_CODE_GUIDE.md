# Hướng dẫn Claude Code — PickleFund

> **Mục đích:** Hướng dẫn Claude Code làm việc đúng với PickleFund  
> **Đối tượng:** Claude Code, AI coding assistant

---

## 1. Context bắt buộc đọc trước khi làm bất kỳ task nào

```
1. knowledge-base/00_START_HERE/PROJECT_OVERVIEW.md
2. knowledge-base/03_FINANCE_ENGINE/FINANCE_RULES.md
3. knowledge-base/08_ADR/ — ADR liên quan đến task
```

---

## 2. Quy tắc tuyệt đối (KHÔNG ĐƯỢC VI PHẠM)

### Nghiệp vụ tài chính
- **Không sửa** `financial-calculator.service.ts` logic cốt lõi
- **Không sửa** database schema
- **Không thay đổi** công thức: `Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ`
- **Không cộng** Quỹ Phụ vào Tổng tài sản CLB

### Deploy & Secrets
- **Không commit** `.env`, `.env.production`
- **Không commit** trực tiếp lên VPS
- **Không push** khi chưa được yêu cầu

### Code style
- **Không thêm** tính năng ngoài scope
- **Không refactor** code không liên quan
- **Không thêm** comments thừa

---

## 3. Khi làm task UI/Frontend

**Kiểm tra trước:**
- NavLink dùng Tailwind callback, không dùng JS event handlers
- Text số tiền phải có `break-words whitespace-normal max-w-full`
- Mobile breakpoint: `text-[20px] sm:text-[24px]` thay vì cứng 1 size
- Không expose port database trong docker-compose

**Pattern chuẩn:**
```tsx
// Finance card balance — không overflow
<p className="text-xl sm:text-2xl font-bold tabular-nums break-words whitespace-normal max-w-full">

// NavLink active — không mất style sau hover
className={({ isActive }) => cn(...)}
style={({ isActive }) => isActive ? { background: 'linear-gradient(...)' } : {}}
```

---

## 4. Khi làm task Backend

**Kiểm tra trước:**
- Calculator là pure function — không gọi DB
- carryForwardBalance inject qua CalculateOptions
- Mock chain dùng `mockResolvedValueOnce` khi cần nhiều giá trị

**Chạy tests sau khi sửa backend:**
```bash
cd backend && npm test -- --runInBand
# Kỳ vọng: 175/175 PASS (hoặc nhiều hơn)
```

---

## 5. Khi làm task DevOps

**Kiểm tra:**
- `env_file: required: false` cho postgres và backend
- Nginx dùng upstream name, không dùng port
- Telegram messages dùng `printf '...\n...'` không dùng literal newlines
- `git clean` luôn có: `-e .env -e .env.production -e "*.sql" -e "ssl/"`

---

## 6. Prompt chuẩn cho Claude Code

Xem [10_PROMPTS/CLAUDE_SYSTEM_PROMPTS.md](../10_PROMPTS/CLAUDE_SYSTEM_PROMPTS.md) để lấy prompt đầy đủ.

---

## 7. Sau khi hoàn thành task

Báo cáo theo format:
```
## Kết quả
- File đã thay đổi: [list]
- Logic đã thay đổi: [mô tả ngắn]
- Tests: [kết quả nếu có]
- Không thay đổi: [những gì KHÔNG sửa]
```
