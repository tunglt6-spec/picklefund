# UI Prompts — PickleFund

> **Mục đích:** Prompt chuẩn cho các task UI/Frontend  
> **Đối tượng:** Frontend Developer, Claude Code

---

## Prompt 1: Tạo component mới

```
Bạn là Senior Frontend Engineer cho PickleFund.

Tạo component React mới: [TÊN COMPONENT]

Yêu cầu:
- TypeScript + Tailwind CSS
- Responsive: 375px → 1440px
- Không overflow text/number
- Props interface rõ ràng

Ràng buộc:
- KHÔNG sửa logic nghiệp vụ tài chính
- KHÔNG sửa file ngoài scope
- KHÔNG commit

Style chuẩn PickleFund:
- Sidebar: #0F1629
- Primary gradient: #4F46E5 → #06B6D4
- Quỹ Chính: emerald #059669 → #0D9488
- Quỹ Phụ: purple #7C3AED → #4F46E5
- Carry Forward: orange #D97706 → #EA580C
- Tổng tài sản: blue #2563EB → #06B6D4
```

---

## Prompt 2: Fix overflow UI

```
Fix overflow issue trong PickleFund:

File: [PATH]
Vấn đề: [MÔ TẢ OVERFLOW]

Pattern fix chuẩn:
- Balance text: className="text-xl sm:text-2xl font-bold tabular-nums break-words whitespace-normal max-w-full"
- Container: className="min-w-0 flex flex-col"
- Formula amount: className="text-[11px] tabular-nums text-right break-words min-w-0 max-w-[55%]"
- Mobile KPI: className="text-[20px] sm:text-[24px] font-[800] break-words whitespace-normal max-w-full"

KHÔNG sửa logic ngoài CSS/className.
```

---

## Prompt 3: Thêm trang/route mới

```
Thêm trang mới vào PickleFund:

Tên trang: [TÊN]
Route: /[route]
Mô tả: [CHỨC NĂNG]

Yêu cầu:
1. Tạo file page: frontend/src/pages/[path]/[PageName].tsx
2. Thêm route vào App.tsx hoặc router config
3. Thêm NavLink vào Sidebar (nếu cần)
4. Responsive hoàn chỉnh

NavLink pattern chuẩn (Sidebar.tsx):
className={({ isActive }) => cn(
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
  isActive ? 'text-white' : 'text-white/50 hover:text-white/90 hover:bg-white/[0.07]'
)}
style={({ isActive }) => isActive
  ? { background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' }
  : {}
}
```

---

## Prompt 4: Redesign component theo spec

```
Bạn là Senior Product UI Engineer cho PickleFund.
Nhiệm vụ: Redesign [COMPONENT] theo spec sau.

[DÁN SPEC VÀO ĐÂY]

Ràng buộc:
- KHÔNG thêm chức năng mới
- KHÔNG sửa nghiệp vụ tài chính
- KHÔNG sửa backend
- KHÔNG commit, KHÔNG push
- Kiểm tra responsive 375px → 1440px sau khi sửa
```
