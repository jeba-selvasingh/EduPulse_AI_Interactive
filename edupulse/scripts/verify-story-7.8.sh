#!/usr/bin/env bash
# Story 7.8 acceptance verification
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

echo "=== Story 7.8 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/mock-test.service.ts" \
  "$ROOT/backend/api/src/campus-drive/mock-test.schema.ts" \
  "$ROOT/backend/api/src/campus-drive/mock-test-store.service.ts" \
  "$ROOT/frontend/src/components/MockTestSchedulePanel.tsx" \
  "$ROOT/frontend/app/mock-test-schedule.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

SCHEDULE=$(curl -s "$API/api/campus-drive/mock-tests" -H "Authorization: Bearer $TPO")
if echo "$SCHEDULE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['monthLabel'] == 'Aug 2026'
assert d['nextMock']['title'].startswith('Next mock')
assert d['nextMock']['resultsSlaHours'] == 2
assert len(d['schedule']) >= 4
mock4 = next(x for x in d['schedule'] if x['mockId'] == 'mock-4')
assert mock4['batchAvgScore'] == 64
assert mock4['participantsCount'] == 78
mock5 = next(x for x in d['schedule'] if x['mockId'] == 'mock-5')
assert mock5['registeredCount'] == 89
trend = {p['label']: p['batchAvgScore'] for p in d['scoreTrend']}
assert trend['M1'] == 51 and trend['M2'] == 56 and trend['M3'] == 60 and trend['M4'] == 64
" 2>/dev/null; then
  ok "schedule view with next mock, cohorts, and score trend"
else
  fail "mock test schedule payload"
fi

DETAIL=$(curl -s "$API/api/campus-drive/mock-tests?mockId=mock-4" -H "Authorization: Bearer $TPO")
if echo "$DETAIL" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['mockId'] == 'mock-4'
assert d['topScorerName'] == 'Divya S'
assert d['topScorerScore'] == 89
assert d['gradingWithinSla'] is True
" 2>/dev/null; then
  ok "mock detail includes completed grading metadata"
else
  fail "mock test detail payload"
fi

NEW=$(curl -s -X POST "$API/api/campus-drive/mock-tests" \
  -H "Authorization: Bearer $TPO" \
  -H "Content-Type: application/json" \
  -d '{"patternLabel":"Cognizant pattern","dateLabel":"2 Sep","durationMinutes":90,"focus":"Aptitude + coding"}')
if echo "$NEW" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['status'] == 'scheduled'
assert 'Cognizant' in d['patternLabel']
" 2>/dev/null; then
  ok "TPO can schedule a new mock test"
else
  fail "mock test schedule create payload"
fi

GRADE=$(curl -s -X POST "$API/api/campus-drive/mock-tests/mock-5/submissions" \
  -H "Authorization: Bearer $TPO" \
  -H "Content-Type: application/json" \
  -d '{"submittedCount":89}')
if echo "$GRADE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['submittedCount'] == 89
assert d['gradedCount'] == 89
assert d['gradingWithinSla'] is True
assert d['gradingCompletedInMinutes'] <= 120
assert d['auditLogAction'] == 'campus.mock_test_submissions_graded'
" 2>/dev/null; then
  ok "objective submissions auto-graded within 2-hour SLA"
else
  fail "mock test grading payload"
fi

STUDENT_CODE=$(curl -s -o /tmp/st78-403.json -w "%{http_code}" \
  "$API/api/campus-drive/mock-tests" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied mock test schedule access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.mock_test_schedule_view'; then ok "campus.mock_test_schedule_view logged"; else fail "mock schedule view log missing"; fi
if echo "$LOGS" | grep -q 'campus.mock_test_submissions_graded'; then ok "campus.mock_test_submissions_graded logged"; else fail "mock grading log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
