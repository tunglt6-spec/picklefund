#!/usr/bin/env bash
# ============================================================================
# check-repo-secret-hygiene.sh — quét vệ sinh secret trong file ĐANG TRACK
# ----------------------------------------------------------------------------
# Non-destructive. Chạy từ gốc repo. In đường dẫn + phân loại rủi ro, KHÔNG in
# giá trị secret. Không sửa gì, không purge history.
# ============================================================================
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

WARN=0
p() { printf '  [OK] %s\n' "$1"; }
w() { printf '  [RISK] %s\n' "$1"; WARN=$((WARN+1)); }

echo "== 1. .env.production KHÔNG được track =="
if git ls-files --error-unmatch .env.production >/dev/null 2>&1; then
  w ".env.production ĐANG bị track — phải git rm --cached"
else
  p ".env.production không track"
fi

echo "== 2. File .env đang track (chỉ được phép *.example / frontend VITE public) =="
TRACKED_ENV="$(git ls-files | grep -E '(^|/)\.env' || true)"
if [ -z "$TRACKED_ENV" ]; then
  p "không có file .env nào track"
else
  while IFS= read -r fenv; do
    case "$fenv" in
      *.example|frontend/.env.production)
        p "$fenv (example/VITE public — chấp nhận)" ;;
      *)
        w "$fenv (file .env không phải example — kiểm tra có secret không)" ;;
    esac
  done <<< "$TRACKED_ENV"
fi

echo "== 3. Grep mẫu rủi ro trong file đang track (phân loại, KHÔNG in giá trị) =="
# Pattern: key gán giá trị dài dạng secret thật (>=16 ký tự base64-ish).
PATTERN='(JWT_SECRET|JWT_REFRESH_SECRET|SMTP_PASS|TELEGRAM_BOT_TOKEN|OPENAI_API_KEY|OPENROUTER_API_KEY|LITELLM_API_KEY)=[A-Za-z0-9+/_-]{16,}'
HITS="$(git ls-files | grep -vE 'node_modules|package-lock' | while IFS= read -r f; do
  [ -f "$f" ] || continue
  if grep -EIl "$PATTERN" "$f" >/dev/null 2>&1; then
    # phân loại: CHANGE_ME/example = an toàn; còn lại = nghi ngờ
    if grep -E "$PATTERN" "$f" | grep -qvE 'CHANGE_ME|example|<|placeholder'; then
      echo "SUSPECT|$f"
    else
      echo "PLACEHOLDER|$f"
    fi
  fi
done)"

if [ -z "$HITS" ]; then
  p "không có key nào gán giá trị giống secret thật"
else
  while IFS='|' read -r kind file; do
    case "$kind" in
      PLACEHOLDER) p "$file (chỉ placeholder CHANGE_ME/example)" ;;
      SUSPECT)     w "$file (CÓ key gán giá trị nghi là secret thật — soát tay, KHÔNG paste ra đây)" ;;
    esac
  done <<< "$HITS"
fi

echo "== 4. Demo credential trong source đang track =="
DEMO_HITS="$(git ls-files '*.ts' '*.tsx' | xargs grep -lE 'admin123|super123|member123|treasurer123' 2>/dev/null || true)"
if [ -z "$DEMO_HITS" ]; then
  p "không có demo credential trong source track"
else
  while IFS= read -r f; do
    case "$f" in
      *seed*|*spec*) p "$f (seed/test fixture — dev-only, chấp nhận)" ;;
      *Login*)       w "$f (demo cred trong Login — phải gated sau flag/DEV; kiểm tra DCE khỏi prod bundle)" ;;
      *)             w "$f (demo cred trong source production — soát)" ;;
    esac
  done <<< "$DEMO_HITS"
fi

echo ""
echo "== KHUYẾN NGHỊ (transaction riêng, cần duyệt) =="
echo "  - Repo public từng chứa JWT secret trong history → chuyển repo PRIVATE và/hoặc"
echo "    purge history bằng git-filter-repo/BFG. KHÔNG làm trong script này."
echo ""
echo "== TỔNG: RISK=$WARN =="
[ "$WARN" = "0" ] || exit 1
