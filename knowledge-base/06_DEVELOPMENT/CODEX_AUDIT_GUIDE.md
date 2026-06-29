# Hướng dẫn Codex Audit — PickleFund

> **Mục đích:** Quy trình audit code theo chuẩn PickleFund  
> **Đối tượng:** Auditor, Claude Code, QA

---

## 1. Codex Audit là gì?

Codex Audit là quy trình kiểm tra code tự động/bán tự động để phát hiện:
- Blocking issues ngăn commit/deploy
- Vi phạm nghiệp vụ tài chính
- Security issues
- UX/responsive issues

---

## 2. Phân loại severity

| Mức | Tên | Ý nghĩa |
|---|---|---|
| P0 | **BLOCKER** | Phải fix trước khi commit/deploy |
| P1 | **HIGH** | Fix trong sprint hiện tại |
| P2 | **MEDIUM** | Fix trong sprint tiếp theo |
| P3 | **LOW** | Backlog |

---

## 3. Checklist audit theo loại

### 3.1 Finance Engine Audit
- [ ] Công thức đúng: `clubAssets = commonBalance + carryForwardBalance`
- [ ] Quỹ Phụ KHÔNG cộng vào clubAssets
- [ ] Calculator là pure function — không có DB call
- [ ] carryForwardBalance inject qua CalculateOptions
- [ ] carryForward chỉ từ kỳ `closed` hoặc `finalized`

### 3.2 Frontend Audit
- [ ] Finance card balance: `break-words whitespace-normal max-w-full`
- [ ] Mobile KPI text: `text-[20px] sm:text-[24px]` không cứng `text-[26px]`
- [ ] NavLink active style: Tailwind callback không dùng `classList.contains('active')`
- [ ] Không có `onMouseEnter/Leave` override style
- [ ] Formula display trong card Tổng tài sản đúng

### 3.3 Docker/Infrastructure Audit
- [ ] `env_file: required: false` cho postgres và backend
- [ ] PostgreSQL không expose port ra host
- [ ] Redis không expose port ra host
- [ ] Nginx dùng upstream name, không dùng port

### 3.4 CI/CD Pipeline Audit
- [ ] Không dùng `git pull` — dùng `git reset --hard`
- [ ] `git clean` có đủ exclusion: `.env`, `.env.production`, `ssl/`, `*.sql`
- [ ] Telegram messages dùng `printf '\n'` không dùng literal newlines
- [ ] Load `.env` trước `pg_dump`
- [ ] Backup SQL không rỗng trước khi tiếp tục deploy
- [ ] Không echo `TELEGRAM_BOT_TOKEN` trong logs

### 3.5 Security Audit
- [ ] Không commit `.env` thật
- [ ] JWT_SECRET ≥ 64 ký tự (trong .env.example là placeholder)
- [ ] ALLOWED_ORIGINS không phải `*`
- [ ] Không có credentials thật trong code

---

## 4. Các blocking issues đã fix trong V2.0 RC1

Đây là reference — KHÔNG cần audit lại:

| Issue | File | Fix |
|---|---|---|
| MobileKpiCard overflow | MobileKpiCard.tsx | `text-[20px] sm:text-[24px]` + break-words |
| Docker env_file fail | docker-compose.yml | `required: false` |
| YAML literal newlines | deploy.yml | `printf '\n'` pattern |
| pg_dump không load .env | deploy.yml | `set -a; source .env; set +a` |
| NavLink active mất | Sidebar.tsx | Tailwind callback |
| FundCard overflow | ClubDashboard.tsx | `min-w-0` + break-words |

---

## 5. Prompt audit chuẩn

Xem [10_PROMPTS/CODEX_AUDIT_PROMPTS.md](../10_PROMPTS/CODEX_AUDIT_PROMPTS.md).

---

## 6. Format báo cáo audit

```markdown
## Codex Audit Report — [tên feature/version]

### BLOCKER (P0)
- [ ] [Mô tả issue] — File: [path] — Fix: [gợi ý]

### HIGH (P1)
- [ ] [Mô tả issue]

### Đã PASS
- [x] Finance formula đúng
- [x] ...

### Kết luận: PASS / FAIL (có blocker)
```
