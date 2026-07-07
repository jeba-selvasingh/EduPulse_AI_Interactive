#!/usr/bin/env bash
# Story 3.1 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
VERIFY_COURSE="${VERIFY_COURSE:-BCS304}"

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

echo "=== Story 3.1 verification (API: $API) ==="

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

GET=$(curl -s "$API/api/paper-craft/blueprint/$VERIFY_COURSE?examType=SEE" \
  -H "Authorization: Bearer $FT")

if echo "$GET" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; p=d['patternProfile']; exit(0 if p.get('label')=='VTU v3' and p.get('learnedFromPapers',0)>=12 else 1)" 2>/dev/null; then
  ok "pattern profile metadata (VTU v3, 12 papers)"
else
  fail "pattern profile metadata"
fi

if echo "$GET" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d['validation'].get('isValid') is True else 1)" 2>/dev/null; then
  ok "default blueprint totals valid"
else
  fail "default blueprint invalid"
fi

INVALID_BODY=$(curl -s -X PUT "$API/api/paper-craft/blueprint/$VERIFY_COURSE" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"examType":"SEE","difficulty":{"easy":40,"moderate":40,"hard":10},"bloom":{"l1":10,"l2":25,"l3":35,"l4":20,"l5":10}}')

if echo "$INVALID_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d['validation'].get('isValid') is False else 1)" 2>/dev/null; then
  ok "invalid difficulty saved with isValid=false"
else
  fail "invalid difficulty handling"
fi

SAVE=$(curl -s -X PUT "$API/api/paper-craft/blueprint/$VERIFY_COURSE" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"examType":"SEE","difficulty":{"easy":25,"moderate":50,"hard":25},"bloom":{"l1":5,"l2":20,"l3":40,"l4":25,"l5":10}}')

if echo "$SAVE" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d['validation'].get('isValid') and d['blueprint']['difficulty']['easy']==25 else 1)" 2>/dev/null; then
  ok "valid blueprint saved"
else
  fail "blueprint save failed"
fi

# corrupt stored blueprint (draft allowed; generation blocked)
curl -s -X PUT "$API/api/paper-craft/blueprint/$VERIFY_COURSE" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"examType":"SEE","difficulty":{"easy":30,"moderate":30,"hard":30},"bloom":{"l1":20,"l2":20,"l3":20,"l4":20,"l5":20}}' >/dev/null 2>&1 || true

BLOCKED_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\"}")
if [ "$BLOCKED_HTTP" = "400" ]; then
  ok "generate blocked when blueprint invalid (400)"
else
  fail "generate not blocked for invalid blueprint (HTTP $BLOCKED_HTTP)"
fi

# restore valid blueprint for optional generate path
curl -s -X PUT "$API/api/paper-craft/blueprint/$VERIFY_COURSE" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"examType":"SEE","difficulty":{"easy":30,"moderate":50,"hard":20},"bloom":{"l1":10,"l2":25,"l3":35,"l4":20,"l5":10}}' >/dev/null

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='blueprint.save' for e in d) else 1)" 2>/dev/null; then
  ok "blueprint.save log recorded"
else
  fail "blueprint.save log missing"
fi

if (cd "$ROOT/backend/api" && npm run build >/dev/null 2>&1); then
  ok "backend builds"
else
  fail "backend build failed"
fi

if (cd "$ROOT/frontend" && npx tsc --noEmit >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
