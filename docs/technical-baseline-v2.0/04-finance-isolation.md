# 04 — Finance Isolation (Technical Baseline v2.0)

> Nguyên tắc cô lập tài chính khỏi lớp AI/vector. Code liên quan: `backend/src/ai/vector/vector-content-policy.service.ts`, `semantic-search.provider.ts`, `vector-index.service.ts`.

---

## 1. Finance Engine là nguồn tính toán duy nhất

- Mọi con số tài chính (số dư, tổng đóng quỹ, chi phí, chuyển kỳ, báo cáo) **chỉ** được tính bởi **Finance Engine / API backend hiện hữu** của PickleFund (RC1).
- Lớp AI Memory/Vector **không** tham gia tính toán tài chính; nó chỉ phục vụ truy hồi ngữ cảnh phi tài chính.

## 2. Không embed / cache / vector hóa dữ liệu tài chính

Các loại dữ liệu sau **bị chặn** khỏi embedding/semantic/cache/DLQ bởi Vector Content Policy:

- `balance` (số dư)
- `contribution` (đóng quỹ)
- `expense` (chi phí)
- `carryForward` (số dư chuyển kỳ)
- `receipt` (phiếu thu)
- personal receipt (phiếu thu cá nhân)
- số tiền / quỹ chính / quỹ phụ / công nợ / doanh thu / khoản thu / khoản chi / báo cáo tài chính

Khi policy phát hiện finance term hoặc money pattern: `allowed=false`, `sanitizedText=''` → **không embed, không query vector store**.

## 3. Finance query bị block khỏi semantic embedding

- `SemanticSearchProvider.search()` chạy policy **trước** embed. Query tài chính (vd: *"số dư quỹ chính là bao nhiêu"*, *"phiếu thu 1.000.000"*, *"chi phí sân 500k"*, *"tổng tài sản CLB"*, *"công nợ thành viên"*) → trả `[]` an toàn, ghi counter `financeBlocked`.
- Test minh chứng: với finance query, `embedding.embed` **và** `store.query` đều **không** được gọi.

## 4. Tính toán tài chính phải đi qua backend Finance Engine/API hiện hữu

- Trợ lý AI khi cần số liệu tài chính phải gọi **API tài chính backend**, không suy ra từ vector/embedding.
- Đây là ranh giới kiến trúc cứng giữa lớp AI và lớp tài chính.

## 5. Không dùng AI để suy đoán số liệu tài chính

- **AI không tự tính toán/suy đoán** số dư, công nợ, hay bất kỳ con số tài chính nào.
- Vector/embedding chỉ thấy nội dung **phi tài chính đã sanitize**; do đó không thể "đoán" số liệu từ dữ liệu đã bị chặn.

> Bất biến này được Codex audit trong Epic 2.4 và là điều kiện để baseline v2.0 đạt PASS. Bất kỳ thay đổi nào nới lỏng policy tài chính đều phải qua Codex Re-Audit.
