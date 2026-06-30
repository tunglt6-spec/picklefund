# GOV-01 — Project Governance Baseline v2.1

> **Single Source of Truth** cho toàn bộ Project Governance của PickleFund, AI Commerce Platform và các sản phẩm AI sau này. Mọi tài liệu khác **chỉ tham chiếu** GOV-01, không định nghĩa lại Governance Rules.

---

## 1. Trạng thái

| Mục | Giá trị |
|---|---|
| **Status** | Accepted |
| **Version** | v2.1 |
| **Governance Baseline** | Official |
| **Effective** | Immediately |
| **Scope** | PickleFund · AI Commerce Platform · AI Teammate Platform · AI Organization Platform · các sản phẩm AI tương lai |

## 2. Mục tiêu

GOV-01 là **nguồn quản trị duy nhất** của dự án. Từ thời điểm ban hành:

- **ADR** chỉ mô tả **quyết định kiến trúc**.
- **ADP** chỉ mô tả **quyết định triển khai**.
- **Epic** chỉ mô tả **phạm vi implementation**.
- **PROJECT_STATUS / Roadmap / README** chỉ ghi **trạng thái và tham chiếu**.
- **Không tài liệu nào được copy lại Governance Rules** — chỉ trỏ về GOV-01.

## 3. Baseline hiện tại

- **Sprint 2 — Foundation Baseline** — Frozen.
- **Sprint 3 — AI Governance Baseline** — Frozen.
- **Sprint 4 — Execution Governance Baseline** — ADR-01, ADR-02, ADP-01.
- **GOV-01 — Project Governance Baseline** — Single Source of Truth.

## 4. Governance Principles

- **Safety First** — an toàn trên hết.
- **Architecture Before Implementation** — kiến trúc trước, code sau.
- **Human In Control** — con người luôn nắm quyền quyết định.
- **Finance Isolation** — tách biệt tài chính; Finance Engine là SoT.
- **Auditability** — mọi hành động kiểm toán được.
- **Traceability** — truy vết được từ quyết định → code.
- **Incremental Delivery** — giao tăng dần, từng gate.
- **Architecture Freeze** — đóng băng kiến trúc sau khi PASS.
- **Documentation as Source of Truth** — tài liệu là nguồn sự thật.
- **Execution by Approval Only** — chỉ thực thi khi được duyệt.

## 5. Project Governance Rules (17)

### Rule 1 — Zero Refactor Rule
- **Mục đích:** mở rộng bằng composition, không phá phần đã đóng.
- **Phạm vi:** mọi Epic/Sprint.
- **PASS:** thành phần mới được thêm; phần đã frozen không đổi.
- **FAIL:** sửa/refactor kiến trúc đã frozen mà không có quyết định mới.
- **Checklist:** ☐ không đụng module đã đóng ☐ chỉ thêm mới ☐ test cũ không regression.

### Rule 2 — Finance Isolation Rule
- **Mục đích:** AI không tính/suy luận/cache/ghi số liệu tài chính.
- **Phạm vi:** mọi lớp AI/vector/execution.
- **PASS:** số liệu tài chính lấy từ Finance Engine/API; finance content bị block khỏi embedding.
- **FAIL:** AI tự tạo con số tài chính / tạo phiếu thu-chi / ghi quỹ.
- **Checklist:** ☐ không finance-calc ☐ chỉ reference Finance API ☐ finance write cần ADR riêng.

### Rule 3 — Vector Safety Rule
- **Mục đích:** không để PII/finance raw vào embedding/vector/cache/metadata/payload.
- **Phạm vi:** vector layer, context, ticket, audit, connector.
- **PASS:** sanitize (block finance, redact PII) trước khi xử lý.
- **FAIL:** raw email/phone/CCCD/bank/số tiền xuất hiện trong output/log.
- **Checklist:** ☐ qua VectorContentPolicy ☐ JSON dump không có raw ☐ tag nhạy cảm bị loại.

### Rule 4 — AI Action Safety Rule
- **Mục đích:** AI không tự hành động.
- **Phạm vi:** Maika & execution layer.
- **PASS:** chỉ Hiểu→Phân tích→Lập kế hoạch→Đề xuất→Yêu cầu duyệt.
- **FAIL:** AI execute/write/send/automation không qua approval.
- **Checklist:** ☐ mutates=false ☐ requiresHumanApproval=true ☐ no auto-execute.

### Rule 5 — Human Approval Rule
- **Mục đích:** mọi action cần con người duyệt.
- **Phạm vi:** action layer, approval engine, execution.
- **PASS:** approved=false/approvedBy=null/approvedAt=null mặc định; no auto-approval; no approve-and-execute cùng request.
- **FAIL:** action tự approved hoặc thực thi không có approval hợp lệ.
- **Checklist:** ☐ approval tách bước ☐ snapshot bất biến ☐ có thời hạn/revoke.

### Rule 6 — Permission Rule
- **Mục đích:** kiểm soát quyền theo role/club.
- **Phạm vi:** mọi endpoint/action.
- **PASS:** role/clubId từ JWT (no body override); cross-club block; least privilege.
- **FAIL:** tin permission từ body / cross-club leak.
- **Checklist:** ☐ JWT context ☐ no body override ☐ re-check tại execution.

### Rule 7 — Dry-run Rule
- **Mục đích:** mô phỏng trước khi thực thi.
- **Phạm vi:** workflow planning, action layer.
- **PASS:** dryRunOnly=true/executed=false; không persist/mutate/send/schedule.
- **FAIL:** dry-run gây side-effect.
- **Checklist:** ☐ không persist ☐ không call-write ☐ trả wouldDo/blockedReasons.

### Rule 8 — Audit Log Design Rule
- **Mục đích:** audit log bất biến, đầy đủ.
- **Phạm vi:** action/execution.
- **PASS:** append-only; có actor/clubId/approvalSnapshot/decision/before-after-ref/result.
- **FAIL:** audit log sửa được / chứa raw sensitive.
- **Checklist:** ☐ append-only ☐ no raw PII ☐ đủ trường truy vết.

### Rule 9 — Documentation Consistency Rule
- **Mục đích:** không để tài liệu mâu thuẫn/stale.
- **Phạm vi:** toàn bộ docs.
- **PASS:** PROJECT_STATUS/Roadmap/README/ADR/ADP/GOV đồng bộ.
- **FAIL:** còn câu stale/mâu thuẫn trạng thái.
- **Checklist:** ☐ grep stale = 0 ☐ cross-reference khớp ☐ trạng thái thống nhất.

### Rule 10 — Document Lifecycle Rule
- **Mục đích:** trạng thái tài liệu đúng vòng đời.
- **Phạm vi:** mọi tài liệu.
- **PASS:** status khớp lifecycle (§8); không tài liệu "Pending" khi đã PASS.
- **FAIL:** status tài liệu lệch thực tế.
- **Checklist:** ☐ status đúng giai đoạn ☐ version đúng ☐ không (draft) khi đã Accepted.

### Rule 11 — Feature Parity Rule
- **Mục đích:** UI đồng bộ đa nền tảng.
- **Phạm vi:** mọi Epic có UI.
- **PASS:** Desktop/Mobile Web/iOS/Android tương đương; hoặc ghi rõ "backend-only, chưa áp dụng".
- **FAIL:** Desktop có / Mobile không có (hoặc ngược lại).
- **Checklist:** ☐ 4 nền tảng đồng bộ ☐ hoặc ghi rõ chưa có UI.

### Rule 12 — Delivery Pipeline Rule (Claude Code → Codex Audit → PASS → Commit → Tag → Push)
- **Mục đích:** quy trình giao hàng có gate.
- **Phạm vi:** mọi Epic/ADR/ADP/GOV.
- **PASS:** đủ chuỗi; không tự duyệt thay Codex.
- **FAIL:** commit/tag/push trước khi Codex PASS; tự approve.
- **Checklist:** ☐ Codex PASS trước commit ☐ tag annotated ☐ push sau PASS.

### Rule 13 — Execution Readiness Rule
- **Mục đích:** chỉ READY khi đủ điều kiện.
- **Phạm vi:** execution engine.
- **PASS:** đủ điều kiện ADR-02 §9; nếu thiếu → NOT READY.
- **FAIL:** ghi READY khi chưa đủ điều kiện.
- **Checklist:** ☐ ADR-01+02 PASS ☐ Epic 4.1–4.6 PASS ☐ Sprint 4 Governance Audit PASS ☐ no Critical/High.

### Rule 14 — Architecture Freeze Rule
- **Mục đích:** đóng băng kiến trúc đã PASS.
- **Phạm vi:** Sprint/Epic đã đóng.
- **PASS:** chỉ bug/security/docs/extension qua Sprint/Epic mới.
- **FAIL:** thêm feature/refactor vào phần frozen.
- **Checklist:** ☐ không feature vào Epic đóng ☐ không refactor frozen.

### Rule 15 — Execution Gate Rule
- **Mục đích:** mở execution theo cổng.
- **Phạm vi:** Sprint 4+.
- **PASS:** Execution Gate chỉ mở cho Epic được ADP cho phép; Epic khác BLOCKED.
- **FAIL:** mở execution ngoài phạm vi ADP.
- **Checklist:** ☐ chỉ Epic được ADP approve ☐ Epic 4.2+ BLOCKED.

### Rule 16 — Governance Pre-Audit Checklist Rule
- **Mục đích:** kiểm tra trước khi gửi Codex.
- **Phạm vi:** mọi lần "READY FOR CODEX AUDIT".
- **PASS:** checklist §9 đạt 100%.
- **FAIL:** ghi READY khi checklist chưa đạt.
- **Checklist:** xem §9.

### Rule 17 — Governance Source of Truth Rule
- **Mục đích:** GOV-01 là nguồn quản trị duy nhất.
- **Phạm vi:** toàn dự án.
- **PASS:** tài liệu khác chỉ tham chiếu GOV-01; không copy/định nghĩa lại rule.
- **FAIL:** Governance Rules bị định nghĩa rải rác/lệch nhau.
- **Checklist:** ☐ chỉ tham chiếu GOV-01 ☐ không duplicate rule ☐ thay đổi rule qua GOV update.

## 6. Governance Workflow

```
Idea → ADR → Codex PASS → (ADP nếu cần) → Codex PASS → Epic
  → Claude Code → Governance Pre-Audit → Codex Audit → PASS
  → Commit → Tag → Push → Architecture Freeze (nếu đạt mốc)
```

## 7. Document Hierarchy

```
GOV-01  (cao nhất — Single Source of Truth)
├── ADR
├── ADP
├── PROJECT_STATUS
├── Roadmap
├── README
├── Sprint Summary
└── Epic Docs
```

> Các tài liệu bên dưới **không định nghĩa lại** Governance Rules — chỉ **tham chiếu** GOV-01.

## 8. Document Lifecycle

```
Draft → Proposed → Accepted → PASS → Commit → Tag → Push → Released → Frozen → Archived
```

## 9. Governance Pre-Audit Checklist

Bắt buộc **trước** Codex Audit:

- ☐ Documentation Lifecycle đồng bộ.
- ☐ Documentation Consistency sạch (không stale/mâu thuẫn).
- ☐ Governance Source of Truth không bị vi phạm.
- ☐ Scope đúng.
- ☐ Working Tree sạch.
- ☐ Không generated artifact trong commit.
- ☐ Không local config trong commit.
- ☐ Cross-reference hợp lệ.
- ☐ Release scope đúng.

> **Claude Code chỉ được ghi "READY FOR CODEX AUDIT" khi checklist PASS 100%.**

## 10. Architecture Freeze

- Sprint đã Governance Audit PASS → **Architecture Frozen**.
- Chỉ được: bug fix · security fix · documentation update · mở rộng qua **Sprint/Epic mới**.
- **Không** thêm feature vào Epic đã đóng.
- **Không** refactor kiến trúc đã frozen nếu không có quyết định kiến trúc mới.

## 11. Execution Governance

- **Execution Readiness** ≠ **Execution Gate**.
- **Execution Readiness hiện vẫn NOT READY.**
- **Execution Gate** chỉ mở cho **Epic 4.1** sau ADR-01, ADR-02, ADP-01 PASS/Commit/Tag/Push.
- **AI chưa được execute thật.**
- **Epic 4.2+ vẫn BLOCKED.**

## 12. Working Tree Hygiene

Không commit: `backend/coverage/` · `.claude/settings.local.json` · `.vscode/` · `.idea/` · `logs/` · `tmp/` · `cache/` · `node_modules/`.

## 13. Definition of Done

Epic chỉ **DONE** khi: Build PASS (nếu có code) · Test PASS (nếu có code) · Lint PASS (nếu có code) · Documentation cập nhật · Governance Pre-Audit PASS · Codex PASS · Commit · Tag · Push · PROJECT_STATUS đồng bộ.

## 14. Change Management

Muốn thay đổi Governance Rule: tạo **ADR hoặc GOV update** → Codex Audit → Commit/Tag/Push → cập nhật tài liệu tham chiếu. **Không sửa rải rác nhiều nơi.**

## 15. Governance Versioning

- **GOV-01 v2.1** là baseline hiện tại.
- Phiên bản sau: **GOV-01 v2.2** · **GOV-01 v3.0**.
- **Không sửa âm thầm** governance version cũ.

---

> 🧾 GOV-01 v2.1 — Official Project Governance Baseline. Mọi quyết định/triển khai sau ngày ban hành tuân thủ tài liệu này.
