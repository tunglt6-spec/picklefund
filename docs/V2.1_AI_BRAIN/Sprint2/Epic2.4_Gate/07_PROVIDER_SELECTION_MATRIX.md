# 07 — Provider Selection Matrix
## PickleFund V2.1 — Sprint 2 Epic 2.4 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial provider selection matrix |

## Purpose
So sánh các vector store để chọn default (ưu tiên chi phí thấp).

## Scope
In-memory · PGVector · Qdrant · Chroma · Pinecone.

## Matrix

| Provider | Chi phí | Độ phức tạp | Local dev | Production | Backup/Restore | Docker | Scale | Vendor lock-in |
|---|---|---|---|---|---|---|---|---|
| In-memory | Thấp nhất | Thấp | Tốt | Không (volatile) | Không | Không cần | Kém | Không |
| **PGVector** | **Thấp** (tái dùng Postgres) | Thấp-TB | Tốt | Tốt | Theo Postgres | Có sẵn | TB | Không |
| Qdrant | TB | TB | Tốt | Tốt | Có | Cần service | Tốt | Thấp |
| Chroma | Thấp | Thấp | Tốt | TB | Cơ bản | Cần service | TB | Thấp |
| Pinecone | Cao (managed) | Thấp | Hạn chế | Tốt | Managed | Không | Rất tốt | Cao |

## Khuyến nghị (ưu tiên chi phí thấp)
- **Default: PGVector** — tái dùng hạ tầng Postgres sẵn có (ít moving parts, backup theo DB, chi phí thấp, không vendor lock-in).
- In-memory: chỉ dev/test (volatile).
- Qdrant/Chroma: tùy chọn self-host khi cần scale.
- Pinecone: future (managed, chi phí cao) — chỉ khi scale lớn.

## Risks
- R: vendor lock-in (Pinecone) → ưu tiên PGVector + abstraction `IVectorStore`.

## Cross References
`01_VECTOR_STORE_BOUNDARY.md` · Sprint2 `02_VECTOR_STORE_SPECIFICATION.md`.
