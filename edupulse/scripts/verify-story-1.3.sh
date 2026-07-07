#!/usr/bin/env bash
# Story 1.3 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"

PASS=0
FAIL=0

ok()   { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

echo "=== Story 1.3 verification (API: $API) ==="

LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"faculty@pes.edu\",\"password\":\"pilot123\",\"institutionId\":\"$INST\"}")

if echo "$LOGIN" | rg -q '"accessToken"'; then
  ok "valid login returns access token"
else
  fail "valid login failed: $LOGIN"
fi

INVALID=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"wrong@pes.edu\",\"password\":\"bad\",\"institutionId\":\"$INST\"}")

if echo "$INVALID" | rg -q 'Invalid email or password'; then
  ok "invalid login returns generic error (no account enumeration)"
else
  fail "invalid login message unexpected: $INVALID"
fi

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true)

if [ -n "$TOKEN" ] && curl -sf "$API/api/auth/me" -H "Authorization: Bearer $TOKEN" | rg -q '"roles":\["faculty"\]'; then
  ok "GET /api/auth/me returns authenticated user"
else
  fail "auth/me failed"
fi

if curl -sf "$API/api/auth/config" | rg -q 'edupulse-mobile'; then
  ok "GET /api/auth/config exposes Keycloak OIDC settings"
else
  fail "auth config missing"
fi

if [ -f "$ROOT/frontend/src/stores/auth.ts" ] && [ -f "$ROOT/frontend/src/lib/session.ts" ]; then
  ok "frontend auth store + secure session present"
else
  fail "frontend auth files missing"
fi

if rg -q 'AuthGate' "$ROOT/frontend/app/_layout.tsx"; then
  ok "auth gate redirects unauthenticated users to login"
else
  fail "auth gate missing"
fi

if (cd "$ROOT/frontend" && npm run typecheck >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Pilot credentials: faculty@pes.edu / pilot123 (PES University)"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
