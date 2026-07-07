#!/usr/bin/env bash
# Story 1.8 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPTS_DIR/_verify_lib.sh"
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

echo "=== Story 1.8 verification (API: $API) ==="

# Frontend component files
for f in \
  "$ROOT/frontend/src/components/home/HomeHeader.tsx" \
  "$ROOT/frontend/src/components/home/StatsRow.tsx" \
  "$ROOT/frontend/src/components/home/QuickActionGrid.tsx" \
  "$ROOT/frontend/src/components/home/AttentionList.tsx" \
  "$ROOT/frontend/src/components/home/HomeTabBar.tsx" \
  "$ROOT/frontend/src/hooks/useHomeSummary.ts" \
  "$ROOT/frontend/src/lib/home-api.ts" \
  "$ROOT/frontend/app/alerts.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

if rg -q "useHomeSummary|HomeHeader|QuickActionGrid" "$ROOT/frontend/app/index.tsx" 2>/dev/null; then
  ok "index.tsx wired to home components"
else
  fail "index.tsx not refactored"
fi

if rg -q "unreadAlertCount" "$ROOT/frontend/src/components/home/HomeHeader.tsx" 2>/dev/null; then
  ok "alert badge on bell"
else
  fail "alert badge missing"
fi

if rg -q "facultyPrimary" "$ROOT/frontend/src/components/home/QuickActionGrid.tsx" 2>/dev/null; then
  ok "faculty quick-action tiles defined"
else
  fail "faculty quick-action tiles missing"
fi

# Backend home module
for f in \
  "$ROOT/backend/api/src/home/home.controller.ts" \
  "$ROOT/backend/api/src/home/home.service.ts" \
  "$ROOT/backend/api/src/home/home.schema.ts"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
ST=$(token "$(login student@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

# Home requires DPDP consent (Story 1.9)
curl -s -X POST "$API/api/consent/accept" -H "Authorization: Bearer $FT" >/dev/null

SUMMARY=$(curl -s "$API/api/home/summary" -H "Authorization: Bearer $FT")
if echo "$SUMMARY" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
exit(0 if d.get('unreadAlertCount', 0) > 0 else 1)
" 2>/dev/null; then
  ok "GET /api/home/summary returns unreadAlertCount"
else
  fail "home summary unreadAlertCount"
fi

if echo "$SUMMARY" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
s = d.get('stats', {})
exit(0 if s.get('papersThisSem') and s.get('hoursSaved') is not None else 1)
" 2>/dev/null; then
  ok "home summary includes stats"
else
  fail "home summary stats missing"
fi

if echo "$SUMMARY" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
exit(0 if len(d.get('attentionItems', [])) >= 1 else 1)
" 2>/dev/null; then
  ok "home summary includes attention items"
else
  fail "attention items missing"
fi

# Unauthenticated should fail
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/home/summary")
if [ "$CODE" = "401" ]; then ok "home summary requires auth"; else fail "home summary auth (got $CODE)"; fi

# Student can still fetch summary (pilot data is role-agnostic for now)
if [ -n "$ST" ]; then
  verify_accept_consent "$API" "$ST"
  SCODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/home/summary" -H "Authorization: Bearer $ST")
  if [ "$SCODE" = "200" ]; then ok "authenticated users can fetch home summary"; else fail "student home summary (got $SCODE)"; fi
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
