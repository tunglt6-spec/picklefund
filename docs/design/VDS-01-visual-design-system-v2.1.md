# VDS-01 — Visual Design System v2.1 (Visual Constitution)

> **Visual Design Constitution** — chuẩn hóa "khẩu vị thị giác" (visual quality) cho toàn bộ PickleFund & hệ sinh thái AI. VDS-01 **bổ sung lớp Visual Quality** cho [UDP-01](UDP-01-unified-product-design-constitution.md), [DASH-01](DASH-01-enterprise-dashboard-pattern.md), UIP-x, UI-x — **KHÔNG thay thế** UDP-01. Tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md); kế thừa [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) + [Amendment #02](UDP-01-AMENDMENT-02-design-pattern-first-rule.md).

**Phiên bản:** v2.1 · **Ngày:** 2026-07-01 · **Chương trình:** UI Refresh Program v2.1

> 🎨 **Nguồn tham chiếu tinh thần (taste):** design-taste-frontend-v1 · high-end-visual-design · stitch-design-taste · redesign-existing-projects · minimalist-ui (thứ tự ưu tiên khi xung đột). *Các skill này được tham chiếu về **tinh thần thiết kế**; VDS-01 mã hóa nguyên tắc của chúng thành chuẩn kiểm được cho dự án.*

---

## 1. Status

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Visual Design Constitution
- **Scope:** PickleFund + AI Commerce Platform + AI Organization Platform
- **Implementation:** Documentation only

## 2. Purpose

Chuẩn hóa visual quality cho toàn bộ UI Program: enterprise SaaS · premium product feel · clean visual hierarchy · consistent spacing rhythm · high-end dashboard aesthetics · mobile-native experience · reusable across AI products.

## 3. Relationship

VDS-01 **bổ sung**: UDP-01 · DESIGN-01 · DASH-01 · UIP-x · UI-x.

VDS-01 **không thay thế**: GOV-01 · UDP-01 · Amendment #01 · Amendment #02.

> Thứ tự nguồn chân lý: **GOV-01** (governance) → **UDP-01** (design tokens/components) → **DASH-01/UIP-x** (pattern) → **VDS-01** (visual quality bar). VDS-01 không định nghĩa lại tokens/components/governance — chỉ nâng chuẩn cảm quan.

## 4. Visual Principles (10)

1. **Premium but calm** — sang nhưng tĩnh, không phô trương.
2. **Clarity before decoration** — rõ ràng trước trang trí.
3. **Spacious but information-dense** — thoáng nhưng vẫn đủ thông tin.
4. **Enterprise trust** — cảm giác đáng tin, chuyên nghiệp.
5. **Mobile-native parity** — mobile như app thật, đủ chức năng.
6. **AI should feel helpful, not noisy** — AI hữu ích, không ồn ào.
7. **Financial data must feel precise** — số liệu tài chính phải chính xác/tin cậy.
8. **Sports energy without visual chaos** — năng lượng thể thao nhưng không hỗn loạn.
9. **Consistency over novelty** — nhất quán hơn là mới lạ.
10. **Every screen must feel commercial-ready** — mọi màn sẵn sàng thương mại.

## 5. Visual Quality Bar

Mỗi UI phải đạt cảm giác ngang chuẩn: **Linear · Stripe · Vercel · Notion · ClickUp · Atlassian · modern SaaS dashboard**.

**Không** được giống: CRUD admin template · Bootstrap dashboard cũ · quá nhiều màu · bảng dữ liệu thô · UI thiếu khoảng trắng · mobile web gò bó.

## 6. Layout Rhythm

- Page max-width (container `PageShell`, 1440).
- 12-column desktop grid.
- Card spacing / section spacing / KPI spacing / chart spacing đồng đều theo token.
- Mobile stacking rõ ràng.
- Sidebar/content breathing room (không dồn cục).

## 7. Typography

Title scale · subtitle scale · KPI number scale (lớn, `tabular-nums`) · table text · label · helper text · empty/error text · mobile typography (≥13px). **Không** dùng font-size tùy tiện — theo thang chuẩn UDP-01.

## 8. Card Composition

Chuẩn hóa: padding · radius (16–24) · shadow mềm · border nhẹ · icon placement (badge accent) · heading · value · delta · mini chart · action area. **Card phải có hierarchy rõ** (label → value → sub/trend).

## 9. KPI Visual Standard

KPI phải: dễ scan · số lớn rõ · label ngắn · delta có text · negative/positive rõ (**không chỉ dùng màu**) · không rối icon.

## 10. Table Standard

Table phải: header rõ (uppercase nhẹ) · row height thoáng · action rõ · hover tinh tế · badge dễ đọc · **mobile chuyển card** · **không table ngang trên mobile**.

## 11. Mobile Visual Standard

Mobile phải: giống app thật · card stack rõ · sticky action hợp lý · bottom sheet đẹp · filter bottom sheet · touch target ≥ 40px · **không overflow ngang** · không nhồi thông tin.

## 12. AI Visual Standard

AI UI phải: nhẹ · tin cậy · **read-only nếu chưa execute** · có confidence/reasoning nếu có · **không tạo cảm giác AI đã làm thay người** nếu backend chưa hỗ trợ · có nhãn recommendation/proposal/pending review.

## 13. Finance Visual Standard

Finance UI phải: chính xác · ít màu · amount rõ **+/−** · **source of truth rõ** · không làm hiểu nhầm quỹ · **Common/Mini Fund tách biệt trực quan** · **official KPI (backend summary) khác transaction-view metric** (nhãn "đang lọc").

## 14. Data Visualization Standard

Charts phải: có title/subtitle · có empty state · tooltip rõ · màu dùng **data-viz constants/token** · không quá nhiều màu · **không chart giả** · không dùng chart nếu không có dữ liệu.

## 15. Interaction / Micro UX

Chuẩn hóa: hover · focus (ring `--pf-focus-ring`) · active · loading · empty · error · disabled · drawer · modal · bottom sheet · toast. Chuyển động tinh tế, không giật.

## 16. Visual Acceptance Checklist

Mọi UI Implementation phải tự check:

- [ ] Không giống CRUD template
- [ ] Visual hierarchy rõ
- [ ] Spacing đồng đều
- [ ] Typography đúng cấp
- [ ] Cards premium
- [ ] KPI dễ scan
- [ ] Table dễ đọc
- [ ] Mobile giống app thật
- [ ] Loading/Empty/Error đẹp
- [ ] AI UI không noisy
- [ ] Finance UI chính xác
- [ ] Không hard-code màu
- [ ] Không mất accessibility

Nếu chưa đạt → **không được** ghi `READY FOR CODEX UI AUDIT`.

## 17. Visual Score Gate

Claude Code phải tự chấm mỗi UI:

| Tiêu chí | Điểm |
|---|---|
| Functionality | /100 |
| Architecture | /100 |
| Accessibility | /100 |
| Design Consistency | /100 |
| Visual Quality | /100 |

> Nếu **Visual Quality < 95** → **phải redesign tiếp** trước khi audit.

## 18. Taste Skill Bootstrap Rule

Từ **UIP-05 / UI-05 trở đi**, mọi prompt UI phải có block **`DESIGN SKILL BOOTSTRAP`** và load (về tinh thần) các skill:

- design-taste-frontend-v1
- high-end-visual-design
- stitch-design-taste
- redesign-existing-projects
- minimalist-ui

> *Ghi chú môi trường:* nếu skill chưa được cài như Claude Code skill khả dụng, phải áp dụng **nguyên tắc** của chúng (theo VDS-01) và ghi rõ trong report là tham chiếu tinh thần — không tuyên bố đã nạp skill khi chưa có.

## 19. Scope of Application

Áp dụng cho: UI-05 Reports Center · UI-06 Tournament Center · UI-07 AI Workspace · UI-08 Notification Center · UI-09 Settings · UI-10 Commercial Polish · AI Commerce Platform · AI Organization Platform · future products.

## 20. Decision

Sau **Codex PASS + Commit/Tag/Push**: VDS-01 trở thành **Visual Constitution chính thức**. Mọi UIP/UI tiếp theo **phải tham chiếu VDS-01**.

---

> 🧾 VDS-01 v2.1 — Visual Design System (✅ Accepted / Codex PASS). Visual Constitution chính thức — mọi UIP/UI tiếp theo phải tham chiếu VDS-01. Bổ sung lớp Visual Quality cho UDP-01/DASH-01/UIP-x/UI-x; không thay thế UDP-01, không định nghĩa lại tokens/components/governance. Thay đổi phải qua VDS update + Codex Audit. Tuân thủ GOV-01.
