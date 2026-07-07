#!/usr/bin/env bash
# Story 6.3 acceptance verification
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
  curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/review/flagged" -H "Authorization: Bearer $ft" > /tmp/st63-flagged.json
  for qid in $(python3 -c "import json; items=[i for i in json.load(open('/tmp/st63-flagged.json'))['data'] if i['usn']=='$USN']; print(' '.join(i['questionId'] for i in items))"); do
    curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$qid/accept" -H "Authorization: Bearer $ft" >/dev/null
  done
  curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/publish" -H "Authorization: Bearer $ft" >/dev/null
}

echo "=== Story 6.3 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/diagnosis/exam-evidence.service.ts" \
  "$ROOT/backend/api/src/diagnosis/pilot-exam-evidence.seed.ts" \
  "$ROOT/frontend/src/components/ExamEvidencePanel.tsx" \
  "$ROOT/frontend/app/exam-evidence.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

ST=$(token "$(login student@pes.edu)")
FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$ST" ]; then ok "student login"; else fail "student login"; fi
accept_consent "$ST"
accept_consent "$FT"

GRID_PUB=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/grid" -H "Authorization: Bearer $FT")
ALREADY_PUBLISHED=$(echo "$GRID_PUB" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('isPublished', False))" 2>/dev/null || echo "False")

DBMS=$(curl -s "$API/api/diagnosis/exam-evidence/BCS301/IA-2" -H "Authorization: Bearer $ST")
if echo "$DBMS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
q2 = next(q for q in d['questions'] if q['questionId'] == 'Q2')
assert d['totalMarks'] == 18
assert q2['marksAwarded'] == 3
assert q2['isWeak'] is True
assert 'improvement-areas' in q2['improvementRoute']
assert d['summary']['classAverageTotal'] == 21
assert 'normalization' in d['summary']['insight'].lower()
" 2>/dev/null; then
  ok "BCS301 pilot exam evidence matches prototype"
else
  fail "BCS301 pilot exam evidence payload"
fi

UNPUBLISHED_CODE=$(curl -s -o /tmp/st63-unpub.json -w "%{http_code}" \
  "$API/api/diagnosis/exam-evidence/BCS304/IA-2" -H "Authorization: Bearer $ST")
if [ "$UNPUBLISHED_CODE" = "400" ]; then
  ok "BCS304 blocks before publish"
elif [ "$ALREADY_PUBLISHED" = "True" ]; then
  ok "BCS304 pre-publish skipped (already published in session)"
else
  fail "BCS304 pre-publish (status=$UNPUBLISHED_CODE)"
fi

if [ "$ALREADY_PUBLISHED" = "False" ]; then
  publish_chetan_sheet "$FT"
fi

LIVE=$(curl -s "$API/api/diagnosis/exam-evidence/BCS304/IA-2" -H "Authorization: Bearer $ST")
if echo "$LIVE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['courseCode'] == 'BCS304'
assert d['isPublished'] is True
assert len(d['questions']) >= 3
weak = [q for q in d['questions'] if q['isWeak']]
for q in weak:
    assert 'improvement-areas' in q['improvementRoute']
assert d['summary']['maxTotalMarks'] > 0
assert 'improvement-areas' in d['improvementPlanRoute']
" 2>/dev/null; then
  ok "published BCS304 marks drive live exam evidence"
else
  fail "BCS304 live exam evidence"
fi

NOT_FOUND_CODE=$(curl -s -o /tmp/st63-404.json -w "%{http_code}" \
  "$API/api/diagnosis/exam-evidence/UNKNOWN/IA-2" -H "Authorization: Bearer $ST")
if [ "$NOT_FOUND_CODE" = "404" ]; then ok "unknown course returns 404"; else fail "unknown course (status=$NOT_FOUND_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'diagnosis.exam_evidence_view'; then ok "diagnosis.exam_evidence_view logged"; else fail "exam evidence log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
