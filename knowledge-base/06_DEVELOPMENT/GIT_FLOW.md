# Git Flow — PickleFund

> **Mục đích:** Quy định quy trình làm việc với Git  
> **Đối tượng:** Developer, DevOps

---

## 1. Chiến lược nhánh

| Nhánh | Mục đích | Deploy |
|---|---|---|
| `main` | Production-ready code | Auto deploy via GitHub Actions |
| `feature/tên-tính-năng` | Phát triển tính năng mới | Không |
| `fix/tên-lỗi` | Sửa lỗi | Không |
| `hotfix/tên-lỗi` | Fix khẩn cấp production | Merge vào main ngay |

---

## 2. Quy trình làm việc thông thường

```bash
# 1. Tạo nhánh từ main
git checkout main && git pull origin main
git checkout -b feature/finance-dashboard-v2

# 2. Phát triển và commit
git add <files>
git commit -m "feat(dashboard): add carry forward card"

# 3. Push và tạo PR
git push origin feature/finance-dashboard-v2
# Tạo PR trên GitHub → review → merge vào main

# 4. Deploy tự động sau khi merge vào main
```

---

## 3. Quy ước commit message

Dùng format: `type(scope): description`

| Type | Khi nào |
|---|---|
| `feat` | Tính năng mới |
| `fix` | Sửa lỗi |
| `ci` | CI/CD pipeline |
| `refactor` | Refactor không thêm feature/fix bug |
| `test` | Thêm/sửa tests |
| `docs` | Tài liệu |
| `chore` | Việc vặt (deps, config) |

**Ví dụ thực tế trong dự án:**
```
feat(dashboard): implement finance dashboard standard rc1.1
fix(finance): correct report expense and separate common mini funds
fix(docker): use 127.0.0.1 in healthchecks instead of localhost
ci(deploy): upgrade production deployment pipeline v2
```

---

## 4. Quy tắc quan trọng

- **Không commit trực tiếp vào `main`** (trừ emergency hotfix)
- **Không commit `.env` thật** vào git
- **Không commit trên VPS** — VPS chỉ nhận code qua `git reset --hard`
- **Không amend commit đã push** lên remote

---

## 5. VPS và git

VPS không dùng `git pull` mà dùng:

```bash
git fetch origin main
git reset --hard origin/main
git clean -fd -e .env -e .env.production -e "*.sql" -e "backup_*.sql" -e "ssl/"
```

Lý do: `git pull` fail nếu VPS có local changes. `git reset --hard` luôn thành công.  
Xem [ADR-003](../08_ADR/ADR-003-Deployment-Pipeline-V2.md) để biết thêm chi tiết.
