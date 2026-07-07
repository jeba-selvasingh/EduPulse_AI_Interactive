#!/usr/bin/env bash
# Story 6.2 acceptance verification
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
  curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/review/flagged" -H "Authorization: Bearer $ft" > /tmp/st62-flagged.json
  for qid in $(python3 -c "import json; items=[i for i in json.load(open('/tmp/st62-flagged.json'))['data'] if i['usn']=='$USN']; print(' '.join(i['questionId'] for i in items))"); do
    curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/review/$USN/$qid/accept" -H "Authorization: Bearer $ft" >/dev/null
  done
  curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/publish" -H "Authorization: Bearer $ft" >/dev/null
}

echo "=== Story 6.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/diagnosis/concept-diagnosis.service.ts" \
  "$ROOT/backend/api/src/diagnosis/pilot-concept-diagnosis.seed.ts" \
  "$ROOT/frontend/src/components/ConceptDiagnosisPanel.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

ST=$(token "$(login student@pes.edu)")
FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$ST" ]; then ok "student login"; else fail "student login"; fi
accept_consent "$ST"
accept_consent "$FT"

DBMS=$(curl -s "$API/api/diagnosis/concept-map/BCS301" -H "Authorization: Bearer $ST")
if echo "$DBMS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
norm = next(c for c in d['concepts'] if c['conceptId'] == 'normalization')
assert norm['masteryPercent'] == 38
assert norm['isWeak'] is True
assert norm['band'] == 'red'
assert 'L3 fails' in d['bloomStrip']['caption']
assert any('IA-2 Q2' in ref for ref in d['aiDiagnosis']['evidenceRefs'])
assert 'schema' in d['aiDiagnosis']['summary'].lower()
" 2>/dev/null; then
  ok "DBMS concept map highlights <40% mastery with AI evidence"
else
  fail "DBMS concept map payload"
fi

HEATMAP=$(curl -s "$API/api/diagnosis/concept-map/BCS304?coTag=CO3" -H "Authorization: Bearer $ST")
if echo "$HEATMAP" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['focusCoTag'] == 'CO3'
assert len(d['concepts']) >= 3
" 2>/dev/null; then
  ok "BCS304 concept map accepts heatmap coTag focus"
else
  fail "BCS304 pre-publish concept map"
fi

publish_chetan_sheet "$FT"

LIVE=$(curl -s "$API/api/diagnosis/concept-map/BCS304?coTag=CO3" -H "Authorization: Bearer $ST")
if echo "$LIVE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['courseCode'] == 'BCS304'
concepts = [c for c in d['concepts'] if c['masteryPercent'] is not None]
assert len(concepts) >= 3
weak = [c for c in d['concepts'] if c['isWeak']]
assert len(d['aiDiagnosis']['evidenceRefs']) >= 1
assert 'exam-evidence' in d['examEvidenceRoute']
" 2>/dev/null; then
  ok "published BCS304 marks drive live concept mastery"
else
  fail "BCS304 live concept map"
fi

NOT_FOUND_CODE=$(curl -s -o /tmp/st62-404.json -w "%{http_code}" \
  "$API/api/diagnosis/concept-map/UNKNOWN" -H "Authorization: Bearer $ST")
if [ "$NOT_FOUND_CODE" = "404" ]; then ok "unknown course returns 404"; else fail "unknown course (status=$NOT_FOUND_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'diagnosis.concept_map_view'; then ok "diagnosis.concept_map_view logged"; else fail "concept map log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
