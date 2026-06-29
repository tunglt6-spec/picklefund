# 07 — Sprint 2 Implementation Plan
## PickleFund V2.1 — Sprint 2 (Memory Layer) · DESIGN ONLY

> Kế hoạch. Sprint 2 CHƯA được triển khai. Chờ Codex Architecture Audit PASS.

---

## 1. Epics → Stories → Tasks

### EPIC M1 — Vector Store Abstraction
| Story | Task | Estimate |
|---|---|---|
| M1.S1 `IVectorStore` interface | Định nghĩa interface + namespace model | 1d |
| M1.S2 Chroma adapter | upsert/query/delete/health | 2d |
| M1.S3 PGVector adapter | migration vector ext + adapter | 2d |
| M1.S4 Config + factory | chọn provider theo `.env` + fail-fast | 1d |

### EPIC M2 — Memory API
| Story | Task | Estimate |
|---|---|---|
| M2.S1 Endpoints | store/query/search/delete/context | 3d |
| M2.S2 Auth & tenant scope | JWT principal, filter tenant | 1d |
| M2.S3 Response model dùng chung | chuẩn hoá DTO | 1d |

### EPIC M3 — Semantic Search
| Story | Task | Estimate |
|---|---|---|
| M3.S1 Embedding qua LiteLLM | client + cache | 2d |
| M3.S2 Search + re-rank | similarity + recency + priority | 2d |

### EPIC M4 — Context Window
| Story | Task | Estimate |
|---|---|---|
| M4.S1 Sliding window + summarization | assembly + budget | 3d |
| M4.S2 Compression theo ưu tiên | cắt ngữ cảnh | 1d |

### EPIC M5 — Memory Manager
| Story | Task | Estimate |
|---|---|---|
| M5.S1 TTL/retention/priority | policy engine | 2d |
| M5.S2 Cleanup job + archive | scheduler hiện có | 2d |

### EPIC M6 — Quality
| Story | Task | Estimate |
|---|---|---|
| M6.S1 Unit + integration tests | mọi endpoint + adapter | 3d |
| M6.S2 Desktop/Mobile shared hook | `useMemory` | 1d |
| M6.S3 Docs sync + report | implementation/test report | 1d |

## 2. Estimate tổng

| Epic | Ngày (ước lượng) |
|---|---|
| M1 | 6 |
| M2 | 5 |
| M3 | 4 |
| M4 | 4 |
| M5 | 4 |
| M6 | 5 |
| **Tổng** | **~28 ngày-người** |

## 3. Risks

| ID | Risk | Mức | Mitigation |
|---|---|---|---|
| R1 | Embedding cost/latency cao | Trung bình | Cache embedding; topK/minScore hợp lý |
| R2 | Rò rỉ tài chính qua memory | Cao | Cấm cache số liệu; chỉ on-demand RC1 (AD-S2-03/19) |
| R3 | Khoá cứng provider vector | Trung bình | Abstraction `IVectorStore` (AD-S2-06) |
| R4 | In-memory mất dữ liệu (cache embedding) | Thấp | Chấp nhận ở Sprint 2; persistence sau |
| R5 | PII trong memory/log | Cao | Sanitize log (kế thừa Sprint 1); kiểm soát nội dung store |

## 4. Dependencies

| Phụ thuộc | Trạng thái |
|---|---|
| AI Gateway (Sprint 1) | ✅ DONE |
| AI Config (`.env`, `*_CONTEXT_WINDOW`) | ✅ DONE |
| Token Accounting (cho embedding cost) | ✅ DONE |
| PostgreSQL (PGVector) | ✅ sẵn có |
| LiteLLM (embedding) | cần model embedding khả dụng |

## 5. Deliverables

- `IVectorStore` + Chroma/PGVector adapters.
- Memory API (5 endpoints) + shared hook Desktop/Mobile.
- Semantic search + context assembly + memory manager.
- Tests (unit + integration) PASS; docs sync.

## 6. Timeline (chỉ thị, tuần tự theo dependency)

```
Tuần 1: M1 (Vector Store) + M2 bắt đầu
Tuần 2: M2 hoàn tất + M3 (Search)
Tuần 3: M4 (Context) + M5 (Manager)
Tuần 4: M6 (Quality) + sync docs + audit gate
```

## 7. Cross References
- Tất cả tài liệu `01`–`06`; Acceptance → `08_SPRINT2_ACCEPTANCE_CRITERIA.md`
