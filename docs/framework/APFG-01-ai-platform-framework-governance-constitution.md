# APFG-01 — AI Platform Framework Governance Constitution

> **AI Platform Framework Governance Constitution** — tầng quản trị **cao nhất** cho toàn bộ hệ sinh thái **AI Platform Framework**. Đây **không** phải tài liệu của một sản phẩm cụ thể; là Constitution **dùng chung** cho mọi Product áp dụng Framework. APFG-01 đứng **trên** mọi Program Governance (Release / Execution / Data / Security / AI) và **trên** mọi Product Governance. Product Governance **kế thừa** — **không** ngang hàng với APFG-01.

**Mã:** APFG-01 · **Loại:** AI Platform Framework Governance Constitution · **Tầng:** Framework (cao nhất) · **State:** ✅ **Accepted / Codex PASS / CLOSED** · **Ngày:** 2026-07-02

> ✅ **State = Accepted / Codex PASS / CLOSED** (Final Audit PASS + Commit/Tag/Push — tag `v2.1-apfg01-ai-platform-framework-governance`). **Framework Governance ACTIVE**: APFG-01 chính thức là Constitution tối cao — mọi Program/Product kế thừa và tuân thủ precedence (Chương 5). Đây vẫn là đặc tả Constitution ở tầng Framework — **không** định nghĩa UI/UX/API/DB/Business Logic/Runtime Implementation (Chương 14). Thay đổi sau CLOSED phải qua Framework Amendment (RFC → Audit → PASS), không rewrite tuỳ tiện.

---

## Chương 1 — Purpose

### 1.1 Định nghĩa AI Platform Framework
**AI Platform Framework** là tập hợp chuẩn hoá gồm **governance · programs · assets · patterns · lifecycle** dùng để xây dựng và vận hành nhiều **AI Product** trên một nền tảng chung, có thể tái sử dụng và tiến hoá độc lập với từng sản phẩm.

### 1.2 Mục tiêu
- Thiết lập **một nguồn quản trị tối cao** (Framework Governance) cho mọi AI Product.
- Cho phép **tái sử dụng** governance/pattern/asset giữa các Product mà không sao chép rời rạc.
- Tách bạch rõ **Design** và **Execution** để giảm rủi ro và tăng khả năng kiểm toán.
- Bảo đảm **Human Approval · AI Safety · Runtime Safety** ở tầng Framework, độc lập với business logic của Product.
- Cho phép Product tiến hoá độc lập trong khi vẫn tuân thủ ràng buộc Framework.

### 1.3 Phạm vi
APFG-01 quản trị **cấu trúc, quan hệ, thứ tự ưu tiên (precedence), vòng đời, nguyên tắc** ở tầng Framework. Không quản trị chi tiết kỹ thuật của Product (xem Chương 14 — Scope Boundary).

### 1.4 Triết lý
- **Framework First · Governance First**: cấu trúc và quản trị đi trước hiện thực.
- **Pattern Before Implementation**: mẫu thiết kế phải được duyệt trước khi triển khai.
- **Separation of Concerns**: Design ≠ Execution; Product ≠ Framework.
- **Auditability by design**: mọi thay đổi phải kiểm toán được, có ranh giới giao dịch rõ ràng.

---

## Chương 2 — Framework Hierarchy

Hệ phân tầng là một **chain tuyến tính** (tầng dưới **kế thừa** tầng trên; không có quan hệ sibling giữa các tầng governance):

```
AI Platform Framework
        ↓
APFG-01            (AI Platform Framework Governance Constitution — tối cao)
        ↓
RELEASE-01         (Release Governance)
        ↓
EGOV-01            (Execution Governance — kế thừa Release Governance)
        ↓
EWR-01             (Execution Working Rules — kế thừa Execution Governance)
        ↓
Execution Runtime  (thực thi action; quyền Runtime CHỈ được cấp tại tầng này)
        ↓
Products           (Product A, Product B, … — kế thừa toàn bộ chain)
```

- Tầng trên **ràng buộc** tầng dưới; tầng dưới **kế thừa** và **không** được vi phạm tầng trên.
- **RELEASE-01 và EGOV-01 KHÔNG phải sibling**: EGOV-01 nằm **dưới** RELEASE-01 và kế thừa Release Governance.
- **Product Governance KHÔNG ngang hàng APFG-01**: Product nằm ở đáy chain, kế thừa toàn bộ tầng trên.
- Một thay đổi ở tầng Framework có hiệu lực xuống toàn bộ tầng dưới (qua vòng kế thừa, Chương 8).

---

## Chương 3 — Framework Assets

Phân loại tài sản theo tầng sở hữu:

| Loại asset | Định nghĩa | Ví dụ loại (không phải sản phẩm) |
|---|---|---|
| **Framework Assets** | Chuẩn dùng chung toàn hệ sinh thái | Constitution, naming convention, lifecycle model, governance rules |
| **Program Assets** | Thuộc một Program | Design pattern library, execution governance model, data policy |
| **Product Assets** | Thuộc một Product | Product Governance, product design system, product patterns |
| **Deployment Assets** | Thuộc một môi trường triển khai | Config, secrets policy, tenant setup, release artifact |
| **Shared Assets** | Dùng lại xuyên Product qua Framework | Shared component contract, token contract, audit format |

**Nguyên tắc asset:** asset ở tầng thấp **không** được ghi đè định nghĩa tầng cao; tái sử dụng Shared Assets phải qua Framework, không sao chép rời rạc.

---

## Chương 4 — Governance Hierarchy

```
APFG-01                              (Framework Governance — tối cao)
   ↓
Release Governance   (RELEASE-01)
   ↓
Execution Governance (EGOV-01 → EWR-01 → Execution Runtime)
   ↓
Data / Security / AI Governance      (DataGOV / SGOV / AGOV)
   ↓
Product Governance                   (Product A / Product B — cụ thể hoá, không ghi đè)
```

- **APFG-01** định nghĩa nguyên tắc và ranh giới; **không** định nghĩa chi tiết Product.
- **Release Governance (RELEASE-01)** kế thừa APFG-01; đứng **trên** Execution Governance.
- **Execution Governance (EGOV-01)** kế thừa Release Governance; **EWR-01** cụ thể hoá vận hành Execution.
- **Data / Security / AI Governance** là các lĩnh vực quản trị kế thừa APFG-01 (thứ tự ưu tiên xem Chương 5).
- **Product Governance** (của từng Product) kế thừa toàn bộ tầng trên; là **Product-level**, **không** phải Framework-level và **không** ngang hàng APFG-01.

---

## Chương 5 — Governance Precedence

Thứ tự ưu tiên quản trị (precedence) — quyết định tầng nào **thắng** khi có xung đột:

```
APFG-01
    ↓
Release Governance
    ↓
Execution Governance
    ↓
Data Governance
    ↓
Security Governance
    ↓
AI Governance
    ↓
Product Governance
```

**Quy tắc precedence (bắt buộc):**

1. **Tầng dưới không được mâu thuẫn với tầng trên.**
2. **Nếu có xung đột, tầng trên luôn thắng.**
3. **Product Governance chỉ được mở rộng, không được ghi đè Framework Governance.**
4. **Release Governance kế thừa APFG-01.**
5. **Execution Governance kế thừa Release Governance.**
6. **Data / Security / AI Governance là forward references** nếu tài liệu tương ứng chưa tồn tại.
7. **Forward references không có hiệu lực Governance** cho tới khi được **Accepted / Codex PASS / CLOSED**.

> **Forward-reference status (tại 2026-07-02):** RELEASE-01 (Release Governance) đã hiệu lực (Framework Release Governance ACTIVE). **EGOV-01, EWR-01, ER (Execution Readiness), DataGOV, SGOV, AGOV chưa tồn tại dạng tài liệu** → là **forward references**, chưa có hiệu lực Governance theo quy tắc 7. APFG-01 **không** giả định chúng đã tồn tại và **không** tạo lifecycle thay chúng.

---

## Chương 6 — Program Model

Program là đơn vị quản trị theo lĩnh vực, kế thừa APFG-01:

| Program | Trạng thái khái niệm | Quản trị bởi |
|---|---|---|
| **Release Program** | Hiệu lực (Framework Release Governance ACTIVE) | Release Governance (RELEASE-01) |
| **Execution Program** | Forward reference (chưa mở) | Execution Governance (EGOV-01) |
| **Design Program** | Hiện hữu (đã áp dụng ở một Product) | Design / Product Design Governance |
| **Data Program** | Forward reference | Data Governance (DataGOV) |
| **Security Program** | Forward reference | Security Governance (SGOV) |
| **AI Governance Program** | Forward reference | AI Governance (AGOV) |

- Mỗi Program có vòng đời, gate, và Working Rules riêng — nhưng đều **kế thừa** APFG-01.
- Program **không** vượt ranh giới lĩnh vực của mình (xem Chương 11 — Execution Separation).

---

## Chương 7 — Product Model

- **Product kế thừa Framework** (qua chain governance + APFG-01). Product **không** định nghĩa lại governance tầng trên.
- Product mang **Product Governance** riêng (cụ thể hoá cho nghiệp vụ của mình) nhưng phải nằm trong ranh giới Framework và chỉ **mở rộng**, không ghi đè.
- Các Product áp dụng Framework được tham chiếu chung là **Product A · Product B · …** — Framework **product-agnostic**, không gắn với một sản phẩm cụ thể nào làm chủ sở hữu.
- **Không Product nào là chủ sở hữu Framework**; mọi Product là bên **áp dụng** Framework.

---

## Chương 8 — Governance Inheritance

```
Framework  →  Release Governance  →  Execution Governance  →  Product Governance
```

- **Kế thừa bắt buộc:** mỗi tầng phải tuân thủ toàn bộ ràng buộc tầng trên.
- **Không đảo chiều:** tầng dưới không sửa/ghi đè tầng trên; muốn đổi tầng trên phải qua quy trình sửa đổi của chính tầng đó (Framework Amendment do APFG-01 kiểm soát — future, không tạo ở đây).
- **Xung đột:** khi mâu thuẫn, tầng cao thắng theo precedence (Chương 5).

---

## Chương 9 — Versioning

| Cấp | Version | Ý nghĩa |
|---|---|---|
| **Framework Version** | `FvX.Y` | Bản của toàn Framework/Constitution |
| **Program Version** | `PvX.Y` | Bản của một Program |
| **Product Version** | `X.Y` | Bản của một Product |
| **Release Version** | `X.Y.Z (+build)` | Đơn vị phát hành có kiểm toán/rollback (theo Release Governance) |

- Thay đổi **breaking** ở Framework → tăng major; Program/Product kế thừa phải re-audit tương thích.
- Chi tiết lifecycle/tagging/rollback của phát hành thuộc **Release Governance (RELEASE-01)**; APFG-01 chỉ đặt nguyên tắc cấp Framework.
- Version phải **truy vết** được tới commit/tag/release (Observability — Chương 12).

---

## Chương 10 — Naming Convention

| Tiền tố | Ý nghĩa |
|---|---|
| **APFG** | AI Platform Framework Governance (tầng khung tối cao) |
| **RELEASE** | Release Governance / Đơn vị phát hành |
| **EGOV** | Execution Governance |
| **EWR** | Execution Working Rules |
| **DGOV** | Design Governance |
| **DataGOV** | Data Governance |
| **SGOV** | Security Governance |
| **AGOV** | AI Governance |
| **PGOV** | Program Governance (chung) |
| **WR** | Working Rules |
| **PATTERN** | Design/Architecture Pattern |
| **IMPLEMENTATION** | Bản hiện thực |

Quy ước: `<PREFIX>-<số thứ tự>-<slug>`; docs tham chiếu bằng mã, không sao chép nội dung tầng trên.

---

## Chương 11 — Execution Separation

- **Design Program** và **Execution Program** **hoàn toàn độc lập** về lĩnh vực.
- **Design không quản trị Runtime:** pattern/UI không mở/điều khiển execution, workflow, job, ghi dữ liệu runtime.
- **Execution không quản trị UI:** execution engine không định nghĩa design/visual/UX.
- Giao diện giữa hai bên chỉ qua **hợp đồng đã kiểm toán** (contract) + **Human Approval**; không có đường tắt.
- **AI Safety invariant:** AI ở tầng Design/Product chỉ **read-only / propose / human-approval**; **execute** chỉ thuộc Execution Runtime dưới EGOV/EWR và các gate riêng.

---

## Chương 12 — Framework Principles (20)

1. **Framework First** — chuẩn khung đi trước sản phẩm.
2. **Governance First** — quản trị đi trước hiện thực.
3. **Pattern Before Implementation** — mẫu duyệt trước khi code.
4. **Human Approval** — hành động ghi/nhạy cảm cần con người duyệt.
5. **AI Safety** — AI read-only/propose, không tự execute ngoài ranh giới.
6. **Runtime Safety** — execution có gate, guard, rollback.
7. **Transaction** — một package = một giao dịch, ranh giới rõ.
8. **Audit** — mọi thay đổi kiểm toán được trước khi đóng.
9. **Release** — phát hành có phiên bản, tag, truy vết (theo Release Governance).
10. **Rollback** — mọi release có đường lùi an toàn.
11. **Observability** — trạng thái/log/lineage quan sát được.
12. **Security** — bảo mật/PII/secret theo policy tầng trên.
13. **Maintainability** — dễ bảo trì, không nợ kỹ thuật ẩn.
14. **Scalability** — mở rộng theo Product/Deployment không phá khung.
15. **Reusability** — tái sử dụng asset qua Framework.
16. **Product Independence** — Product tiến hoá độc lập trong ranh giới.
17. **Framework Reuse** — không sao chép rời rạc; dùng lại chuẩn.
18. **Documentation** — tài liệu là hợp đồng; không trạng thái giả.
19. **Lifecycle** — Proposed → Audit → PASS → Commit/Tag/Push → Effective.
20. **Evolution** — thay đổi qua quy trình sửa đổi có kiểm soát, không rewrite tuỳ tiện.

---

## Chương 13 — Future Evolution

Framework có thể mở rộng sang nhiều lĩnh vực (loại, không phải cam kết sản phẩm): Commerce · Airport · Government · Education · Healthcare · Manufacturing · Smart City · … Mỗi lĩnh vực mới là một **Product/Program** kế thừa APFG-01; mở rộng phải qua Audit + lifecycle, không phá vỡ ràng buộc khung.

---

## Chương 14 — Scope Boundary

APFG-01 **không** định nghĩa: UI · UX · Database · API · Business Logic · Product Design · Execution Detail · Runtime Implementation.

Các mục trên thuộc **Program/Product/Deployment** tương ứng. APFG-01 chỉ quản trị cấu trúc, quan hệ, precedence, vòng đời, nguyên tắc, ranh giới.

---

## Chương 15 — Relationship Matrix

```
AI Platform Framework → APFG-01 → RELEASE-01 → EGOV-01 → EWR-01 → Execution Runtime → Products
```

| Quan hệ | Ràng buộc |
|---|---|
| AI Platform Framework → APFG-01 | APFG-01 là Constitution tối cao của Framework |
| APFG-01 → RELEASE-01 | Release Governance kế thừa & cụ thể hoá APFG-01 cho phát hành |
| RELEASE-01 → EGOV-01 | Execution Governance kế thừa Release Governance (không sibling); Release **không** cấp quyền Runtime |
| EGOV-01 → EWR-01 | Execution Working Rules kế thừa Execution Governance |
| EWR-01 → Execution Runtime | Quyền Runtime chỉ cấp ở tầng Execution Runtime, dưới EGOV/EWR |
| Execution Runtime → Products | Product áp dụng Framework, kế thừa toàn bộ chain; Product Governance chỉ mở rộng |

> EGOV-01 / EWR-01 / Execution Runtime là **forward references** (chưa tồn tại dạng tài liệu) — chưa có hiệu lực Governance theo Chương 5 §7.

---

## Chương 16 — Decision

- **APFG-01 là Constitution cao nhất** của AI Platform Framework.
- **Mọi Program phải kế thừa APFG-01.**
- **Mọi Product phải kế thừa Program** (và qua đó kế thừa APFG-01); Product Governance **không** ngang hàng APFG-01.
- **Precedence:** APFG-01 → Release → Execution → Data → Security → AI → Product; tầng trên thắng khi xung đột.
- Design và Execution độc lập; Execution do EGOV/EWR quản trị ở tầng dưới Release Governance.
- APFG-01 hiện **Accepted / Codex PASS / CLOSED** — **Framework Governance ACTIVE**, hiệu lực làm governance gate tối cao (tag `v2.1-apfg01-ai-platform-framework-governance`).

---

> 🧾 APFG-01 — AI Platform Framework Governance Constitution (✅ Accepted / Codex PASS / CLOSED · **Framework Governance ACTIVE** · tag `v2.1-apfg01-ai-platform-framework-governance`). Constitution tầng Framework cao nhất; chain: AI Platform Framework → APFG-01 → RELEASE-01 → EGOV-01 → EWR-01 → Execution Runtime → Products. Precedence: APFG-01 → Release → Execution → Data → Security → AI → Product (tầng trên thắng). Product-agnostic (ví dụ dùng Product A/Product B); không Product nào là chủ sở hữu Framework. Không định nghĩa UI/UX/DB/API/business logic/execution detail (Chương 14). EGOV-01/EWR-01/ER/DataGOV/SGOV/AGOV là forward references (chưa hiệu lực). Không tạo Constitution/Amendment khác. Thay đổi phải qua Audit + lifecycle.
