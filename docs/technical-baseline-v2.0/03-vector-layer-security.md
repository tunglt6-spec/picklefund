# 03 — An ninh lớp Vector (Technical Baseline v2.0)

> Code thực tế: `backend/src/ai/vector/` (vector-content-policy, embedding, semantic-search, in-memory-vector-store, vector-index).

---

## 1. Vector Store là derived view, không phải Source of Truth

- Vector Store (`in-memory-vector-store.provider.ts`) chỉ chứa **biểu diễn dẫn xuất (embedding + metadata an toàn)** của Club Memory.
- **Source of Truth là Memory Object trong Club Memory.** Vector index **dựng lại được** bất kỳ lúc nào từ Club Memory (`VectorIndexService.rebuildClub`).
- Hit vector không load được từ Club Memory (stale) → bỏ qua khi retrieve.

## 2. Không lưu raw PII trong vector metadata

- Khi index, snippet trong metadata là **`sanitizedSnippet`** (đã qua policy), không phải raw content.
- `embeddingVersion = ${embedding.version}|${policy.policyVersion}` — đổi policy ⇒ version đổi ⇒ index cũ được coi là lệch và rebuild lại.

## 3. Không đưa raw content/query vào embedding

- **Index Club Memory:** `VectorIndexService` chạy `sanitizeForEmbedding` trước; nội dung bị block thì **skip** (và `deleteByIds` để xoá vector cũ trên `upsertOne`); chỉ embed `sanitizedText`.
- **Query người dùng:** `SemanticSearchProvider.search()` chạy `sanitizeForEmbedding` **trước** embed; chỉ embed `sanitizedText`. Raw title/content/query **không bao giờ** tới `embed()`.

## 4. Embedding cache key dùng SHA-256

- `EmbeddingService` cache theo key `${embeddingVersion}:${sha256(text)}` (`createHash('sha256')`).
- Không lưu raw text làm key ⇒ không rò rỉ qua cache.

## 5. DLQ không lưu raw text

`DeadLetterEntry` chỉ chứa trường an toàn: `requestId`, `textHash` (sha256 hex 64 ký tự), `reason`, `provider`, `createdAt`, `length`, `embeddingVersion`.

- Không có field `text/rawText/input/content/title/snippet`.
- Test minh chứng: chuỗi bí mật `super secret raw text 0912345678` **không** xuất hiện trong `JSON.stringify(dlq)`.

## 6. Vector Content Policy

`vector-content-policy.service.ts` — `sanitizeForEmbedding(input)`:

### Finance content → block/skip
- Danh sách FINANCE_TERMS (balance, số dư, tổng tài sản, contribution, đóng quỹ, thu quỹ, chi phí, expense, receipt, phiếu thu, carryforward, chuyển kỳ, quỹ chính, quỹ phụ, công nợ, doanh thu, khoản thu, khoản chi, báo cáo tài chính) + MONEY_PATTERNS (hậu tố k/triệu/tỷ/VND/₫/đồng, định dạng `1.000.000`).
- Khớp ⇒ `allowed=false`, `sanitizedText=''`, ghi `blockedReasons`.

### PII → redact
- Email → `[redacted-email]`; điện thoại (`+84` hoặc `0` + 9 số) → `[redacted-phone]`; ID dài ≥9 chữ số (CCCD/CMND/STK) → `[redacted-id]`.
- Ghi `redactedReasons`; `policyVersion = 'policy-v1'`.

## 7. Club-scoped vector search & không cross-club leak

- `store.query(clubId, vector, …)` chỉ truy vấn vector thuộc `clubId`.
- Hit không thuộc Club Memory hiện tại (stale/khác club) load `null` → loại bỏ. Không rò rỉ chéo club.

## 8. Rebuild vector từ Club Memory

- `VectorIndexService.rebuildClub(clubId)` đọc Club Memory (SoT) → policy → embed sanitizedText → upsert vector.
- Vì là derived view, có thể xoá sạch và rebuild mà **không mất dữ liệu nghiệp vụ**.

## 9. Deferred (để Sprint/Epic sau)

Các backend vector production **CHƯA triển khai** trong baseline này — chỉ là định hướng tương lai:

- PGVector
- Qdrant
- Milvus
- Pinecone
- Weaviate

> Hiện tại Vector Store là **in-memory cosine** qua interface `IVectorStoreProvider` (`VECTOR_STORE_PROVIDER`). Việc thay bằng backend production là **deferred** và sẽ chỉ cần thêm adapter implement interface, không refactor lớp trên.
