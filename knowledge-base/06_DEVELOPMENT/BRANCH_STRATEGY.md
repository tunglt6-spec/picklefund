# Branch Strategy — PickleFund

> **Mục đích:** Quy định cách đặt tên và quản lý nhánh  
> **Đối tượng:** Developer

---

## 1. Quy ước đặt tên nhánh

```
feature/<tên-tính-năng>    — Tính năng mới
fix/<tên-lỗi>              — Sửa lỗi thông thường
hotfix/<tên-lỗi>           — Fix khẩn cấp production
ci/<tên-thay-đổi>          — CI/CD pipeline
docs/<tên-tài-liệu>        — Cập nhật tài liệu
```

**Ví dụ:**
```
feature/finance-dashboard-standard
feature/carry-forward-balance
fix/navbar-active-style
fix/fundcard-overflow
hotfix/nginx-proxy-405
ci/deploy-pipeline-v2
```

---

## 2. Lifetime của nhánh

| Nhánh | Lifetime |
|---|---|
| `main` | Vĩnh viễn |
| `feature/*` | Xóa sau khi merge |
| `fix/*` | Xóa sau khi merge |
| `hotfix/*` | Xóa sau khi merge vào main |

---

## 3. Quy tắc merge

- Tất cả nhánh merge vào `main` qua Pull Request
- PR cần ít nhất 1 review (nếu có team)
- Sau khi merge: xóa nhánh feature
- `main` → auto deploy via GitHub Actions

---

## 4. Branch protection

Branch `main` cần bật protection rules (khuyến nghị):
- Require PR before merge
- Require status checks (CI tests)
- No force push
