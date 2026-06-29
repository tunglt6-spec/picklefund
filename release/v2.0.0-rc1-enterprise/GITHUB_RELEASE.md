# PickleFund v2.0.0-rc1 — Release Candidate 1

> **Release date:** 2026-06-29
> **Status:** RC1 Feature Freeze ✅
> **Tests:** 175/175 PASS ✅
> **Codex Audit:** PASS ✅

---

## Highlights

### 💰 Finance Engine — Finalized

Công thức nghiệp vụ tài chính đã được chốt và kiểm định:

```
Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
```

- **Quỹ Chính** — quỹ thu từ thành viên, tính sau khi trừ chi phí
- **Quỹ Phụ** — quỹ phụ độc lập (minigame, thưởng, tài trợ) — KHÔNG cộng vào Tổng tài sản
- **Số dư chuyển kỳ (Carry Forward)** — số dư Quỹ Chính từ kỳ đã đóng/finalized gần nhất, cho phép âm
- **Club Assets** — tổng tài sản CLB = Quỹ Chính + Carry Forward, từ backend làm source of truth

### 📊 Finance Design System — Đồng bộ toàn bộ UI

- Chuẩn hóa nhãn: **Quỹ Chính** / **Quỹ Phụ** trên tất cả màn hình
- Shared Finance Component Library: `FundSummaryCard`, `FinanceKpiGrid`, `FinanceFormula`, `FinanceStatusBadge`, `FinanceLegend`
- FundPeriods, Contributions, Expenses, Reports, TreasurerDashboard, MobileKpiCard — đồng nhất

### 🎨 Premium Dashboard

- Finance KPI cards với gradient theo loại quỹ (Emerald · Purple · Orange · Blue)
- Công thức Tổng tài sản hiển thị đầy đủ breakdown
- Health Score gauge, AI Insight chips (Maika API integration)
- Responsive 360px → 1920px

### 🔒 RC1 Feature Freeze Hotfix

- Frontend không còn tự tính Carry Forward — dùng trực tiếp `carryForward.balance` từ backend
- TreasurerDashboard: "Tổng tài sản CLB" dùng đúng công thức (không cộng Quỹ Phụ)
- Loại bỏ toàn bộ `Math.max(0, ...)` clamp trên carry forward — số âm hiển thị đúng

### ⚙️ Deployment Pipeline V2

- GitHub Actions V2 với `git fetch + git reset --hard` (không dùng `git pull`)
- `git clean` có đầy đủ exclusion (`.env`, `*.sql`, `ssl/`)
- `set -a; source .env; set +a` trước `pg_dump`
- Backup verify > 0 bytes, health check 2 endpoints
- Rollback tự động khi deploy fail

### 📦 Enterprise Release Package

- 28 files tài liệu trong `release/v2.0.0-rc1-enterprise/`
- Installation Guide, Deployment Guide, Architecture Overview, Security Guide
- Admin Manual, User Manual, API Handbook
- Audit Report, Acceptance Checklist (47 mục PASS), Release Checklist

### 📚 Enterprise Knowledge Base

- 76 Markdown files trong `knowledge-base/`
- 11 directories: Product · Architecture · Finance Engine · AI Platform · Operations · Development · Troubleshooting · ADR · Commercial · Prompts
- Finance Rules, ADR-001 → ADR-005, Prompt Library 20 prompts chuẩn

---

## Thay đổi kỹ thuật chính

| Phạm vi | Thay đổi |
|---|---|
| Finance Engine | `carryForward` inject qua `CalculateOptions`, pure function, không DB call |
| Frontend KPI | Dùng `GET /fund-periods/{id}/summary` làm source of truth |
| NavLink | Tailwind className callback, không dùng `classList.contains` |
| Docker | `env_file: required: false`, PostgreSQL/Redis không expose port |
| Backend | Argon2 password hashing, JWT + refresh token |

---

## Dữ liệu production xác nhận

| Chỉ số | Giá trị |
|---|---|
| Quỹ Chính | -560.000 đ |
| Quỹ Phụ | 0 đ |
| Số dư chuyển kỳ | -1.184.000 đ |
| **Tổng tài sản CLB** | **-1.744.000 đ** |

---

## Kiểm định chất lượng

| Kiểm tra | Kết quả |
|---|---|
| Backend tests | ✅ 175/175 PASS |
| Frontend lint | ✅ 0 errors |
| Frontend build | ✅ 3109 modules |
| Docker Compose config | ✅ Valid |
| Finance formula audit | ✅ Đúng công thức |
| Codex Audit (6 blockers) | ✅ Tất cả PASS |

---

## Upgrade notes

- Không breaking change API
- Không thay đổi database schema
- Env vars: `VITE_API_URL` phải trỏ đến API subdomain (`https://api.picklefund.uk`)
- Docker: dùng `env_file: path: .env, required: false`

---

## Contributors

- **tunglt6-spec** — Lead Developer, Product Owner

---

*PickleFund V2.0 RC1 — Enterprise Club Finance Management Platform*
