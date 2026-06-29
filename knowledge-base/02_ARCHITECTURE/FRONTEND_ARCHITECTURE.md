# Kiến trúc Frontend PickleFund

**Mục đích:** Mô tả kiến trúc React/Vite frontend  
**Đối tượng:** Frontend Developer  
**Cập nhật:** 2026-06-29

---

## Stack công nghệ

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | Latest | Type safety |
| Vite | Latest | Build tool |
| Tailwind CSS | v3 | Styling |
| React Router | v6 | Routing |
| React Query | v5 | Server state |
| Zustand | v4 | Client state |
| Axios | Latest | HTTP client |

---

## Cấu trúc thư mục

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       ← Dark sidebar #0F1629
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── ui/                   ← Shared UI components
│   ├── finance/              ← Finance-specific components
│   └── mobile/               ← Mobile-specific components
├── pages/
│   ├── auth/
│   ├── admin/
│   │   └── ClubDashboard.tsx ← Dashboard chính
│   ├── finance/
│   └── members/
├── hooks/                    ← Custom React hooks
├── services/                 ← API client calls
├── stores/                   ← Zustand stores
├── types/                    ← TypeScript types
└── utils/                    ← Utility functions
```

---

## Quy tắc NavLink (quan trọng)

**ĐÚNG:** Dùng `className` callback
```tsx
<NavLink
  to="/dashboard"
  className={({ isActive }) =>
    isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
  }
>
  Dashboard
</NavLink>
```

**SAI:** Không dùng `classList.contains('active')`

Lý do: NavLink của React Router v6 không tự thêm class `active` theo cách truyền thống. Phải dùng callback prop.

---

## Sidebar Design (V2.0)

- Background: `#0F1629` (dark navy)
- Active item: `bg-white/10` + white text
- Inactive item: `text-gray-400`
- Hover: `hover:text-white hover:bg-white/5`

---

## Mobile-first Policy

Mỗi tính năng mới PHẢI được phát triển song song trên mobile và desktop:
- Dùng Tailwind responsive prefix: `sm:`, `md:`, `lg:`
- KPI card mobile: `text-[20px] sm:text-[24px]` (không dùng `text-[26px]` — gây overflow)
- FundCard: phải có `min-w-0` và `break-words` để tránh overflow trên mobile

---

## API Client

Frontend gọi API qua `VITE_API_URL` environment variable:
- Development: `http://localhost:3000`
- Production: `https://api.picklefund.uk`

**Lưu ý:** `VITE_API_URL` phải trỏ đến API subdomain, không phải relative path.
