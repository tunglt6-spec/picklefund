# PickleFund — Technical Baseline v2.0

> **Điểm chốt kỹ thuật** sau khi Sprint 2 (AI Memory Architecture) và Epic 2.4 (Vector Layer) được Codex **Second Final Re-Audit PASS**.
> Bộ tài liệu này phản ánh **đúng trạng thái code hiện tại**, không phóng đại, không mô tả tính năng chưa triển khai như đã hoàn thành.

**Phiên bản:** 2.0
**Ngày đóng gói:** 2026-06-30
**Nhánh:** `main`
**Phạm vi:** Tài liệu hóa (documentation only) — không sửa code ứng dụng.

---

## 1. Tổng quan PickleFund v2.0

PickleFund là nền tảng SaaS quản lý câu lạc bộ Pickleball: thành viên, điểm danh, đóng quỹ, chi phí, báo cáo tài chính theo kỳ, kèm lớp AI Memory (V2.1 AI Brain) phục vụ trợ lý hội thoại.

PickleFund v2.0 (baseline này) gồm hai khối lớn:

| Khối | Trạng thái | Ghi chú |
|---|---|---|
| **Finance / nghiệp vụ CLB** (RC1) | Ổn định | Finance Engine là nguồn tính toán duy nhất. |
| **AI Memory Architecture** (Sprint 2) | PASS | Memory Core → Conversation/User → Club Memory + Deterministic Retrieval → Vector Layer (Epic 2.4). |

> Lớp AI hiện hỗ trợ **lưu trữ + truy hồi ngữ cảnh (retrieval)**. AI **không** tự tính toán số liệu tài chính (xem [04-finance-isolation.md](04-finance-isolation.md)).

## 2. Mục tiêu của Technical Baseline v2.0

- Tạo **một điểm chốt kỹ thuật rõ ràng** trước khi mở rộng (Epic 2.5 trở đi).
- Ghi lại các **bất biến kiến trúc** (invariants) đã được Codex audit, để bảo trì/mở rộng/thương mại hóa không phá vỡ chúng.
- Phân định rạch ròi **đã làm** vs **deferred (để Sprint/Epic sau)**.
- Làm tài liệu tham chiếu cho người mới onboard vào lớp AI Memory.

## 3. Trạng thái Sprint 2

Sprint 2 = **AI Memory Architecture**, đã hoàn tất và Codex Re-Audit PASS các Epic dưới đây.

| Epic | Tên | Trạng thái |
|---|---|---|
| 2.1 | Memory Core Foundation | Close (Codex Re-Audit PASS) |
| 2.2 | Conversation Memory + User Memory | Close (Codex Re-Audit PASS) |
| 2.3 | Club Memory + Deterministic Retrieval | Close (Codex Re-Audit PASS) — commit `00b68e7` |
| 2.4 | Vector Layer (Store/Embedding/Semantic/Hybrid/Policy/Observability) | **Codex Second Final Re-Audit PASS** |

Chi tiết timeline audit ở [05-sprint2-release-notes.md](05-sprint2-release-notes.md).

## 4. Các Epic đã hoàn thành

- **Epic 2.1** — `backend/src/ai/memory/`: Memory Core (CRUD, immutable Memory Object, repository abstraction, in-memory volatile default).
- **Epic 2.2** — `backend/src/ai/conversation/` + `backend/src/ai/user-memory/`: cửa sổ hội thoại, context builder, bộ nhớ người dùng.
- **Epic 2.3** — `backend/src/ai/club-memory/` + `backend/src/ai/retrieval/`: Club Memory + Deterministic Retrieval (keyword + tag filter, index manager).
- **Epic 2.4** — `backend/src/ai/vector/`: Vector Store (in-memory cosine), Embedding Service (local hash, cache, DLQ, cost guardrail), Semantic Search, Hybrid Retrieval, Vector Content Policy, Observability.

## 5. Nguyên tắc Zero-Refactor

Mỗi Epic **bổ sung** thành phần mới thay vì refactor thành phần đã đóng (closed) của Epic trước.

- Hybrid Retrieval (Epic 2.4) là **service composition mới** (`HybridRetrievalEngine`) đặt cạnh `RetrievalEngine` của Epic 2.3 — **không** sửa lại RetrievalEngine/ContextBuilder.
- Vector Layer **không** đụng Finance Engine RC1, AI Harness, Routing/Provider.
- Hệ quả: bề mặt audit nhỏ, regression thấp, dễ rollback theo Epic.

## 6. Nguyên tắc Finance Isolation

- **Finance Engine là nguồn tính toán tài chính duy nhất.** AI/vector/embedding **không** được tính toán hay suy đoán số liệu tài chính.
- Nội dung tài chính (số dư, đóng quỹ, chi phí, phiếu thu, chuyển kỳ, báo cáo tài chính…) **bị chặn** khỏi embedding/semantic search bởi Vector Content Policy.
- Chi tiết: [04-finance-isolation.md](04-finance-isolation.md).

## 7. Nguyên tắc Club Isolation

- Mọi truy hồi đều **scope theo `clubId`** (tenant isolation). Vector search nhận `clubId` và chỉ truy vấn vector của club đó.
- Hit vector "mồ côi" (stale) không load được từ Club Memory (Source of Truth) thì **bị bỏ qua**, tránh rò rỉ chéo club.

## 8. Nguyên tắc PII/Finance Content Policy

- `VectorContentPolicyService` chạy **trước** mọi lần embed (cả khi index Club Memory lẫn khi nhận query người dùng).
- **Finance content → block/skip** (không embed, không query store).
- **PII (email/điện thoại/CCCD/số tài khoản) → redact** trước khi embed.
- Chi tiết: [03-vector-layer-security.md](03-vector-layer-security.md).

## 9. Hướng dẫn đọc bộ tài liệu

| File | Nội dung |
|---|---|
| [README.md](README.md) | Tổng quan + các bất biến kiến trúc (file này). |
| [01-ai-memory-architecture.md](01-ai-memory-architecture.md) | Kiến trúc AI Memory tổng thể + sơ đồ. |
| [02-hybrid-retrieval-flow.md](02-hybrid-retrieval-flow.md) | Luồng Hybrid Retrieval (deterministic ưu tiên, semantic supplement). |
| [03-vector-layer-security.md](03-vector-layer-security.md) | An ninh lớp vector (derived view, PII/finance policy, SHA-256, DLQ). |
| [04-finance-isolation.md](04-finance-isolation.md) | Cô lập tài chính khỏi AI/vector. |
| [05-sprint2-release-notes.md](05-sprint2-release-notes.md) | Release notes Sprint 2 + timeline Codex audit. |
| [06-roadmap-next.md](06-roadmap-next.md) | Việc đã làm, deferred, bước tiếp theo. |

> **Quy trình phát triển bắt buộc:** Claude Code triển khai → **Codex Audit** → Claude sửa → **Codex Re-Audit PASS** → mới chuyển bước tiếp theo. Không tự duyệt (self-approve) thay Codex.
