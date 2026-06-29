# 05 — Desktop / Mobile Consistency Matrix
## PickleFund V2.1 — Enterprise Governance Audit Prep

> Phân loại: **Must Match** (bắt buộc giống) · **Allowed Difference** (được phép khác) · **Forbidden Difference** (cấm khác).

---

## Consistency Matrix

| Khía cạnh | Must Match | Allowed Difference | Forbidden Difference |
|---|---|---|---|
| **UI** | Thông tin & hành động cốt lõi | Layout/spacing theo kích thước màn hình | Ẩn tính năng trên một nền tảng |
| **UX** | Flow nghiệp vụ, thứ tự bước | Cử chỉ (touch vs click) | Khác bước nghiệp vụ |
| **API** | Endpoint, request/response model | — | Endpoint riêng cho một nền tảng |
| **Workflow** | Quy trình end-to-end | Trình bày trung gian | Bỏ bước trên một nền tảng |
| **AI** | Cùng Gateway, `useAIGateway`, response | — | Gateway/route khác nhau |
| **Notification** | Loại & nội dung thông báo | Kênh hiển thị (push vs in-app) | Thiếu thông báo ở một nền tảng |
| **Dashboard** | Số liệu & nguồn (RC1) | Sắp xếp widget | Số liệu lệch giữa hai nền tảng |
| **Finance** | Đọc cùng Finance Summary RC1 | — | Tính tài chính khác nhau |
| **Memory** | Cùng Memory API + context | — | Memory scope/khả năng khác |
| **Authentication** | Cùng JWT + refresh flow | UI đăng nhập | Cơ chế auth khác |
| **Permission** | Cùng role/permission model | — | Quyền khác nhau giữa nền tảng |

## Consistency Rules

| Rule ID | Quy tắc |
|---|---|
| DM-01 | API/response model PHẢI giống (Must Match) |
| DM-02 | Chỉ được khác về trình bày/cử chỉ (Allowed) |
| DM-03 | CẤM feature-gap, số liệu lệch, auth/permission khác (Forbidden) |
| DM-04 | Dùng chung hook (`useAIGateway`, tương lai `useMemory`) |

## Cross References
- Handbook §3 · Source of Truth `04` · DoD `06`
