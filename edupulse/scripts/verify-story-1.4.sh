#!/usr/bin/env bash
# Story 1.4 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"

PASS=0
FAIL=0

ok()   { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

login() {
  curl -s -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"pilot123\",\"institutionId\":\"$INST\"}"
}

token() {
  echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true
}

accept_consent() {
  curl -s -X POST "$API/api/consent/accept" -H "Authorization: Bearer $1" >/dev/null
}

echo "=== Story 1.4 verification (API: $API) ==="

FT=$(token "$(login faculty@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/dean-pulse" -H "Authorization: Bearer $FT")
if [ "$STATUS" = "403" ]; then
  ok "faculty denied Dean Pulse (403)"
else
  fail "faculty should be denied dean-pulse, got $STATUS"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/paper-craft/generate" -H "Authorization: Bearer $ST")
if [ "$STATUS" = "403" ]; then
  ok "student denied Paper Craft generate (403)"
else
  fail "student should be denied paper-craft, got $STATUS"
fi

accept_consent "$PT"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/dean-pulse" -H "Authorization: Bearer $PT")
if [ "$STATUS" = "200" ]; then
  ok "principal allowed Dean Pulse (200)"
else
  fail "principal should access dean-pulse, got $STATUS"
fi

if [ -f "$ROOT/backend/api/src/rbac/rbac.guard.ts" ]; then
  ok "RbacGuard present"
else
  fail "RbacGuard missing"
fi

if [ -f "$ROOT/frontend/src/components/AccessDenied.tsx" ]; then
  ok "AccessDenied UI component present"
else
  fail "AccessDenied component missing"
fi

if rg -q 'useSessionTimeout' "$ROOT/frontend/app/_layout.tsx"; then
  ok "session idle timeout hook wired"
else
  fail "session timeout missing"
fi

if rg -q 'isSessionExpired' "$ROOT/frontend/src/lib/session.ts"; then
  ok "session activity tracking in secure store"
else
  fail "session tracking missing"
fi

if (cd "$ROOT/frontend" && npm run typecheck >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Pilot roles: faculty@pes.edu, student@pes.edu, principal@pes.edu, tpo@pes.edu / pilot123"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
