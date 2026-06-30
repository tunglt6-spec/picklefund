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

## 2. Việc deferred (để Sprint/Epic sau)

- **Vector store production**: PGVector / Qdrant / Milvus / Pinecone / Weaviate — **CHƯA triển khai** (hiện in-memory cosine).
- **Persistence Memory Core**: hiện in-memory volatile default; adapter DB là deferred.
- **Maika Execution** (thực thi action/automation) — **CHƯA triển khai** (xem §3 Execution Readiness).

## 3. Bước tiếp theo & Execution Readiness

**Trạng thái:**

- Sprint 2 ✅ Hoàn thành (Core Stable + UI Stable).
- Sprint 3 ✅ Hoàn thành Governance Layer (Epic 3.1 → 3.5 PASS).

**Execution Readiness = NOT READY.** **Sprint 4 (Execution Engine) = BLOCKED.**

Bước tiếp theo (thứ tự bắt buộc):

1. **Sprint 3 — Final Governance Audit** (chưa thực hiện) — phải PASS trước.
2. **Quyết định kiến trúc mới** cho Execution (sau khi Final Governance Audit PASS).
3. **Sprint 4 — Execution Engine** — **chỉ được xem xét sau** khi (1) + (2) hoàn tất; hiện **BLOCKED**.

> ⛔ KHÔNG được kết luận: "Sprint 4 Ready", "Execution Ready", "Maika Execute", "Automation Ready". Maika vẫn read-only; chưa execute/API-write/DB-write/email/telegram/notification/workflow/job-queue.
> Các lệnh commit/tag chỉ là **đề xuất**; không tự thực hiện nếu chưa được yêu cầu.

## 3b. AI Commerce Platform

- **Planned** — **CHƯA triển khai**.

## 4. Epic 2.5 phải triển khai đồng bộ trên mọi nền tảng

Theo nguyên tắc "Mobile song song với Desktop", Dashboard Light Theme phải được nâng cấp song song:

- **Desktop**
- **Mobile Web**
- **iOS**
- **Android**

> Không để desktop có light theme còn mobile/iOS/Android lệch giao diện.

## 5. Nguyên tắc phát triển bắt buộc (nhắc lại)

```
Claude Code triển khai → Codex Audit → Claude sửa → Codex Re-Audit PASS → mới chuyển bước tiếp theo
```

- Không tự duyệt (self-approve) thay Codex.
- Không bỏ qua gate audit.
- Mỗi Epic đóng (close) chỉ sau khi Codex Re-Audit PASS.
- **Sprint 4 (Execution Engine) chỉ được xem xét sau khi Sprint 3 Final Governance Audit PASS** + quyết định kiến trúc mới. Execution Readiness hiện = NOT READY.
