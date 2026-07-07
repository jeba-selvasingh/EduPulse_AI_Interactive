#!/usr/bin/env bash
# Story 7.2 acceptance verification
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

echo "=== Story 7.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/readiness-tier.service.ts" \
  "$ROOT/backend/api/src/campus-drive/readiness-tier.util.ts" \
  "$ROOT/frontend/src/components/ReadinessTierBoardPanel.tsx" \
  "$ROOT/frontend/app/readiness-board.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

BOARD=$(curl -s "$API/api/campus-drive/readiness-board" -H "Authorization: Bearer $TPO")
if echo "$BOARD" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['batchStrength'] == 146
counts = {t['tier']: t['count'] for t in d['tiers']}
assert counts['dream'] == 18
assert counts['core'] == 64
assert counts['mass'] == 41
assert counts['at_risk'] == 23
assert d['weights']['academics'] == 25
assert len(d['sampleBreakdown']) == 4
divya = next(s for s in d['featuredStudents'] if s['name'] == 'Divya S')
chetan = next(s for s in d['featuredStudents'] if s['name'] == 'Chetan R')
farhan = next(s for s in d['featuredStudents'] if s['name'] == 'Farhan A')
assert divya['readinessPercent'] == 86 and divya['tier'] == 'dream'
assert chetan['readinessPercent'] == 72 and chetan['tier'] == 'core'
assert farhan['readinessPercent'] == 41 and farhan['tier'] == 'at_risk'
assert 'backlog' in (farhan.get('gapSummary') or '').lower()
" 2>/dev/null; then
  ok "readiness board shows tier counts, breakdown, and featured students"
else
  fail "readiness board payload"
fi

PATCH=$(curl -s -X PATCH "$API/api/campus-drive/readiness-weights" \
  -H "Authorization: Bearer $TPO" \
  -H "Content-Type: application/json" \
  -d '{"academics":28,"coding":18,"certs":14,"communication":10}')
if echo "$PATCH" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['academics'] == 28
assert d['coding'] == 18
" 2>/dev/null; then
  ok "TPO can tune readiness weights within bounds"
else
  fail "readiness weights patch"
fi

INVALID=$(curl -s -o /tmp/st72-invalid.json -w "%{http_code}" \
  -X PATCH "$API/api/campus-drive/readiness-weights" \
  -H "Authorization: Bearer $TPO" \
  -H "Content-Type: application/json" \
  -d '{"academics":5,"coding":20,"certs":15,"communication":10}')
if [ "$INVALID" = "400" ]; then ok "out-of-bounds weights rejected"; else fail "weight validation (status=$INVALID)"; fi

STUDENT_CODE=$(curl -s -o /tmp/st72-403.json -w "%{http_code}" \
  "$API/api/campus-drive/readiness-board" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied readiness board access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.readiness_board_view'; then ok "campus.readiness_board_view logged"; else fail "readiness board log missing"; fi
if echo "$LOGS" | grep -q 'campus.readiness_weights_update'; then ok "campus.readiness_weights_update logged"; else fail "weights update log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
