# AUTH-01 — Enterprise Read-Only Member Role

> **Authorization transaction** — bổ sung mô hình phân quyền `MEMBER_FULL_VIEW` (thành viên xem full sản phẩm, read-only). **KHÔNG** phải Design transaction, **KHÔNG** phải Execution transaction. **Không** mở Epic 4.2 / Execution Program / AI Execution. Tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md) (Product Governance); là **docs-only** (đặc tả) — implementation ở transaction riêng sau khi Codex PASS.

**Mã:** AUTH-01 · **Loại:** Authorization Specification · **State:** ✅ **Accepted / Codex PASS / CLOSED** · **Ngày:** 2026-07-02

> ✅ **State = Accepted / Codex PASS / CLOSED** (Final Audit PASS + Commit/Tag/Push). Đây là **đặc tả** (docs-only) — **chưa** thay đổi code; implementation ở **AUTH-IMPL-01** (transaction riêng). MEMBER_FULL_VIEW = Official read-only role; MEMBER cũ = Deprecated.

---

## 1. Mục tiêu

- Bổ sung role **`MEMBER_FULL_VIEW`**: thành viên được **trải nghiệm full sản phẩm**, **view toàn bộ chức năng giống Admin**, nhưng **không** create/update/delete/import/admin-export/approve/execute/settings.
- Chuẩn hoá phân quyền **trước** khi mở AI Platform Framework / Execution Program.
- Bảo đảm **read-only an toàn** ở cả UX (frontend) và enforcement (backend).

## 2. Role Model

Role chính thức:

| Role | Vai trò |
|---|---|
| **SUPER_ADMIN** | Toàn quyền hệ thống |
| **ADMIN** | Quản trị trong club/tenant |
| **MEMBER_FULL_VIEW** | Xem full sản phẩm, **read-only** |

**MEMBER (cũ):**
- **Deprecated** — không dùng làm role nghiệp vụ chính.
- Nếu còn trong DB / legacy code → **map về `MEMBER_FULL_VIEW`** ở bước implementation sau (không thực hiện trong AUTH-01 docs-only).

> Danh mục role hiện tại của Product (SUPER_ADMIN / CLUB_ADMIN / CLUB_TREASURER / CLUB_MEMBER) sẽ được đối chiếu & ánh xạ ở AUTH-IMPL-01 — AUTH-01 chỉ đặc tả mô hình đích, không đổi code/DB.

## 3. Permission Matrix

| Năng lực | SUPER_ADMIN | ADMIN | MEMBER_FULL_VIEW |
|---|:---:|:---:|:---:|
| View all (dashboard/member/attendance/finance/reports/minigame/AI/notifications) | ✅ (toàn hệ thống) | ✅ (trong club/tenant) | ✅ (read-only) |
| Create | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ (theo quyền club) | ❌ |
| Import | ✅ | ✅ | ❌ |
| Admin export (dữ liệu nhạy cảm) | ✅ | ✅ | ❌ |
| Export **preview** read-only (nếu backend cho phép) | ✅ | ✅ | ✅ (nếu backend cho phép) |
| Approve | ✅ | ✅ (theo quyền) | ❌ |
| Execute / Dispatch / Workflow | ✅ | — (theo Execution Gate) | ❌ |
| Finance write | ✅ | ✅ | ❌ |
| Tournament result write | ✅ | ✅ | ❌ |
| Member write | ✅ | ✅ | ❌ |
| User management | ✅ | — (nếu được phân quyền) | ❌ |
| System settings / config | ✅ | ❌ (nếu không được phân quyền system-level) | ❌ |
| API keys / AI config (LiteLLM/OpenRouter/Ollama) | ✅ | — | ❌ |

**MEMBER_FULL_VIEW được xem:** full dashboard · members · attendance · finance · reports · minigame/tournament · AI Workspace · notifications · export preview read-only (nếu backend cho phép).

**MEMBER_FULL_VIEW KHÔNG được:** Create · Update · Delete · Import · Admin export (dữ liệu nhạy cảm) · Approve · Execute · Dispatch · Workflow · Finance write · Tournament result write · Member write · User management · Settings · API keys · AI config · LiteLLM/OpenRouter/Ollama config.

## 4. UX Rule

- **Không ẩn toàn bộ giao diện Admin.** MEMBER_FULL_VIEW **nhìn thấy toàn bộ module** (full trải nghiệm).
- Mọi **action ghi dữ liệu** phải:
  - **disabled**,
  - có **tooltip:** *"Bạn đang ở chế độ Xem. Chỉ Quản trị viên mới được phép chỉnh sửa."*
- **Không** fake quyền · **không** cho phép submit form disabled · **không** gọi API write từ UI.

## 5. Security Rule

- Frontend disable **chỉ là UX** — không phải cơ chế bảo mật.
- **Backend BẮT BUỘC enforce permission.** Mọi API write phải kiểm tra role.
- MEMBER_FULL_VIEW gọi write API trực tiếp → **`403 Forbidden`**.
- Tenant isolation & scope theo GOV-01 vẫn áp dụng.

## 6. AI Safety

MEMBER_FULL_VIEW **được xem:** AI Insight · AI Recommendation · AI History · AI Workspace (read-only).

MEMBER_FULL_VIEW **KHÔNG được:** Approve · Reject · Execute · Dispatch · Send notification · Trigger workflow.

> Đồng bộ ràng buộc AI read-only/governance của Product; Execution thuộc Execution Program (BLOCKED).

## 7. Migration Strategy (thực hiện ở AUTH-IMPL-01, sau AUTH-01 PASS)

1. Add role `MEMBER_FULL_VIEW`.
2. Replace UI references `MEMBER` → `MEMBER_FULL_VIEW`.
3. Map legacy `MEMBER` → `MEMBER_FULL_VIEW`.
4. Update seed / admin-created member accounts.
5. Add permission guard (backend).
6. Add backend **403** tests cho write API.
7. Add frontend **disabled-state** tests.

> **Không** thực hiện migration trong AUTH-01 (docs-only).

## 8. Governance

- AUTH-01 phải **Codex Audit PASS trước implementation**.
- Sau AUTH-01 PASS: **Commit · Tag · Push**.
- Sau đó mới mở **AUTH-IMPL-01** (hoặc tương đương implementation transaction).
- AUTH-01 **không** mở Epic 4.2 / Execution Program / AI Execution; **không** thay đổi APFG/EGOV/DESIGN-02.

## 9. Scope Boundary

AUTH-01 (docs-only) **không** sửa: frontend · backend · API · DB · Execution · AI Runtime · APFG · EGOV · DESIGN-02. Chỉ đặc tả mô hình phân quyền đích + matrix + rule + migration plan.

---

> 🧾 AUTH-01 — Enterprise Read-Only Member Role (🟡 Proposed / Pending Codex Audit). Authorization spec (docs-only). MEMBER_FULL_VIEW = full-view read-only; write bị chặn ở UX (disabled + tooltip) và enforce ở backend (403). MEMBER cũ deprecated → map ở AUTH-IMPL-01. Không mở Execution/Epic 4.2. Sau Codex PASS + Commit/Tag/Push mới mở implementation.
