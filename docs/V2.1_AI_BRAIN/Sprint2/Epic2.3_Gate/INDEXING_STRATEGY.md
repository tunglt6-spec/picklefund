# 04 — Indexing Strategy
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial indexing strategy (design only) |

---

## 1. Nguyên tắc cốt lõi
- **Index KHÔNG phải Source of Truth.** Memory Object (Club Memory) mới là Source of Truth.
- Index chỉ là **derived view** (keyword/tag/metadata) để retrieval nhanh.
- Index sai → **rebuild được hoàn toàn** từ Memory Objects.

## 2. What to index / not to index
| | Nội dung |
|---|---|
| **Index** | content (token hoá keyword), tags, memoryType, clubId, updatedAt |
| **Không index** | PII, secret/token/key, số liệu tài chính, embedding (Epic 2.4) |

## 3. Index lifecycle
| Sự kiện | Hành vi index |
|---|---|
| Create Club Memory | thêm vào index |
| Update | cập nhật derived entry |
| Archive | đánh dấu archived (loại khỏi retrieval mặc định) |
| Delete | gỡ khỏi index |
| TTL hết hạn | loại khỏi retrieval (lazy) |

## 4. Re-index trigger
- Thay đổi schema index · phát hiện drift · lệnh rebuild thủ công. Rebuild đọc toàn bộ Club Memory (Source of Truth).

## 5. TTL / Tag / Metadata strategy
- **TTL:** kế thừa từ Memory Object; index tôn trọng TTL.
- **Tag:** chuẩn hoá lowercase; retrieval lọc theo tag.
- **Metadata:** clubId + memoryType + updatedAt phục vụ filter/recency.

## Clear Boundaries
Index = derived, disposable, rebuildable. KHÔNG chứa embedding (Epic 2.4). KHÔNG là nguồn sự thật.

## DoD
Index lifecycle + rebuild-from-source + cấm index dữ liệu nhạy cảm được Codex xác nhận.

## Risks
- R: coi index là source of truth → Mitigation: nguyên tắc §1 + rebuild.
- R: index PII/tài chính → Mitigation: bảng §2.

## Security Notes
Index không lưu PII/secret/tài chính; entry gắn clubId để lọc tenant.

## Cross References
`CLUB_MEMORY_MODEL.md` · `RETRIEVAL_PIPELINE_DESIGN.md` · `VECTOR_STORE_BOUNDARY.md`
