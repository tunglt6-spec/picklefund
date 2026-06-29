# 02 — Embedding Pipeline Design
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial embedding pipeline design |

## Purpose
Thiết kế pipeline embedding (chưa gọi provider thật trong tài liệu này).

## Scope
Embedding của Club Memory content (derived). Không embedding tài chính/PII.

## Pipeline
| Bước | Thiết kế |
|---|---|
| Input | content + title của Club Memory (đã sanitize, no PII/finance) |
| Normalization | lowercase/trim, chuẩn hoá khoảng trắng |
| Chunking | chia content dài theo kích thước cấu hình (overlap nhỏ) |
| Metadata | gắn clubId/type/tags/memoryId/updatedAt vào vector record |
| Versioning | `embeddingModelVersion` + `schemaVersion` để re-embed khi đổi model |
| Re-embedding | trigger khi đổi model/version hoặc content thay đổi |
| Failure handling | embed lỗi → log sanitized, fallback deterministic retrieval |
| Cost control | batch embedding, cache theo hash(content), giới hạn ngân sách |

## Boundaries
- KHÔNG gọi provider thật ở tài liệu này (design).
- Embedding derived từ Memory Object; Memory Object là SoT.

## Risks
- R: cost embedding cao → batch + cache + guardrail (`06`).
- R: PII/finance vào embedding → content policy (`08`).

## Cross References
`03_SEMANTIC_PROVIDER_CONTRACT.md` · `06_OPTIMIZATION_STRATEGY.md` · `08_SECURITY_AND_PRIVACY.md`.
