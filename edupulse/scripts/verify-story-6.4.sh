#!/usr/bin/env bash
# Story 6.4 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
USN="PES1UG23CS003"

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

echo "=== Story 6.4 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/diagnosis/improvement-plan.service.ts" \
  "$ROOT/backend/api/src/diagnosis/pilot-improvement-plan.seed.ts" \
  "$ROOT/frontend/src/components/ImprovementAreasPanel.tsx" \
  "$ROOT/frontend/src/components/EightWeekPlanPanel.tsx" \
  "$ROOT/frontend/app/improvement-plan.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

ST=$(token "$(login student@pes.edu)")
FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$ST" ]; then ok "student login"; else fail "student login"; fi
accept_consent "$ST"
accept_consent "$FT"

PLAN=$(curl -s "$API/api/diagnosis/improvement-plan" -H "Authorization: Bearer $ST")
if echo "$PLAN" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert len(d['rankedAreas']) == 4
assert d['rankedAreas'][0]['title'] == 'DBMS normalization'
assert d['rankedAreas'][0]['priority'] == 'high'
assert len(d['milestones']) == 4
assert d['completionPercent'] == 31
assert d['currentWeekLabel'] == 'Week 3 of 8'
assert 'improvement-plan' in d['eightWeekPlanRoute']
assert 'CO3' in d['rankedAreas'][0]['coTagsAffected']
" 2>/dev/null; then
  ok "ranked improvement areas with 8-week milestones"
else
  fail "improvement plan payload"
fi

FOCUS=$(curl -s "$API/api/diagnosis/improvement-plan?questionId=Q2&courseCode=BCS301" -H "Authorization: Bearer $ST")
if echo "$FOCUS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['focusQuestionId'] == 'Q2'
assert d['rankedAreas'][0]['itemId'] == 'dbms-normalization'
assert d['rankedAreas'][0]['isFocused'] is True
" 2>/dev/null; then
  ok "weak question focus boosts normalization area"
else
  fail "question focus ranking"
fi

PATCH=$(curl -s -X PATCH "$API/api/diagnosis/improvement-plan/items/dbms-normalization" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"usn\":\"$USN\",\"description\":\"Faculty note: redo SEE 2024 Q4 set before Friday check-in.\"}")
if echo "$PATCH" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
area = next(a for a in d['rankedAreas'] if a['itemId'] == 'dbms-normalization')
assert 'Faculty note' in area['impactSummary']
assert area['facultyAttribution']['facultyName']
" 2>/dev/null; then
  ok "faculty edit returns attribution on plan item"
else
  fail "faculty PATCH improvement item"
fi

STUDENT_VIEW=$(curl -s "$API/api/diagnosis/improvement-plan?usn=$USN" -H "Authorization: Bearer $ST")
if echo "$STUDENT_VIEW" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
area = next(a for a in d['rankedAreas'] if a['itemId'] == 'dbms-normalization')
assert 'Faculty note' in area['impactSummary']
assert area['facultyAttribution']
" 2>/dev/null; then
  ok "student sees faculty-updated guidance"
else
  fail "student view after faculty edit"
fi

FORBIDDEN_CODE=$(curl -s -o /tmp/st64-forbidden.json -w "%{http_code}" \
  -X PATCH "$API/api/diagnosis/improvement-plan/items/dbms-normalization" \
  -H "Authorization: Bearer $ST" \
  -H "Content-Type: application/json" \
  -d "{\"usn\":\"$USN\",\"description\":\"student attempt\"}")
if [ "$FORBIDDEN_CODE" = "403" ]; then ok "student cannot edit plan items"; else fail "student edit guard (status=$FORBIDDEN_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'diagnosis.improvement_plan_view'; then ok "diagnosis.improvement_plan_view logged"; else fail "plan view log missing"; fi
if echo "$LOGS" | grep -q 'diagnosis.improvement_plan_edit'; then ok "diagnosis.improvement_plan_edit logged"; else fail "plan edit log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
