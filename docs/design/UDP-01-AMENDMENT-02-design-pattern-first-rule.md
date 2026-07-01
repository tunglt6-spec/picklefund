# UDP-01 Amendment #02 — Design Pattern First Rule

> **Design Constitution Amendment** cho [UDP-01](UDP-01-unified-product-design-constitution.md). Chính thức hóa quy luật **UIP-x trước, UI-x sau**. Kế thừa [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md) (Workspace State DoD); tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). Không thay thế UDP-01, không định nghĩa lại Design Tokens/Component Library/Governance Rules.

## 1. Status

- **Status:** ✅ Accepted · Codex PASS
- **Type:** Design Constitution Amendment
- **Scope:** All UI Workspaces from UI-04 onward
- **Implementation:** Documentation only

## 2. Decision

Từ UI-04 trở đi, mọi UI Workspace **chỉ được mở implementation** khi đã có:

- UIP-x Design Pattern
- Codex Audit PASS
- Commit
- Tag
- Push

Nếu chưa có **UIP-x chính thức (Official)**, Claude Code **KHÔNG** được triển khai UI-x.

## 3. Required Workflow

```text
UIP-x Design Pattern
  → Codex Audit
  → PASS
  → Commit
  → Tag
  → Push
  → UIP-x Official
  → UI-x Implementation
  → Codex UI Audit
  → PASS
  → Commit
  → Tag
  → Push
  → UI-x Closed
```

## 4. Scope of Application

Áp dụng cho:

- UI-04 Finance Workspace
- UI-05 Reports Center
- UI-06 Tournament Center
- UI-07 AI Workspace
- UI-08 Notification Center
- UI-09 Settings
- UI-10 Commercial Polish
- AI Commerce Platform workspaces
- AI Organization Platform workspaces
- Future AI products

## 5. UIP-x Requirements

Mỗi UIP-x phải có tối thiểu:

- Document type rõ ràng: **Design Pattern Document**
- Workspace mục tiêu
- Desktop layout
- Mobile layout
- Feature Parity
- Shared Component Mapping
- **Loading / Empty / Error states** theo [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md)
- Business Logic Boundaries
- AI UX boundary (nếu có AI)
- Responsive rules
- Accessibility rules
- Scope preview cho UI-x

## 6. UI-x Requirements

UI-x chỉ được triển khai **đúng theo UIP-x đã PASS**.

UI-x **không được**:

- mở rộng ngoài scope UIP-x
- sửa backend nếu UIP không cho phép
- sửa API nếu UIP không cho phép
- sửa finance / execution / database
- bỏ qua Loading / Empty / Error DoD
- bỏ qua mobile parity

## 7. Relationship with UDP-01

Amendment #02 **mở rộng** UDP-01. Không thay thế UDP-01. Không định nghĩa lại Design Tokens. Không định nghĩa lại Component Library.

## 8. Relationship with Amendment #01

Amendment #02 **kế thừa** [Amendment #01](UDP-01-AMENDMENT-01-workspace-state-dod.md). Mọi UIP-x phải đưa **Loading / Empty / Error** vào checklist và UI-x DoD.

## 9. Relationship with GOV-01

Tuân thủ [GOV-01](../governance/GOV-01-project-governance-baseline-v2.1.md). Không định nghĩa lại Governance Rules. Chỉ tham chiếu GOV-01.

## 10. Forbidden Shortcuts

Cấm:

- triển khai UI-x khi chưa có UIP-x
- ghi `READY FOR CODEX UI AUDIT` nếu chưa có UIP-x Official
- gộp UIP-x và UI-x trong cùng commit
- commit implementation trước pattern
- tạo pattern sau khi đã code xong để hợp thức hóa
- bỏ qua Codex Audit cho UIP-x

## 11. Exception Policy

Chỉ được bỏ qua UIP-x nếu:

- hotfix UI rất nhỏ
- bug fix không thay đổi layout/pattern
- copy/text typo
- accessibility fix nhỏ
- token usage fix nhỏ

Nhưng phải ghi rõ trong report:

```text
Design Pattern First Rule: Not applicable — reason.
```

## 12. Design Pre-Audit Checklist Update

Thêm checklist bắt buộc:

- [ ] UIP-x exists
- [ ] UIP-x Codex PASS
- [ ] UIP-x committed
- [ ] UIP-x tagged
- [ ] UIP-x pushed
- [ ] UI-x scope matches UIP-x
- [ ] Loading / Empty / Error included
- [ ] Mobile parity included
- [ ] Business boundaries included

Nếu thiếu bất kỳ mục nào → **không được ghi** `READY FOR CODEX UI AUDIT`.

## 13. Decision Outcome

Sau Codex PASS + Commit/Tag/Push: **Design Pattern First Rule** trở thành bắt buộc cho **UI-04 trở đi**.

---

> 🧾 UDP-01 Amendment #02 — Design Pattern First Rule (✅ Accepted / Codex PASS). Mở rộng UDP-01, kế thừa Amendment #01; tokens/components theo UDP-01/DESIGN-01, governance theo GOV-01. Thay đổi phải qua Amendment mới + Codex Audit.
