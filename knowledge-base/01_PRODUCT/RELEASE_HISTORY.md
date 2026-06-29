# Lịch sử phiên bản PickleFund

**Mục đích:** Ghi lại lịch sử release  
**Đối tượng:** Dev, PM, Ops  
**Cập nhật:** 2026-06-29

---

## V2.0 RC1 — 2026-06-28 (Current Baseline)

### Tính năng mới
- Finance Dashboard Premium (dark sidebar #0F1629, gradient KPI cards)
- Tách hoàn toàn Quỹ Chính vs Quỹ Phụ (ADR-001)
- Carry Forward tự động (ADR-002)
- Deployment Pipeline V2 với git reset --hard, DB backup, health check + auto rollback (ADR-003)

### Fixes
- Fix double-count totalExpense trong báo cáo
- Fix env_file required: false trong Docker Compose
- Fix YAML literal newlines trong Telegram deploy notifications
- Fix NavLink active state dùng className callback (ADR-004)
- Fix MobileKpiCard overflow text
- Fix FundCard overflow với min-w-0 + break-words

### Kỹ thuật
- Backend tests: 175/175 PASS
- Auth: Argon2 + Refresh Token
- DB: PostgreSQL 16

---

## V2.0 Beta — 2026-06 (trước RC1)

- SaaS multi-tenant refactor
- Finance engine cơ bản
- Authentication với JWT

---

## V1.x — (Legacy)

- Phiên bản ban đầu, không phải SaaS
- Single-tenant
- Chưa có Quỹ Phụ riêng biệt

---

## Hotfix đang pending (2026-06-29)

- Fix double-count totalExpense (đã fix trong code, chưa commit chính thức)
- Xem [V2.0 RC1 Release](../knowledge-base/) để biết chi tiết
