#!/usr/bin/env bash
# Story 6.1 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
COURSE="BCS304"
EXAM="IA-2"
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

publish_chetan_sheet() {
  local ft="$1"
  curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/$USN" -H "Authorization: Bearer $ft" >/dev/null
  curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/review/flagged" -H "Authorization: Bearer $ft" > /tmp/st61-flagged.json
  for qid in $(python3 -c "import json; items=[i for i in json.load(open('/tmp/st61-flagged.json'))['data'] if i['usn']=='$USN']; print(' '.join(i['questionId'] for i in items))"); do
    curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$qid/accept" -H "Authorization: Bearer $ft" >/dev/null
  done
  curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/publish" -H "Authorization: Bearer $ft" >/dev/null
}

echo "=== Story 6.1 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/diagnosis/academic-level.service.ts" \
  "$ROOT/backend/api/src/diagnosis/academic-level.util.ts" \
  "$ROOT/frontend/src/components/AcademicLevelPanel.tsx" \
  "$ROOT/frontend/app/academic-level.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

ST=$(token "$(login student@pes.edu)")
FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$ST" ]; then ok "student login"; else fail "student login"; fi
if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

accept_consent "$ST"
accept_consent "$FT"

PRE=$(curl -s "$API/api/diagnosis/academic-level" -H "Authorization: Bearer $ST")
if echo "$PRE" | python3 -c "
import json
d = json.load(open('/dev/stdin'))['data']
codes = {s['courseCode'] for s in d['subjects']}
assert 'BCS303' in codes
assert 'BCS304' not in codes
" 2>/dev/null <<< "$PRE"; then
  ok "BCS304 hidden until marks published"
else
  fail "unpublished BCS304 guard"
fi

publish_chetan_sheet "$FT"

VIEW=$(curl -s "$API/api/diagnosis/academic-level" -H "Authorization: Bearer $ST")
if echo "$VIEW" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['usn'] == '$USN'
assert d['studentName'] == 'Chetan R'
assert len(d['subjects']) >= 4
bcs304 = next(s for s in d['subjects'] if s['courseCode'] == 'BCS304')
assert bcs304['highestBloomLevel'] >= 1
assert bcs304['hasPublishedMarks'] is True
networks = next(s for s in d['subjects'] if s['courseCode'] == 'BCS303')
assert networks['trend'] == 'down'
assert networks['trendWarning'] is True
assert networks['competency'] == 'Foundational'
" 2>/dev/null; then
  ok "student academic level with Bloom ladder and declining warning"
else
  fail "academic level payload"
fi

PREVIEW=$(curl -s "$API/api/diagnosis/academic-level?usn=$USN" -H "Authorization: Bearer $FT")
if echo "$PREVIEW" | python3 -c "import sys,json; assert json.load(sys.stdin)['data']['usn']=='$USN'" 2>/dev/null; then
  ok "faculty preview by USN"
else
  fail "faculty preview"
fi

FORBIDDEN_CODE=$(curl -s -o /tmp/st61-forbidden.json -w "%{http_code}" \
  "$API/api/diagnosis/academic-level?usn=PES1UG23CS001" -H "Authorization: Bearer $ST")

if [ "$FORBIDDEN_CODE" = "403" ]; then
  ok "student cannot preview other USNs"
else
  fail "student scope guard (status=$FORBIDDEN_CODE)"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'diagnosis.academic_level_view'; then
  ok "diagnosis.academic_level_view logged"
else
  fail "diagnosis.academic_level_view log missing"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
