# 08 — Security & Privacy
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial security & privacy design |

## Purpose
Bảo mật & quyền riêng tư cho vector/embedding (Epic 2.4).

## Scope
Tenant isolation · vector leakage · PII · finance · embedding content policy · secret · audit.

## Controls
| Mục | Yêu cầu |
|---|---|
| Tenant isolation | mỗi vector record gắn clubId; query scope theo clubId từ JWT |
| No cross-club vector leakage | filter clubId trước similarity; không trả vector club khác |
| No PII leakage | KHÔNG embed PII; content policy lọc trước embedding |
| No finance calculation | KHÔNG embed/cache số liệu tài chính; Finance Engine RC1 only |
| Embedding content policy | chỉ embed Club Memory content đã sanitize |
| Secret handling | API key provider qua ConfigService/.env; không log |
| Audit metadata | log clubId/model-version/thời điểm (no content/no vector) |

## Threat Model (tóm tắt)
| ID | Threat | Mitigation |
|---|---|---|
| T1 | Cross-club vector read | scope clubId + filter trước/ sau similarity |
| T2 | PII/finance trong embedding | content policy + cấm finance |
| T3 | External embedding API rò dữ liệu | chính sách dữ liệu; cân nhắc self-host (PGVector/Qdrant) |
| T4 | Secret leak | ConfigService + no log |

## Risks
- R: external API rò tenant data → ưu tiên self-host; policy rõ ràng.

## Cross References
`02_EMBEDDING_PIPELINE_DESIGN.md` · `07_PROVIDER_SELECTION_MATRIX.md` · Baseline invariants.
