#!/usr/bin/env bash
# Story 7.7 acceptance verification
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

echo "=== Story 7.7 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/intervention-priority.service.ts" \
  "$ROOT/backend/api/src/campus-drive/intervention-priority.schema.ts" \
  "$ROOT/backend/api/src/campus-drive/intervention-priority-store.service.ts" \
  "$ROOT/frontend/src/components/InterventionPriorityPanel.tsx" \
  "$ROOT/frontend/app/intervention-priority.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

LIST=$(curl -s "$API/api/campus-drive/intervention-priority" -H "Authorization: Bearer $TPO")
if echo "$LIST" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['batchLabel'] == '2027 batch'
assert len(d['interventions']) == 5
backlog = next(x for x in d['interventions'] if x['id'] == 'backlog-clearance')
assert backlog['cohortSize'] == 23
assert backlog['urgency'] == 'urgent'
assert backlog['owner'] == 'TPO counselling desk'
assert backlog['completionStatus'] == 'in_progress'
comm = next(x for x in d['interventions'] if x['id'] == 'communication-crash-course')
assert comm['cohortSize'] == 38
assert comm['owner'] == 'Prof. Meena'
f = d['recoveryForecast']
assert f['currentPlacementPercent'] == 78
assert f['projectedPlacementPercent'] == 89
assert f['additionalOffers'] == 16
" 2>/dev/null; then
  ok "intervention list ranked with cohort size, owner, and forecast"
else
  fail "intervention priority overview payload"
fi

FILTERED=$(curl -s "$API/api/campus-drive/intervention-priority?focus=backlog" -H "Authorization: Bearer $TPO")
if echo "$FILTERED" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['activeFocus'] == 'backlog'
assert len(d['interventions']) == 1
assert d['interventions'][0]['id'] == 'backlog-clearance'
" 2>/dev/null; then
  ok "cohort filter narrows to backlog intervention"
else
  fail "intervention focus filter payload"
fi

APTITUDE=$(curl -s "$API/api/campus-drive/intervention-priority?focus=aptitude" -H "Authorization: Bearer $TPO")
if echo "$APTITUDE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert len(d['interventions']) == 1
assert d['interventions'][0]['id'] == 'quant-sprint'
" 2>/dev/null; then
  ok "aptitude focus maps to quant sprint cohort"
else
  fail "aptitude focus filter payload"
fi

UPDATE=$(curl -s -X PATCH "$API/api/campus-drive/intervention-priority/dsa-sprint/completion" \
  -H "Authorization: Bearer $TPO" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress","completionPercent":35,"completionNote":"Week 1 mock test scheduled"}')
if echo "$UPDATE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['id'] == 'dsa-sprint'
assert d['completionStatus'] == 'in_progress'
assert d['completionPercent'] == 35
assert 'mock test' in d['completionNote']
" 2>/dev/null; then
  ok "completion status update persisted"
else
  fail "intervention completion update payload"
fi

STUDENT_CODE=$(curl -s -o /tmp/st77-403.json -w "%{http_code}" \
  "$API/api/campus-drive/intervention-priority" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied intervention list access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.intervention_priority_view'; then ok "campus.intervention_priority_view logged"; else fail "intervention view log missing"; fi
if echo "$LOGS" | grep -q 'campus.intervention_status_update'; then ok "campus.intervention_status_update logged"; else fail "intervention status log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
