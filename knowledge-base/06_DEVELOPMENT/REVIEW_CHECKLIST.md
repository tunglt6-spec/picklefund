# Review Checklist — PickleFund

> **Mục đích:** Checklist trước khi merge PR hoặc commit quan trọng  
> **Đối tượng:** Developer, reviewer, Claude Code

---

## Checklist tổng quát

### Code quality
- [ ] Không thêm tính năng ngoài scope PR
- [ ] Không có `any` type không cần thiết (TypeScript)
- [ ] Không có `console.log` debug còn lại
- [ ] Không có code bị comment out (xóa hẳn nếu không dùng)
- [ ] Tên biến/function rõ ràng

### Finance Engine
- [ ] Công thức đúng: `clubAssets = commonBalance + carryForwardBalance`
- [ ] Quỹ Phụ không ảnh hưởng clubAssets
- [ ] Calculator vẫn là pure function sau thay đổi

### Tests
- [ ] Backend tests: 175+ PASS (không giảm)
- [ ] Test mới đã thêm nếu có logic mới

### Frontend
- [ ] `npm run build` không có lỗi
- [ ] `npm run lint` không có lỗi mới
- [ ] Responsive: không overflow trên 375px

### Security
- [ ] Không commit `.env` thật
- [ ] Không hardcode secrets
- [ ] Không expose port database

### Docker/Deploy
- [ ] `docker compose config` PASS
- [ ] env_file: `required: false` nếu có file .env optional

---

## Checklist đặc thù cho từng loại PR

### PR loại: Finance Dashboard
- [ ] 4 card KPI đúng màu gradient
- [ ] Công thức hiển thị trong card Tổng tài sản đúng
- [ ] Health Score tính đúng
- [ ] Quick Actions đủ 6 nút
- [ ] Mobile 375px: không overflow

### PR loại: Backend Service
- [ ] Unit tests PASS
- [ ] Không thay đổi DB schema ngoài migration file
- [ ] API response format không thay đổi breaking

### PR loại: Deploy Pipeline
- [ ] Không dùng `git pull`
- [ ] git clean có đủ exclusion
- [ ] Telegram messages dùng `printf '\n'`
- [ ] Backup SQL kiểm tra trước khi tiếp tục

### PR loại: Infrastructure
- [ ] Không expose port DB/Redis ra host
- [ ] Nginx dùng upstream name đúng
- [ ] SSL cert files không bị commit
