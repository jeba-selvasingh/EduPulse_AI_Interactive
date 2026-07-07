#!/usr/bin/env bash
# Story 8.1 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3047}"
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

echo "=== Story 8.1 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/dean-pulse/institution-pulse.service.ts" \
  "$ROOT/backend/api/src/dean-pulse/institution-pulse.schema.ts" \
  "$ROOT/backend/api/src/dean-pulse/pilot-institution-pulse.seed.ts" \
  "$ROOT/frontend/src/components/InstitutionPulsePanel.tsx" \
  "$ROOT/frontend/app/dean-pulse.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
ST=$(token "$(login student@pes.edu)")

if [ -n "$PR" ]; then ok "Principal login"; else fail "Principal login"; fi
accept_consent "$PR"

PULSE=$(curl -s "$API/api/dean-pulse" -H "Authorization: Bearer $PR")
if echo "$PULSE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['predictedPlacementPct'] == 78
assert d['atRiskCount'] == 23
assert d['weekOverWeek']['placementPctDelta'] == 3
assert d['weekOverWeek']['atRiskDelta'] == -4
assert len(d['readinessByDepartment']) == 4
assert d['readinessByDepartment'][0]['department'] == 'CSE'
assert d['readinessByDepartment'][0]['readinessScore'] == 82
assert 'CO4 trailing' in d['accreditationWatch']['summary']
assert d['weekSummary']['papersGenerated'] == 34
assert d['weekSummary']['hoursSaved'] == 61
assert d['weekSummary']['studentsRecovered'] == 6
"; then ok "Institution pulse payload matches prototype"; else fail "Institution pulse payload"; fi

accept_consent "$ST"
ST_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/dean-pulse" -H "Authorization: Bearer $ST")
if [ "$ST_CODE" = "403" ]; then ok "Student denied dean-pulse (403)"; else fail "Student should get 403, got $ST_CODE"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
