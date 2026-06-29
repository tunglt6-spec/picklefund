# 04 — Source of Truth Matrix
## PickleFund V2.1 — Enterprise Governance Audit Prep

> Mỗi domain có đúng MỘT nguồn sự thật. Consumer chỉ đọc/ghi theo rule.

---

## Source of Truth Matrix

| Domain | Owner (SoT) | Consumer | Rules | Violation Examples |
|---|---|---|---|---|
| **Finance** | Finance Engine RC1 (`FinancialCalculatorService`/`FundPeriodsService`) | AI Gateway, Reports, Dashboard | AI chỉ GET summary; không tính lại | AI tự `reduce()` contributions; `balance = income - expense` trong AI |
| **Memory** | Memory Layer (Sprint 2 design) | AI Gateway, Maika/Lisa/Hermes (future) | Không lưu số liệu tài chính | Cache `totalExpense` trong memory |
| **Prompt** | Prompt Engine (`05_PROMPT_ENGINE_SPECIFICATION.md`) | AI Gateway | Template versioned | Prompt hardcode rải rác trong controller |
| **Configuration** | `.env` / `ConfigService` | Toàn hệ | Không hardcode; fail-fast | `baseUrl`/`priority` hardcode trong service |
| **AI** | AIGatewayService | Desktop, Mobile | Mọi request qua Gateway | Frontend gọi thẳng LiteLLM |
| **Desktop** | Shared frontend + `useAIGateway` | Người dùng | Dùng API chung | Desktop có endpoint riêng |
| **Mobile** | Shared frontend + `useAIGateway` | Người dùng | Dùng API chung | Mobile dùng response model khác |
| **Database** | Prisma schema RC1 | Backend services | Không sửa schema ngoài migration | Sửa schema trực tiếp không migration |
| **API** | NestJS controllers | Desktop, Mobile | Hợp đồng ổn định | Đổi shape response phá vỡ client |

## Source of Truth Rules

| Rule ID | Quy tắc |
|---|---|
| SOT-01 | Finance Engine RC1 là nguồn tài chính DUY NHẤT |
| SOT-02 | AI không thực hiện `SUM()`/`balance =`/`contribution -`/`expense` |
| SOT-03 | Memory không lưu số liệu tài chính (đọc RC1 on-demand) |
| SOT-04 | Config 100% từ `.env`; thiếu → fail-fast (prod) |
| SOT-05 | Mọi AI request qua Gateway, không bypass |
| SOT-06 | Desktop/Mobile dùng chung API + response model |

## Cross References
- Handbook §2 · Governance `02` · Desktop/Mobile `05`
