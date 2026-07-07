#!/usr/bin/env bash
# Story 6.5 acceptance verification
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

echo "=== Story 6.5 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/diagnosis/progress-tracking.service.ts" \
  "$ROOT/backend/api/src/diagnosis/pilot-progress-tracking.seed.ts" \
  "$ROOT/frontend/src/components/ProgressTrackingPanel.tsx" \
  "$ROOT/frontend/app/progress-tracking.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$ST" ]; then ok "student login"; else fail "student login"; fi
accept_consent "$ST"

PROGRESS=$(curl -s "$API/api/diagnosis/progress-tracking" -H "Authorization: Bearer $ST")
if echo "$PROGRESS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['dataPointCount'] >= 3
assert len(d['readinessPoints']) >= 3
assert d['readinessTrendLabel'] == 'improving'
assert d['readinessPoints'][-1]['score'] == 72
assert any(c['conceptName'] == 'DBMS normalization' for c in d['conceptDeltas'])
assert d['companiesEligibility']['toCount'] == 29
assert 'communication' in d['projection']['summary'].lower()
assert len(d['projection']['assumptions']) >= 1
" 2>/dev/null; then
  ok "progress view shows readiness trend with concept and eligibility deltas"
else
  fail "progress tracking payload"
fi

FT=$(token "$(login faculty@pes.edu)")
if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

PREVIEW=$(curl -s "$API/api/diagnosis/progress-tracking?usn=$USN" -H "Authorization: Bearer $FT")
if echo "$PREVIEW" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['usn'] == '$USN'
assert d['studentName']
" 2>/dev/null; then
  ok "faculty can preview student progress"
else
  fail "faculty progress preview"
fi

NOT_FOUND_CODE=$(curl -s -o /tmp/st65-404.json -w "%{http_code}" \
  "$API/api/diagnosis/progress-tracking?usn=UNKNOWN999" -H "Authorization: Bearer $FT")
if [ "$NOT_FOUND_CODE" = "404" ]; then ok "unknown student returns 404"; else fail "unknown student (status=$NOT_FOUND_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'diagnosis.progress_view'; then ok "diagnosis.progress_view logged"; else fail "progress view log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
