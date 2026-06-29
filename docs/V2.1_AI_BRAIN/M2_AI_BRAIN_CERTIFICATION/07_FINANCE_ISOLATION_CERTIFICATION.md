# 07 — Finance Isolation Certification
## PickleFund V2.1 — Milestone M2

**Version:** 1.0.0 · **Status:** DRAFT / PENDING CODEX · **Ngày:** 2026-06-29

## Revision History
| Ver | Ngày | Mô tả |
|---|---|---|
| 1.0.0 | 2026-06-29 | Initial finance isolation certification |

---

## Purpose
Chứng nhận **Finance Engine RC1 là Source of Truth tài chính DUY NHẤT**; AI Brain không tính/cache tài chính.

## Scope
Toàn bộ AI Brain (Harness, Memory, Retrieval, Context Builder).

## Quy tắc — AI Brain KHÔNG được
- Tính Quỹ Chính · Quỹ Phụ · Số dư chuyển kỳ · Tổng tài sản CLB · Member Receipt.
- Cache balance · contribution · expense · carryForward.

## Cho phép
Nếu cần số liệu tài chính → **chỉ gọi Finance Engine RC1** (`FundPeriodsService.summary` / API summary đã duyệt), đọc realtime, không lưu/không tính lại.

## Certification Checklist

| Area | Requirement | Evidence | Status |
|---|---|---|---|
| AI đọc RC1, không tính | `ai.service.getFinanceSummary` → `FundPeriodsService.summary` | `backend/src/ai/ai.service.ts` | PENDING |
| Không SUM/balance trong AI | grep sạch trong `src/ai` | code review | PENDING |
| Memory không cache tài chính | Conversation/User/Club Memory không có field tài chính | memory modules | PENDING |
| Retrieval không tính tài chính | reference RC1 only | `Epic2.3_Gate` | PENDING |
| Context Builder không gọi Finance trực tiếp | additive source rule | `CONTEXT_BUILDER_INTEGRATION.md` | PENDING |

## Evidence Placeholder
`[Evidence: Finance Isolation report (Sprint 1.1) + memory design — Codex confirm]`

## Risk Notes
- R: agent tương lai (Maika) tự tính tài chính → cấm; phải qua RC1 (ràng buộc Sprint 3).

## Cross References
`../../Sprint1.1_Codex_Blocker_Resolution.md` (Epic 3 Finance Isolation) · Finance Engine RC1.
