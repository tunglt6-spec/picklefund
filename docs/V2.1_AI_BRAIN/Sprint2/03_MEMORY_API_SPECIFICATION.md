# 03 — Memory API Specification
## PickleFund V2.1 — Sprint 2 (Memory Layer) · DESIGN ONLY

> Thiết kế hợp đồng API. KHÔNG code triển khai. Dùng chung cho Desktop, Mobile, Maika, Lisa, Hermes.

---

## 1. Nguyên tắc

- **Một API duy nhất** cho mọi consumer (Desktop/Mobile/Maika/Lisa/Hermes) — đảm bảo parity.
- Auth bằng JWT hiện có; scope theo `clubId`/`userId` từ principal (không tin body spoof — kế thừa pattern Sprint 1).
- KHÔNG ghi/đọc số liệu tài chính qua Memory API.

## 2. Endpoints

| Method | Path | Mục đích |
|---|---|---|
| `POST` | `/memory/store` | Lưu một memory (turn/fact/preference) + embedding |
| `POST` | `/memory/query` | Truy hồi theo bộ lọc metadata (không semantic) |
| `POST` | `/memory/search` | Semantic search (vector similarity) |
| `DELETE` | `/memory` | Xoá theo id/filter (tôn trọng quyền & tenant) |
| `GET` | `/memory/context` | Lấy ngữ cảnh đã lắp ráp cho một session/prompt |

## 3. Hợp đồng (shape mô tả)

### POST /memory/store
```
{ type, scope:{clubId?,userId?,sessionId?}, content, metadata?, ttl? }
→ { id, stored:true }
```

### POST /memory/query
```
{ scope, filter, limit }
→ { items:[{ id, content, metadata, createdAt }] }
```

### POST /memory/search
```
{ scope, query, topK, minScore? }
→ { matches:[{ id, content, score, metadata }] }
```

### DELETE /memory
```
{ scope, id? , filter? }
→ { deleted: <count> }
```

### GET /memory/context
```
?sessionId=&clubId=&userId=&budgetTokens=
→ { context:[...], tokensUsed, sources:[...] }
```

## 4. Consumer Sharing

| Consumer | Dùng endpoint | Ghi chú |
|---|---|---|
| Desktop | tất cả | qua hook chung (kế thừa pattern `useAIGateway`) |
| Mobile | tất cả | cùng API, cùng response model |
| Maika | store/search/context | persona Sprint 2+ (không thuộc Sprint 2 implementation) |
| Lisa | store/context | |
| Hermes | search/context | |

> Maika/Lisa/Hermes ở đây chỉ là **consumer dự kiến** trong thiết kế; Sprint 2 KHÔNG triển khai các persona này.

## 5. Architecture Decisions

| ID | Quyết định |
|---|---|
| AD-S2-10 | Memory API tách khỏi business API; mount prefix `/memory` |
| AD-S2-11 | Scope bắt buộc từ JWT principal; filter tenant ở server |
| AD-S2-12 | `GET /memory/context` nhận `budgetTokens` để giới hạn ngữ cảnh |
| AD-S2-13 | Response model thống nhất cho mọi consumer |

## 6. Cross References
- Search → `04_SEMANTIC_SEARCH_DESIGN.md`
- Context assembly → `05_CONTEXT_WINDOW_DESIGN.md`
- TTL/retention cho store/delete → `06_MEMORY_MANAGER_DESIGN.md`
