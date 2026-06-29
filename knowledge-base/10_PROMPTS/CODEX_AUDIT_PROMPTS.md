# Codex Audit Prompts — PickleFund

> **Mục đích:** Prompt chuẩn cho Codex Audit theo từng loại  
> **Đối tượng:** Auditor, Claude Code, QA

---

## Prompt 1: Audit tổng quát (trước commit)

```
Bạn là Codex Auditor cho PickleFund V2.0 RC1.

Audit các file thay đổi trong diff này theo checklist:

FINANCE ENGINE:
- [ ] clubAssets = commonBalance + carryForwardBalance (KHÔNG cộng Quỹ Phụ)
- [ ] Calculator là pure function (không có DB call)
- [ ] carryForward inject qua CalculateOptions

FRONTEND:
- [ ] Finance card balance có: break-words whitespace-normal max-w-full
- [ ] Mobile KPI: text-[20px] sm:text-[24px] (không cứng text-[26px])
- [ ] NavLink: Tailwind className callback (không có classList/JS event handlers)

DOCKER/INFRA:
- [ ] env_file: required: false
- [ ] PostgreSQL/Redis không expose port ra host
- [ ] Nginx: proxy_pass http://backend/ (upstream name, không có port)

SECURITY:
- [ ] Không commit .env thật
- [ ] Không hardcode secrets
- [ ] Không echo TELEGRAM_BOT_TOKEN

CI/CD:
- [ ] Không dùng git pull (dùng git reset --hard)
- [ ] git clean có đủ exclusion
- [ ] Telegram messages dùng printf '\n'
- [ ] Load .env trước pg_dump

Trả kết quả theo format:
## BLOCKER (P0): [phải fix trước commit]
## HIGH (P1): [fix sớm]
## PASS: [danh sách đã pass]
## Kết luận: PASS / FAIL
```

---

## Prompt 2: Audit chuyên Finance Engine

```
Audit Finance Engine PickleFund:

File cần kiểm tra:
- backend/src/finance/financial-calculator.service.ts
- backend/src/fund-periods/fund-periods.service.ts
- frontend/src/pages/admin/ClubDashboard.tsx

Kiểm tra:
1. Công thức: clubAssetsBalance = commonBalance + carryForwardBalance
2. Quỹ Phụ (miniBalance) KHÔNG cộng vào clubAssetsBalance
3. Calculator không gọi DB (không có Prisma call trong calculate())
4. carryForwardBalance = 0 nếu không có kỳ trước
5. carryForward chỉ từ kỳ status = 'closed' hoặc 'finalized'
6. Công thức hiển thị trong UI card Tổng tài sản đúng

Trả về: PASS hoặc danh sách issues với file:line
```

---

## Prompt 3: Audit Frontend Responsive

```
Audit responsive PickleFund frontend:

Kiểm tra các breakpoint:
- 375px (iPhone SE): tất cả text và card không overflow
- 390px (iPhone 14): Finance cards không bị vỡ layout
- 768px (iPad): layout chuyển đúng sang tablet
- 1440px (Desktop): layout đầy đủ

Các component cần kiểm tra:
- Finance KPI cards (ClubDashboard.tsx)
- MobileKpiCard (MobileKpiCard.tsx)
- Sidebar NavLink active states
- Quick Actions row

Báo cáo: screenshot mô tả hoặc code snippet cần fix
```

---

## Prompt 4: Audit Pipeline V2

```
Audit GitHub Actions deploy pipeline PickleFund:

File: .github/workflows/deploy.yml

Checklist:
- [ ] Không có git pull — chỉ git fetch + git reset --hard
- [ ] git clean có: -e .env -e .env.production -e "*.sql" -e "ssl/"
- [ ] source .env trước pg_dump (set -a / set +a pattern)
- [ ] Kiểm tra backup file > 0 bytes trước khi deploy
- [ ] Health check đủ 2 endpoint: API + Frontend
- [ ] Rollback git reset --hard $PREVIOUS_COMMIT
- [ ] TELEGRAM_BOT_TOKEN không bị echo ra log
- [ ] Telegram messages dùng printf '\n' không dùng literal newlines
- [ ] command_timeout đủ lớn (>= 30m)

Trả: PASS / FAIL với issue chi tiết
```
