# 07 — Security & Tenant Isolation
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial security + threat model (design only) |

---

## 1. Nguyên tắc
- **clubId isolation:** mọi truy cập Club Memory/retrieval scope theo `clubId` từ JWT.
- **No cross-club leakage:** không trả tri thức của club khác.
- **No private user facts** trong Club Memory (đó là User Memory).
- **No financial calculation;** chỉ reference Finance Engine RC1 nếu cần (đọc, không tính/cache).
- **No prompt leakage / no vector leakage:** không log prompt/nội dung/embedding.
- **Audit metadata:** ghi clubId + memoryType + thời điểm cho truy vết (không nội dung nhạy cảm).

## 2. Threat Model

| ID | Threat | Vector | Mitigation |
|---|---|---|---|
| T1 | Cross-club read | Truy vấn club khác qua id | Scope clubId từ JWT; filter ở Candidate Selection |
| T2 | PII leak qua Club Memory | Lưu private user facts | Cấm PII (model §3); validation |
| T3 | Financial leak | Cache balance/contribution | Cấm; reference RC1 only |
| T4 | Prompt/vector log leak | Log nội dung/embedding | Sanitize log (kế thừa Sprint 1) |
| T5 | Tenant spoof | Client gửi clubId override | clubId chỉ từ JWT principal, không nhận từ body |
| T6 | Index leakage | Index chứa dữ liệu nhạy cảm | Index không lưu PII/secret/tài chính (`INDEXING_STRATEGY.md`) |

## Clear Boundaries
Isolation theo clubId; Club Memory ≠ User Memory ≠ Finance. Không log nhạy cảm.

## DoD
Threat T1–T6 có mitigation + test (no cross-club, no PII, no finance calc). Xem acceptance.

## Risks
- R: rò rỉ tenant qua external embedding (Epic 2.4) → ghi nhận, xử lý ở 2.4.

## Security Notes
Tài liệu này LÀ security notes chính của gate; các doc khác tham chiếu về đây.

## Cross References
`CLUB_MEMORY_MODEL.md` · `RETRIEVAL_PIPELINE_DESIGN.md` · `VECTOR_STORE_BOUNDARY.md`
