# ADR-004: Premium Dashboard — Dark Sidebar + Gradient Cards

**Ngày:** 2026-06  
**Trạng thái:** ✅ Accepted

---

## Bối cảnh

PickleFund V2.0 cần nâng cấp giao diện từ MVP (white cards, light sidebar) lên chuẩn thương mại Premium SaaS. Mục tiêu: trông chuyên nghiệp, phân biệt rõ từng loại quỹ bằng màu sắc.

---

## Quyết định

**Dark sidebar + 4 gradient KPI cards:**

| Card | Gradient | Ý nghĩa |
|---|---|---|
| Quỹ Chính | Emerald `#059669 → #0D9488` | Quỹ vận hành chính |
| Quỹ Phụ | Purple `#7C3AED → #4F46E5` | Quỹ phụ trợ |
| Số dư chuyển kỳ | Orange `#D97706 → #EA580C` | Carry Forward |
| Tổng tài sản CLB | Blue `#2563EB → #06B6D4` | Net Asset |

**Sidebar:** Background `#0F1629` (dark navy), NavLink active: gradient `#4F46E5 → #06B6D4`.

---

## Lý do các quyết định kỹ thuật

**NavLink dùng Tailwind callback thay JS event handlers:**  
`classList.contains('active')` không đáng tin cậy với React Router NavLink. `onMouseEnter/Leave` JS override inline `style` được set bởi React → mất active style sau hover. Fix: Tailwind `className={({ isActive }) => ...}` + `style={({ isActive }) => ...}` callback.

**Overflow guard cho số tiền:**  
Số tiền lớn (8-9 chữ số VND) có thể tràn ngang trên mobile. Bắt buộc: `min-w-0`, `break-words`, `whitespace-normal`, `max-w-full`.

**Mobile KPI responsive:**  
`text-[26px]` cứng gây overflow trên iPhone SE (375px). Fix: `text-[20px] sm:text-[24px]`.

**Animation stagger:**  
4 cards fade-in stagger 0/80/160/240ms → hiệu ứng đẹp hơn không chói mắt.

---

## Hậu quả

**Tích cực:**
- Giao diện thương mại, phân biệt rõ các loại quỹ
- Không mất active style khi hover
- Không overflow trên mobile

**Tiêu cực:**
- CSS phức tạp hơn MVP
- Cần test kỹ responsive

---

## Quy tắc bất biến

- Màu gradient 4 card **không thay đổi** trừ khi có ADR mới
- NavLink active **không dùng** `classList.contains('active')` hoặc JS event handlers
- Số tiền **phải có** `break-words whitespace-normal max-w-full`
