#!/usr/bin/env bash
# CHỈ ĐỌC. Kiểm tra bằng import THẬT các thư viện hub cần trong container AI-BOT (find_spec có thể báo sai với namespace package).
set -uo pipefail
docker exec -i maika-saas-engine python - <<'PY' 2>&1 | head -30
import importlib, sys
print("python", sys.version.split()[0])
for m in ["fastapi", "pydantic", "httpx", "starlette", "cryptography", "cryptography.fernet", "jwt", "hmac", "hashlib", "sqlite3"]:
    try:
        mod = importlib.import_module(m)
        print(" OK ", m, getattr(mod, "__version__", ""), "->", (getattr(mod, "__file__", None) or "namespace/builtin"))
    except Exception as e:
        print(" LỖI", m, type(e).__name__, str(e)[:80])
PY
echo "=== pip (tên + phiên bản các gói liên quan) ==="
docker exec maika-saas-engine pip list 2>/dev/null | grep -i -E '^(fastapi|pydantic|httpx|starlette|cryptography|pyjwt|jwt|uvicorn|cffi) ' | head
echo "=== xong ==="
exit 0
