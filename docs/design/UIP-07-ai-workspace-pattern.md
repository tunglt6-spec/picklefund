# UIP-07 — AI Workspace Pattern

> **Design Pattern Document** cho nhóm chức năng **AI** của PickleFund (Maika · Lisa · Hermes · AI Insight/Recommendation/Conversation/Notification/Knowledge) — chuẩn hóa thiết kế trước khi triển khai **UI-07 (AI Workspace Implementation)**. **KHÔNG** phải Constitution mới, **KHÔNG** thay thế [UDP-01](UDP-01-unified-product-design-constitution.md) / [VDS-01](VDS-01-visual-design-system-v2.1.md) / [DASH-01](DASH-01-enterprise-dashboard-pattern.md) / các Amendment. Kế thừa UDP-01 (Design SoT) + [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) + [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md) + [VDS-01](VDS-01-visual-design-system-v2.1.md) + [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) + [DASH-01](DASH-01-enterprise-dashboard-pattern.md); tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). UI-02 = Golden Reference; UIP-03/04/05/06 = precedent.

**Phiên bản:** v1.0 · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

> 🎨 **Design Skill Bootstrap (Reality Filter):** Các Taste Skills (design-taste-frontend-v1 · high-end-visual-design · stitch-design-taste · redesign-existing-projects · minimalist-ui) **được áp dụng như nguyên tắc thiết kế tham chiếu theo [VDS-01](VDS-01-visual-design-system-v2.1.md)**. Đây là tài liệu pattern (docs-only, không code) → **không invoke** skill code-gen; **không claim đã nạp skill**.

---

## 1. Trạng thái

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Design Pattern Document
- **Scope:** AI Workspace (Maika / Lisa / Hermes / Insight / Conversation / Knowledge)
- **Implementation:** Not Started
- **UI-07:** 🟢 READY TO START (chưa mở implementation)

> - UIP-07 **đã Accepted** (Codex PASS).
> - UI-07 **chưa triển khai** — READY TO START, mở ở increment riêng (theo Amendment #02).
> - Đây **chỉ** là pattern document (docs-only), không phải code.
> - **AI/Execution logic KHÔNG được thay đổi** trong UIP/UI. Execution thuộc **Epic 4.2 (BLOCKED)**.

## 2. Mục tiêu

Chuẩn hóa **AI Workspace** thành màn hình enterprise cho: Maika · Lisa · Hermes · AI Insight · AI Recommendation · AI Conversation · AI Notification · AI Knowledge — thống nhất về layout, trạng thái, an toàn AI (read-only/approval), Loading/Empty/Error, Feature Parity desktop/mobile.

## 3. Quan hệ với Design Baseline

Tham chiếu (không định nghĩa lại): [UDP-01](UDP-01-unified-product-design-constitution.md) · [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) (Loading/Empty/Error DoD) · [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md) (Design Pattern First) · [VDS-01](VDS-01-visual-design-system-v2.1.md) (Visual Quality Gate) · [DESIGN-01](DESIGN-01-design-foundation-freeze-declaration.md) · [DASH-01](DASH-01-enterprise-dashboard-pattern.md) · UI-02 (Golden Reference) · [UIP-03](UIP-03-member-workspace-pattern.md)/[UIP-04](UIP-04-finance-workspace-pattern.md)/[UIP-05](UIP-05-reports-center-pattern.md)/[UIP-06](UIP-06-tournament-center-pattern.md).

**Không** định nghĩa lại: Design Tokens · Shared Components · Governance Rules · Dashboard Constitution · Visual Constitution.

## 4. AI Business Invariants

UI-07 **KHÔNG được** thay đổi:

- LiteLLM · OpenRouter · Ollama (LLM routing/provider)
- Execution Engine · Hermes · Workflow · Notification
- Permission · Database · API · Conversation · Memory · Knowledge · Agent Runtime · Execution Program

**Bất biến bắt buộc:**

- UI chỉ **render dữ liệu hiện có** và **gọi flow read-only/approval hiện có**.
- Không tự sinh/sửa/xóa conversation, memory, knowledge nếu backend chưa hỗ trợ.
- Không tự thay đổi provider/routing/model config.
- Thiếu dữ liệu → "Chưa có dữ liệu", **không bịa AI state/insight**.
- Execution thuộc **Epic 4.2 (BLOCKED)** — UI-07 **không** mở execution.

## 5. AI Safety (read-only / governance)

AI Workspace **chỉ** định nghĩa: read-only insight · recommendation · conversation · preview · approval (human) · explanation/reasoning · knowledge · status.

UI-07 **không được**: AI execute · AI approve (tự động) · AI send · AI delete · AI create · AI transfer · AI update database · AI manipulate finance · AI manipulate tournament · AI call workflow tự động.

> Pattern hành động AI: **Insight → Recommendation → Suggested Action → Human Approval → (nếu approve) gọi backend flow hiện có**. Mọi action ghi = **Not Executed** cho tới khi human duyệt qua flow backend. Đồng bộ Maika governance (Sprint 3): toàn bộ read-only, `executionAllowed=false`.
>
> ⚠️ **Nếu UI cho phép AI execute/approve/send/transfer/write tự động → CRITICAL FAIL trong Codex.**

## 6. Workspace Layout

**Desktop:** `PageShell` → `PageHeader` → AI Tabs → KPI Row → Conversation Panel → AI Insight → Recommendation → Knowledge → History → Tool Status → Detail Drawer → Loading/Empty/Error states.

**Mobile:** MobileHeader → Drawer navigation (full menu) → AI tabs scroll ngang → KPI compact → Conversation cards → Insight cards → Knowledge cards → Detail bottom sheet → Loading/Empty/Error states.

## 7. PageHeader Pattern

- **Title:** "AI Workspace" (hoặc "Trợ lý AI")
- **Subtitle:** "Trợ lý AI của CLB — hiểu, phân tích, đề xuất và hỗ trợ (read-only, cần con người duyệt)."
- **Header actions:** Hỏi AI / Trò chuyện · Xem đề xuất · Kiến thức · (các action ghi chỉ hiển thị nếu backend hỗ trợ + human approval).

> **Không** hiển thị action execute/write. **Không** hiển thị action không có backend hỗ trợ.

## 8. AI Tabs

`ResponsiveTabs`: Tổng quan · Trò chuyện · Đề xuất (Insight/Recommendation) · Kiến thức · Lịch sử · Trạng thái công cụ (Tool/Memory/Health). Mobile: scroll ngang, không mất tab, **không ép table ngang**.

## 9. KPI Summary Pattern

KPI (nếu data có, map `MetricCard`): Số hội thoại · Đề xuất chờ duyệt · Insight mới · Trạng thái AI (health) · Provider/model đang dùng · Memory/Knowledge entries (read-only).

> Thiếu dữ liệu → "Chưa có dữ liệu"; **không tự tính** nếu backend/store có summary chính thức. Phân biệt **official summary** vs **filtered preview metric** (ghi rõ "đang lọc").

## 10. AI Modules cần chuẩn hóa

Maika · Lisa · Hermes · Knowledge · Conversation · Notification Status · Tool Status · Memory Status · AI Health · Prompt History · **Reasoning Preview** (read-only) · **Action Preview** (proposal, not executed) · **Approval Queue** (human) · **Execution Status (read-only)**.

> Reasoning/Action Preview + Approval Queue + Execution Status đều **read-only / proposal / pending human approval** — không phản ánh "đã execute" khi backend chỉ read/propose.

## 11. Conversation Pattern

Conversation Panel (Maika/Lisa/Hermes): tin nhắn read-only + gửi câu hỏi (nếu backend hỗ trợ chat) · reasoning preview (nếu có) · nguồn/knowledge tham chiếu · trạng thái (đang xử lý/hoàn tất/lỗi).

> **Không** tự gửi/xóa hội thoại thay người; chỉ gọi endpoint chat hiện có. AI trả lời = read-only content; hành động đề xuất = proposal.

## 12. AI Insight / Recommendation Pattern

Insight card (tone `ai`): priority · confidence · reasoning · suggested action · expand · history. Recommendation → **Suggested Action → Human Review / Not Executed**.

> **Không** tự thực thi khuyến nghị; **không** hiển thị "đã làm" khi backend chỉ propose.

## 13. Knowledge Pattern

Knowledge list/cards (read-only): nguồn · loại · cập nhật gần nhất · trạng thái vector/policy (nếu có). Thiếu → EmptyState "Chưa có dữ liệu". **Không** tự tạo/sửa/xóa knowledge nếu backend chưa hỗ trợ; PII/finance theo VectorContentPolicy hiện có (không đổi).

## 14. Tool / Memory / Health Status Pattern

Hiển thị **read-only**: tool status (available/degraded) · memory status · AI health · provider/model · retry/failover status (nếu có). Dùng `StatusBadge` (text + tone, không chỉ màu). **Không** cho phép UI thay đổi config runtime.

## 15. Approval Queue / Execution Status Pattern

- **Approval Queue:** danh sách proposal chờ **human approval**; mỗi item: mô tả · dry-run/preview · rủi ro · nút Duyệt/Từ chối (gọi backend approval flow hiện có, nếu có). Mặc định `approved=false`, `executionAllowed=false`.
- **Execution Status:** **read-only** — hiển thị trạng thái (pending/not executed). UI-07 **không** mở execution (Epic 4.2 BLOCKED).

## 16. Match Detail / Detail Drawer Pattern

- **Desktop:** right drawer / side panel cho chi tiết insight/conversation/proposal.
- **Mobile:** bottom sheet.

Nội dung: reasoning · nguồn · suggested action · trạng thái approval · lịch sử. **Không** expose secret/PII không cần thiết.

## 17. Charts / Visualization Pattern

Nếu data có (bọc `ChartCard`): AI usage trend · insight theo loại · approval throughput · health timeline. Chưa có → `EmptyState`, **không chart giả**. Chart có title/subtitle · tooltip rõ · data-viz constants/token · không quá nhiều màu.

## 18. Loading / Empty / Error States (Amendment #01 — bắt buộc)

- **Loading:** shared `LoadingState`; initial load; refresh/gửi câu hỏi/tải insight.
- **Empty:** no conversation · no insight · no recommendation · no knowledge · no approval · filter no-result · no chart data.
- **Error:** icon · title · description · retry; retry dùng **API hiện có**; **không** tạo endpoint mới.

> Thiếu state → UI-07 **không được** ghi `READY FOR CODEX UI AUDIT`.

## 19. Desktop Pattern

Phải có: PageHeader · AI Tabs · KPI · Conversation Panel · Insight/Recommendation · Knowledge · History · Tool Status · Detail Drawer · Loading/Empty/Error. **Không overflow ngang.**

## 20. Mobile Pattern

Phải có: KPI compact · AI tabs scroll ngang · conversation cards · insight cards · knowledge cards · detail bottom sheet · Loading/Empty/Error. **Không** table ngang · **không** mất conversation/insight/knowledge/approval so với desktop (Feature Parity).

## 21. Accessibility

- Icon-only button có `aria-label` · tabs có trạng thái active · section có heading.
- Chart có title/description · table có header · status có text (không chỉ màu).
- Message/conversation có role/label · focus visible · touch target ≥ 40px · error có retry rõ ràng · input chat có label.

## 22. Visual Quality Gate — VDS-01

Mọi UI-07 implementation phải đạt: Không giống CRUD/chatbot rẻ tiền · Visual hierarchy rõ · Spacing đều · Typography đúng cấp · Cards premium · KPI dễ scan · Conversation dễ đọc · **AI UI nhẹ, tin cậy, không noisy** · Mobile như app thật · Loading/Empty/Error đẹp · Không hiển thị AI "đã execute" khi chưa · Không hard-code màu · Giữ accessibility.

> **Visual Quality Score phải ≥ 95/100.** Nếu < 95 → redesign tiếp, **không** ghi `READY FOR CODEX UI AUDIT`.

## 23. Visual Score Gate

UI-07 implementation phải tự chấm: Functionality /100 · Architecture /100 · Accessibility /100 · Design Consistency /100 · Visual Quality /100. Nếu **Visual Quality < 95** → **không** gửi Codex audit.

## 24. Shared Component Mapping

| Pattern | Component |
|---|---|
| Container | `PageShell` |
| Header | `PageHeader` |
| KPI | `MetricCard` |
| AI tabs | `ResponsiveTabs` |
| Filter/Search | `FilterBar` |
| Bảng (desktop) | `DataTable` |
| Danh sách (mobile) | `MobileCardList` |
| Trạng thái | `StatusBadge` (tone `ai` cho AI) |
| Nút hành động | `ActionButton` |
| Rỗng | `EmptyState` |
| Đang tải | `LoadingState` |
| Chart | `ChartCard` |

> Component mới → **chỉ** ai-specific (vd AiInsightCard, ConversationBubble, ApprovalItem); **không** trùng shared; dùng `--pf-*` token (tone `ai` = `--pf-color-ai`); đạt **VDS-01 visual bar**.

## 25. Business Logic Boundaries

UI-07 **không được** đổi: Execution · Workflow · Finance · Tournament · Reports · Members · Attendance · Database · API · LLM routing · Memory · Knowledge · Agent Runtime · Permission.

> UI chỉ **render dữ liệu hiện có** và **gọi flow read-only/approval hiện có**. **Không AI execute** (Epic 4.2 BLOCKED).

## 26. UI-07 Scope Preview

Sau khi UIP-07 Codex PASS, UI-07 **được phép**: rewrite/tạo màn AI Workspace · nâng cấp Desktop/Mobile UI · reuse shared components · cập nhật `PROJECT_STATUS`.

UI-07 **không được**: sửa backend · thêm API mới · sửa DB · mở execution · cho AI execute/approve/send/write tự động · đổi LLM routing/memory/knowledge logic · mở UI-08.

## 27. Execution Program

- Execution Program: **UNCHANGED**
- Epic 4.2: **BLOCKED**
- Execution Readiness: **NOT READY**

> UIP-07/UI-07 **không** thay đổi Execution Readiness. AI vẫn read-only/governance (Maika/Lisa/Hermes).

## 28. Decision

**Đề xuất:** UIP-07 chọn **AI Workspace Pattern** làm chuẩn cho UI-07.

UI-07 **chỉ** được mở sau: UIP-07 Codex PASS · Commit · Tag · Push.

---

> 🧾 UIP-07 v1.0 — AI Workspace Pattern (✅ Accepted / Codex PASS). Thay đổi pattern phải qua Design Increment mới + Codex Audit. UI-07 (🟢 READY TO START) triển khai ở increment riêng (theo Amendment #02), sau khi UIP-07 PASS. Tokens/components theo UDP-01/DESIGN-01, Workspace State theo Amendment #01, Visual Quality theo VDS-01, governance theo GOV-01. **AI read-only/governance — UI không execute/approve/write tự động; Execution thuộc Epic 4.2 (BLOCKED); Execution Readiness NOT READY.**
