#!/usr/bin/env bash
# CÓ THỂ SỬA VPS (rw, rủi ro thấp). GĐ0 của Zalo Hub: tạo kho git CỤC BỘ cho /opt/ai-bot-saas để có lịch sử thay đổi
# và quay lại được (thư mục hiện chỉ có các file main.py.bak_*). Không push đi đâu, không đổi mã, không restart.
# .gitignore loại: data/ (DB, uploads, khóa), *.bak*, __pycache__, .env, *.key, *.sqlite, *.db.
# LƯU Ý: main.py hiện còn khóa API viết cứng nên lịch sử cục bộ sẽ chứa nó — cần đổi khóa và đưa khóa ra biến môi trường,
# rồi dọn lịch sử (không đưa kho này lên GitHub khi chưa làm vậy). Idempotent.
set -euo pipefail
cd /opt/ai-bot-saas
if [ -d .git ]; then echo "đã có kho git — bỏ qua khởi tạo"; else git init -q -b main; echo "đã git init"; fi
git config user.name  "ops-remote"
git config user.email "ops-remote@localhost"
cat > .gitignore <<'GI'
data/
*.bak*
__pycache__/
*.pyc
.env
*.key
*.sqlite
*.db
GI
git add .gitignore main.py Dockerfile docker-compose.yml requirements.txt backup.sh enterprise_report_generator.py static 2>/dev/null || true
if git diff --cached --quiet; then
  echo "không có thay đổi mới để commit"
else
  git commit -q -m "baseline $(date -Is)"
  echo "đã commit"
fi
echo "commit hiện tại: $(git log --oneline -1 | cut -c1-60)"
echo "số file được theo dõi: $(git ls-files | wc -l)"
echo "file lớn nhất được theo dõi (KB): $(git ls-files -z | xargs -0 du -k 2>/dev/null | sort -rn | head -1 | cut -f1)"
echo "kiểm tra data/ không bị theo dõi: $(git ls-files | grep -c '^data/' || true) file"
exit 0
