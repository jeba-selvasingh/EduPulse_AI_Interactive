#!/usr/bin/env bash
# Story 9.6 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3055}"
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

echo "=== Story 9.6 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/college-radar/naac-prediction.service.ts" \
  "$ROOT/frontend/src/components/NaacPredictionPanel.tsx" \
  "$ROOT/frontend/app/naac-prediction.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
accept_consent "$PR"

NAAC=$(curl -s "$API/api/college-radar/naac-prediction" -H "Authorization: Bearer $PR")
if echo "$NAAC" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['predictedCgpa'] == 3.12
assert d['predictedGrade'] == 'A'
assert d['targetCgpa'] == 3.26
assert d['targetGrade'] == 'A+'
assert 'estimate' in d['estimateDisclaimer'].lower()
crit = {c['criterion']: c for c in d['criteria']}
assert crit['Criterion 3 · research']['gap'] == -0.09
assert crit['Criteria 1, 2, 4, 7']['status'] == 'on_target'
assert d['fastestFix']['weeks'] == 4
assert d['trustCardId'] == '10000000-0000-4000-8000-000000000003'
"; then ok "NAAC prediction matches prototype"; else fail "NAAC prediction payload"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
