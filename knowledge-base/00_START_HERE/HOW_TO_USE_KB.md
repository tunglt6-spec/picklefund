# Hướng dẫn sử dụng Knowledge Base

**Mục đích:** Giúp người dùng khai thác hiệu quả KB này  
**Đối tượng:** Tất cả thành viên đội ngũ  
**Cập nhật:** 2026-06-29

---

## 1. Nguyên tắc cơ bản

Knowledge Base này được thiết kế theo nguyên tắc **single source of truth**:
- Một thông tin chỉ tồn tại ở một nơi
- Các file khác tham chiếu (link) thay vì copy
- Khi có mâu thuẫn: file 08_ADR > file 03_FINANCE_ENGINE > các file còn lại

---

## 2. Cấu trúc thư mục

```
00_START_HERE/   → Đọc đầu tiên
01_PRODUCT/      → Sản phẩm và chiến lược
02_ARCHITECTURE/ → Kiến trúc kỹ thuật
03_FINANCE_ENGINE/ → Nghiệp vụ tài chính (quan trọng nhất)
04_AI_PLATFORM/  → AI Platform (Planned/Future)
05_OPERATIONS/   → Vận hành production
06_DEVELOPMENT/  → Tiêu chuẩn phát triển
07_TROUBLESHOOTING/ → Xử lý sự cố
08_ADR/          → Quyết định kiến trúc
09_COMMERCIAL/   → Thương mại và kinh doanh
10_PROMPTS/      → Thư viện prompt AI
```

---

## 3. Cách dùng cho từng vai trò

### Developer mới
1. Đọc [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
2. Đọc [GLOSSARY.md](GLOSSARY.md)
3. Đọc [02_ARCHITECTURE/SYSTEM_ARCHITECTURE.md](../02_ARCHITECTURE/SYSTEM_ARCHITECTURE.md)
4. Đọc [03_FINANCE_ENGINE/FINANCE_OVERVIEW.md](../03_FINANCE_ENGINE/FINANCE_OVERVIEW.md)
5. Đọc [06_DEVELOPMENT/CODING_STANDARD.md](../06_DEVELOPMENT/CODING_STANDARD.md)

### DevOps / Ops
1. Đọc [05_OPERATIONS/DEPLOYMENT.md](../05_OPERATIONS/DEPLOYMENT.md)
2. Đọc [07_TROUBLESHOOTING/DOCKER.md](../07_TROUBLESHOOTING/DOCKER.md)
3. Đọc [08_ADR/ADR-003-Deployment-Pipeline-V2.md](../08_ADR/ADR-003-Deployment-Pipeline-V2.md)

### PM / Product
1. Đọc [01_PRODUCT/PRODUCT_VISION.md](../01_PRODUCT/PRODUCT_VISION.md)
2. Đọc [01_PRODUCT/ROADMAP.md](../01_PRODUCT/ROADMAP.md)
3. Đọc [03_FINANCE_ENGINE/FINANCE_OVERVIEW.md](../03_FINANCE_ENGINE/FINANCE_OVERVIEW.md)

### Sales / Commercial
1. Đọc [09_COMMERCIAL/BUSINESS_MODEL.md](../09_COMMERCIAL/BUSINESS_MODEL.md)
2. Đọc [09_COMMERCIAL/PRICING.md](../09_COMMERCIAL/PRICING.md)
3. Đọc [09_COMMERCIAL/SALES_FAQ.md](../09_COMMERCIAL/SALES_FAQ.md)

### Khi làm việc với Claude Code / AI
1. Copy system prompt từ [10_PROMPTS/CLAUDE_SYSTEM_PROMPTS.md](../10_PROMPTS/CLAUDE_SYSTEM_PROMPTS.md)
2. Chọn prompt phù hợp từ [10_PROMPTS/PROMPT_LIBRARY.md](../10_PROMPTS/PROMPT_LIBRARY.md)

---

## 4. Khi gặp sự cố

1. Tra cứu [07_TROUBLESHOOTING/FAQ.md](../07_TROUBLESHOOTING/FAQ.md) trước
2. Tìm file chuyên biệt (LOGIN, DATABASE, DOCKER, NGINX, REDIS...)
3. Nếu không tìm thấy: ghi lại sự cố và bổ sung vào KB

---

## 5. Cập nhật Knowledge Base

### Khi nào cần cập nhật?
- Có quyết định kiến trúc mới → Tạo ADR mới trong [08_ADR/](../08_ADR/)
- Fix được bug mới → Bổ sung vào [07_TROUBLESHOOTING/](../07_TROUBLESHOOTING/)
- Thay đổi nghiệp vụ tài chính → Cập nhật [03_FINANCE_ENGINE/](../03_FINANCE_ENGINE/)
- Release phiên bản mới → Cập nhật [01_PRODUCT/RELEASE_HISTORY.md](../01_PRODUCT/RELEASE_HISTORY.md)

### Nguyên tắc cập nhật
- Ghi ngày cập nhật ở header mỗi file
- Không xóa thông tin cũ — đánh dấu `(deprecated)` nếu cần
- Không viết thông tin mâu thuẫn với ADR đã có

---

## 6. Điều cấm kỵ trong KB này

- **KHÔNG** viết: `Tổng tài sản CLB = Quỹ Chính + Quỹ Phụ` — SAI
- **KHÔNG** ghi secret thật, API key, password thật
- **KHÔNG** viết về AI Platform như đã hoàn thành (trạng thái là Planned)
- **KHÔNG** phịa số liệu — ghi "Chưa xác định" nếu chưa có
