#!/usr/bin/env bash
# Story 5.5 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
COURSE="BCS304"
EXAM="IA-2"
USN="PES1UG23CS001"

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

echo "=== Story 5.5 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/evaluation/faculty-review.service.ts" \
  "$ROOT/backend/api/src/evaluation/faculty-review.util.ts" \
  "$ROOT/frontend/src/components/FacultyReviewPanel.tsx" \
  "$ROOT/frontend/app/faculty-review.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/$USN" \
  -H "Authorization: Bearer $FT" >/dev/null

FLAGGED=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/review/flagged" -H "Authorization: Bearer $FT")
if echo "$FLAGGED" | python3 -c "
import sys, json
items = json.load(sys.stdin)['data']
assert any(i['usn']=='$USN' and i['reviewStatus']=='pending' for i in items)
" 2>/dev/null; then
  ok "flagged review queue lists pending items"
else
  fail "flagged review queue"
fi

Q1=$(echo "$FLAGGED" | python3 -c "import sys,json; items=[i for i in json.load(sys.stdin)['data'] if i['usn']=='$USN']; print(items[0]['questionId'])" 2>/dev/null || true)
Q2=$(echo "$FLAGGED" | python3 -c "import sys,json; items=[i for i in json.load(sys.stdin)['data'] if i['usn']=='$USN']; print(items[1]['questionId'])" 2>/dev/null || true)
Q3=$(echo "$FLAGGED" | python3 -c "import sys,json; items=[i for i in json.load(sys.stdin)['data'] if i['usn']=='$USN']; print(items[2]['questionId'])" 2>/dev/null || true)

DETAIL=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$Q1" -H "Authorization: Bearer $FT")
if echo "$DETAIL" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['scannedSnippet']
assert d['rationale']
assert d['confidence'] < 0.75
assert d['aiMarksAwarded'] == d['marksAwarded']
" 2>/dev/null; then
  ok "review detail shows snippet, rationale, and confidence"
else
  fail "review detail payload"
fi

TC_ID=$(echo "$DETAIL" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['trustCardId'])" 2>/dev/null || true)

ACCEPT=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$Q1/accept" \
  -H "Authorization: Bearer $FT")
if echo "$ACCEPT" | python3 -c "import sys,json; assert json.load(sys.stdin)['data']['reviewStatus']=='accepted'" 2>/dev/null; then
  ok "faculty can accept AI mark"
else
  fail "accept review"
fi

AUDIT_ACCEPT=$(curl -s "$API/api/audit-events/artifact/$TC_ID" -H "Authorization: Bearer $FT")
if echo "$AUDIT_ACCEPT" | python3 -c "
import sys, json
events = json.load(sys.stdin)['data']
assert any(e['eventType']=='approval' and e.get('beforeValue') and e.get('afterValue') for e in events)
" 2>/dev/null; then
  ok "accept logs approval audit with before/after marks"
else
  fail "accept audit trail"
fi

EMPTY_OVERRIDE=$(curl -s -o /tmp/st55-empty.json -w "%{http_code}" -X POST \
  "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$Q2/override" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"marksAwarded":6,"facultyNote":"   "}')

if [ "$EMPTY_OVERRIDE" = "400" ]; then
  ok "override without faculty note rejected"
else
  fail "empty faculty note (status=$EMPTY_OVERRIDE)"
fi

OVERRIDE=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$Q2/override" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"marksAwarded":6,"facultyNote":"Partial credit for attempted rotation steps"}')

if echo "$OVERRIDE" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['reviewStatus']=='overridden'
assert d['marksAwarded']==6
assert d['facultyNote']
" 2>/dev/null; then
  ok "faculty can override with note"
else
  fail "override review"
fi

TC2=$(echo "$OVERRIDE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['trustCardId'])" 2>/dev/null || true)
AUDIT_OVERRIDE=$(curl -s "$API/api/audit-events/artifact/$TC2" -H "Authorization: Bearer $FT")
if echo "$AUDIT_OVERRIDE" | python3 -c "
import sys, json
events = json.load(sys.stdin)['data']
ov = [e for e in events if e['eventType']=='override'][-1]
assert ov['beforeValue'] != ov['afterValue']
" 2>/dev/null; then
  ok "override logs before/after marks in audit trail"
else
  fail "override audit trail"
fi

BEFORE=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard" -H "Authorization: Bearer $FT")
FR_BEFORE=$(echo "$BEFORE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['progress']['facultyReviewed'])" 2>/dev/null || echo 0)

curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$Q3/accept" \
  -H "Authorization: Bearer $FT" >/dev/null

AFTER=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard" -H "Authorization: Bearer $FT")
FR_AFTER=$(echo "$AFTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['progress']['facultyReviewed'])" 2>/dev/null || echo 0)

if [ "$FR_AFTER" -eq $((FR_BEFORE + 1)) ]; then
  ok "dashboard facultyReviewed increments when sheet fully reviewed"
else
  fail "facultyReviewed increment (before=$FR_BEFORE after=$FR_AFTER)"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'evaluation.faculty_review'; then ok "evaluation.faculty_review logged"; else fail "evaluation.faculty_review log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
