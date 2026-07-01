# 06 — Roadmap & bước tiếp theo (Technical Baseline v2.0)

---

## 1. Việc đã hoàn thành (cập nhật theo trạng thái hiện tại)

- **Finance / nghiệp vụ CLB (RC1)** — ổn định.
- **Sprint 2 — AI Memory Architecture** ✅ **Hoàn thành** (Codex Re-Audit PASS):
  - Epic 2.1 Memory Core.
  - Epic 2.2 Conversation Memory + User Memory.
  - Epic 2.3 Club Memory + Deterministic Retrieval.
  - Epic 2.4 Vector Layer (Store/Embedding/Semantic/Hybrid/Policy/Observability) — **Second Final Re-Audit PASS**.
  - Epic 2.5 Dashboard 3.0 (Light Theme) — ✅ **PASS** (Sprint 2 UI Stable; tag `v2.1-sprint2-ui`).
- **Sprint 3 — Maika AI (Governance Layer)** ✅ **Hoàn thành** (toàn bộ Codex PASS, đã Commit/Tag/Push):
  - Epic 3.1 Maika Core ✅ PASS — tag `v2.1-sprint3-epic3.1`.
  - Epic 3.2 Organization Intelligence ✅ PASS — tag `v2.1-sprint3-epic3.2`.
  - Epic 3.3 Workflow Planning ✅ PASS — tag `v2.1-sprint3-epic3.3`.
  - Epic 3.4 AI Action Layer ✅ PASS — tag `v2.1-sprint3-epic3.4`.
  - Epic 3.5 Human Approval Engine ✅ PASS — tag `v2.1-sprint3-epic3.5`.
  - **Governance Layer hoàn thành** — toàn bộ Maika READ-ONLY (Hiểu → Phân tích → Lập kế hoạch → Đề xuất → Yêu cầu Human Approval); **KHÔNG execute**.
- **Technical Baseline v2.0** — bộ tài liệu này.
- **GOV-01 — Project Governance Baseline v2.1** ✅ **Accepted / Official** — Single Source of Truth cho toàn bộ Project Governance (không thay đổi trạng thái kỹ thuật; mọi tài liệu chỉ tham chiếu GOV-01).
- **Design Program:** UDP-01 Foundation (Design Source of Truth) ✅ **Codex PASS / CLOSED** → DESIGN-01 🧊 **Design Foundation Freeze** → DASH-01 ✅ **Enterprise Dashboard Pattern (Codex PASS / Accepted)** → UI-02 Dashboard 4.0 ✅ **Codex PASS / CLOSED** (Golden Reference; tag `v2.1-ui02-dashboard-4.0`) → UIP-03 Member Workspace Pattern ✅ **Accepted / Codex PASS** (tag `v2.1-uip03-member-workspace`) → UI-03 Member Management Workspace ✅ **Codex PASS / CLOSED** → UDP-01 Amendment #01 ✅ **Accepted / Codex PASS** (tag `v2.1-udp01-amendment01`) → UDP-01 Amendment #02 ✅ **Accepted / Codex PASS** (tag `v2.1-udp01-amendment02`) → UIP-04 Finance Workspace Pattern ✅ **Accepted / Codex PASS** (tag `v2.1-uip04-finance-workspace`) → UI-04 Finance Workspace ✅ **Codex PASS / CLOSED** (tag `v2.1-ui04-finance-workspace`) → VDS-01 Visual Design System ✅ **Accepted / Codex PASS** (tag `v2.1-vds01-visual-design-system`) → UIP-05 Reports Center Pattern ✅ **Accepted / Codex PASS** (tag `v2.1-uip05-reports-center`) → UI-05 Reports Center 🟢 **READY TO START** (chưa mở implementation) → UIP-06 Tournament Center Pattern ⬜ **chưa mở**. Chi tiết design chỉ tham chiếu UDP-01/DESIGN-01/DASH-01/UIP-03/UIP-04/VDS-01/UDP-01 Amendment #01/#02.

## 2. Việc deferred (để Sprint/Epic sau)

- **Vector store production**: PGVector / Qdrant / Milvus / Pinecone / Weaviate — **CHƯA triển khai** (hiện in-memory cosine).
- **Persistence Memory Core**: hiện in-memory volatile default; adapter DB là deferred.
- **Maika Execution** (thực thi action/automation) — **CHƯA triển khai** (xem §3 Execution Readiness).

## 3. Bước tiếp theo & Execution Readiness

**Trạng thái:**

- Sprint 2 ✅ Hoàn thành (Core Stable + UI Stable).
- Sprint 3 ✅ **Hoàn thành Governance Layer** (Epic 3.1 → 3.5 PASS) + **Sprint 3 Final Governance Audit ✅ PASS** → **Sprint 3 CLOSED**.

**Execution Readiness = NOT READY.**

Sau khi Sprint 3 Governance PASS:

- **ADR-01** (Execution Engine Architecture) — ✅ **Codex PASS**.
- **ADR-02** (Execution Governance Model) — ✅ **Codex PASS**.
- **ADP-01** (Decision to Proceed) — ✅ **APPROVED FOR LIMITED IMPLEMENTATION**.
- **Epic 4.1** (Execution Ticket Framework) — ✅ **PASS / CLOSED** (framework-only: ticket/state/validation/guard/metadata + repository in-memory volatile; **KHÔNG execute/write**).
- **ADR-03** (Execution State Strategy) — ✅ **Codex PASS / Accepted** (chuẩn bị Epic 4.2 — chọn **Pure State Machine**, không event-driven/queue/worker/persistence/execution).
- **Epic 4.2** (Execution State Machine) — ⛔ **BLOCKED** (chưa mở; chờ quyết định triển khai riêng).
- **Sprint 4 implementation** — 🟡 **PARTIALLY APPROVED** (Epic 4.1 CLOSED).
- **Epic 4.3+ / Execution Engine** — ⛔ **BLOCKED**.
- **Execution Readiness** — vẫn **NOT READY**.

**Muốn mở Epic 4.2 phải có:** ADR-03 Codex PASS · Commit · Tag · Push · PROJECT_STATUS cập nhật · quyết định triển khai riêng (nếu cần).

> **Trạng thái:** Maika vẫn read-only; chưa execute/API-write/DB-write/email/telegram/notification/workflow/job-queue. Execution Gate & điều kiện mở Epic được định nghĩa trong [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md) (Rule 15, §11).

## 3b. AI Commerce Platform

- **Planned** — **CHƯA triển khai**.

## 4. Đồng bộ UI đa nền tảng

Quy định đồng bộ UI (Desktop / Mobile Web / iOS / Android) được định nghĩa trong **GOV-01 Rule 11 (Feature Parity Rule)** — xem [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). Áp dụng cho mọi Epic có giao diện (gồm Epic 2.5 Dashboard 3.0).

## 5. Tham chiếu quản trị

Nguyên tắc phát triển, Delivery Pipeline, Workflow Gate, Execution Gate và Architecture Freeze được định nghĩa trong **GOV-01** (Rule 12, Rule 15, §6, §9). Tài liệu này không định nghĩa lại — xem [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md).

**Trạng thái mốc hiện tại:** Sprint 3 Final Governance Audit ✅ PASS / Sprint 3 CLOSED · ADP-01 cho phép mở DUY NHẤT Epic 4.1 · Epic 4.2+ ⛔ BLOCKED · Execution Readiness = NOT READY.
