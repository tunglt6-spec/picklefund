# ops/remote — script chạy trên VPS qua GitHub Actions

Mục đích: thay việc dán lệnh vào console VPS (dễ sai, console không gõ được ký tự cần Shift) bằng script có trong repo, chạy qua workflow **Ops remote**.

```bash
gh workflow run ops-remote.yml -f script=ro-ai-bot-inspect.sh
gh run watch                          # hoặc xem tab Actions
gh run view <id> --log                # đọc kết quả
```

## Quy tắc
- Tên file: `ro-<tên>.sh` (CHỈ ĐỌC) hoặc `rw-<tên>.sh` (có thể sửa VPS). Chữ thường, số, `_ . -`.
- `rw-*` chỉ chạy khi nhập `-f confirm=APPLY` và **sau khi chủ hệ thống duyệt đúng nội dung script đó** (script nằm trong repo, đọc được trước khi chạy). Mỗi `rw-*` phải: sao lưu trước, in cách quay lại, idempotent (chạy lại không hỏng), và `set -euo pipefail`.
- Script luôn lấy từ **commit đang chạy** (`github.sha`), không từ file tự do trên VPS.
- Không bao giờ ghi token/khóa/mật khẩu vào script (repo công khai). Đầu ra tự che các mẫu `sk-…`, token bot `id:secret`, JWT, `PASSWORD/SECRET/TOKEN/API_KEY=…`; script vẫn nên tránh in giá trị bí mật.
- Tham số chỉ gồm chữ, số, khoảng trắng và `_ . / : = , @ -` (workflow kiểm tra trước khi chạy).
- Mỗi lần chạy ghi một dòng vào `/var/log/ops-remote.log` trên VPS (thời điểm, người dispatch, sha, script, tham số).
- Mỗi lần chỉ chạy một job (`concurrency: ops-remote`), tối đa 15 phút.

## ⚠ Repo công khai ⇒ log Actions công khai
- Ai trên internet cũng đọc được log của các lần chạy. **Script không được in mã nguồn nhạy cảm, mật khẩu, khóa, token, địa chỉ nội bộ chi tiết.** Bước che khóa tự động chỉ bắt được vài mẫu, không thay thế việc tự kiểm.
- Thông tin bí mật cần trao cho người vận hành (vd. mật khẩu tạm) phải ghi vào file `chmod 600` trên VPS, không in ra log.
- Sau khi đọc xong một lần chạy có nội dung đáng ngại, xóa run: `gh run delete <id>`.

## Giới hạn
- Không tương tác (không gõ tay giữa chừng); script phải tự chạy hết.
- Dùng cùng khóa SSH/secret `VPS_*` với workflow deploy; ai có quyền ghi vào repo đều có thể đưa script mới vào — giữ nhánh `main` được bảo vệ như deploy.
