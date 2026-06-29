# 02 — Club Memory Model
## PickleFund V2.1 — Sprint 2 Epic 2.3 Architecture Gate

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial Club Memory model (design only) |

---

## 1. Mục tiêu
Mô hình hoá tri thức cấp **Câu lạc bộ** (scope `clubId`) để retrieval phục vụ AI, KHÔNG chứa dữ liệu cá nhân hay tính toán tài chính.

## 2. Loại Club Memory
- **Club Facts** — sự kiện/thông tin nền tảng của CLB (tên sân ưu tiên, lịch sinh hoạt).
- **Club Rules** — quy định nội bộ.
- **Club Preferences** — sở thích chung (giờ chơi, loại sân).
- **Club Policies** — chính sách (vắng mặt, khách mời).
- **Club Knowledge** — tri thức tích luỹ (mẹo, FAQ).
- **Club Operational Notes** — ghi chú vận hành.

## 3. Bảng nội dung cho phép / cấm

| Memory Type | Owner | Allowed Content | Forbidden Content |
|---|---|---|---|
| Club Facts | clubId | Thông tin chung CLB | Private user facts, số liệu tài chính |
| Club Rules | clubId | Quy định nội bộ | Balance/contribution/expense |
| Club Preferences | clubId | Sở thích chung | Sở thích cá nhân user |
| Club Policies | clubId | Chính sách CLB | Carry-forward/financial calc |
| Club Knowledge | clubId | FAQ/mẹo | Dữ liệu PII |
| Club Operational Notes | clubId | Ghi chú vận hành | Secret/token/key |

## 4. Quy tắc scope
- Club Memory **scope theo `clubId`** (KHÔNG theo userId).
- KHÔNG chứa private user facts (đó là User Memory — Epic 2.2).
- KHÔNG chứa financial calculations; KHÔNG cache balance/contribution/expense/carryForward.
- Cần số liệu tài chính → **reference Finance Engine RC1** (đọc realtime), không lưu.

## Clear Boundaries
Club Memory ≠ User Memory (userId) ≠ Finance Engine (số liệu). Chỉ tri thức định tính cấp CLB.

## DoD
Club Memory model + scope clubId + bảng allowed/forbidden được Codex xác nhận. Xem `EPIC2.3_ACCEPTANCE_CRITERIA.md`.

## Risks
- R: nhầm club memory với user memory → Mitigation: scope clubId, cấm PII (bảng §3).
- R: lưu số liệu tài chính → Mitigation: forbidden content + reference RC1.

## Security Notes
Mọi truy cập Club Memory kiểm tra `clubId` của principal; không cross-club; không PII.

## Cross References
`SEMANTIC_SEARCH_BOUNDARY.md` · `SECURITY_AND_TENANT_ISOLATION.md` · `INDEXING_STRATEGY.md`
