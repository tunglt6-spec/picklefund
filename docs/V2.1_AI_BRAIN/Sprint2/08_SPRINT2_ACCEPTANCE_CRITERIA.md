# 08 — Sprint 2 Acceptance Criteria
## PickleFund V2.1 — Sprint 2 (Memory Layer) · DESIGN ONLY

> Tiêu chí nghiệm thu cho Sprint 2 (khi triển khai). Hiện chỉ là thiết kế.

---

## 1. Definition of Done

| # | Tiêu chí |
|---|---|
| 1 | `IVectorStore` + ≥2 adapter (Chroma, PGVector) hoạt động |
| 2 | 5 endpoint Memory API hoạt động, auth + tenant scope đúng |
| 3 | Semantic search trả kết quả có score + re-rank |
| 4 | Context assembly tôn trọng `budgetTokens` + ưu tiên |
| 5 | Memory Manager: TTL/retention/cleanup/archive vận hành |
| 6 | Desktop & Mobile dùng chung hook + API + response model |
| 7 | Finance Isolation: 0 số liệu tài chính lưu trong memory |
| 8 | Build + tests PASS; docs khớp code |

## 2. Audit Checklist (Codex)

- [ ] Không sửa Finance Engine RC1
- [ ] Không sửa AI Harness Sprint 1 (chỉ tích hợp qua interface)
- [ ] Vector store provider-agnostic (không khoá cứng)
- [ ] Memory API scope từ JWT principal
- [ ] Không log prompt/response/PII/secret
- [ ] Config từ `.env` + fail-fast

## 3. Testing Checklist

- [ ] Unit: vector adapters (upsert/query/delete/health)
- [ ] Unit: TTL/retention/priority logic
- [ ] Unit: context assembly + compression theo budget
- [ ] Integration: 5 endpoint end-to-end (mock vector store)
- [ ] Integration: semantic search ranking
- [ ] Negative: tenant isolation (không truy hồi chéo club)

## 4. Codex Checklist

- [ ] Architecture khớp tài liệu `01`–`06`
- [ ] Mọi Architecture Decision được tôn trọng
- [ ] Không có tính năng ngoài scope (không Maika/Lisa/Hermes persona)
- [ ] Cross-reference tài liệu nhất quán

## 5. Release Checklist

- [ ] Checkpoint commit cho audit
- [ ] Sau audit PASS: release commit + push + tag `v2.1-sprint2`
- [ ] KNOWLEDGE_BASE.md append block Sprint 2
- [ ] SPRINT2_CLOSE_REPORT.md

## 6. Desktop/Mobile Consistency Checklist

- [ ] Cùng endpoint `/memory/*`
- [ ] Cùng hook (`useMemory`)
- [ ] Cùng response model + error handling + retry
- [ ] Cùng loading/empty state + permission

## 7. Finance Isolation Checklist

- [ ] Memory KHÔNG lưu income/expense/balance
- [ ] Số liệu tài chính chỉ nạp on-demand từ Finance Engine RC1
- [ ] Không có `SUM()`/`balance =` trong Memory Layer
- [ ] Test xác nhận memory không chứa trường tài chính

## 8. Cross References
- Plan → `07_SPRINT2_IMPLEMENTATION_PLAN.md`
- Lock → `MEMORY_ARCHITECTURE_LOCK.md`
