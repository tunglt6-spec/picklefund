# 06 — Roadmap & bước tiếp theo (Technical Baseline v2.0)

---

## 1. Việc đã hoàn thành (đến baseline v2.0)

- **Finance / nghiệp vụ CLB (RC1)** — ổn định.
- **Sprint 2 — AI Memory Architecture**, Codex Re-Audit PASS:
  - Epic 2.1 Memory Core.
  - Epic 2.2 Conversation Memory + User Memory.
  - Epic 2.3 Club Memory + Deterministic Retrieval.
  - Epic 2.4 Vector Layer (Store/Embedding/Semantic/Hybrid/Policy/Observability) — **Second Final Re-Audit PASS**.
- **Technical Baseline v2.0** — bộ tài liệu này.

## 2. Việc deferred (để Sprint/Epic sau)

- **Vector store production**: PGVector / Qdrant / Milvus / Pinecone / Weaviate — **CHƯA triển khai** (hiện in-memory cosine).
- **Persistence Memory Core**: hiện in-memory volatile default; adapter DB là deferred.
- **Maika AI (Sprint 3)** — **CHƯA triển khai**.
- **Epic 2.5 Dashboard Light Theme** — **CHƯA bắt đầu**.

## 3. Bước tiếp theo (thứ tự đề xuất)

1. **Commit Sprint 2** (sau khi baseline đóng gói xong).
2. **Tag Sprint 2** (vd `v2.1-sprint2`).
3. **Sprint 2 Release**.
4. **Epic 2.5 — Dashboard Light Theme** (frontend only; bắt đầu sau baseline).
5. **Sprint 3 — Maika AI** (về sau).

> Các lệnh commit/tag chỉ là **đề xuất**; không tự thực hiện nếu chưa được yêu cầu.

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
- Epic 2.5 chỉ bắt đầu **sau** khi baseline v2.0 đã đóng gói (bước hiện tại).
