# UDP-01 Amendment #01 — Workspace State Definition of DoD

## 1. Status

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Design Constitution Amendment
- **Scope:** All UI Workspaces from UI-03 onward
- **Implementation:** Documentation only

## 2. Decision

Từ UI-03 trở đi, mọi Workspace chỉ được xem là **Implementation Complete** khi có đủ ba state:

- Loading State
- Empty State
- Error State

Nếu thiếu một trong ba state này, Claude Code **không được ghi**:

```text
READY FOR CODEX UI AUDIT
```

## 3. Loading State

Bắt buộc:

- Dùng shared `LoadingState`.
- Không tự tạo spinner riêng nếu Foundation đã có `LoadingState`.
- Bao phủ initial load.
- Bao phủ refresh/sync nếu màn có refresh/sync.
- Không làm thay đổi business logic.
- Không gọi API mới nếu không cần.

## 4. Empty State

Bắt buộc:

- Dùng shared `EmptyState`.
- Phân biệt:
  - No data
  - Filter/search no result
  - Not configured / not available nếu phù hợp
- Không để màn trắng.
- Có CTA phù hợp nếu backend hỗ trợ.
- Không bịa số liệu/dữ liệu.

## 5. Error State

Bắt buộc có Error Workspace rõ ràng:

- icon
- title
- description
- retry action nếu có thể
- retry chỉ gọi lại API hiện có
- không tạo endpoint mới
- không thay đổi API contract
- không đổi business logic

## 6. Workspace State Matrix

| State | Required Component | Required Content | Allowed Action | Forbidden |
|---|---|---|---|---|
| Loading | `LoadingState` | title/description optional | none / retry disabled | custom spinner nếu không cần |
| Empty | `EmptyState` | title/description | CTA hợp lệ | fake data |
| Error | `EmptyState` / Error pattern | title/description/error context | retry | new API / hidden failure |

## 7. Definition of Done Update

Một UI Workspace chỉ được xem là **Implementation Complete** khi PASS:

- Desktop layout
- Mobile layout
- Feature parity
- Accessibility
- Loading State
- Empty State
- Error State
- Token compliance
- Shared component reuse
- Business logic unchanged
- Backend unchanged
- Finance unchanged
- Execution unchanged
- No unrelated screen changes

## 8. Design Pre-Audit Checklist Update

Checklist bắt buộc:

- [ ] Loading State implemented
- [ ] Empty State implemented
- [ ] Error State implemented
- [ ] Filter-empty state implemented nếu có filter/search
- [ ] Retry action uses existing API
- [ ] No fake data
- [ ] No custom duplicate state component
- [ ] No backend/API/finance/execution changes

Nếu bất kỳ mục nào chưa PASS:

```text
READY FOR CODEX UI AUDIT
```

không được ghi.

## 9. Scope of Application

Áp dụng cho:

- UI-03 và các màn UI sau
- PickleFund
- AI Commerce Platform
- AI Organization Platform
- Future AI products

## 10. Relationship with UDP-01

Amendment #01 mở rộng UDP-01.

Không thay thế UDP-01.

Không định nghĩa lại Design Tokens.

Không định nghĩa lại Component Library.

## 11. Relationship with GOV-01

Tuân thủ GOV-01.

Không định nghĩa lại Governance Rules.

## 12. Decision Outcome

Sau Codex PASS + Commit/Tag/Push:

Workspace State DoD trở thành bắt buộc cho mọi UI Workspace tiếp theo.
