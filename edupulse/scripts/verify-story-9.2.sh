#!/usr/bin/env bash
# Story 9.2 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3051}"
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

echo "=== Story 9.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/college-radar/nirf-radar.service.ts" \
  "$ROOT/frontend/src/components/NirfRadarPanel.tsx" \
  "$ROOT/frontend/app/nirf-radar.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
accept_consent "$PR"

RADAR=$(curl -s "$API/api/college-radar/nirf-radar?rivalId=rival-a" -H "Authorization: Bearer $PR")
if echo "$RADAR" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['dataYear'] == 2026
assert d['rivalId'] == 'rival-a'
assert d['rivalName'] == 'Rival A Engg'
assert len(d['parameters']) == 5
keys = {p['key'] for p in d['parameters']}
assert keys == {'TLR', 'RP', 'GO', 'OI', 'PR'}
go = next(p for p in d['parameters'] if p['key'] == 'GO')
assert go['pesScore'] == 52 and go['rivalScore'] == 61
rp = next(p for p in d['parameters'] if p['key'] == 'RP')
assert rp['pesScore'] == 31 and rp['rivalScore'] == 44
tlr = next(p for p in d['parameters'] if p['key'] == 'TLR')
assert tlr['pesAhead'] is True
"; then ok "NIRF radar comparison matches prototype"; else fail "NIRF radar payload"; fi

BAD=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/college-radar/nirf-radar?rivalId=unknown" -H "Authorization: Bearer $PR")
if [ "$BAD" = "404" ]; then ok "Unknown rival returns 404"; else fail "Unknown rival should 404, got $BAD"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
