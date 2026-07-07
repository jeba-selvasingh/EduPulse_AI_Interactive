#!/usr/bin/env bash
# Story 1.2 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST_A="00000000-0000-4000-8000-000000000001"
INST_B="00000000-0000-4000-8000-000000000002"

PASS=0
FAIL=0

ok()   { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

echo "=== Story 1.2 verification (API: $API) ==="

if curl -sf "$API/api/institutions" | rg -q '"name":"PES University"'; then
  ok "GET /api/institutions returns pilot institutions"
else
  fail "institutions list missing or API down"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/institutions/$INST_A")
if [ "$STATUS" = "401" ]; then
  ok "GET /api/institutions/:id without auth returns 401"
else
  fail "expected 401 without JWT, got $STATUS"
fi

# Obtain JWT via dev login for scoped tests
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"faculty@pes.edu\",\"password\":\"pilot123\",\"institutionId\":\"$INST_A\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true)

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/api/institutions/$INST_B")
if [ "$STATUS" = "403" ]; then
  ok "cross-institution ID returns 403 (AD-9)"
else
  fail "expected 403 for scope violation, got $STATUS"
fi

if [ -n "$TOKEN" ] && curl -sf -H "Authorization: Bearer $TOKEN" "$API/api/institutions/$INST_A" | rg -q '"code":"pes"'; then
  ok "matching JWT scope returns institution detail"
else
  fail "scoped institution detail failed"
fi

if [ -f "$ROOT/frontend/src/components/InstitutionPicker.tsx" ]; then
  ok "InstitutionPicker component present"
else
  fail "InstitutionPicker missing"
fi

if rg -q 'credentialsEnabled' "$ROOT/frontend/app/login.tsx"; then
  ok "login credentials gated on institution selection"
else
  fail "login screen missing institution gate"
fi

if (cd "$ROOT/frontend" && npm run typecheck >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
