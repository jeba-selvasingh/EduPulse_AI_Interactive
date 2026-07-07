#!/usr/bin/env bash
# Story 1.9 acceptance verification
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

echo "=== Story 1.9 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/consent/consent.service.ts" \
  "$ROOT/backend/api/src/consent/consent.guard.ts" \
  "$ROOT/frontend/app/consent.tsx" \
  "$ROOT/frontend/src/lib/consent-api.ts" \
  "$ROOT/frontend/src/hooks/useConsentGate.ts"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login moderator@pes.edu)")
AT=$(token "$(login admin@pes.edu)")

if [ -n "$FT" ]; then ok "moderator login"; else fail "moderator login"; fi
if [ -n "$AT" ]; then ok "admin login"; else fail "admin login"; fi

# Fresh user should require consent
STATUS=$(curl -s "$API/api/consent/status" -H "Authorization: Bearer $FT")
if echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('required') is True else 1)" 2>/dev/null; then
  ok "consent required for new user"
else
  fail "consent not required on first login"
fi

POLICY=$(curl -s "$API/api/consent/policy" -H "Authorization: Bearer $FT")
if echo "$POLICY" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if 'on-prem' in d.get('summary','').lower() or any('on-prem' in s.get('body','').lower() for s in d.get('sections',[])) else 1)" 2>/dev/null; then
  ok "policy describes on-prem storage"
else
  fail "policy missing on-prem notice"
fi

if echo "$POLICY" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('retentionPolicy') else 1)" 2>/dev/null; then
  ok "policy includes retention policy"
else
  fail "retention policy missing"
fi

# Home blocked without consent
HOME_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/home/summary" -H "Authorization: Bearer $FT")
if [ "$HOME_CODE" = "403" ]; then ok "home blocked without consent"; else fail "home should return 403 (got $HOME_CODE)"; fi

# Accept consent
curl -s -X POST "$API/api/consent/accept" -H "Authorization: Bearer $FT" >/dev/null
STATUS2=$(curl -s "$API/api/consent/status" -H "Authorization: Bearer $FT")
if echo "$STATUS2" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('required') is False and d.get('acceptedVersion') else 1)" 2>/dev/null; then
  ok "accept records consent version"
else
  fail "accept did not clear required flag"
fi

HOME_CODE2=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/home/summary" -H "Authorization: Bearer $FT")
if [ "$HOME_CODE2" = "200" ]; then ok "home accessible after accept"; else fail "home after accept (got $HOME_CODE2)"; fi

# Decline logs without PII — use student fresh session
ST=$(token "$(login student@pes.edu)")
curl -s -X POST "$API/api/consent/accept" -H "Authorization: Bearer $ST" >/dev/null
curl -s -X POST "$API/api/consent/decline" -H "Authorization: Bearer $ST" >/dev/null

PT=$(token "$(login principal@pes.edu)")
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='consent.decline' for e in d) else 1)" 2>/dev/null; then
  ok "decline audit-logged via structured logger"
else
  fail "consent.decline log missing"
fi

if echo "$LOGS" | rg -q 'student@pes.edu|Student Demo'; then
  fail "PII found in decline log"
else
  ok "decline log has no email/name"
fi

# Policy version bump forces re-accept
curl -s -X PUT "$API/api/consent/policy" \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  -d '{"version":"1.1.0"}' >/dev/null

STATUS3=$(curl -s "$API/api/consent/status" -H "Authorization: Bearer $FT")
if echo "$STATUS3" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('required') is True and d.get('currentVersion')=='1.1.0' else 1)" 2>/dev/null; then
  ok "policy version bump requires re-accept"
else
  fail "re-accept not required after version bump"
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
