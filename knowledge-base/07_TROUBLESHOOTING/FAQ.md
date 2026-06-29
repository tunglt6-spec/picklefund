# FAQ — PickleFund

> **Mục đích:** Câu hỏi thường gặp từ developer, DevOps và Admin CLB  
> **Đối tượng:** Tất cả thành viên team

---

## Câu hỏi kỹ thuật

**Q: Tại sao Tổng tài sản CLB không bằng Quỹ Chính + Quỹ Phụ?**  
A: Công thức đúng là `Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ`. Quỹ Phụ hoạt động **độc lập** và **không cộng** vào Tổng tài sản CLB.

---

**Q: Tại sao Số dư chuyển kỳ = 0 dù kỳ trước có số dư?**  
A: Chỉ kỳ có trạng thái `closed` hoặc `finalized` mới tạo ra carryForward. Kỳ đang `active` không được dùng làm carryForward nguồn — tránh double-count.

---

**Q: Tại sao không dùng `git pull` mà phải dùng `git reset --hard`?**  
A: `git pull` fail nếu VPS có local changes (ai đó sửa file trực tiếp). `git reset --hard origin/main` luôn thành công. Xem [ADR-003](../08_ADR/ADR-003-Deployment-Pipeline-V2.md).

---

**Q: Tại sao phải dùng `env_file: required: false`?**  
A: Để `docker compose config --env-file .env.example` chạy được trong CI/dev mà không cần file `.env` thật. Docker Compose V2 syntax.

---

**Q: Tại sao NavLink active style bị mất sau hover?**  
A: `classList.contains('active')` không đáng tin cậy với React Router NavLink, và `onMouseEnter/Leave` JS override inline `style` của React. Fix: dùng Tailwind `className={({ isActive }) => ...}` callback. Xem [ADR-004](../08_ADR/ADR-004-Premium-Dashboard.md).

---

**Q: Tại sao `proxy_pass http://backend:3000/api/` gây lỗi nginx?**  
A: Khi đã khai báo `upstream backend { server backend:3000; }`, upstream đã define port. Dùng thêm port trong `proxy_pass` gây conflict. Fix: `proxy_pass http://backend/api/`.

---

**Q: CalculateOptions là gì và tại sao carryForward inject từ ngoài?**  
A: `FinancialCalculatorService.calculate()` được thiết kế là pure function — không gọi DB. `carryForwardBalance` được caller (`fund-periods.service.ts`) tra cứu từ DB và inject vào qua `CalculateOptions`. Thiết kế này giữ calculator pure, dễ test, không side effect. Xem [ADR-002](../08_ADR/ADR-002-Carry-Forward.md).

---

**Q: Tại sao Telegram message dùng `printf` thay vì multiline string?**  
A: YAML block scalar không cho phép literal newlines trong double-quoted strings. `printf '...\n...'` là cách chuẩn để có multiline content trong YAML.

---

**Q: Backend có bao nhiêu tests?**  
A: V2.0 RC1: 175/175 PASS. 5 test mới thêm cho carryForward. Xem [AUDIT_REPORT](../../release/v2.0.0-rc1-enterprise/AUDIT_REPORT.md).

---

## Câu hỏi vận hành

**Q: Deploy tự động bao lâu 1 lần?**  
A: Deploy trigger mỗi khi push vào nhánh `main`. Không có schedule tự động.

**Q: Backup SQL được lưu ở đâu?**  
A: `/opt/picklefund/backups/picklefund_YYYYMMDD_HHMMSS.sql`. Tạo tự động trước mỗi deploy.

**Q: Khi nào thì rollback tự động?**  
A: Pipeline V2 tự rollback khi health check sau deploy thất bại (API hoặc Frontend không return HTTP 200).

**Q: Cổng nào được expose ra internet?**  
A: Chỉ 80 (HTTP → redirect 443) và 443 (HTTPS). PostgreSQL, Redis không expose.
