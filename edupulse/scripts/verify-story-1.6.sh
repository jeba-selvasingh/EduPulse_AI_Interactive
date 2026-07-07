#!/usr/bin/env bash
# Story 1.6 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
PILOT_CARD="10000000-0000-4000-8000-000000000001"
PILOT_EVENT="20000000-0000-4000-8000-000000000001"

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

echo "=== Story 1.6 verification (API: $API) ==="

FT=$(token "$(login faculty@pes.edu)")
MT=$(token "$(login moderator@pes.edu)")
ST=$(token "$(login student@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
if [ -n "$MT" ]; then ok "moderator login"; else fail "moderator login"; fi

# Trust card includes audit trail
BODY=$(curl -s "$API/api/trust-cards/$PILOT_CARD" -H "Authorization: Bearer $FT")
if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('auditTrail') and len(d['auditTrail'])>=2 else 1)" 2>/dev/null; then
  ok "trust card returns auditTrail entries"
else
  fail "trust card missing auditTrail"
fi

if echo "$BODY" | python3 -c "import sys,json; e=json.load(sys.stdin)['auditTrail'][0]; exit(0 if e.get('beforeValue') and e.get('afterValue') and e.get('userName') else 1)" 2>/dev/null; then
  ok "audit entry has user and before/after values"
else
  fail "audit entry shape incomplete"
fi

# Dedicated audit list endpoint
AUDIT=$(curl -s "$API/api/audit-events/artifact/$PILOT_CARD" -H "Authorization: Bearer $FT")
COUNT=$(echo "$AUDIT" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo 0)
if [ "$COUNT" -ge 2 ]; then
  ok "GET audit-events/artifact/:id returns trail"
else
  fail "audit list endpoint returned $COUNT events"
fi

# Student denied audit read
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/audit-events/artifact/$PILOT_CARD" -H "Authorization: Bearer $ST")
if [ "$STATUS" = "403" ]; then
  ok "student denied audit read (403)"
else
  fail "student should be denied audit read, got $STATUS"
fi

# Faculty can append override
OV=$(curl -s -X POST "$API/api/audit-events/override" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"artifactId\":\"$PILOT_CARD\",\"summary\":\"Test override\",\"field\":\"mark\",\"beforeValue\":\"3\",\"afterValue\":\"4\"}")
if echo "$OV" | python3 -c "import sys,json; exit(0 if json.load(sys.stdin).get('data',{}).get('eventType')=='override' else 1)" 2>/dev/null; then
  ok "faculty can append override event"
else
  fail "override append failed"
fi

# Moderator can append approval
AP=$(curl -s -X POST "$API/api/audit-events/approve" \
  -H "Authorization: Bearer $MT" \
  -H "Content-Type: application/json" \
  -d "{\"artifactId\":\"$PILOT_CARD\",\"summary\":\"Test approval\",\"field\":\"package\",\"beforeValue\":\"draft\",\"afterValue\":\"approved\"}")
if echo "$AP" | python3 -c "import sys,json; exit(0 if json.load(sys.stdin).get('data',{}).get('eventType')=='approval' else 1)" 2>/dev/null; then
  ok "moderator can append approval event"
else
  fail "approval append failed"
fi

# Faculty cannot approve
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/audit-events/approve" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"artifactId\":\"$PILOT_CARD\",\"summary\":\"Bad\",\"field\":\"package\"}")
if [ "$STATUS" = "403" ]; then
  ok "faculty denied approval append (403)"
else
  fail "faculty should be denied approval, got $STATUS"
fi

# Immutable: PATCH rejected
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/api/audit-events/$PILOT_EVENT" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"summary":"tamper"}')
if [ "$STATUS" = "403" ]; then
  ok "PATCH audit entry rejected (403)"
else
  fail "PATCH should be forbidden, got $STATUS"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API/api/audit-events/$PILOT_EVENT" \
  -H "Authorization: Bearer $FT")
if [ "$STATUS" = "403" ]; then
  ok "DELETE audit entry rejected (403)"
else
  fail "DELETE should be forbidden, got $STATUS"
fi

if [ -f "$ROOT/backend/api/src/explainability/explainability.service.ts" ]; then
  ok "ExplainabilityService present"
else
  fail "ExplainabilityService missing"
fi

if [ -f "$ROOT/frontend/src/components/AuditTrailSection.tsx" ]; then
  ok "AuditTrailSection UI present"
else
  fail "AuditTrailSection missing"
fi

if (cd "$ROOT/frontend" && npm run typecheck >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Pilot users: faculty@pes.edu, moderator@pes.edu / pilot123"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
