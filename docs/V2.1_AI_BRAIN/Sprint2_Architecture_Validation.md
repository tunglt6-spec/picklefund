# Sprint 2 Architecture Validation — Epic 2.1
## PickleFund V2.1 — Memory Core Foundation

---

**Ngày:** 2026-06-29
**Epic:** 2.1 — Memory Core Foundation
**Đối chiếu:** `Sprint2/01..08`, `MEMORY_ARCHITECTURE_LOCK.md`, Enterprise Handbook v1.0

---

## 1. Tuân thủ Architecture Lock (Sprint 2)

| Yêu cầu thiết kế | Triển khai Epic 2.1 | Đạt |
|---|---|---|
| Memory Layer tách qua Memory API (AD-S2-01) | `MemoryController` `/memory`, độc lập | ✅ |
| Vector Store provider-agnostic (AD-S2-02/06) | Epic 2.1 chỉ làm Memory Core; repository là abstraction, vector deferred | ✅ (scope) |
| Không lưu số liệu tài chính (AD-S2-03) | Memory không có field/logic tài chính | ✅ |
| Một API/hook dùng chung mọi consumer (AD-S2-04) | `/memory` shared Desktop/Mobile/Maika/Lisa/Hermes | ✅ |
| Scope từ JWT principal (AD-S2-11) | ownerId ép từ principal; access enforced | ✅ |

### SESSION ownership rule (hotfix 1)
- SESSION `ownerId = ${clubId|none}:${userId}:${sessionId}` (composite), nhất quán create/load/update/delete/list.
- `assertAccess` kiểm tra prefix `${club}:${user}:` → **user A không đọc/sửa/xoá được SESSION của user B; club A ≠ club B**. SESSION KHÔNG public.
- Đã có test negative ownership + positive owner + SUPER_ADMIN bypass.

### Deep immutability (hotfix 2)
- Save/update: deep clone input (`structuredClone`) + deep freeze đệ quy (root + tags + metadata + nested).
- `update()` không mutate object cũ; object load về không mutate được. Đã có test nested.

### Config source (hotfix 3)
- `MEMORY_MAX_CONTENT_LENGTH`, `MEMORY_DEFAULT_TTL_SECONDS` từ ConfigService = runtime source of truth; có trong `.env.example`.
- DTO dùng `MEMORY_ABSOLUTE_MAX_CONTENT_LENGTH` (hard cap kỹ thuật), không hardcode lệch config.

## 2. Tuân thủ Enterprise Handbook v1.0

| Trục | Kết quả |
|---|---|
| Source of Truth | Memory KHÔNG tính nghiệp vụ; tài chính = Finance Engine RC1 ONLY |
| Desktop/Mobile Consistency | Cùng API `/memory`, cùng response model (`ok()`), không API riêng |
| Configuration | `MEMORY_DEFAULT_TTL_SECONDS`, `MEMORY_MAX_CONTENT_LENGTH` từ `.env`; không hardcode |
| Security | Scope theo principal; tenant isolation; không log nội dung nhạy cảm |
| Definition of Done | Build PASS · 297 test PASS · coverage ≥90% (cả 4 metric) · docs cập nhật |
| Release Gate | Checkpoint trước; KHÔNG commit/push/tag turn này |

## 3. Deviations & Justifications

### D-S2-01: In-memory repository làm default
- **Thiết kế:** repository chỉ là abstraction; persistence (SQLite/Postgres/Qdrant) deferred.
- **Triển khai:** thêm `InMemoryMemoryRepository` (volatile) làm binding mặc định để module **chạy được + test được** mà không phụ thuộc DB.
- **Justification:** Không phải persistence backend nào trong danh sách cấm; nhất quán với pattern in-memory Sprint 1 (telemetry/token accounting, AD-S1-01). Đổi sang persistence chỉ cần thay binding `MEMORY_REPOSITORY`.
- **Risk:** LOW (mất dữ liệu khi restart — chấp nhận ở foundation).

### D-S2-02: Branch coverage (post-hotfix)
- Sau hotfix: **cả 4 metric ≥90%** (Stmts 95% · Branch 90.19% · Funcs 100% · Lines 96.04%).
- `memory.dto.ts` (decorator metadata) + `memory.module.ts` (DI wiring) vẫn kéo branch nhưng tổng đã ≥90%.
- **Risk:** LOW.

## 4. Isolation Verification

```
✅ MemoryManager KHÔNG import finance/harness/provider
✅ Không SUM()/balance=/contribution-/expense trong memory
✅ Không embedding/vector/semantic/RAG/ranking/compression
✅ Không Maika/Lisa/Hermes
✅ Không sửa Finance Engine RC1 / DB schema / Desktop UI / Mobile UI
✅ Chỉ thêm wiring MemoryModule vào app.module.ts
```

## 5. Kết luận

```
Epic 2.1 Architecture Validation = PASS
```

Sẵn sàng cho Codex Epic 2.1 Audit.

---

*PickleFund V2.1 — Sprint 2 Epic 2.1 Architecture Validation*
