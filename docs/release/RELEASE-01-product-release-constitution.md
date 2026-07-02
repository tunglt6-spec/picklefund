# RELEASE-01 — Product Release Constitution

> **Product Release Constitution** — bộ quy chuẩn **phát hành dùng chung** cho mọi Product áp dụng AI Platform Framework. RELEASE-01 định nghĩa **vòng đời phát hành, versioning, tagging, release gate, rollback và deployment validation**. Đây là **Release Governance** — đặt **dưới** [APFG-01](../framework/APFG-01-ai-platform-framework-governance-constitution.md) (Framework Constitution) và **trên** Execution Governance (EGOV-01): Execution Governance **kế thừa** Release Governance. Release quản trị việc *ship artifact* và **không cấp quyền Runtime**; quyền thực thi action runtime thuộc Execution Governance ở tầng dưới. RELEASE-01 là **docs-only** (đặc tả); không thay đổi code/hạ tầng.

**Mã:** RELEASE-01 · **Loại:** Product Release Constitution · **Tầng:** Release Governance (dưới APFG-01, trên EGOV-01) · **State:** ✅ **Accepted / Codex PASS / CLOSED** · **Ngày:** 2026-07-02

> ✅ **State = Accepted / Codex PASS / CLOSED** (Final Re-Audit PASS + Commit/Tag/Push — tag `v2.1-release01-product-release-constitution`). **Framework Release Governance ACTIVE**: RELEASE-01 chính thức là chuẩn phát hành dùng chung cho mọi Product áp dụng Framework. Đây vẫn là đặc tả docs-only — **không** sửa frontend/backend/API/DB/Execution/APFG/AUTH/BRAND/Design Program. Thay đổi sau CLOSED phải qua Release Increment mới (RFC → Audit → PASS).

---

## 1. Mục tiêu & Phạm vi

- Chuẩn hoá **cách phát hành** một Product (Desktop / Web / Mobile / Cloud) theo một vòng đời thống nhất, có gate và bằng chứng.
- Bảo đảm mọi bản phát hành **có thể truy vết** (immutable tag + checksum), **có thể rollback** và **được validate** trước khi tới người dùng.
- Phân định rõ **Release** (ship artifact) với **Execution** (runtime action): Release Governance đứng **trên** và được Execution Governance **kế thừa**; Release **không** cấp quyền Runtime.
- Áp dụng cho **mọi Product** dùng Framework (vd Product A, Product B); mỗi Product chỉ **tham chiếu** RELEASE-01, không định nghĩa lại.

**Ngoài phạm vi:** không định nghĩa business logic, không mở Execution Program, không thay đổi kiến trúc; không phải Execution Readiness (ER) — chỉ tham chiếu.

## 2. Vị trí trong hệ phân tầng & quan hệ

Hệ phân tầng là một **chain tuyến tính** (mỗi tầng dưới **kế thừa** tầng trên); RELEASE-01 và EGOV-01 **không** phải sibling — EGOV-01 nằm **dưới** RELEASE-01:

```
AI Platform Framework
        ↓
APFG-01            (AI Platform Framework Governance Constitution — Framework, cao nhất)
        ↓
RELEASE-01         (Product Release Constitution — Release Governance)
        ↓
EGOV-01            (Execution Governance — kế thừa Release Governance)
        ↓
EWR-01             (Execution Working Rules — kế thừa Execution Governance)
        ↓
Execution Runtime  (thực thi action; quyền Runtime chỉ cấp tại tầng này, dưới EGOV/EWR)
        ↓
Products           (áp dụng Framework; tuân thủ toàn bộ chain khi phát hành & vận hành)
```

| Quan hệ | Nội dung |
|---|---|
| **APFG-01 → RELEASE-01** | RELEASE-01 **kế thừa** APFG-01 và đứng **dưới** APFG-01; mọi xung đột ưu tiên APFG-01. |
| **RELEASE-01 → EGOV-01** | Execution Governance (EGOV-01) **kế thừa** Release Governance và nằm **dưới** RELEASE-01 (không phải sibling). Release quản trị việc *phát hành artifact* và **không** cấp quyền Runtime; một GA release **không** tự động cấp quyền Execution. *(EGOV-01 chưa tồn tại dạng tài liệu — forward reference; xem §12.)* |
| **EGOV-01 → EWR-01** | EWR-01 (**Execution Working Rules**) **kế thừa** EGOV-01, cụ thể hoá vận hành Execution; Release checklist **không** thay thế EWR-01. *(EWR-01 chưa tồn tại — forward reference.)* |
| **EWR-01 → Execution Runtime → ER** | Quyền Runtime chỉ được cấp ở tầng **Execution Runtime**, dưới EGOV/EWR. **ER (Execution Readiness)** là cổng/trạng thái riêng cho Execution; việc đạt GA ở tầng Release **không** làm thay đổi ER — ER do Execution Governance quyết định. *(ER chưa tồn tại dạng tài liệu — forward reference.)* |
| **Chain → Products** | Product áp dụng Framework **tuân thủ toàn bộ chain**; Product Governance định nghĩa gate nội bộ của Product và **tham chiếu** RELEASE-01 khi phát hành. |

## 3. Release Lifecycle

Thứ tự trưởng thành: **Alpha → Beta → RC → GA**; nhánh bảo trì: **Hotfix / Patch / LTS**.

| Giai đoạn | Định nghĩa | Điều kiện vào (Entry) | Điều kiện ra (Exit) |
|---|---|---|---|
| **Alpha** | Bản thử nghiệm nội bộ, tính năng chưa đủ, có thể breaking. | Feature nhánh gộp; build pass. | Chức năng lõi chạy được nội bộ. |
| **Beta** | Tính năng đầy đủ, còn bug; mở cho tester giới hạn. | Feature-complete; smoke test pass. | Không còn lỗi Critical/Blocker mở. |
| **RC** (Release Candidate) | Ứng viên phát hành; chỉ sửa lỗi, **không** thêm tính năng. | Beta ổn định; regression pass; docs sẵn sàng. | Release Gate (§6) PASS; 0 Critical/High. |
| **GA** (General Availability) | Bản chính thức cho toàn bộ người dùng. | RC PASS; Deployment Validation (§7) PASS. | Đã phát hành + verify sau phát hành. |
| **Hotfix** | Sửa khẩn cấp lỗi nghiêm trọng trên GA. | Sự cố Critical trên production. | Fix verify + rollback plan sẵn sàng. |
| **Patch** | Sửa lỗi nhỏ/không khẩn theo lịch. | Backlog lỗi non-critical. | Regression pass. |
| **LTS** (Long-Term Support) | Nhánh được hỗ trợ dài hạn (chỉ security/critical fix). | Bản GA được chỉ định LTS. | Vòng bảo trì có kỳ hạn công bố. |

> Không nhảy cóc giai đoạn trưởng thành (Alpha→Beta→RC→GA). Hotfix/Patch chỉ áp lên nhánh đã GA.

## 4. Versioning

- Tuân thủ **Semantic Versioning**: `MAJOR.MINOR.PATCH`.
  - **MAJOR** — thay đổi phá vỡ tương thích (breaking).
  - **MINOR** — thêm tính năng tương thích ngược.
  - **PATCH** — sửa lỗi tương thích ngược.
- **Pre-release**: `-alpha.N`, `-beta.N`, `-rc.N` (vd `2.1.0-rc.1`).
- **Build metadata** (tuỳ chọn): `+<meta>` (vd `+win.x64`), không ảnh hưởng thứ tự ưu tiên.
- **LTS** đánh dấu bằng nhãn kênh (vd `2.0.x-lts`), không phải một số version riêng.
- Version là **bất biến sau khi phát hành**: không tái sử dụng, không ghi đè một version đã ship.

## 5. Tagging Convention

- Tag **annotated** (`git tag -a`) kèm message mô tả; **không** dùng lightweight tag cho release.
- Product release: `v<MAJOR.MINOR.PATCH>[-prerelease]` — vd `v2.1.0`, `v2.1.0-rc.1`.
- Governance / gate milestone: `v<track>-<slug>` — vd `v2.1-pre-execution-gate-auth-bug-brand`.
- Một commit = một release tag; tag **immutable** (không di chuyển tag đã push; nếu sai → tag mới, giữ lịch sử — xem §10 & §11).
- Tag message nêu rõ phạm vi + trạng thái audit (vd `… (Codex PASS)`).

## 6. Release Gate

Một bản chỉ được thăng hạng khi **tất cả** cổng dưới đây PASS và có bằng chứng:

1. **Build Gate** — build sạch mọi target liên quan (`npm run build` v.v.), 0 error.
2. **Quality Gate** — lint/test theo phạm vi; 0 Critical/High mở.
3. **Docs Gate** — CHANGELOG / Release Notes / trạng thái tracker cập nhật.
4. **Audit Gate** — Codex Audit PASS cho phạm vi phát hành (theo APFG-01).
5. **Security/Config Gate** — không hardcode secret; config fail-fast; artifact không chứa credential.
6. **Working-Tree Gate** — cây làm việc sạch; chỉ file cần thiết được stage; generated artifact **không** commit.

> Gate là **bắt buộc** và **không tự-approve**: người/Codex duyệt tách khỏi người thực hiện (Audit Scope Isolation).

## 7. Deployment Validation

Sau khi build/đóng gói, **trước khi công bố**, phải validate và lưu bằng chứng:

| Nền tảng | Validation tối thiểu |
|---|---|
| **Web** | App load; health endpoint 200; luồng đăng nhập/critical path chạy; console không lỗi; asset (favicon/manifest) serve đúng. |
| **Desktop** | Executable khởi chạy; icon/branding đúng ở **cấp artifact**; installer/shortcut tạo được; **shell visual** (Explorer/Taskbar/Start Menu/Window) xác nhận trên máy đích. |
| **Mobile** | Bundle cài đặt được; icon/splash đúng; luồng critical chạy trên thiết bị/emulator. |
| **Cloud** | Deploy tới môi trường đích; health/readiness probe xanh; smoke test sau deploy; rollback plan sẵn sàng. |

> Nếu **không thể xác nhận** một mục (giới hạn môi trường/quan sát), **ghi rõ Reality Filter** và đánh dấu mục đó **Deferred / Pending Validation** — **không** claim PASS. (Ví dụ tổng quát: một hạng mục *Desktop Deployment Validation* chưa quan sát được shell → Deferred.)

## 8. Quy tắc phát hành theo nền tảng

- **Web** — build tĩnh + serve; PWA manifest/icon hợp lệ; cache-busting; không lộ secret trong bundle.
- **Desktop** — đóng gói qua công cụ chuẩn của Product (packager/builder); icon nguồn là **single source of truth** của Product; installer/shortcut kế thừa icon từ executable.
- **Mobile** — tuân thủ Feature Parity (đồng bộ Desktop/Web); asset icon/splash theo brand chính thức.
- **Cloud** — image/artifact gắn version + checksum; triển khai bất biến (immutable deploy), có health probe & rollback.
- **Không** phát hành trực tiếp trên môi trường production bằng thao tác thủ công ngoài pipeline.

## 9. Artifact Rules

- Artifact phát hành (installer, image, bundle) **bất biến**: gắn version + **checksum** (vd SHA-256) công bố kèm.
- **Generated build output KHÔNG commit vào repo** (vd `dist/`, `dist-packager/`, `dist-electron/`, `coverage/`) — phải gitignored; chỉ **source + config + asset nguồn** được version-control.
- Artifact lưu ở kênh phát hành (release storage), tham chiếu bằng tag; không nhồi binary lớn vào lịch sử git.
- Artifact **không** chứa secret/credential; cấu hình nhạy cảm nạp lúc runtime.
- Mỗi artifact truy vết được về đúng **một tag/commit**.

## 10. Rollback Rules

- Mọi GA/Hotfix phải có **rollback plan** trước khi phát hành (bản trước + cách khôi phục).
- Rollback = **triển khai lại version trước** (roll-forward tới bản đã biết tốt), **không** xoá/ghi đè lịch sử.
- **Không hạ version số**; nếu cần sửa, ra **Patch/Hotfix mới** với version cao hơn.
- Rollback dữ liệu: **không reset/migrate phá huỷ**; tuân thủ backup/restore của Data Governance.
- Ghi nhận sự cố + nguyên nhân + hành động (post-mortem) cho Hotfix.

## 11. Git Discipline — No Force Push / No History Rewrite

- **Cấm `--force` / force-with-lease** trên nhánh phát hành (`main`, release branch).
- **Cấm rewrite lịch sử** đã push (rebase/amend/reset trên lịch sử công khai).
- Chỉ **fast-forward** hoặc merge commit hợp lệ; xác nhận `origin/main..HEAD = 0` trước push.
- Tag đã push **không di chuyển**; sai thì tạo tag mới, **giữ tag/commit lịch sử** (no history rewrite).
- Sửa lỗi = **commit mới tiến lên**, không viết lại quá khứ.

## 12. Release Checklist (bắt buộc trước GA / Hotfix)

- [ ] Đúng giai đoạn lifecycle & tiêu chí Exit đạt (§3).
- [ ] Version tuân thủ SemVer, chưa từng dùng (§4).
- [ ] Build Gate PASS mọi target (§6.1).
- [ ] Quality Gate: 0 Critical/High; test/lint theo phạm vi (§6.2).
- [ ] Docs Gate: CHANGELOG / Release Notes / tracker cập nhật (§6.3).
- [ ] Audit Gate: Codex Audit PASS (§6.4).
- [ ] Security/Config Gate: không secret trong artifact (§6.5).
- [ ] Deployment Validation theo nền tảng (§7); mục không xác nhận được → **Deferred + Reality Filter**.
- [ ] Artifact có checksum; generated output **không** commit (§9).
- [ ] Rollback plan sẵn sàng (§10).
- [ ] Tag annotated đúng convention; **no force push / no history rewrite** (§5, §11).
- [ ] Verify sau phát hành: `HEAD = origin/main`, remote tag tồn tại.

> ⚠️ **Reality Filter (trạng thái tài liệu tham chiếu tại 2026-07-02):** **EGOV-01**, **EWR-01** và **ER (Execution Readiness)** **chưa tồn tại dạng tài liệu độc lập** — hiện chỉ có **APFG-01** (Proposed) ở tầng trên. Các tham chiếu tới EGOV-01/EWR-01/ER trong RELEASE-01 là **forward reference** (dự kiến), sẽ có hiệu lực khi các tài liệu đó được tạo + Codex PASS. RELEASE-01 **không** giả định chúng đã tồn tại và **không** tạo lifecycle thay chúng.

## 13. Governance & Lifecycle của chính RELEASE-01

- RELEASE-01 phải **Codex Audit PASS** trước khi Official.
- Sau PASS: **Commit · Tag · Push** (fast-forward, no force).
- Chỉ khi Official, RELEASE-01 mới được dùng làm **release gate** dùng chung.
- Thay đổi RELEASE-01 sau Official phải qua **Release Increment** mới (RFC → Audit → PASS), không sửa lén.
- **Không** tự-approve; **không** tạo trạng thái Accepted/PASS/Official/Closed giả trước audit.

## 14. Scope Boundary

RELEASE-01 (docs-only) **không** sửa: frontend · backend · API · DB · Execution · AI Runtime · APFG · AUTH · BRAND · Design Program · EGOV · EWR · ER. Chỉ đặc tả **chuẩn phát hành dùng chung** (lifecycle, versioning, tagging, gate, rollback, deployment validation, artifact rules) + quan hệ tầng.

---

> 🧾 RELEASE-01 — Product Release Constitution (✅ Accepted / Codex PASS / CLOSED — tag `v2.1-release01-product-release-constitution`; Framework Release Governance ACTIVE). Chuẩn phát hành dùng chung ở tầng Release Governance — chain: AI Platform Framework → APFG-01 → **RELEASE-01** → EGOV-01 → EWR-01 → Execution Runtime → Products (EGOV kế thừa Release; Release **không** cấp quyền Runtime). Lifecycle Alpha→Beta→RC→GA + Hotfix/Patch/LTS · SemVer · annotated tag bất biến · release gate + deployment validation có bằng chứng · rollback roll-forward · **no force push / no history rewrite** · generated artifact không commit. EGOV-01/EWR-01/ER là forward reference (chưa tồn tại). Docs-only; thay đổi sau CLOSED qua Release Increment mới.
