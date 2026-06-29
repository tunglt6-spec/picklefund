# 06 — Optimization Strategy
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial optimization strategy |

## Purpose
Chiến lược tối ưu cho vector/embedding retrieval (thiết kế).

## Scope
Latency, cache, batching, re-index, fallback, observability, cost.

## Strategy
| Mục | Thiết kế |
|---|---|
| Latency budget | đặt ngân sách ms/truy vấn; vượt → fallback deterministic |
| Cache policy | cache embedding theo hash(content); cache query gần đây (TTL ngắn) |
| Batch embedding | gom nhiều content/lần gọi để giảm cost/latency |
| Re-index strategy | rebuild khi đổi model/version; incremental khi update/delete |
| Fallback | semantic fail/timeout → deterministic retrieval |
| Observability | log latency/hit-rate/cost (sanitized, no content) |
| Cost guardrail | ngưỡng chi phí/ngày; vượt → tắt embedding, dùng deterministic |

## Risks
- R: cost vượt kiểm soát → guardrail + batch + cache.
- R: latency cao → budget + fallback.

## Cross References
`02_EMBEDDING_PIPELINE_DESIGN.md` · `04_HYBRID_RETRIEVAL_DESIGN.md`.
