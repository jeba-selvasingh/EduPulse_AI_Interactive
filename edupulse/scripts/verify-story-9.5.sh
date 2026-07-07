#!/usr/bin/env bash
# Story 9.5 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3054}"
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

echo "=== Story 9.5 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/college-radar/gap-action.service.ts" \
  "$ROOT/frontend/src/components/GapActionPanel.tsx" \
  "$ROOT/frontend/app/gap-action.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
accept_consent "$PR"

GAP=$(curl -s "$API/api/college-radar/gap-action?rivalId=rival-a" -H "Authorization: Bearer $PR")
if echo "$GAP" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['rivalId'] == 'rival-a'
assert len(d['actions']) == 3
assert d['actions'][0]['title'] == 'Fix graduation outcomes'
assert d['actions'][0]['impact'] == 'high'
assert d['actions'][2]['timelineLabel'] == '2 yrs'
assert d['trustCardId'] == '10000000-0000-4000-8000-000000000002'
assert 'NIRF 2026' in d['sourcesLabel']
"; then ok "Gap action plan matches prototype"; else fail "Gap action payload"; fi

BAD=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/college-radar/gap-action?rivalId=rival-b" -H "Authorization: Bearer $PR")
if [ "$BAD" = "404" ]; then ok "Gap plan only for configured rival"; else fail "Unexpected rival gap response $BAD"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
